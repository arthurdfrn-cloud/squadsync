"""Construit la version autonome de la page teaser (pour Netlify, Vercel, Cloudflare Pages…).
Usage : python3 build_site.py [https://adresse-du-site]"""
import pathlib
import sys

HERE = pathlib.Path(__file__).parent
SITE_URL = (sys.argv[1] if len(sys.argv) > 1 else "https://avantlaube.netlify.app").rstrip("/")
src = (HERE / "index.html").read_text(encoding="utf-8")
cut = src.index('<header class="top">')
head, body = src[:cut], src[cut:]

meta = f"""<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0B0C0B">
<meta property="og:type" content="website">
<meta property="og:title" content="Préparation en cours">
<meta property="og:description" content="Quelque chose se prépare à Erbisœul.">
<meta property="og:url" content="{SITE_URL}/">
<meta property="og:image" content="{SITE_URL}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>*,*::before,*::after{{box-sizing:border-box}}body{{margin:0}}img{{max-width:100%}}
:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}</style>
"""
html = f'<!doctype html>\n<html lang="fr">\n<head>\n{meta}{head}</head>\n<body>\n{body}\n</body>\n</html>\n'
(HERE / "site" / "index.html").write_text(html, encoding="utf-8")
(HERE / "site" / "favicon.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0B0C0B"/>'
    '<circle cx="32" cy="40" r="13" fill="#C08A48"/><rect x="10" y="40" width="44" height="14" fill="#0B0C0B"/>'
    '<rect x="10" y="40" width="44" height="2" fill="#E3B272"/></svg>', encoding="utf-8")
print("site construit pour", SITE_URL)
