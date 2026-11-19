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


def beats_of(path):
    import librosa
    y, sr = librosa.load(path, sr=22050, mono=True, duration=240)
    tempo, frames = librosa.beat.beat_track(y=y, sr=sr)
    return float(np.atleast_1d(tempo)[0]), librosa.frames_to_time(frames, sr=sr).tolist()


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
        layout = clip.get("layout", layout)

        # Zooms : jump-cuts toutes les ~2,5-4 s (sur les coupures de phrase), punch sur les mots forts
        jumps, last, lvl = [], 0.0, 1.0
        for c in chunks:
            if c["s"] - last > rnd.uniform(2.5, 4.0):
                lvl = 1.12 if lvl == 1.0 else 1.0
                jumps.append({"t": round(c["s"], 2), "scale": lvl})
                last = c["s"]
        zooms = [{"t": w["s"], "amount": 0.16 if w["boom"] else 0.09} for w in words if w["emph"]]
        booms = [w["s"] for w in words if w["boom"]]

        # Bruitages
        sfx = [{"file": "sfx/ding.wav", "at": 0.05, "vol": 0.5}]
        for w in words:
            if w["boom"]:
                sfx.append({"file": "sfx/boom.wav", "at": max(0, w["s"] - 0.02), "vol": 0.75})
            elif w["emph"]:
                sfx.append({"file": "sfx/pop.wav", "at": w["s"], "vol": 0.45})
        for j in jumps:
            sfx.append({"file": "sfx/whoosh.wav", "at": max(0, j["t"] - 0.25), "vol": 0.22})

        # GIF
        gifs = []
        for i, g in enumerate(clip.get("gifs", [])):
            got = {"file": g["file"], "aspect": g.get("aspect", 1.33)} if g.get("file") else fetch_gif(g["query"], os.path.join(job, "gifs"), int(cid) * 10 + i)
            if got:
                gifs.append({**got, "at": g["at"], "dur": g.get("dur", 1.6), "rot": rnd.choice([-5, -3, 3, 5])})
                sfx.append({"file": "sfx/whoosh.wav", "at": max(0, g["at"] - 0.2), "vol": 0.35})

        # Musique (optionnelle) : volume bas sous la voix, jump-cuts calés sur les temps forts
        music = None
        mfile = clip.get("music", {}).get("file") if clip.get("music") else a.music
        if mfile:
            src = mfile if os.path.isabs(mfile) else os.path.join(job, mfile)
            os.makedirs(os.path.join(job, "music"), exist_ok=True)
            dst = os.path.join(job, "music", os.path.basename(src))
            if os.path.abspath(src) != dst:
                shutil.copy(src, dst)
            offset = (clip.get("music") or {}).get("offset", 0)
            tempo, beats = beats_of(dst)
            bars = [b - offset for b in beats[::4] if 0 < b - offset < dur]
            for j in jumps:  # aimante chaque saut de zoom sur la mesure la plus proche
                if bars:
                    j["t"] = round(min(bars, key=lambda b: abs(b - j["t"])), 2)
            music = {"file": "music/" + os.path.basename(dst), "offset": offset, "vol": (clip.get("music") or {}).get("vol", 0.1)}
            print(f"  musique {tempo:.0f} BPM, {len(bars)} mesures")

        props = {"src": "source.mp4", "start": start, "end": end, "duration": dur, "aspect": aspect,
                 "layout": layout, "focusY": round(focus_y, 3), "track": track, "zooms": zooms, "jumps": jumps,
                 "booms": booms, "chunks": chunks, "gifs": gifs, "sfx": sfx, "hook": clip.get("hook", ""), "music": music}
        pfile = os.path.join(job, f"props_{cid}.json")
        json.dump(props, open(pfile, "w"), ensure_ascii=False)
        print(f"  cadrage={layout} (visage {ratio:.0%}), {len(chunks)} sous-titres, {len(zooms)} punchs, {len(gifs)} GIF")
        if a.no_render:
            continue

        out = os.path.join(out_dir, f"short_{cid}.mp4")
        cmd = ["npx", "remotion", "render", "shorts/remotion/index.jsx", "Short", out, f"--props={pfile}",
               f"--public-dir={job}", f"--concurrency={a.concurrency}", "--crf=20", "--log=error"]
        chrome = os.environ.get("REMOTION_CHROME")
        if chrome:
            cmd.append(f"--browser-executable={chrome}")
        subprocess.run(cmd, cwd=APP, check=True)
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
