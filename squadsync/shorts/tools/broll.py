#!/usr/bin/env python3
"""Plans de coupe (B-roll) : génération IA ou stock réel, puis animation.

    python3 shorts/tools/broll.py <job> <nom> --source fal-image  --prompt "..."  [--animate parallax|kling|none] [--move push]
    python3 shorts/tools/broll.py <job> <nom> --source pexels     --query  "city night" [--photo]
    python3 shorts/tools/broll.py <job> <nom> --source file       --path   mon_image.png [--animate parallax]

Écrit <job>/broll/<nom>.mp4 (1080x1920, prêt pour le montage) et l'ajoute à <job>/broll/manifest.json.

Sources :
  fal-image   image générée (Flux) au format vertical ; clé fal.ai gérée par l'environnement (fal.run)
  pexels      vidéo ou photo de stock réelle, libre d'usage commercial ; variable PEXELS_API_KEY
  file        image ou vidéo locale
Animation d'une image :
  parallax    2.5D par carte de profondeur, local et gratuit (défaut)
  kling       vraie vidéo générée à partir de l'image (fal.ai, queue.fal.run) : plus vivant, payant
"""
import argparse
import base64
import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
FAL_IMAGE_MODEL = os.environ.get("FAL_IMAGE_MODEL", "fal-ai/flux/dev")
FAL_VIDEO_MODEL = os.environ.get("FAL_VIDEO_MODEL", "fal-ai/kling-video/v2.1/standard/image-to-video")

STYLE_SUFFIX = ("vertical composition, cinematic lighting, high detail, clean background space in the upper third, "
                "no text, no watermark, no logo")


def http_json(url, data=None, headers=None, method=None):
    h = {"Content-Type": "application/json", "User-Agent": "shorts-broll/1.0"}
    h.update(headers or {})
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=h, method=method or ("POST" if body else "GET"))
    try:
        return json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{url} → HTTP {e.code} : {e.read()[:300].decode(errors='replace')}")


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "shorts-broll/1.0"})
    with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as f:
        f.write(r.read())
    return path


def fal_image(prompt, out_png):
    # La clé est injectée par le proxy de l'environnement : aucune clé dans le code.
    res = http_json(f"https://fal.run/{FAL_IMAGE_MODEL}", {
        "prompt": f"{prompt}, {STYLE_SUFFIX}", "image_size": "portrait_16_9", "num_images": 1,
        "enable_safety_checker": True})
    return download(res["images"][0]["url"], out_png)


def fal_animate(image_path, prompt, out_mp4, dur=5):
    data_uri = "data:image/png;base64," + base64.b64encode(open(image_path, "rb").read()).decode()
    sub = http_json(f"https://queue.fal.run/{FAL_VIDEO_MODEL}", {
        "prompt": prompt + ", subtle natural motion, smooth camera, no text", "image_url": data_uri, "duration": str(dur)})
    status_url, response_url = sub["status_url"], sub["response_url"]
    for _ in range(120):  # jusqu'à ~10 min
        st = http_json(status_url)
        if st.get("status") == "COMPLETED":
            break
        if st.get("status") in ("FAILED", "ERROR"):
            raise SystemExit(f"fal : génération vidéo échouée : {st}")
        time.sleep(5)
    res = http_json(response_url)
    return download(res["video"]["url"], out_mp4)


def pexels(query, out_base, photo=False):
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        raise SystemExit("PEXELS_API_KEY absent : ajoute-le dans les variables d'environnement de l'environnement cloud.")
    hdr = {"Authorization": key}
    if photo:
        res = http_json("https://api.pexels.com/v1/search?" + urllib.parse.urlencode(
            {"query": query, "orientation": "portrait", "per_page": 5, "size": "large"}), headers=hdr)
        if not res.get("photos"):
            raise SystemExit(f"Pexels : aucune photo pour « {query} »")
        p = res["photos"][0]
        print(f"  Pexels photo de {p['photographer']} ({p['url']})")
        return download(p["src"]["portrait"], out_base + ".jpg")
    res = http_json("https://api.pexels.com/videos/search?" + urllib.parse.urlencode(
        {"query": query, "orientation": "portrait", "per_page": 8, "size": "medium"}), headers=hdr)
    vids = res.get("videos") or []
    if not vids:
        raise SystemExit(f"Pexels : aucune vidéo pour « {query} »")
    v = max(vids[:5], key=lambda v: (v["height"] >= 1280, -abs(v["duration"] - 6)))
    files = sorted([f for f in v["video_files"] if f.get("height")], key=lambda f: abs(f["height"] - 1920))
    print(f"  Pexels vidéo de {v['user']['name']} ({v['url']})")
    return download(files[0]["link"], out_base + "_raw.mp4")


def to_vertical(src, out, dur=None):
    vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1"
    cmd = ["ffmpeg", "-loglevel", "error", "-y", "-i", src]
    if dur:
        cmd += ["-t", str(dur)]
    cmd += ["-vf", vf, "-an", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", out]
    subprocess.run(cmd, check=True)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("job")
    ap.add_argument("name")
    ap.add_argument("--source", required=True, choices=["fal-image", "pexels", "file"])
    ap.add_argument("--prompt", default="")
    ap.add_argument("--query", default="")
    ap.add_argument("--path")
    ap.add_argument("--photo", action="store_true")
    ap.add_argument("--animate", default="parallax", choices=["parallax", "kling", "none"])
    ap.add_argument("--move", default="push")
    ap.add_argument("--dur", type=float, default=3.5)
    a = ap.parse_args()

    d = os.path.join(a.job, "broll")
    os.makedirs(d, exist_ok=True)
    base = os.path.join(d, a.name)
    out = base + ".mp4"
    still = None
    if a.source == "fal-image":
        still = fal_image(a.prompt, base + ".png")
    elif a.source == "pexels":
        got = pexels(a.query, base, a.photo)
        if got.endswith(".mp4"):
            to_vertical(got, out, a.dur)
            os.remove(got)
        else:
            still = got
    else:
        if a.path.lower().endswith((".mp4", ".mov", ".webm", ".mkv")):
            to_vertical(a.path, out, a.dur)
        else:
            still = a.path

    if still:
        if a.animate == "kling":
            raw = fal_animate(still, a.prompt or a.query, base + "_raw.mp4")
            to_vertical(raw, out, a.dur)
            os.remove(raw)
        elif a.animate == "parallax":
            subprocess.run([sys.executable, os.path.join(HERE, "parallax.py"), still, out,
                            "--dur", str(a.dur), "--move", a.move], check=True)
        else:
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-i", still, "-t", str(a.dur),
                            "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30",
                            "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", out], check=True)

    mpath = os.path.join(d, "manifest.json")
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}
    manifest[a.name] = {"file": f"broll/{a.name}.mp4", "source": a.source, "prompt": a.prompt, "query": a.query,
                        "still": f"broll/{os.path.basename(still)}" if still else None}
    json.dump(manifest, open(mpath, "w"), indent=2, ensure_ascii=False)
    print("✓", out)


if __name__ == "__main__":
    main()
