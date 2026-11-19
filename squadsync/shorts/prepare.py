#!/usr/bin/env python3
"""Étape 1 : prépare une vidéo source pour en tirer des shorts.

    python3 shorts/prepare.py <url-ou-fichier> <dossier-job> [--model small] [--lang fr]

Produit dans <dossier-job> :
  source.mp4        la vidéo (téléchargée via yt-dlp si c'est une URL)
  info.json         largeur, hauteur, fps, durée
  transcript.json   transcription mot à mot (faster-whisper)
  transcript.txt    version lisible, une phrase par ligne avec horodatage → sert à choisir les clips
  faces.json        position horizontale du visage principal, 4 échantillons/seconde (recadrage 9:16)
  scenes.json       instants de changement de plan
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def fetch(src, job):
    out = os.path.join(job, "source.mp4")
    if os.path.exists(out):
        return out
    if re.match(r"^https?://", src):
        run(["yt-dlp", "--no-warnings", "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b",
             "--merge-output-format", "mp4", "-o", out, src])
    else:
        # ré-encode en mp4 H.264 si besoin, sinon copie simple
        if src.lower().endswith(".mp4"):
            shutil.copy(src, out)
        else:
            run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-c:v", "libx264", "-crf", "18", "-c:a", "aac", out])
    return out


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height,r_frame_rate:format=duration", "-of", "json", path],
                       capture_output=True, text=True, check=True)
    j = json.loads(r.stdout)
    s = j["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return {"width": s["width"], "height": s["height"], "fps": float(num) / float(den),
            "duration": float(j["format"]["duration"])}


def transcribe(path, job, model_name, lang):
    from faster_whisper import WhisperModel
    wav = os.path.join(job, "audio16k.wav")
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, "-ac", "1", "-ar", "16000", wav])
    import wave
    import numpy as np
    with wave.open(wav) as wf:  # on passe un tableau numpy : évite les soucis de version de PyAV
        audio = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segs, info = model.transcribe(audio, language=lang, word_timestamps=True, vad_filter=True)
    out = {"language": info.language, "segments": []}
    lines = []
    for s in segs:
        words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for w in (s.words or []) if w.word.strip()]
        out["segments"].append({"s": round(s.start, 2), "e": round(s.end, 2), "text": s.text.strip(), "words": words})
        lines.append(f"[{fmt(s.start)} → {fmt(s.end)}] {s.text.strip()}")
        print(lines[-1], flush=True)
    json.dump(out, open(os.path.join(job, "transcript.json"), "w"), ensure_ascii=False)
    open(os.path.join(job, "transcript.txt"), "w").write("\n".join(lines) + "\n")


def fmt(t):
    m, s = divmod(t, 60)
    return f"{int(m):02d}:{s:05.2f}"


def faces(path, job, info):
    import cv2
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    cap = cv2.VideoCapture(path)
    step = 0.25
    t = 0.0
    samples = []
    while t < info["duration"]:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, frame = cap.read()
        if not ok:
            break
        h, w = frame.shape[:2]
        scale = 480 / w
        small = cv2.resize(frame, (480, int(h * scale)))
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        found = cascade.detectMultiScale(gray, 1.15, 5, minSize=(28, 28))
        if len(found):
            x, y, fw, fh = max(found, key=lambda f: f[2] * f[3])
            samples.append({"t": round(t, 2), "x": round((x + fw / 2) / 480, 4), "y": round((y + fh / 2) / small.shape[0], 4),
                            "size": round(fw / 480, 4)})
        else:
            samples.append({"t": round(t, 2), "x": None})
        t += step
    json.dump(samples, open(os.path.join(job, "faces.json"), "w"))


def scenes(path, job):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-vf", "select='gt(scene,0.32)',showinfo", "-an", "-f", "null", "-"],
                       capture_output=True, text=True)
    ts = [round(float(m), 2) for m in re.findall(r"pts_time:([0-9.]+)", r.stderr)]
    json.dump(ts, open(os.path.join(job, "scenes.json"), "w"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("job")
    ap.add_argument("--model", default="small")
    ap.add_argument("--lang", default=None)
    a = ap.parse_args()
    os.makedirs(a.job, exist_ok=True)
    path = fetch(a.src, a.job)
    info = probe(path)
    json.dump(info, open(os.path.join(a.job, "info.json"), "w"))
    print("info:", info, flush=True)
    scenes(path, a.job)
    faces(path, a.job, info)
    transcribe(path, a.job, a.model, a.lang)
    print("OK →", a.job)


if __name__ == "__main__":
    sys.exit(main())
