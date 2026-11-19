#!/usr/bin/env python3
"""Étape 3 : rend les shorts décrits dans <job>/plan.json.

    python3 shorts/build.py <dossier-job> [--only 01] [--music fichier.mp3] [--no-render]

plan.json (écrit après lecture de transcript.txt) :
{
  "clips": [
    {
      "id": "01",
      "start": 63.2, "end": 104.8,                # secondes dans la source
      "hook": "Il a tout perdu à 25 ans 😳",        # accroche affichée les 2,5 premières secondes
      "title": "…",                               # titre / description de publication
      "emphasis": ["jamais", "million"],          # mots forts : vert, zoom punch, son "pop"
      "booms": ["million"],                       # mots qui déclenchent aussi secousse + "boom"
      "gifs": [{"query": "mind blown", "at": 12.5, "dur": 1.6}],   # "at" relatif au début du clip
      "music": {"file": "music/track.mp3", "offset": 0, "vol": 0.1}  # optionnel
    }
  ]
}
"""
import argparse
import json
import math
import os
import random
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
SR = 44100


# ------------------------------------------------------------------ bruitages
def write_wav(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def synth_sfx(d):
    """Bruitages générés (aucun droit) ; remplacés par des fichiers du dossier sfx/ s'ils existent déjà."""
    os.makedirs(d, exist_ok=True)
    rng = np.random.default_rng(3)
    t = lambda dur: np.arange(int(dur * SR)) / SR

    def lowpass(x, a):
        y = np.zeros_like(x)
        acc = 0.0
        for i, v in enumerate(x):
            acc += a[i] * (v - acc) if hasattr(a, "__len__") else a * (v - acc)
            y[i] = acc
        return y

    sounds = {}
    # whoosh : bruit filtré dont la coupure monte puis descend
    tt = t(0.45)
    env = np.sin(np.pi * tt / 0.45) ** 2
    sounds["whoosh"] = lowpass(rng.uniform(-1, 1, len(tt)), 0.02 + 0.35 * env) * env * 1.6
    # pop : petit "bloop" pour les mots forts
    tt = t(0.12)
    f = 900 - 500 * tt / 0.12
    sounds["pop"] = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 38) * 0.8
    # boom : sub-bass qui descend + impact
    tt = t(0.9)
    f = 32 + 90 * np.exp(-tt * 18)
    sounds["boom"] = (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 4.5)
                      + rng.uniform(-1, 1, len(tt)) * np.exp(-tt * 40) * 0.3) * 0.95
    # ding : petite cloche pour l'accroche
    tt = t(0.6)
    sounds["ding"] = (np.sin(2 * np.pi * 1320 * tt) + 0.5 * np.sin(2 * np.pi * 2640 * tt)) * np.exp(-tt * 7) * 0.35
    for name, x in sounds.items():
        p = os.path.join(d, name + ".wav")
        if not os.path.exists(p):
            write_wav(p, x)


# ------------------------------------------------------------------ GIF (GIPHY)
def fetch_gif(query, dest_dir, idx):
    key = os.environ.get("GIPHY_API_KEY")
    if not key:
        print(f"  ! GIF « {query} » ignoré : GIPHY_API_KEY absent")
        return None
    url = "https://api.giphy.com/v1/gifs/search?" + urllib.parse.urlencode(
        {"api_key": key, "q": query, "limit": 5, "rating": "pg-13", "lang": "fr"})
    try:
        data = json.load(urllib.request.urlopen(url, timeout=20))["data"]
        if not data:
            return None
        img = data[0]["images"].get("downsized_medium") or data[0]["images"]["original"]
        os.makedirs(dest_dir, exist_ok=True)
        name = f"gif_{idx:02d}.gif"
        urllib.request.urlretrieve(img["url"], os.path.join(dest_dir, name))
        return {"file": "gifs/" + name, "aspect": int(img["width"]) / int(img["height"])}
    except Exception as e:  # réseau, quota…
        print(f"  ! GIF « {query} » non récupéré : {e}")
        return None


