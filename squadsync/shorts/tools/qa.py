#!/usr/bin/env python3
"""Contrôle qualité d'un ou plusieurs shorts avant livraison.

    python3 shorts/tools/qa.py shorts/out/<job>/short_01.mp4 [...]      # ou un dossier

Pour chaque vidéo : planche de 8 images (<nom>_sheet.png à côté de la vidéo), et vérifications :
  - format 1080x1920, 30 fps, durée 8-90 s
  - volume intégré -14 LUFS ±1,5 et crête < -1 dBTP
  - images noires ou figées > 0,5 s
  - silences > 1,2 s (perte de rythme)
Imprime un rapport et sort en erreur si un point bloquant échoue. La planche doit être regardée :
visage dans le cadre, sous-titres hors des zones d'interface TikTok/Reels (bandeau bas 18 %, colonne droite 12 %),
textes lisibles, rien de coupé.
"""
import json
import os
import re
import subprocess
import sys


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def check(path):
    issues, notes = [], []
    pr = json.loads(run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration",
                         "-of", "json", path]).stdout)
    v = next(s for s in pr["streams"] if s["codec_type"] == "video")
    dur = float(pr["format"]["duration"])
    fps = eval(v["r_frame_rate"])
    if (v["width"], v["height"]) != (1080, 1920):
        issues.append(f"format {v['width']}x{v['height']} (attendu 1080x1920)")
    if abs(fps - 30) > 0.5:
        notes.append(f"{fps:.0f} fps")
    if not 8 <= dur <= 90:
        issues.append(f"durée {dur:.1f} s hors 8-90 s")
    if not any(s["codec_type"] == "audio" for s in pr["streams"]):
        issues.append("pas de piste audio")

    e = run(["ffmpeg", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    lufs = re.findall(r"I:\s+(-?[\d.]+) LUFS", e)
    peak = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", e)
    if lufs:
        L = float(lufs[-1])
        (issues if abs(L + 14) > 1.5 else notes).append(f"volume {L:.1f} LUFS")
    if peak and float(peak[-1]) > -1.0:
        issues.append(f"crête {float(peak[-1]):.1f} dBTP (saturation possible)")

    d = run(["ffmpeg", "-nostats", "-i", path, "-vf", "blackdetect=d=0.5:pix_th=0.08,freezedetect=n=-55dB:d=0.6",
             "-af", "silencedetect=n=-40dB:d=1.2", "-f", "null", "-"]).stderr
    for kind, rx in [("image noire", r"black_start:([\d.]+)"), ("image figée", r"freeze_start: ([\d.]+)"),
                     ("silence", r"silence_start: ([\d.]+)")]:
        for t in re.findall(rx, d):
            issues.append(f"{kind} à {float(t):.1f} s")

    sheet = os.path.splitext(path)[0] + "_sheet.png"
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, "-vf",
         f"fps=8/{max(dur, 1):.2f},scale=270:-1,tile=8x1", "-frames:v", "1", sheet])
    return dur, issues, notes, sheet


def main():
    paths = []
    for p in sys.argv[1:]:
        if os.path.isdir(p):
            paths += sorted(os.path.join(p, f) for f in os.listdir(p) if f.endswith(".mp4"))
        else:
            paths.append(p)
    bad = 0
    for p in paths:
        dur, issues, notes, sheet = check(p)
        status = "✗" if issues else "✓"
        bad += bool(issues)
        print(f"{status} {os.path.basename(p)} ({dur:.1f} s) {' · '.join(notes)}")
        for i in issues:
            print(f"    - {i}")
        print(f"    planche : {sheet}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
