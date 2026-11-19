---
name: broll
description: Choisir, générer et intégrer des plans de coupe (B-roll) dans un short ou un montage — illustrations IA animées (fal.ai Flux + Kling/parallaxe 2.5D), vidéos de stock réelles (Pexels), visuels Adobe Firefly ou vidIQ — avec transitions. À utiliser pendant le skill shorts, ou dès qu'un montage a besoin d'images qui illustrent ce qui est dit.
---

# B-roll : illustrer ce qui est dit

Un plan de coupe sert l'histoire : il **montre** ce que la voix **raconte**, relance l'attention et cache une coupe.
Il ne remplace jamais le visage pendant une émotion forte, une punchline ou un regard caméra.

## Quand en mettre

- 1 plan de coupe toutes les 6-10 s en moyenne, jamais dans les 2 premières secondes (l'accroche reste sur le visage).
- Durée 1,8-3 s. Plus long = on perd la personne ; plus court = illisible.
- Sur : une image mentale (« j'étais seul dans ma chambre »), un lieu, un chiffre, une métaphore (« une renaissance »),
  un objet, une époque. Pas sur une phrase abstraite qu'aucune image ne sert.
- La voix continue dessous ; les sous-titres restent sauf si le B-roll porte un titre qui dit la même chose
  (`hide_captions_on_broll`).

## Choisir la source (dans cet ordre de réalisme)

| Besoin | Source | Commande |
|---|---|---|
| Lieu, action, objet réel (ville, sport, argent, bureau) | **Pexels** vidéo verticale | `tools/broll.py <job> <nom> --source pexels --query "…"` |
| Métaphore, émotion, époque, concept, scène impossible | **fal.ai** image Flux + animation | `--source fal-image --prompt "…" --animate parallax` (gratuit) ou `--animate kling` (vivant, payant) |
| Retouche, extension d'une image, détourage | **Adobe** (outils MCP Firefly/image) | via les outils `mcp__Adobe__*` |
| Plans de coupe d'actualité / tendances | **vidIQ** `vidiq_find_broll` (crédits) | outil MCP |

Écrire les requêtes Pexels en anglais, concrètes (« man running city night », pas « motivation »).

## Prompts d'images qui s'intègrent (fal.ai)

Une série d'images doit avoir **un seul langage visuel** par vidéo. Choisir une direction et la répéter dans chaque prompt :
- *Illustration éditoriale* : « flat editorial illustration, muted pastel palette, soft grain, minimal shapes »
- *Peinture cinéma* : « cinematic digital painting, volumetric light, pale blue and gold palette, dreamlike »
- *Photo réaliste* : « 35mm photo, natural light, shallow depth of field, film grain »
- *3D douce* : « soft 3D render, clay materials, studio lighting, pastel background »
- *Anime/manga* : « anime key visual, dramatic sky, cel shading »

Toujours : sujet clair au centre/bas, **espace libre dans le tiers haut** (pour le titre), pas de texte dans l'image
(le moteur gère la typo), pas de visage de personne réelle identifiable, pas de logo de marque.

## Animer

- `parallax` (défaut) : 2.5D par profondeur, gratuit. `--move push` (entrée dans l'image), `rise` (élévation, inspirant),
  `pan-left/right` (récit, déplacement), `orbit` (mystère).
- `kling` : vrai mouvement généré (cheveux, nuages, eau). Réserver aux 1-2 plans clés d'un clip (coût, ~1-3 min chacun).

## Intégrer

Dans `plan.json` du clip (voir `squadsync/shorts/PLAN_FORMAT.md`) :
`{"name": "reve", "at": 14.2, "dur": 2.6, "trans": "zoom", "transOut": "whip", "title": {...}}`

Transitions : `zoom` (par défaut, propre), `whip` (énergie, enchaînement rapide), `iris` (révélation, flashback),
`glitch` (tech, gaming, rupture), `slide-up` (liste, étape suivante), `fade` (émotion, calme).
Varier : jamais deux fois la même transition d'affilée dans un clip.
Un titre sur le B-roll : voir le skill **typo-cinetique** (ex. `reveal` en serif pour un mot-concept comme « Renaissance »).

## Coûts et droits

- Pexels : gratuit, usage commercial autorisé, pas d'attribution obligatoire (créditer reste apprécié).
- fal.ai : payant à l'usage — prévenir l'utilisateur avant de générer plus de ~10 plans animés Kling.
- Ne pas générer d'image imitant une personne réelle, une marque ou une œuvre protégée précise.