# ------------------------------------------------------------------ helpers
def norm(w):
    return re.sub(r"[^\w%€$]+", "", w.lower())


def clean_word(w):
    # pas de points ni virgules dans les sous-titres façon shorts ; on garde ! et ?
    w = re.sub(r"[.,;:…]+$", "", w.strip()).strip()
    return w.replace("'", "’")  # apostrophe typographique : rendu propre avec le contour épais


def build_chunks(words, emphasis):
    """Groupes de 1 à 3 mots (≤ 16 caractères), coupés sur la ponctuation et les silences."""
    chunks, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        text = " ".join(x["w"] for x in cur)
        brk = (nxt is None or len(cur) >= 3 or len(text) + len(nxt["w"]) > 16
               or re.search(r"[.!?:,]$", w["raw"]) or nxt["s"] - w["e"] > 0.35 or w["emph"] or (nxt and nxt["emph"]))
        if brk:
            chunks.append({"s": cur[0]["s"], "e": (nxt["s"] if nxt and nxt["s"] - w["e"] < 0.6 else w["e"] + 0.25),
                           "words": [{"w": x["w"], "s": x["s"], "emph": x["emph"]} for x in cur]})
            cur = []
    return chunks


def face_track(faces, scenes, start, end):
    pts = [f for f in faces if start - 0.3 <= f["t"] <= end + 0.3]
    found = [f for f in pts if f["x"] is not None]
    ratio = len(found) / max(1, len(pts))
    if not found:
        return [], ratio, 0.35
    # bouche les trous par la valeur connue la plus proche
    xs = []
    for f in pts:
        if f["x"] is not None:
            xs.append(f["x"])
        else:
            near = min(found, key=lambda g: abs(g["t"] - f["t"]))
            xs.append(near["x"])
    cuts = [s for s in scenes if start < s < end]
    track, ema = [], xs[0]
    for f, x in zip(pts, xs):
        is_cut = any(abs(f["t"] - c) < 0.13 for c in cuts)
        ema = x if is_cut else ema + 0.18 * (x - ema)  # lissage : pas de recadrage qui tremble
        track.append({"t": round(f["t"] - start, 2), "x": round(ema, 4), **({"cut": True} if is_cut else {})})
    focus_y = float(np.median([f["y"] for f in found]))
    return track, ratio, focus_y


def cam_box(faces, start, end):
    """Repère une webcam incrustée : petit visage stable dans un coin. Renvoie la zone normalisée {x,y,w,h} ou None."""
    pts = [f for f in faces if start <= f["t"] <= end and f["x"] is not None]
    allpts = [f for f in faces if start <= f["t"] <= end]
    if len(pts) < max(4, 0.4 * len(allpts)):
        return None
    xs, ys, sz = (np.array([f[k] for f in pts]) for k in ("x", "y", "size"))
    mx, my, ms = float(np.median(xs)), float(np.median(ys)), float(np.median(sz))
    corner = (mx < 0.33 or mx > 0.67) or (my > 0.6)
    stable = np.std(xs) < 0.05 and np.std(ys) < 0.05
    if not (ms < 0.12 and corner and stable):
        return None
    w = min(0.5, max(0.16, ms * 3.2))
    h = min(0.6, w * 16 / 9 * 0.75)  # webcam ~4:3 dans une image 16:9
    x = min(max(0, mx - w / 2), 1 - w)
    y = min(max(0, my - h * 0.45), 1 - h)
    return {"x": round(x, 4), "y": round(y, 4), "w": round(w, 4), "h": round(h, 4)}


def beats_of(path):
    import librosa
    y, sr = librosa.load(path, sr=22050, mono=True, duration=240)
    tempo, frames = librosa.beat.beat_track(y=y, sr=sr)
    return float(np.atleast_1d(tempo)[0]), librosa.frames_to_time(frames, sr=sr).tolist()



# ------------------------------------------------------------------ bibliothèques son
LIB = os.path.join(HERE, "library")


