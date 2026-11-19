#!/usr/bin/env python3
"""Bibliothèques son du monteur : bruitages classés par catégorie + musiques indexées par ambiance.

    python3 shorts/tools/library.py import-sfx <dossier|zip> [...]     # ex. un pack Sonniss GDC, Epidemic SFX, Artlist SFX
    python3 shorts/tools/library.py fetch-freesound [--per 6]           # remplit les catégories depuis Freesound (CC0 / CC-BY)
    python3 shorts/tools/library.py import-music <dossier|zip> [...] [--moods "epic dark"]
    python3 shorts/tools/library.py status

Rangement : shorts/library/sfx/<catégorie>/*.wav  et  shorts/library/music/*.mp3 + index.json
Catégories de bruitages utilisées par le moteur : whoosh, pop, boom, riser, glitch, click, ding (+ ambience, transition).
Les fichiers audio ne sont pas commités par défaut (licences, taille) : voir le SKILL sound-design pour les conserver.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import zipfile

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(HERE, "library")
AUDIO_EXT = (".wav", ".mp3", ".flac", ".ogg", ".aif", ".aiff", ".m4a")

# mots-clés (anglais + français) → catégorie ; l'ordre compte (le premier qui correspond gagne)
RULES = [
    ("riser", r"riser|rise|build.?up|uplifter|tension|reverse|montée"),
    ("glitch", r"glitch|digital.?error|bitcrush|stutter|static|distort|data"),
    ("boom", r"impact|boom|hit|slam|thud|punch|braam|explosion|cinematic.?hit|sub.?drop|drop"),
    ("whoosh", r"whoosh|swoosh|swish|woosh|swipe|pass.?by|fly.?by|transition|wind.?pass"),
    ("ding", r"ding|bell|chime|notif|sparkle|success|coin|magic|shine"),
    ("pop", r"pop|bubble|bloop|blip|plop|cartoon|boing"),
    ("click", r"click|tick|tap|button|ui|interface|keyboard|typing|camera.?shutter|shutter"),
    ("ambience", r"ambien|room.?tone|crowd|city|rain|forest|ocean|wind"),
]


def classify(path):
    name = os.path.basename(path).lower() + " " + os.path.basename(os.path.dirname(path)).lower()
    for cat, rx in RULES:
        if re.search(rx, name):
            return cat
    return None


def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0


def iter_audio(src):
    if zipfile.is_zipfile(src):
        tmp = tempfile.mkdtemp()
        zipfile.ZipFile(src).extractall(tmp)
        src = tmp
    if os.path.isfile(src):
        yield src
        return
    for root, _, files in os.walk(src):
        for f in files:
            if f.lower().endswith(AUDIO_EXT):
                yield os.path.join(root, f)


def norm_copy(src, dst, max_len):
    # wav 44,1 kHz stéréo, silence de début retiré, longueur bornée, crête normalisée
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-t", str(max_len), "-af",
                    "silenceremove=start_periods=1:start_threshold=-50dB,loudnorm=I=-16:TP=-1",
                    "-ar", "44100", "-ac", "2", dst], check=True)


def import_sfx(srcs):
    n = 0
    maxlen = {"ambience": 20, "riser": 6}
    for s in srcs:
        for f in iter_audio(s):
            cat = classify(f)
            d = duration(f)
            if not cat or d <= 0 or (cat not in ("ambience", "riser") and d > 4):
                continue
            os.makedirs(os.path.join(LIB, "sfx", cat), exist_ok=True)
            base = re.sub(r"[^\w-]+", "_", os.path.splitext(os.path.basename(f))[0])[:60]
            dst = os.path.join(LIB, "sfx", cat, base + ".wav")
            if not os.path.exists(dst):
                norm_copy(f, dst, maxlen.get(cat, 4))
                n += 1
    print(f"{n} bruitages importés")
    status()


FREESOUND_QUERIES = {
    "whoosh": ["whoosh transition", "swoosh fast"], "pop": ["pop bubble ui", "cartoon pop"],
    "boom": ["cinematic impact", "sub drop boom"], "riser": ["riser transition", "tension riser"],
    "glitch": ["glitch transition"], "click": ["ui click soft"], "ding": ["notification ding", "sparkle chime"],
}


def fetch_freesound(per):
    credits = []
    for cat, queries in FREESOUND_QUERIES.items():
        os.makedirs(os.path.join(LIB, "sfx", cat), exist_ok=True)
        got = 0
        for q in queries:
            url = "https://freesound.org/apiv2/search/text/?" + urllib.parse.urlencode({
                "query": q, "filter": 'duration:[0.1 TO 4] license:("Creative Commons 0" OR "Attribution")',
                "sort": "rating_desc", "page_size": per, "fields": "id,name,username,license,previews,url"})
            # Le jeton Freesound est injecté par le proxy de l'environnement.
            try:
                res = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "shorts/1.0"}), timeout=30))
            except Exception as e:
                sys.exit(f"Freesound inaccessible ({e}). Vérifie la clé Freesound dans les Network secrets de l'environnement.")
            for r in res.get("results", []):
                if got >= per:
                    break
                tmp = os.path.join(tempfile.gettempdir(), f"fs_{r['id']}.mp3")
                urllib.request.urlretrieve(r["previews"]["preview-hq-mp3"], tmp)
                base = re.sub(r"[^\w-]+", "_", r["name"])[:50]
                norm_copy(tmp, os.path.join(LIB, "sfx", cat, f"fs{r['id']}_{base}.wav"), 6 if cat == "riser" else 4)
                credits.append({"file": f"sfx/{cat}/fs{r['id']}_{base}.wav", "author": r["username"], "license": r["license"], "url": r["url"]})
                got += 1
        print(f"  {cat}: {got}")
    cp = os.path.join(LIB, "credits.json")
    old = json.load(open(cp)) if os.path.exists(cp) else []
    json.dump(old + credits, open(cp, "w"), indent=1, ensure_ascii=False)
    print("Crédits (CC-BY à citer en description) →", cp)


def analyze_music(path):
    import librosa
    import numpy as np
    y, sr = librosa.load(path, sr=22050, mono=True, duration=90)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(np.atleast_1d(tempo)[0])
    rms = librosa.feature.rms(y=y)[0]
    energy = float(np.mean(rms))
    dyn = float(np.percentile(rms, 95) / max(1e-6, np.percentile(rms, 20)))
    bright = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    moods = []
    if tempo >= 118 and energy > 0.08:
        moods += ["energetic", "upbeat", "hype"]
    if tempo < 95 and energy < 0.08:
        moods += ["calm", "chill", "emotional"]
    if dyn > 4 and bright < 1800:
        moods += ["epic", "cinematic", "dramatic"]
    if bright < 1500:
        moods += ["dark", "mysterious"]
    if bright > 2600 and tempo >= 100:
        moods += ["happy", "fun"]
    if not moods:
        moods = ["neutral", "background"]
    return {"bpm": round(tempo), "energy": round(energy, 3), "dynamics": round(dyn, 1), "brightness": round(bright), "moods": moods}


def import_music(srcs, extra_moods):
    os.makedirs(os.path.join(LIB, "music"), exist_ok=True)
    ip = os.path.join(LIB, "music", "index.json")
    index = json.load(open(ip)) if os.path.exists(ip) else []
    known = {t["file"] for t in index}
    for s in srcs:
        for f in iter_audio(s):
            name = re.sub(r"[^\w.-]+", "_", os.path.basename(f))
            if name in known:
                continue
            shutil.copy(f, os.path.join(LIB, "music", name))
            meta = analyze_music(os.path.join(LIB, "music", name))
            # les noms de fichiers Epidemic/Artlist contiennent souvent genre/ambiance : on les garde comme tags
            words = set(re.findall(r"[a-z]{4,}", name.lower()))
            meta["moods"] = sorted(set(meta["moods"]) | set(extra_moods) | (words & MOOD_WORDS))
            index.append({"file": name, **meta})
            print(f"  {name}: {meta['bpm']} BPM, {', '.join(meta['moods'])}")
    json.dump(index, open(ip, "w"), indent=1, ensure_ascii=False)
    print(f"{len(index)} musiques indexées → {ip}")


MOOD_WORDS = {"epic", "cinematic", "dramatic", "dark", "chill", "calm", "happy", "sad", "emotional", "upbeat", "energetic",
              "hype", "funny", "fun", "lofi", "trap", "drill", "phonk", "house", "piano", "ambient", "inspiring",
              "motivational", "suspense", "mysterious", "romantic", "corporate", "gaming", "rock", "hiphop"}


def status():
    sfx = os.path.join(LIB, "sfx")
    if os.path.isdir(sfx):
        for cat in sorted(os.listdir(sfx)):
            print(f"  sfx/{cat}: {len(os.listdir(os.path.join(sfx, cat)))}")
    ip = os.path.join(LIB, "music", "index.json")
    print(f"  musiques indexées : {len(json.load(open(ip))) if os.path.exists(ip) else 0}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["import-sfx", "fetch-freesound", "import-music", "status"])
    ap.add_argument("paths", nargs="*")
    ap.add_argument("--per", type=int, default=6)
    ap.add_argument("--moods", default="")
    a = ap.parse_args()
    if a.cmd == "import-sfx":
        import_sfx(a.paths)
    elif a.cmd == "fetch-freesound":
        fetch_freesound(a.per)
    elif a.cmd == "import-music":
        import_music(a.paths, a.moods.split())
    else:
        status()


if __name__ == "__main__":
    main()
