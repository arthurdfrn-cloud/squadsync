#!/usr/bin/env python3
"""Après (ou pendant) un live : prépare chaque clip découpé pour le montage et les classe.

    python3 shorts/live/prepare_clips.py shorts/work/live/<chaîne> [--top 10] [--min-score 3]

Pour chaque clip (meilleurs scores d'abord) : crée un job shorts/work/live/<chaîne>/jobs/<clip>/ avec
transcription mot à mot, visages, plans (via shorts/prepare.py), puis affiche un récapitulatif :
score, raisons, extraits du chat, et ce qui se dit autour du moment (event_offset_s ≈ 35 s dans le clip).
Ensuite : écrire plan.json dans chaque job retenu (skill live-clips) et lancer shorts/build.py.
"""
import argparse
import glob
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("chandir")
    ap.add_argument("--top", type=int, default=10)
    ap.add_argument("--min-score", type=float, default=0)
    ap.add_argument("--lang", default="fr")
    a = ap.parse_args()
    metas = []
    for j in glob.glob(os.path.join(a.chandir, "clips", "*.json")):
        m = json.load(open(j))
        if m["score"] >= a.min_score and os.path.exists(m["clip"]):
            metas.append(m)
    metas.sort(key=lambda m: -m["score"])
    for m in metas[: a.top]:
        name = os.path.splitext(os.path.basename(m["clip"]))[0]
        job = os.path.join(a.chandir, "jobs", name)
        if not os.path.exists(os.path.join(job, "transcript.txt")):
            subprocess.run([sys.executable, os.path.join(os.path.dirname(HERE), "prepare.py"), m["clip"], job, "--lang", a.lang],
                           check=True, stdout=subprocess.DEVNULL)
        print(f"\n=== {name}  score {m['score']}  (chat_z {m['chat_z']}, réactions/msg {m['reactions_par_msg']}, audio_z {m['audio_z']})")
        print("chat :", " | ".join(x[:40] for x in m.get("chat", [])[:8]))
        lines = open(os.path.join(job, "transcript.txt")).read().strip().splitlines()
        print("transcription (moment ≈ 00:35) :")
        for l in lines:
            print("   ", l)
        print("job :", job)


if __name__ == "__main__":
    main()
