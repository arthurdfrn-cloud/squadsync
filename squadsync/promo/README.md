# Vidéo promo « du brut au montage final »

Montage vertical 9:16 (1080x1920, 20 s) au format **étape par étape** : le même extrait de 4,5 s
est joué 4 fois, chaque passe ajoute une couche de montage, et une timeline colorée en bas montre où on en est.

| Étape | Couleur | Ce qui s'ajoute |
|---|---|---|
| 1. Brut | brun | les captures de l'appli, coupes sèches |
| 2. Zoom + Tracking | orange | zoom progressif qui suit le créneau clé, contraste/saturation, vignette, cadre lumineux sur « Mer 20h » |
| 3. Sous-titres + Masquage | jaune | sous-titres mot à mot, mot courant en jaune |
| 4. Anim + SFX + Musique | bleu | mot géant derrière le cadre, flash + secousse à chaque coupe, sous-titres qui « pop », nappe, kicks, whooshes |

Puis 2 s d'outro « TROUVE LE CRÉNEAU. ».

Résultat : `promo/out/squadsync-promo.mp4`.

## Régénérer

Prérequis : [Playwright](https://playwright.dev) (`npm i -D playwright && npx playwright install chromium`) et `ffmpeg`.

```bash
npm run dev                                   # terminal 1
npm run promo:capture -- http://localhost:5173  # terminal 2 : capture les « rushes » de l'appli (données de démo)
npm run promo:render                          # rend la vidéo (≈ 2 min)
```

- `capture.cjs` : injecte des données de démo dans le `localStorage`, filme le remplissage d'une grille et le dashboard,
  et écrit `assets/*.png` + `assets/meta.js` (position des cellules pour le zoom/tracking).
- `composition.html` : le montage lui-même. Ouvre-le dans un navigateur et appelle `renderFrame(t)` dans la console
  pour prévisualiser n'importe quel instant. Textes, timings des plans et sous-titres sont dans le tableau `SHOTS`.
- `render.cjs` : capture chaque image à 30 fps, génère la bande-son (aucun fichier audio externe, donc pas de droits)
  et encode en H.264/AAC.

## Outils installés pour les prochains montages

| Outil | Rôle | Commande type |
|---|---|---|
| Remotion + `@remotion/gif` | moteur de montage en React, GIF sur la timeline (`promo/remotion/index.jsx`) | `npx remotion studio promo/remotion/index.jsx` |
| yt-dlp | récupérer des vidéos de référence / memes (TikTok, YouTube) | `yt-dlp <url>` |
| librosa | détecter le tempo pour caler les coupes sur le beat | `librosa.beat.beat_track(...)` |
| rembg | détourer une personne/un objet (incrustations, texte derrière le sujet) | `rembg i in.png out.png` |
| faster-whisper | sous-titres synchronisés au mot près depuis une voix off | `WhisperModel('small')` |
| GIPHY | GIF par mot-clé (clé dans la variable d'env `GIPHY_API_KEY`) | `api.giphy.com/v1/gifs/search` |
| Freesound / ElevenLabs | bruitages, voix off, musique (clés gérées par l'environnement cloud) | API |

Dans un environnement cloud, si Remotion ne trouve pas Chrome, passe `--browser-executable` vers le Chromium de Playwright
(ex. `/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell`).
