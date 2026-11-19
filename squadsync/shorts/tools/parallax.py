#!/usr/bin/env python3
"""Effet 2.5D : transforme une image fixe en plan vidéo avec mouvement de caméra en relief.

    python3 shorts/tools/parallax.py image.png out.mp4 [--dur 3.5] [--move push|pan-left|pan-right|rise|orbit]
                                      [--strength 1.0] [--w 1080 --h 1920] [--fps 30]

La profondeur est estimée par Depth Anything V2 (modèle « small », sur CPU, ~2 s par image) ;
les pixels proches bougent plus que le fond, ce qui donne l'illusion de relief. L'image est d'abord
recadrée en « cover » sur le format de sortie, avec une marge pour le mouvement.
"""
import argparse
import os
import subprocess
import sys

import cv2
import numpy as np

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")


def depth_map(img_rgb):
    from PIL import Image
    from transformers import pipeline
    pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device="cpu")
    d = np.array(pipe(Image.fromarray(img_rgb))["depth"]).astype(np.float32)
    d = cv2.resize(d, (img_rgb.shape[1], img_rgb.shape[0]), interpolation=cv2.INTER_CUBIC)
    d = (d - d.min()) / max(1e-6, d.max() - d.min())  # 1 = proche
    # lisse les bords de profondeur pour éviter les déchirures
    return cv2.GaussianBlur(d, (0, 0), sigmaX=max(2, img_rgb.shape[1] / 300))


def cover(img, w, h, margin):
    W, H = int(w * margin), int(h * margin)
    ih, iw = img.shape[:2]
    s = max(W / iw, H / ih)
    img = cv2.resize(img, (int(iw * s + 0.5), int(ih * s + 0.5)), interpolation=cv2.INTER_LANCZOS4)
    y0, x0 = (img.shape[0] - H) // 2, (img.shape[1] - W) // 2
    return img[y0:y0 + H, x0:x0 + W]


def ease(x):
    return x * x * (3 - 2 * x)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("out")
    ap.add_argument("--dur", type=float, default=3.5)
    ap.add_argument("--move", default="push")
    ap.add_argument("--strength", type=float, default=1.0)
    ap.add_argument("--w", type=int, default=1080)
    ap.add_argument("--h", type=int, default=1920)
    ap.add_argument("--fps", type=int, default=30)
    a = ap.parse_args()

    bgr = cv2.imread(a.image)
    if bgr is None:
        sys.exit(f"image illisible : {a.image}")
    margin = 1.18
    big = cover(bgr, a.w, a.h, margin)
    depth = depth_map(cv2.cvtColor(big, cv2.COLOR_BGR2RGB))
    H, W = big.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    cx, cy = W / 2, H / 2
    n = int(a.dur * a.fps)
    amp = 0.045 * a.strength * W  # amplitude max du décalage des plans proches

    ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24",
                           "-s", f"{a.w}x{a.h}", "-r", str(a.fps), "-i", "-", "-c:v", "libx264", "-crf", "16",
                           "-preset", "medium", "-pix_fmt", "yuv420p", a.out], stdin=subprocess.PIPE)
    for i in range(n):
        p = ease(i / max(1, n - 1))
        if a.move == "push":       # la caméra avance : les plans proches grossissent plus vite
            z = 1 + 0.06 * p + 0.10 * p * depth
            mx = cx + (xs - cx) / z
            my = cy + (ys - cy) / z
        elif a.move in ("pan-left", "pan-right"):
            sgn = -1 if a.move == "pan-left" else 1
            off = sgn * (p - 0.5) * amp * (0.35 + depth)
            mx, my = xs - off, ys
        elif a.move == "rise":      # la caméra monte
            off = (p - 0.5) * amp * (0.35 + depth)
            mx, my = xs, ys + off
        else:                        # orbit : léger mouvement circulaire
            ang = p * np.pi
            mx = xs - np.cos(ang) * amp * 0.6 * depth
            my = ys - np.sin(ang) * amp * 0.4 * depth
        frame = cv2.remap(big, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        # recadre au centre (la marge absorbe le mouvement)
        y0, x0 = (H - a.h) // 2, (W - a.w) // 2
        ff.stdin.write(frame[y0:y0 + a.h, x0:x0 + a.w].tobytes())
    ff.stdin.close()
    ff.wait()
    print("✓", a.out)


if __name__ == "__main__":
    main()
