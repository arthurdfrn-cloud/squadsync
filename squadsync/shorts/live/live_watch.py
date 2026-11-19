#!/usr/bin/env python3
"""Surveillance de lives Twitch / YouTube en parallèle et découpe automatique des moments forts.

    python3 shorts/live/live_watch.py [--channels shorts/live/channels.json] [--out shorts/work/live]
                                       [--buffer-min 90] [--poll 120] [--hours 6] [--threshold 3.0]

Pour chaque chaîne (un fil par chaîne) :
  1. vérifie toutes les --poll secondes si elle est en live ;
  2. enregistre le flux en segments de 10 s horodatés (tampon tournant de --buffer-min minutes) ;
  3. lit le chat (Twitch : IRC anonyme en lecture seule ; YouTube : live_chat via yt-dlp) ;
  4. mesure le volume sonore du stream (cris, fous rires, explosions) ;
  5. toutes les 10 s, calcule un score d'intensité (pic de messages, mots de réaction FR/emotes, pic audio)
     et, au-delà du seuil, découpe un clip [-35 s, +15 s] autour du moment.

Sorties : <out>/<chaîne>/clips/<chaîne>_<AAAAMMJJ-HHMMSS>.mp4 + .json (score, raisons, extraits du chat),
          <out>/<chaîne>/moments.jsonl (tous les moments, triables a posteriori).
Les segments bruts sont supprimés au fil de l'eau (seuls les clips sont gardés).
"""
import argparse
import collections
import glob
import json
import os
import re
import subprocess
import threading
import time
import urllib.parse

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
CA = "/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None

# Réactions du chat francophone (et emotes Twitch courantes), avec poids
REACTIONS = {
    r"\b(mdr+|ptdr+|xpdr|jpp|mort de rire|ahah+|haha+|hahah+|lol+|xd+)\b": 1.0,
    r"(kekw|omegalul|lul|lulw|icant|pepelaugh|kekl)": 1.0,
    r"[😂🤣💀]": 1.0,
    r"\b(quoi+|what+|wtf|nan+|noo+n|nooo+|oh non|ohh+|wsh|wesh|la honte|c'est chaud|incroyable|dingue|masterclass)\b": 0.8,
    r"(pog|pogchamp|poggers|pogu|monkas|omegalul|pepehands|sadge|o7)": 0.8,
    r"\?{3,}|!{3,}": 0.6,
    r"\b(clip|clipp?ez|clip it)\b": 1.5,
    r"\b(gg|ez|insane|cracked)\b": 0.5,
}
REACT_RX = [(re.compile(k, re.I), w) for k, w in REACTIONS.items()]


def log(ch, msg):
    print(f"[{time.strftime('%H:%M:%S')}] {ch}: {msg}", flush=True)


def ytdlp_base():
    cmd = ["yt-dlp", "--no-warnings", "--js-runtimes", "node"]
    if os.environ.get("YTDLP_COOKIES"):
        cmd += ["--cookies", os.environ["YTDLP_COOKIES"]]
    return cmd


def is_live(url):
    r = subprocess.run(ytdlp_base() + ["--skip-download", "--print", "is_live", url], capture_output=True, text=True, timeout=90)
    return r.stdout.strip().startswith("True"), r.stderr.strip().splitlines()[-1:] if r.returncode else []


