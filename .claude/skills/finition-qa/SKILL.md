---
name: finition-qa
description: Finition et contrôle qualité d'un montage vidéo avant livraison — étalonnage (LUT), netteté, grain, agrandissement, exports par plateforme, et vérifications (cadre, zones d'interface, lisibilité, volume, images noires/figées, silences). À utiliser à la fin de chaque montage, avant d'envoyer quoi que ce soit à l'utilisateur.
---

# Finition et contrôle qualité

Rien ne part chez l'utilisateur sans être passé par cette étape.

## Étalonnage (look)
`plan.json` → `"look"` (job) ou par clip. LUT générées dans `squadsync/shorts/luts/` (`tools/grade.py --make-luts`).
- `clean` : par défaut, interviews, podcasts. `warm-film` : témoignage, nostalgie, lifestyle.
- `teal-orange` : cinéma, business, ambition. `cold-drama` : sujets graves, tension.
- `vivid-pop` : humour, gaming, food. `mono-punch` : une citation forte, un souvenir (à réserver à un clip).
Un seul look par vidéo source (cohérence de série), sauf effet voulu. Grain `0.04-0.08` ; 0 pour un rendu « net » tech.

## Qualité d'image
- Source < 1080p ou floue : agrandir avant montage (fal.ai upscaler, ex. `fal-ai/clarity-upscaler` sur des images ;
  pour la vidéo, `ffmpeg -vf scale=…:flags=lanczos,unsharp`), sinon accepter et privilégier le layout `fit`.
- Ralentis : `ffmpeg minterpolate` (fluide, lent à calculer) sur un B-roll court seulement.

## Contrôle (obligatoire)
```bash
python3 shorts/tools/qa.py shorts/out/<job>/
```
Puis **regarder chaque planche** `*_sheet.png` et vérifier :
1. visage entier dans le cadre (yeux dans le tiers haut), pas de tête coupée pendant les zooms ;
2. sous-titres et titres hors des zones d'interface : bandeau bas 18 % (description, boutons), colonne droite 12 % (likes) ;
3. aucun texte coupé ou qui déborde, aucune faute dans l'accroche et les titres ;
4. GIF/emoji/B-roll ne masquent ni le visage pendant une émotion ni un titre ;
5. rapport : volume -14 LUFS ±1,5, pas de saturation, pas d'image noire/figée, pas de silence > 1,2 s.
Corriger dans `plan.json` puis `build.py --only <id>`, et recontrôler.

## Exports
Le rendu standard (1080x1920, 30 fps, H.264, AAC, -14 LUFS) convient à TikTok, YouTube Shorts, Reels.
Pour YouTube Shorts : < 60 s conseillé (jusqu'à 3 min accepté). Instagram : couverture = image de l'accroche (frame ~1 s).

## Livraison
Envoyer les vidéos (SendUserFile) + `publication.md` (titres, descriptions, hashtags, crédits CC-BY éventuels),
en signalant honnêtement ce qui n'a pas pu être fait (clé manquante, GIF non trouvé…).
