#!/usr/bin/env python3
"""Détourage du sujet (personne ou objet) pour l'effet « texte derrière le sujet ».

Vidéo :  python3 shorts/tools/matte.py in.mp4 fg.webm [--start 12.0 --dur 3.0] [--model u2net_human_seg]
Image :  python3 shorts/tools/matte.py in.png fg.png  [--model isnet-general-use]

Sortie vidéo : WebM VP9 avec transparence (lisible par Remotion avec <OffthreadVideo transparent />),
à la même taille que la source sur la plage demandée. Le masque est lissé dans le temps pour éviter
le scintillement. Modèles : u2net_human_seg (personnes, rapide), isnet-general-use (tout objet),
birefnet-portrait (contours fins, plus lent).
"""
import argparse
import os
import subprocess
import sys

import cv2
import numpy as np


def session(model):
    from rembg import new_session
    return new_session(model)


def mask_of(sess, bgr, work=512):
    from rembg import remove
    from PIL import Image
    h, w = bgr.shape[:2]
    s = work / max(h, w)
    small = cv2.resize(bgr, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)
    m = remove(Image.fromarray(cv2.cvtColor(small, cv2.COLOR_BGR2RGB)), session=sess, only_mask=True)
    m = cv2.resize(np.array(m), (w, h), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255
    return m


def refine(m):
    # bord doux, sans halo : légère érosion puis flou
    m = cv2.erode(m, np.ones((3, 3), np.uint8), iterations=1)
    return cv2.GaussianBlur(m, (0, 0), 1.6)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--start", type=float, default=0)
    ap.add_argument("--dur", type=float, default=None)
    ap.add_argument("--model", default=None)
    ap.add_argument("--fps", type=float, default=30)
    a = ap.parse_args()

    is_img = a.src.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
    sess = session(a.model or ("isnet-general-use" if is_img else "u2net_human_seg"))

    if is_img:
        bgr = cv2.imread(a.src)
        m = refine(mask_of(sess, bgr, 1024))
        rgba = np.dstack([bgr, (m * 255).astype(np.uint8)])
        cv2.imwrite(a.out, rgba)
        print("✓", a.out)
        return

    cap = cv2.VideoCapture(a.src)
    cap.set(cv2.CAP_PROP_POS_MSEC, a.start * 1000)
    src_fps = cap.get(cv2.CAP_PROP_FPS) or a.fps
    w, h = int(cap.get(3)), int(cap.get(4))
    n = int((a.dur or (cap.get(cv2.CAP_PROP_FRAME_COUNT) / src_fps - a.start)) * a.fps)
    ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgra",
                           "-s", f"{w}x{h}", "-r", str(a.fps), "-i", "-", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
                           "-b:v", "0", "-crf", "30", "-deadline", "realtime", "-cpu-used", "8", "-auto-alt-ref", "0", a.out],
                          stdin=subprocess.PIPE)
    prev = None
    for i in range(n):
        cap.set(cv2.CAP_PROP_POS_MSEC, (a.start + i / a.fps) * 1000)
        ok, bgr = cap.read()
        if not ok:
            break
        m = mask_of(sess, bgr)
        prev = m if prev is None else 0.55 * m + 0.45 * prev  # lissage temporel
        alpha = (refine(prev) * 255).astype(np.uint8)
        ff.stdin.write(np.dstack([bgr, alpha]).tobytes())
        if i % 30 == 0:
            print(f"  matte {i}/{n}", flush=True)
    ff.stdin.close()
    ff.wait()
    print("✓", a.out)


if __name__ == "__main__":
    sys.exit(main())