# ------------------------------------------------------------------ enregistrement
class Recorder:
    def __init__(self, ch, url, segdir):
        self.ch, self.url, self.segdir, self.proc = ch, url, segdir, None
        os.makedirs(segdir, exist_ok=True)

    def start(self):
        pattern = os.path.join(self.segdir, "seg_%s.ts")  # %s = heure Unix du début du segment
        seg = ["-c", "copy", "-f", "segment", "-segment_time", "10", "-reset_timestamps", "1", "-strftime", "1", pattern]
        if "twitch.tv" in self.url:
            cmd = (f"streamlink --twitch-disable-ads --stdout '{self.url}' 720p60,720p,best 2>/dev/null | "
                   f"ffmpeg -loglevel error -i pipe:0 {' '.join(seg[:-1])} '{pattern}'")
            self.proc = subprocess.Popen(cmd, shell=True, start_new_session=True)  # groupe : on arrête streamlink ET ffmpeg
        else:  # YouTube : flux vidéo + audio séparés, fusionnés par ffmpeg (via le proxy de l'environnement)
            r = subprocess.run(ytdlp_base() + ["-g", "-f", "bv*[height<=720][protocol^=m3u8]+ba[protocol^=m3u8]/b[height<=720]", self.url],
                               capture_output=True, text=True, timeout=90)
            urls = r.stdout.split()
            if not urls:
                log(self.ch, "flux YouTube indisponible (" + (r.stderr.strip().splitlines() or ["?"])[-1][:120] + ")")
                return False
            net = (["-http_proxy", PROXY] if PROXY else []) + (["-ca_file", CA, "-tls_verify", "1"] if CA else [])
            inputs = sum([net + ["-i", u] for u in urls], [])
            maps = ["-map", "0:v", "-map", "1:a"] if len(urls) > 1 else []
            self.proc = subprocess.Popen(["ffmpeg", "-loglevel", "error", *inputs, *maps, *seg])
        log(self.ch, "enregistrement démarré")
        return True

    def alive(self):
        return self.proc is not None and self.proc.poll() is None

    def stop(self):
        if self.proc is not None and self.proc.poll() is None:
            try:
                os.killpg(os.getpgid(self.proc.pid), 15)
            except (ProcessLookupError, PermissionError):
                self.proc.terminate()


# ------------------------------------------------------------------ chat
class Chat:
    def __init__(self, ch, url, out):
        self.ch, self.url = ch, url
        self.msgs = collections.deque(maxlen=200000)  # (heure unix, texte)
        self.file = open(os.path.join(out, "chat.jsonl"), "a")
        self.stop_flag = False

    def add(self, ts, text):
        self.msgs.append((ts, text))
        self.file.write(json.dumps({"t": round(ts, 2), "m": text}, ensure_ascii=False) + "\n")
        self.file.flush()

    def start(self):
        target = self.twitch if "twitch.tv" in self.url else self.youtube
        threading.Thread(target=target, daemon=True).start()

    def twitch(self):
        import websocket
        login = self.url.rstrip("/").split("/")[-1].lower()
        while not self.stop_flag:
            try:
                kw = {"sslopt": {"ca_certs": CA}} if CA else {}
                if PROXY:
                    p = urllib.parse.urlparse(PROXY)
                    kw.update(http_proxy_host=p.hostname, http_proxy_port=p.port, proxy_type="http")
                    if p.username:
                        kw["http_proxy_auth"] = (urllib.parse.unquote(p.username), urllib.parse.unquote(p.password or ""))
                ws = websocket.create_connection("wss://irc-ws.chat.twitch.tv:443", timeout=60, **kw)
                # connexion anonyme en lecture seule (aucun compte, aucun message envoyé dans le chat)
                ws.send("PASS SCHMOOPIIE")
                ws.send(f"NICK justinfan{np.random.randint(10000, 99999)}")
                ws.send(f"JOIN #{login}")
                log(self.ch, "chat Twitch connecté")
                while not self.stop_flag:
                    for line in ws.recv().split("\r\n"):
                        if line.startswith("PING"):
                            ws.send("PONG :tmi.twitch.tv")
                        elif " PRIVMSG #" in line:
                            self.add(time.time(), line.split(" :", 2)[-1] if line.startswith(":") else line.split(" :", 1)[-1])
            except Exception as e:
                log(self.ch, f"chat Twitch coupé ({e}), reconnexion…")
                time.sleep(5)

    def youtube(self):
        # yt-dlp écrit le chat au fil de l'eau (une action JSON par ligne) ; on lit le fichier en continu
        base = os.path.join(os.path.dirname(self.file.name), "ytchat")
        while not self.stop_flag:
            proc = subprocess.Popen(ytdlp_base() + ["--skip-download", "--write-subs", "--sub-langs", "live_chat", "-o", base, self.url],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            log(self.ch, "chat YouTube connecté")
            pos = {}
            while proc.poll() is None and not self.stop_flag:
                for f in glob.glob(base + "*.live_chat.json*"):
                    with open(f, errors="ignore") as fh:
                        fh.seek(pos.get(f, 0))
                        for line in fh:
                            for text in re.findall(r'"text": "((?:[^"\\]|\\.)*)"', line)[:3]:
                                self.add(time.time(), json.loads('"' + text + '"'))
                        pos[f] = fh.tell()
                time.sleep(2)
            time.sleep(10)


# ------------------------------------------------------------------ analyse
def segment_audio_rms(path):
    """Volume (RMS) toutes les 0,5 s d'un segment."""
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
                       capture_output=True)
    x = np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32) / 32768
    win = 4000
    return [float(np.sqrt(np.mean(x[i:i + win] ** 2))) for i in range(0, max(0, len(x) - win + 1), win)]