class SfxLib:
    """Choisit un bruitage par catégorie dans shorts/library/sfx/<catégorie>/ (varie d'un clip à l'autre) ;
    à défaut, utilise le son généré équivalent."""
    FALLBACK = {"whoosh": "whoosh", "pop": "pop", "boom": "boom", "ding": "ding", "riser": "whoosh", "glitch": "pop", "click": "pop"}

    def __init__(self, job, cid):
        self.job, self.rnd, self.n = job, random.Random("sfx" + cid), 0

    def pick(self, cat):
        d = os.path.join(LIB, "sfx", cat)
        files = sorted(f for f in os.listdir(d) if f.lower().endswith((".wav", ".mp3", ".ogg", ".flac"))) if os.path.isdir(d) else []
        if not files:
            return f"sfx/{self.FALLBACK.get(cat, 'pop')}.wav"
        f = self.rnd.choice(files)
        os.makedirs(os.path.join(self.job, "sfx", "lib"), exist_ok=True)
        dst = os.path.join(self.job, "sfx", "lib", f"{cat}_{f}")
        if not os.path.exists(dst):
            shutil.copy(os.path.join(d, f), dst)
        return os.path.relpath(dst, self.job)


def pick_music(mood, cid):
    idx_p = os.path.join(LIB, "music", "index.json")
    if not os.path.exists(idx_p):
        return None
    tracks = json.load(open(idx_p))
    mood = mood.lower()
    scored = sorted(tracks, key=lambda t: (-sum(m in t.get("moods", []) for m in mood.split()), t["file"]))
    best = [t for t in scored if sum(m in t.get("moods", []) for m in mood.split()) == sum(m in scored[0].get("moods", []) for m in mood.split())]
    return random.Random("m" + cid).choice(best)["file"] if best else None


def duck_curve(clip_file, dur, high, low):
    """Volume de la musique : bas quand quelqu'un parle, remonte dans les silences."""
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", clip_file, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
                       capture_output=True)
    x = np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32) / 32768
    if not len(x):
        return []
    win = 800  # 0,1 s
    rms = np.array([np.sqrt(np.mean(x[i:i + win] ** 2)) for i in range(0, len(x) - win, win)])
    thr = max(0.01, np.percentile(rms, 90) * 0.18)
    speech = rms > thr
    # garde la musique basse 0,4 s après la fin d'une phrase (pas de « pompage »)
    hold = np.convolve(speech.astype(float), np.ones(5), mode="full")[:len(speech)] > 0
    keys, v = [], low
    for i, sp in enumerate(hold[::2]):
        target = low if sp else high
        v += (target - v) * (0.6 if target < v else 0.25)
        keys.append([round(i * 0.2, 2), round(v, 3)])
    return keys


