---
name: styles
description: Bibliothèque de styles de montage — analyser des vidéos de référence que l'utilisateur aime (TikTok, Reels, Shorts, YouTube) pour en tirer des règles de montage réutilisables, sans copier leur contenu, et appliquer un style nommé à un nouveau montage. À utiliser quand l'utilisateur envoie une référence (« fais comme ça »), ou demande un style déjà enregistré.
---

# Bibliothèque de styles

On s'inspire, on ne copie pas : une référence donne des **règles** (rythme, hiérarchie des textes, palette, transitions,
densité sonore), jamais ses images, sa musique, ses textes ou sa mise en page à l'identique.

## Enregistrer un style
```bash
python3 shorts/tools/style_extract.py "<url ou fichier>" <nom-du-style>
```
Produit `squadsync/shorts/styles/<nom>/analysis.json` (durée, coupes par 10 s, durée moyenne de plan, volume, BPM)
et `sheet.png`. Regarder la planche (et, si besoin, l'analyse scène par scène avec vidIQ `vidiq_watch_shortform_content`,
en prévenant du coût en crédits), puis rédiger `shorts/styles/<nom>/style.md` :

```markdown
# <nom>
Référence : <url> (analysée le <date>)
## Ce qui fait le style (observé)
- rythme : … coupes / 10 s, zooms …
- textes : … (taille, position, police proche : anton/bebas/…, couleurs)
- visuels : … (B-roll illustrés ? stock ? fréquence)
- transitions : …
- son : … (musique, densité de bruitages)
## Traduction moteur (plan.json)
look: … · grain: … · titres: styles … · transitions: … · B-roll toutes les … s · emojis: oui/non · musique: mood …
## À ne pas reprendre
- éléments propres au créateur (logo, gimmick signature, musique, phrases)
```

## Appliquer un style
Lire `shorts/styles/<nom>/style.md` avant d'écrire `plan.json` et suivre sa section « Traduction moteur ».
Si l'utilisateur ne précise pas, proposer les styles existants (`ls shorts/styles/`).
Les styles sont commités (texte et planches légères), pas les vidéos de référence.
