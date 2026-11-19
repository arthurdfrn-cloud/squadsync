#!/usr/bin/env python3
"""Étalonnage et finition d'un extrait.

    python3 shorts/tools/grade.py in.mp4 out.mp4 [--start 63.2 --dur 41] [--look warm-film] [--sharpen 0.6]
    python3 shorts/tools/grade.py --make-luts          # (re)génère les LUT dans shorts/luts/

Looks (LUT .cube 33³ générées ici, libres de droits) :
  clean        contraste et saturation légèrement relevés, rendu « YouTube pro »
  warm-film    tons chauds, noirs relevés, couleurs douces (ambiance documentaire / ciné)
  teal-orange  ombres bleu-vert, peaux orangées (look blockbuster)
  cold-drama   froid, désaturé, contrasté (tension, sujets sérieux)
  vivid-pop    couleurs franches (lifestyle, gaming, humour)
  mono-punch   noir et blanc contrasté (citations fortes, moments graves)
"""
import argparse
import os
import subprocess
import sys

import numpy as np

LUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "luts")


def smoothstep(x):
    return x * x * (3 - 2 * x)


def look_fn(name):
    def luma(c):
        return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]

    def sat(c, k):
        y = luma(c)[..., None]
        return y + (c - y) * k

    def contrast(c, k):
        return 0.5 + (c - 0.5) * k

    def scurve(c, k):
        return c + k * (smoothstep(np.clip(c, 0, 1)) - c)

    def lift(c, k):  # relève les noirs
        return c * (1 - k) + k

    if name == "clean":
        return lambda c: sat(scurve(c, 0.35), 1.12)
    if name == "warm-film":
        return lambda c: lift(sat(scurve(c * np.array([1.06, 1.0, 0.9]), 0.4), 0.9), 0.04)
    if name == "teal-orange":
        def f(c):
            y = luma(c)[..., None]
            shadows = np.clip(1 - y * 2, 0, 1)
            highs = np.clip(y * 2 - 1, 0, 1)
            c = c + shadows * np.array([-0.05, 0.03, 0.07]) + highs * np.array([0.06, 0.02, -0.06])
            return sat(scurve(c, 0.45), 1.1)
        return f
    if name == "cold-drama":
        return lambda c: sat(contrast(scurve(c * np.array([0.93, 1.0, 1.08]), 0.5), 1.08), 0.72)
    if name == "vivid-pop":
        return lambda c: sat(scurve(c, 0.3), 1.35)
    if name == "mono-punch":
        return lambda c: np.repeat(scurve(contrast(luma(c), 1.25), 0.5)[..., None], 3, axis=-1)
    raise SystemExit(f"look inconnu : {name}")


LOOKS = ["clean", "warm-film", "teal-orange", "cold-drama", "vivid-pop", "mono-punch"]


def make_luts(size=33):
    os.makedirs(LUT_DIR, exist_ok=True)
    g = np.linspace(0, 1, size)
    b, gg, r = np.meshgrid(g, g, g, indexing="ij")  # ordre .cube : R varie le plus vite
    rgb = np.stack([r, gg, b], axis=-1).reshape(-1, 3)
    for name in LOOKS:
        out = np.clip(look_fn(name)(rgb), 0, 1)
        with open(os.path.join(LUT_DIR, name + ".cube"), "w") as f:
            f.write(f'TITLE "{name}"\nLUT_3D_SIZE {size}\n')
            for v in out:
                f.write(f"{v[0]:.5f} {v[1]:.5f} {v[2]:.5f}\n")
    print("LUT →", LUT_DIR)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", nargs="?")
    ap.add_argument("out", nargs="?")
    ap.add_argument("--start", type=float)
    ap.add_argument("--dur", type=float)
    ap.add_argument("--look", default="clean")
    ap.add_argument("--sharpen", type=float, default=0.5)
    ap.add_argument("--make-luts", action="store_true")
    a = ap.parse_args()
    if a.make_luts or not os.path.exists(os.path.join(LUT_DIR, "clean.cube")):
        make_luts()
    if not a.src:
        return
    vf = []
    if a.look != "none":
        vf.append(f"lut3d=file='{os.path.join(LUT_DIR, a.look + '.cube')}'")
    if a.sharpen > 0:
        vf.append(f"unsharp=5:5:{a.sharpen}:5:5:0")
    cmd = ["ffmpeg", "-loglevel", "error", "-y"]
    if a.start is not None:
        cmd += ["-ss", str(a.start)]
    cmd += ["-i", a.src]
    if a.dur is not None:
        cmd += ["-t", str(a.dur)]
    cmd += ["-vf", ",".join(vf) or "null", "-c:v", "libx264", "-crf", "16", "-preset", "fast",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", a.out]
    subprocess.run(cmd, check=True)
    print("✓", a.out)


if __name__ == "__main__":
    sys.exit(main())