def noto_lottie(emoji, job):
    """Emoji animé Google Noto (Lottie). `emoji` : caractère (🔥) ou code (1f525)."""
    code = emoji if re.fullmatch(r"[0-9a-f_]+", emoji) else "_".join(f"{ord(c):x}" for c in emoji if ord(c) != 0xFE0F)
    d = os.path.join(job, "emoji")
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, code + ".json")
    if not os.path.exists(p):
        try:
            urllib.request.urlretrieve(f"https://fonts.gstatic.com/s/e/notoemoji/latest/{code}/lottie.json", p)
        except Exception as e:
            print(f"  ! emoji {emoji} indisponible : {e}")
            return None
    return json.load(open(p))


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("job")
    ap.add_argument("--only")
    ap.add_argument("--music")
    ap.add_argument("--no-render", action="store_true")
    ap.add_argument("--concurrency", default=str(max(1, (os.cpu_count() or 2) - 1)))
    a = ap.parse_args()
    job = os.path.abspath(a.job)

    info = json.load(open(os.path.join(job, "info.json")))
    tr = json.load(open(os.path.join(job, "transcript.json")))
    faces = json.load(open(os.path.join(job, "faces.json")))
    scenes = json.load(open(os.path.join(job, "scenes.json")))
    plan = json.load(open(os.path.join(job, "plan.json")))
    all_words = [w for s in tr["segments"] for w in s["words"]]
    aspect = info["width"] / info["height"]
    synth_sfx(os.path.join(job, "sfx"))
    shutil.copytree(os.path.join(HERE, "remotion", "fonts"), os.path.join(job, "fonts"), dirs_exist_ok=True)
    out_dir = os.path.join(APP, "shorts", "out", os.path.basename(job))
    os.makedirs(out_dir, exist_ok=True)

    for clip in plan["clips"]:
        if a.only and clip["id"] != a.only:
            continue
        cid, start, end = clip["id"], float(clip["start"]), float(clip["end"])
        dur = end - start
        rnd = random.Random(cid)
        emph = {norm(x) for x in clip.get("emphasis", [])}
        booms_w = {norm(x) for x in clip.get("booms", [])}
        print(f"\n▶ Clip {cid} ({start:.1f}s → {end:.1f}s, {dur:.1f}s)")

        words = []
        for w in all_words:
            if w["s"] >= start - 0.05 and w["e"] <= end + 0.1:
                n = norm(w["w"])
                words.append({"w": clean_word(w["w"]), "raw": w["w"], "s": round(w["s"] - start, 3),
                              "e": round(w["e"] - start, 3), "emph": n in emph or n in booms_w, "boom": n in booms_w})
        # Whisper coupe parfois « n'est » en « n » + « 'est » : on recolle
        merged = []
        for w in words:
            if merged and (w["w"].startswith(("’", "-")) or merged[-1]["raw"].strip().endswith(("'", "’"))):
                m = merged[-1]
                m.update(w=m["w"] + w["w"], raw=m["raw"] + w["raw"], e=w["e"], emph=m["emph"] or w["emph"], boom=m["boom"] or w["boom"])
            else:
                merged.append(w)
        words = merged
        chunks = build_chunks(words, emph)

        # Cadrage
        track, ratio, focus_y = face_track(faces, scenes, start, end)
        if aspect <= 9 / 16 + 0.05:
            layout = "full"
        elif ratio >= 0.45:
            layout = "crop"
        else:
            layout = "fit"
        # Stream (webcam dans un coin d'une image de jeu) → format « split » webcam en haut / jeu en bas
        cam = cam_box(faces, start, end)
        if layout != "full" and cam and "layout" not in clip:
            layout = "split"
        layout = clip.get("layout", layout)
        if layout == "split" and not cam:
            layout = "fit"

        # Zooms : jump-cuts toutes les ~2,5-4 s (sur les coupures de phrase), punch sur les mots forts
        jumps, last, lvl = [], 0.0, 1.0
        for c in chunks:
            if c["s"] - last > rnd.uniform(2.5, 4.0):
                lvl = 1.12 if lvl == 1.0 else 1.0
                jumps.append({"t": round(c["s"], 2), "scale": lvl})
                last = c["s"]
        zooms = [{"t": w["s"], "amount": 0.16 if w["boom"] else 0.09} for w in words if w["emph"]]
        booms = [w["s"] for w in words if w["boom"]]

        # Extrait étalonné du clip (le rendu Remotion lit ce fichier court : plus rapide et plus beau)
        look = clip.get("look", plan.get("look", "clean"))
        clip_file = os.path.join(job, "clips", f"clip_{cid}.mp4")
        os.makedirs(os.path.dirname(clip_file), exist_ok=True)
        if not os.path.exists(clip_file) or clip.get("regrade"):
            subprocess.run([sys.executable, os.path.join(HERE, "tools", "grade.py"), os.path.join(job, "source.mp4"), clip_file,
                            "--start", str(start), "--dur", str(dur), "--look", look], check=True)

        # Bruitages (banque shorts/library/sfx si présente, sinon sons générés)
        lib = SfxLib(job, cid)
        sfx = [{"file": lib.pick("ding"), "at": 0.05, "vol": 0.5}]
        for w in words:
            if w["boom"]:
                sfx.append({"file": lib.pick("boom"), "at": max(0, w["s"] - 0.02), "vol": 0.75})
            elif w["emph"]:
                sfx.append({"file": lib.pick("pop"), "at": w["s"], "vol": 0.45})
        for jmp in jumps:
            sfx.append({"file": lib.pick("whoosh"), "at": max(0, jmp["t"] - 0.25), "vol": 0.22})

        # GIF
        gifs = []
        for i, g in enumerate(clip.get("gifs", [])):
            got = {"file": g["file"], "aspect": g.get("aspect", 1.33)} if g.get("file") else fetch_gif(g["query"], os.path.join(job, "gifs"), int(cid) * 10 + i)
            if got:
                gifs.append({**got, "at": g["at"], "dur": g.get("dur", 1.6), "rot": rnd.choice([-5, -3, 3, 5])})
                sfx.append({"file": lib.pick("whoosh"), "at": max(0, g["at"] - 0.2), "vol": 0.35})

        # Titres cinétiques (optionnellement derrière le sujet, via détourage)
        titles = []
        for i, k in enumerate(clip.get("titles", [])):
            k = {"dur": 1.6, "style": "behind", **k}
            if k.get("behind"):
                fg = os.path.join(job, "mattes", f"{cid}_t{i}.webm")
                os.makedirs(os.path.dirname(fg), exist_ok=True)
                if not os.path.exists(fg):
                    subprocess.run([sys.executable, os.path.join(HERE, "tools", "matte.py"), clip_file, fg,
                                    "--start", str(k["at"]), "--dur", str(k["dur"])], check=True)
                k["fg"] = os.path.relpath(fg, job)
            titles.append(k)
            snd = {"slam": "boom", "stack": "boom", "neon": "glitch", "reveal": "riser"}.get(k["style"], "whoosh")
            sfx.append({"file": lib.pick(snd), "at": max(0, k["at"] - (0.35 if snd == "riser" else 0.02)), "vol": 0.55})

        # Plans de coupe (B-roll) avec transitions
        manifest_p = os.path.join(job, "broll", "manifest.json")
        manifest = json.load(open(manifest_p)) if os.path.exists(manifest_p) else {}
        broll, leaks = [], list(clip.get("leaks", []))
        for i, b in enumerate(clip.get("broll", [])):
            f = b.get("file") or manifest.get(b.get("name", ""), {}).get("file")
            if not f or not os.path.exists(os.path.join(job, f)):
                print(f"  ! B-roll « {b.get('name') or b.get('file')} » introuvable : génère-le avec tools/broll.py")
                continue
            item = {"file": f, "at": b["at"], "dur": b.get("dur", 2.5), "transIn": b.get("trans", "zoom"),
                    "transOut": b.get("transOut", b.get("trans", "zoom"))}
            if b.get("title"):
                item["title"] = {"style": "behind", "y": 0.42, **b["title"]}
                if b["title"].get("behind"):
                    fg = os.path.join(job, "mattes", f"{cid}_b{i}.webm")
                    os.makedirs(os.path.dirname(fg), exist_ok=True)
                    if not os.path.exists(fg):
                        subprocess.run([sys.executable, os.path.join(HERE, "tools", "matte.py"), os.path.join(job, f), fg,
                                        "--model", b["title"].get("matte_model", "isnet-general-use")], check=True)
                    item["fg"] = os.path.relpath(fg, job)
            broll.append(item)
            tsnd = {"glitch": "glitch", "whip": "whoosh", "zoom": "whoosh", "iris": "riser"}.get(item["transIn"], "whoosh")
            sfx.append({"file": lib.pick(tsnd), "at": max(0, b["at"] - 0.2), "vol": 0.45})
            sfx.append({"file": lib.pick("whoosh"), "at": b["at"] + item["dur"] - 0.25, "vol": 0.3})
            if item["transIn"] in ("zoom", "fade", "iris"):
                leaks.append(b["at"])

        # Emojis animés (Noto, Google, CC BY 4.0)
        emojis = []
        for e in clip.get("emojis", []):
            data = noto_lottie(e["emoji"], job)
            if data:
                emojis.append({**e, "data": data, "dur": e.get("dur", 1.4)})
                sfx.append({"file": lib.pick("pop"), "at": e["at"], "vol": 0.35})

        # Musique : fichier, ou choix par ambiance dans la bibliothèque ; baisse auto sous la voix
        music = None
        mspec = clip.get("music") or plan.get("music") or ({"file": a.music} if a.music else None)
        if mspec:
            mfile = mspec.get("file") or pick_music(mspec.get("mood", ""), cid)
            if mfile:
                src = mfile if os.path.isabs(mfile) else (os.path.join(job, mfile) if os.path.exists(os.path.join(job, mfile)) else os.path.join(LIB, "music", mfile))
                os.makedirs(os.path.join(job, "music"), exist_ok=True)
                dst = os.path.join(job, "music", os.path.basename(src))
                if os.path.abspath(src) != dst:
                    shutil.copy(src, dst)
                offset = mspec.get("offset", 0)
                tempo, beats = beats_of(dst)
                bars = [b - offset for b in beats[::4] if 0 < b - offset < dur]
                for jmp in jumps:
                    if bars:
                        jmp["t"] = round(min(bars, key=lambda b: abs(b - jmp["t"])), 2)
                music = {"file": "music/" + os.path.basename(dst), "offset": offset, "vol": mspec.get("vol", 0.16),
                         "duck": duck_curve(clip_file, dur, mspec.get("vol", 0.16), mspec.get("duck_to", 0.06))}
                print(f"  musique « {os.path.basename(dst)} » {tempo:.0f} BPM")
            else:
                print(f"  ! aucune musique trouvée pour l'ambiance « {mspec.get('mood')} »")

        props = {"src": os.path.relpath(clip_file, job), "start": 0, "end": dur, "duration": dur, "aspect": aspect,
                 "layout": layout, "focusY": round(focus_y, 3), "track": track, "zooms": zooms, "jumps": jumps,
                 "booms": booms, "chunks": chunks, "gifs": gifs, "sfx": sfx, "hook": clip.get("hook", ""), "music": music,
                 "titles": titles, "broll": broll, "emojis": emojis, "leaks": leaks,
                 "cam": cam, "camH": 0.42, "captionY": clip.get("caption_y", 0.36 if layout == "split" else 0.63),
                 "grain": clip.get("grain", plan.get("grain", 0.06)), "hideCaptionsOnBroll": clip.get("hide_captions_on_broll", False)}
        pfile = os.path.join(job, f"props_{cid}.json")
        json.dump(props, open(pfile, "w"), ensure_ascii=False)
        print(f"  cadrage={layout} (visage {ratio:.0%}), look={look}, {len(chunks)} sous-titres, {len(zooms)} punchs, "
              f"{len(titles)} titres, {len(broll)} B-roll, {len(gifs)} GIF, {len(emojis)} emojis")
        if a.no_render:
            continue

        raw = os.path.join(job, f"render_{cid}.mp4")
        out = os.path.join(out_dir, f"short_{cid}.mp4")
        cmd = ["npx", "remotion", "render", "shorts/remotion/index.jsx", "Short", raw, f"--props={pfile}",
               f"--public-dir={job}", f"--concurrency={a.concurrency}", "--crf=18", "--log=error"]
        chrome = os.environ.get("REMOTION_CHROME")
        if chrome:
            cmd.append(f"--browser-executable={chrome}")
        subprocess.run(cmd, cwd=APP, check=True)
        # Mastering : volume au standard des plateformes (-14 LUFS, crête -1,5 dB)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-c:v", "copy", "-af",
                        "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], check=True)
        os.remove(raw)
        print("  ✓", out)

    # Fichier récap des titres pour la publication
    with open(os.path.join(out_dir, "publication.md"), "w") as f:
        for clip in plan["clips"]:
            f.write(f"## short_{clip['id']}.mp4\n\n**Titre :** {clip.get('title', clip.get('hook', ''))}\n\n")
            if clip.get("description"):
                f.write(clip["description"] + "\n\n")
    print("\nTerminé →", out_dir)


if __name__ == "__main__":
    sys.exit(main())
