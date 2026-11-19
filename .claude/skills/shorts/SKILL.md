---
name: shorts
description: Transforme une vidéo longue (lien YouTube/TikTok ou fichier) en 5 à 10 shorts verticaux 9:16 prêts à publier sur YouTube Shorts, TikTok et Reels — sélection des meilleurs moments, recadrage sur le visage, sous-titres mot à mot, zooms, GIF, bruitages, musique. À utiliser dès que l'utilisateur envoie une vidéo et demande des shorts, des clips, des extraits ou un « montage viral ».
---

# Shorts : d'une vidéo longue à 5-10 clips viraux

Objectif : des clips qu'un **large public** regarde jusqu'au bout sans effort. Le spectateur se pose et regarde :
le montage doit tenir l'attention, rester lisible et ne jamais montrer « comment c'est fait »
(pas de timeline, pas d'étapes, pas de couleurs de phase : uniquement le rendu final).

Code : `squadsync/shorts/` (Python + Remotion). Toutes les commandes se lancent depuis `squadsync/`.

## 1. Récupérer et analyser la vidéo

```bash
python3 shorts/prepare.py "<url ou fichier>" shorts/work/<job> [--lang fr] [--model small]
```

- `<job>` = nom court sans espaces (ex. `podcast-mars`).
- Produit `transcript.txt` (horodaté), `transcript.json` (mot à mot), `faces.json`, `scenes.json`, `info.json`.
- Vidéo de plus de 30 min : `--model base` pour aller plus vite ; `small` est le bon défaut, `medium` si l'audio est difficile.
- Si le téléchargement échoue (YouTube sert ses vidéos depuis des serveurs `*.googlevideo.com` que le réseau peut bloquer),
  le dire à l'utilisateur et proposer : un accès réseau élargi pour l'environnement, ou qu'il dépose le fichier vidéo.
  Ne jamais inventer le contenu d'une vidéo non téléchargée.

## 2. Choisir les clips (le travail éditorial, le plus important)

Lire **tout** `transcript.txt`, puis choisir **entre 5 et 10 clips** (moins si la vidéo est courte ou pauvre ; jamais de remplissage).

Un bon clip :
- **Accroche dans les 2 premières secondes** : commence sur une phrase forte, une question, un chiffre, une affirmation
  surprenante, un conflit. Jamais sur « alors », « euh », une intro ou une phrase qui dépend de ce qui précède.
- **Autonome** : compréhensible sans le reste de la vidéo, pour quelqu'un qui ne connaît pas l'intervenant.
- **Une seule idée** avec une chute (punchline, révélation, conseil concret, émotion, rire).
- **20 à 60 s**, idéalement 30-45 s. Couper sur des fins de phrase (utiliser les temps des mots dans `transcript.json`,
  `start` ≈ 0,1 s avant le premier mot, `end` ≈ 0,3 s après le dernier).
- Varier les sujets entre les clips ; pas deux fois la même idée.
- Ordre de publication : le plus fort en premier.

Pour chaque clip, écrire aussi :
- `hook` : accroche affichée 2,5 s en haut, 3 à 7 mots, majuscule initiale, au plus 1 emoji. Elle promet la chute sans la donner
  (« Il a refusé 1 million 😳 », « Personne ne t'explique ça »).
- `emphasis` : 3 à 6 mots prononcés qui portent le sens (chiffres, noms, mots émotionnels) → vert + zoom + « pop ».
- `booms` : 0 à 2 mots-chocs du clip (la chute) → secousse + impact grave. Ces mots doivent être dans le transcript du clip.
- `gifs` : 0 à 3 réactions **au bon moment** (après une chute, une exagération, une surprise), `at` en secondes depuis
  le début du clip, requête GIPHY en anglais, littérale et universelle (« mind blown », « shocked face », « slow clap »,
  « this is fine »). Pas sur une phrase importante : le GIF ne doit pas couvrir l'information. Requiert `GIPHY_API_KEY`.
- `title` et `description` : titre de publication (≤ 60 caractères, sans clickbait mensonger) + 3-5 hashtags pertinents.

Écrire le tout dans `shorts/work/<job>/plan.json` (format en tête de `shorts/build.py`).

## 3. Musique

Par défaut : **son TikTok tendance** ajouté par l'utilisateur à la publication.
- Chercher 2-3 sons adaptés au ton avec l'outil vidIQ `vidiq_tiktok_trending_sound_search` (coûte des crédits : le dire)
  et les proposer avec leur nom ; la vidéo est rendue **sans musique** (voix + bruitages), l'utilisateur ajoute le son dans l'app à ~10 % de volume.
- Si l'utilisateur fournit un fichier (`shorts/work/<job>/music/…` ou `--music`), `build.py` le mixe bas sous la voix et cale
  les zooms sur les mesures (librosa).
- Ne jamais intégrer une musique commerciale dans le fichier rendu.

## 4. Rendu

```bash
export REMOTION_CHROME=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | head -1)
python3 shorts/build.py shorts/work/<job>              # tous les clips
python3 shorts/build.py shorts/work/<job> --only 03    # un seul
```

Sortie : `shorts/out/<job>/short_XX.mp4` (1080x1920, 30 fps, H.264/AAC) + `publication.md` (titres et descriptions).
Compter ~1 min de rendu pour 10 s de clip sur 4 cœurs : lancer les longs rendus en tâche de fond.

Ce que le moteur applique automatiquement (`shorts/remotion/Short.jsx`) :
- recadrage 9:16 qui suit le visage, lissé, recalé à chaque changement de plan ; si pas de visage → vidéo entière sur fond flouté ;
- zooms « jump cut » toutes les 2,5-4 s, punch-in sur les mots forts, secousse sur les booms, flash d'entrée ;
- sous-titres 1-3 mots, gros, majuscules, contour noir, mot prononcé en jaune, mots forts en vert ;
- accroche en carte blanche les 2,5 premières secondes, GIF en cartes qui popent, barre de progression en bas ;
- bruitages générés (ding d'accroche, pop, boom, whoosh) — aucun droit d'auteur.

## 5. Vérifier avant de livrer

Pour chaque short, extraire 6 images et les regarder :
```bash
ffmpeg -loglevel error -y -i shorts/out/<job>/short_01.mp4 -vf "fps=1/3,scale=270:-1,tile=6x1" -frames:v 1 /tmp/sheet.png
```
Contrôler : visage bien dans le cadre, sous-titres lisibles et pas coupés, GIF qui ne masque pas le sujet, accroche lisible.
Corriger `plan.json` (bornes, mots, GIF) ou forcer `"layout": "fit"` / `"crop"` dans le clip, puis relancer `--only`.

## 6. Livrer

- Envoyer les vidéos à l'utilisateur (SendUserFile), avec pour chacune : accroche, durée, titre et hashtags (`publication.md`).
- Rappeler en une ligne : n'utiliser que des vidéos dont on a les droits (sa propre chaîne, ou avec l'accord du créateur).
- Les vidéos ne sont pas commitées (`shorts/work/` et `shorts/out/` sont ignorés par git).