class Analyzer:
    def __init__(self, ch, out, segdir, chat, threshold, buffer_min):
        self.ch, self.out, self.segdir, self.chat = ch, out, segdir, chat
        self.threshold, self.buffer_s = threshold, buffer_min * 60
        self.audio = {}            # seconde unix → rms
        self.done_segs = set()
        self.last_moment = 0
        self.pending = []          # moments en attente de leurs segments « après »
        os.makedirs(os.path.join(out, "clips"), exist_ok=True)

    def segments(self):
        segs = []
        for f in glob.glob(os.path.join(self.segdir, "seg_*.ts")):
            try:
                segs.append((int(os.path.basename(f)[4:-3]), f))
            except ValueError:
                pass
        return sorted(segs)

    def update_audio(self):
        segs = self.segments()
        for i, (t0, f) in enumerate(segs[:-1]):  # le dernier est en cours d'écriture
            if f in self.done_segs:
                continue
            for k, v in enumerate(segment_audio_rms(f)):
                self.audio[t0 + k * 0.5] = v
            self.done_segs.add(f)

    def score_at(self, now):
        """Score de l'instant ~ now-10 s (le chat réagit avec 2 à 10 s de retard)."""
        msgs = [m for m in self.chat.msgs if m[0] > now - 600]
        if len(msgs) < 30:
            return None
        bins = collections.Counter(int(t // 5) for t, _ in msgs)
        first = max(now - 600, msgs[0][0])  # au démarrage, pas de faux « historique vide »
        hist = [bins.get(b, 0) for b in range(int(first // 5) + 1, int((now - 25) // 5))]
        if len(hist) < 12:  # au moins 1 minute de référence
            return None
        med, mad = np.median(hist), np.median(np.abs(np.array(hist) - np.median(hist))) + 1
        win = [m for m in msgs if now - 15 <= m[0] <= now]
        rate = len(win) / 3  # messages par tranche de 5 s
        rate_z = (rate - med) / (1.4826 * mad)
        react = sum(w for _, text in win for rx, w in REACT_RX if rx.search(text))
        react_ratio = react / max(1, len(win))
        # audio : pic par rapport au bruit de fond des 10 dernières minutes, autour de l'événement (now-25 → now-8)
        aud = [v for t, v in self.audio.items() if t > now - 600]
        ev = [v for t, v in self.audio.items() if now - 25 <= t <= now - 8]
        audio_z = 0.0
        if len(aud) > 60 and ev:
            base, spread = np.median(aud), np.percentile(aud, 90) - np.median(aud) + 1e-4
            audio_z = (np.percentile(ev, 90) - base) / spread
        score = 0.55 * max(0, rate_z) + 2.5 * react_ratio + 0.6 * max(0, audio_z)
        reasons = {"chat_z": round(rate_z, 1), "reactions_par_msg": round(react_ratio, 2), "audio_z": round(audio_z, 1),
                   "msgs_15s": len(win)}
        return score, reasons, [t for _, t in win][-12:]

    def tick(self, now):
        self.update_audio()
        r = self.score_at(now)
        if r:
            score, reasons, sample = r
            rec = {"t": round(now - 10, 1), "time": time.strftime("%H:%M:%S", time.localtime(now - 10)), "score": round(score, 2), **reasons}
            with open(os.path.join(self.out, "moments.jsonl"), "a") as f:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            if score >= self.threshold and now - self.last_moment > 45:
                self.last_moment = now
                rec["chat"] = sample
                self.pending.append(rec)
                log(self.ch, f"⚡ moment fort à {rec['time']} (score {score:.1f}, {reasons})")
        self.flush_pending(now)
        self.cleanup(now)

    def flush_pending(self, now):
        for m in list(self.pending):
            if now < m["t"] + 25:  # attendre que les segments « après » existent
                continue
            self.extract(m)
            self.pending.remove(m)

    def extract(self, m, before=35, after=15):
        start, end = m["t"] - before, m["t"] + after
        segs = [(t0, f) for t0, f in self.segments() if t0 + 12 > start and t0 < end]
        if not segs:
            return
        lst = os.path.join(self.out, "concat.txt")
        open(lst, "w").write("".join(f"file '{os.path.abspath(f)}'\n" for _, f in segs))
        name = f"{self.ch}_{time.strftime('%Y%m%d-%H%M%S', time.localtime(m['t']))}"
        out = os.path.join(self.out, "clips", name + ".mp4")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                        "-ss", str(max(0, start - segs[0][0])), "-t", str(end - start),
                        "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-c:a", "aac", "-b:a", "160k", out])
        json.dump({**m, "channel": self.ch, "clip": out, "event_offset_s": before}, open(out[:-4] + ".json", "w"), ensure_ascii=False, indent=1)
        log(self.ch, f"✂ clip → {out}")

    def cleanup(self, now):
        keep_after = min([m["t"] - 60 for m in self.pending], default=now)
        for t0, f in self.segments():
            if t0 < now - self.buffer_s and t0 < keep_after:
                os.remove(f)
                self.done_segs.discard(f)
        for t in [t for t in self.audio if t < now - 900]:
            del self.audio[t]


# ------------------------------------------------------------------ chaîne
def watch(chan, args, deadline):
    ch, url = chan["name"], chan["url"]
    out = os.path.join(args.out, ch)
    segdir = os.path.join(out, "segments")
    os.makedirs(out, exist_ok=True)
    rec = chat = an = None
    while time.time() < deadline:
        if rec is None or not rec.alive():
            try:
                live, err = is_live(url)
            except subprocess.TimeoutExpired:
                live, err = False, ["délai dépassé"]
            if not live:
                if rec is not None:
                    log(ch, "live terminé ou coupé")
                    rec = None
                log(ch, "hors ligne" + (f" ({err[0][:100]})" if err else "") + f", nouvel essai dans {args.poll} s")
                time.sleep(args.poll)
                continue
            rec = Recorder(ch, url, segdir)
            if not rec.start():
                rec = None
                time.sleep(args.poll)
                continue
            if chat is None:
                chat = Chat(ch, url, out)
                chat.start()
                an = Analyzer(ch, out, segdir, chat, args.threshold, args.buffer_min)
        time.sleep(10)
        try:
            an.tick(time.time())
        except Exception as e:
            log(ch, f"analyse : {e}")
    if rec:
        rec.stop()
    if chat:
        chat.stop_flag = True
    log(ch, "fin de la surveillance")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--channels", default=os.path.join(HERE, "channels.json"))
    ap.add_argument("--out", default=os.path.join(os.path.dirname(HERE), "work", "live"))
    ap.add_argument("--buffer-min", type=float, default=90)
    ap.add_argument("--poll", type=int, default=120)
    ap.add_argument("--hours", type=float, default=6)
    ap.add_argument("--threshold", type=float, default=3.0)
    ap.add_argument("--only", help="nom d'une seule chaîne")
    args = ap.parse_args()
    chans = [c for c in json.load(open(args.channels)) if c.get("enabled", True) and (not args.only or c["name"] == args.only)]
    deadline = time.time() + args.hours * 3600
    threads = [threading.Thread(target=watch, args=(c, args, deadline), daemon=True) for c in chans]
    for t in threads:
        t.start()
    for t in threads:
        t.join()


if __name__ == "__main__":
    main()
