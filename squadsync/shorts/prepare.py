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
        extra = ["--js-runtimes", "node"]
        if os.environ.get("YTDLP_COOKIES"):  # YouTube exige parfois une session (« confirm you're not a bot »)
            extra += ["--cookies", os.environ["YTDLP_COOKIES"]]
        run(["yt-dlp", "--no-warnings", *extra, "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b",
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


def detect_faces(path, info, width, step=0.25):
    import cv2
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    cap = cv2.VideoCapture(path)
    t, samples = 0.0, []
    while t < info["duration"]:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, frame = cap.read()
        if not ok:
            break
        h, w = frame.shape[:2]
        small = cv2.resize(frame, (width, int(h * width / w)))
        gray = cv2.equalizeHist(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY))
        found = cascade.detectMultiScale(gray, 1.1, 5, minSize=(max(14, width // 40),) * 2)
        if len(found):
            x, y, fw, fh = max(found, key=lambda f: f[2] * f[3])
            hh = small.shape[0]
            samples.append({"t": round(t, 2), "x": round((x + fw / 2) / width, 4), "y": round((y + fh / 2) / hh, 4),
                            "size": round(fw / width, 4),
                            "all": [[round((a + c / 2) / width, 3), round((b + d / 2) / hh, 3), round(c / width, 3)] for a, b, c, d in found]})
        else:
            samples.append({"t": round(t, 2), "x": None})
        t += step
    return samples


def faces(path, job, info):
    samples = detect_faces(path, info, 640)
    ratio = sum(s["x"] is not None for s in samples) / max(1, len(samples))
    if ratio < 0.35 and info["width"] >= 1000:  # petits visages (webcam de stream) : 2e passe en haute résolution
        hi = detect_faces(path, info, min(1280, info["width"]))
        if sum(s["x"] is not None for s in hi) > ratio * len(samples):
            samples = hi
    json.dump(samples, open(os.path.join(job, "faces.json"), "w"))
    cam = facecam(path, samples, info)
    if cam:
        json.dump(cam, open(os.path.join(job, "facecam.json"), "w"))
        print("webcam incrustée détectée :", cam, flush=True)


def facecam(path, samples, info):
    """Repère le cadre d'une webcam incrustée (stream) grâce à ses bords, fixes d'une image à l'autre."""
    import cv2
    import numpy as np
    # visage le plus « immobile » : la case de 4 % la plus souvent occupée par un petit visage
    dets = [d for s in samples for d in s.get("all", [])]
    if len(dets) < 4:
        return None
    cells = {}
    for x, y, sz in dets:
        if sz < 0.12:
            cells.setdefault((int(x / 0.04), int(y / 0.04)), []).append((x, y, sz))
    if not cells:
        return None
    def in_corner(c):
        x, y = (c[0] + 0.5) * 0.04, (c[1] + 0.5) * 0.04
        return (x < 0.33 or x > 0.67) and (y < 0.4 or y > 0.6)
    corner_cells = [v for c, v in cells.items() if in_corner(c)]
    if not corner_cells:
        return None
    best_cell = max(corner_cells, key=len)
    if len(best_cell) < max(5, 0.03 * len(samples)):
        return None  # aucun visage ne revient assez souvent dans un coin
    mx, my = float(np.median([d[0] for d in best_cell])), float(np.median([d[1] for d in best_cell]))
    ms = float(np.median([d[2] for d in best_cell]))
    cap = cv2.VideoCapture(path)
    W, H = 960, int(960 * info["height"] / info["width"])
    acc_v, acc_h, n = np.zeros((H, W)), np.zeros((H, W)), 0
    for k in range(40):
        cap.set(cv2.CAP_PROP_POS_MSEC, info["duration"] * 1000 * (k + 0.5) / 40)
        ok, fr = cap.read()
        if not ok:
            continue
        g = cv2.cvtColor(cv2.resize(fr, (W, H)), cv2.COLOR_BGR2GRAY).astype(np.float32)
        acc_v += np.abs(cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)) > 40
        acc_h += np.abs(cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)) > 40
        n += 1
    if n < 10:
        return None
    acc_v, acc_h = acc_v / n, acc_h / n  # fraction d'images où le bord est présent (≈1 pour un cadre fixe)
    cx, cy, fs = int(mx * W), int(my * H), max(8, int(ms * W))
    r0, r1 = max(0, cy - 2 * fs), min(H, cy + 2 * fs)
    c0, c1 = max(0, cx - 2 * fs), min(W, cx + 2 * fs)

    def best(profile, lo, hi, default):
        if hi - lo < 3:
            return default
        seg = profile[lo:hi]
        i = int(np.argmax(seg))
        return lo + i if seg[i] > 0.6 else default

    left = best(acc_v[r0:r1].mean(0), max(0, cx - int(0.3 * W)), cx - fs, 0)
    right = best(acc_v[r0:r1].mean(0), cx + fs, min(W, cx + int(0.3 * W)), W)
    top = best(acc_h[:, c0:c1].mean(1), max(0, cy - int(0.35 * H)), cy - fs, 0)
    bottom = best(acc_h[:, c0:c1].mean(1), cy + fs, min(H, cy + int(0.35 * H)), H)
    box = {"x": left / W, "y": top / H, "w": (right - left) / W, "h": (bottom - top) / H}
    if not (0.08 < box["w"] < 0.6 and 0.08 < box["h"] < 0.7):
        return None
    return {k: round(v, 4) for k, v in box.items()}


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
