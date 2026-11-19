---
name: sound-design
description: Son d'un montage vidéo — nettoyage de la voix (Adobe Enhance Speech), choix de la musique par ambiance et tempo, bruitages (bibliothèque Sonniss/Epidemic/Artlist/Freesound, ElevenLabs), mixage avec baisse automatique sous la voix et mastering -14 LUFS. À utiliser pendant le skill shorts ou pour tout montage où le son compte.
---

# Sound design

Le son fait la moitié de la qualité perçue. Ordre de priorité : **voix claire > rythme > musique > bruitages**.

## 1. La voix
- Écouter (ou mesurer avec `tools/qa.py`) : écho, souffle, micro lointain ? → passer l'audio source dans
  **Adobe Enhance Speech** (outil MCP `mcp__Adobe__media_enhance_speech`, après `adobe_mandatory_init`), puis remplacer la
  piste audio de `source.mp4` par la version nettoyée (ffmpeg `-map 0:v -map 1:a`). À proposer à l'utilisateur, pas d'office.
- Ne jamais couvrir une phrase importante par un bruitage fort.

## 2. La musique
Bibliothèque : `squadsync/shorts/library/music/` + `index.json` (BPM, énergie, ambiances).
- Import : `python3 shorts/tools/library.py import-music <dossier|zip> [--moods "inspiring cinematic"]`
  (fichiers téléchargés par l'utilisateur sur Epidemic Sound / Artlist / Pixabay Music / YouTube Audio Library).
- Dans `plan.json` : `"music": {"mood": "dark suspense"}` → choisit une piste ; ou `{"file": "…", "offset": 12}`.
  `offset` : démarrer la musique sur sa partie la plus intéressante (souvent après l'intro, au premier « drop »).
- Ambiance ↔ contenu : témoignage/inspiration → `inspiring cinematic piano` ; business/argent → `upbeat corporate hiphop` ;
  révélation/scandale → `dark suspense` ; humour → `fun happy` ; sport/défi → `energetic hype trap` ; nuit/tech → `phonk dark`.
- Mixage automatique : la musique descend à `duck_to` (0,05) quand on parle et remonte à `vol` (0,16) dans les silences ;
  les zooms « jump cut » sont aimantés sur les mesures de la musique.
- Son TikTok tendance : chercher avec `vidiq_tiktok_trending_sound_search` (crédits) et le **proposer** ; l'utilisateur l'ajoute
  dans l'app. Dans ce cas rendre sans musique intégrée.
- Jamais de musique commerciale (radio, artistes) intégrée au fichier : blocage et retrait garantis.

## 3. Les bruitages
Bibliothèque : `squadsync/shorts/library/sfx/<catégorie>/` — catégories : whoosh, pop, boom, riser, glitch, click, ding, ambience.
- Import d'un pack (Sonniss GDC, Epidemic SFX, Artlist SFX…) : `python3 shorts/tools/library.py import-sfx <dossier|zip>`
  (classement automatique par mots-clés du nom de fichier ; vérifier `library.py status`).
- Freesound (CC0/CC-BY) : `python3 shorts/tools/library.py fetch-freesound` ; les crédits CC-BY sont dans
  `library/credits.json` et doivent figurer en description.
- ElevenLabs Sound Effects (`api.elevenlabs.io/v1/sound-generation`, clé injectée par l'environnement) pour un son précis
  introuvable (« notification Discord », « foule qui applaudit dans un gymnase ») : enregistrer dans la bonne catégorie.
- Le moteur place automatiquement : ding sur l'accroche, pop sur les mots forts et emojis, impact sur les booms et titres
  `slam`/`stack`, whoosh sur les zooms et B-roll, riser avant `reveal`/`iris`, glitch sur `neon`/`glitch`.
  Sans bibliothèque, des sons générés prennent le relais (corrects mais moins riches).
- Densité : 1 bruitage marquant toutes les 2-4 s maximum. Trop de whooshes = amateur.

## 4. Mastering
Automatique en fin de rendu : -14 LUFS intégrés, crête -1,5 dBTP (standard TikTok/YouTube/Instagram).
`tools/qa.py` vérifie volume, saturation et silences.

## Conserver les bibliothèques
Le conteneur cloud est éphémère et `shorts/library/sfx|music` est ignoré par git (licences, taille).
Proposer à l'utilisateur : un dépôt GitHub **privé** dédié (ex. `<user>/montage-library`, à attacher avec add_repo)
ou un dossier Google Drive, et le réimporter en début de session.
