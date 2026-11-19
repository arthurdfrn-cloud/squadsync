#!/usr/bin/env python3
"""Bibliothèque de styles : mesure le montage d'une vidéo de référence (sans la copier).

    python3 shorts/tools/style_extract.py <url|fichier> <nom-du-style>

Écrit shorts/styles/<nom>/analysis.json et sheet.png (1 image toutes les 0,5 s sur les 12 premières secondes,
puis 1/s). Ensuite, regarder la planche et rédiger shorts/styles/<nom>/style.md : les RÈGLES du style
(rythme de coupe, place et taille des textes, palette, types de transitions, densité de bruitages, ambiance musicale),
transposées en paramètres du moteur (look, styles de titres, transitions, fréquence des B-roll, emojis…).
La vidéo source n'est pas conservée.
"""
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    src, name = sys.argv[1], sys.argv[2]
    out = os.path.join(HERE, "styles", name)
    os.makedirs(out, exist_ok=True)
    tmp = tempfile.mkdtemp()
    video = src
    if re.match(r"^https?://", src):
        video = os.path.join(tmp, "ref.mp4")
        cmd = ["yt-dlp", "-q", "--no-warnings", "--js-runtimes", "node", "-f", "b[height<=1080]/bv*+ba", "--merge-output-format", "mp4", "-o", video, src]
        if os.environ.get("YTDLP_COOKIES"):
            cmd[1:1] = ["--cookies", os.environ["YTDLP_COOKIES"]]
        subprocess.run(cmd, check=True)

    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration",
                                    "-of", "json", video], capture_output=True, text=True).stdout)
    dur = float(pr["format"]["duration"])
    w, h = pr["streams"][0]["width"], pr["streams"][0]["height"]

    sc = subprocess.run(["ffmpeg", "-hide_banner", "-i", video, "-vf", "select='gt(scene,0.28)',showinfo", "-an", "-f", "null", "-"],
                        capture_output=True, text=True).stderr
    cuts = [round(float(t), 2) for t in re.findall(r"pts_time:([0-9.]+)", sc)]
    shots = [b - a for a, b in zip([0] + cuts, cuts + [dur])]

    e = subprocess.run(["ffmpeg", "-nostats", "-i", video, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    lufs = re.findall(r"I:\s+(-?[\d.]+) LUFS", e)

    bpm = None
    try:
        import librosa
        import numpy as np
        wav = os.path.join(tmp, "a.wav")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", video, "-ac", "1", "-ar", "22050", wav], check=True)
        y, sr = librosa.load(wav, sr=22050)
        bpm = round(float(np.atleast_1d(librosa.beat.beat_track(y=y, sr=sr)[0])[0]))
    except Exception:
        pass

    analysis = {
        "source": src if src.startswith("http") else os.path.basename(src),
        "duration": round(dur, 1), "format": f"{w}x{h}", "cuts": len(cuts),
        "cuts_per_10s": round(len(cuts) / dur * 10, 1),
        "avg_shot_s": round(sum(shots) / len(shots), 2) if shots else dur,
        "first_cut_s": cuts[0] if cuts else None, "loudness_lufs": float(lufs[-1]) if lufs else None,
        "music_bpm_estimate": bpm, "cut_times": cuts[:80],
    }
    json.dump(analysis, open(os.path.join(out, "analysis.json"), "w"), indent=1)
    sheet = os.path.join(out, "sheet.png")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", video, "-vf",
                    "select='if(lt(t,12),not(mod(n,15)),not(mod(n,30)))',scale=180:-1,tile=8x4", "-vsync", "vfr",
                    "-frames:v", "1", sheet])
    print(json.dumps(analysis, indent=1, ensure_ascii=False))
    print("planche →", sheet, "\nÀ faire : rédiger", os.path.join(out, "style.md"))


if __name__ == "__main__":
    main()
