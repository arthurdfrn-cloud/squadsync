---
name: typo-cinetique
description: Typographie cinétique pour shorts et montages — gros mots-titres animés (derrière le sujet, révélation, contour, néon, empilés, slam, écriture main), choix de polices et de couleurs, placement. À utiliser pendant le skill shorts ou pour tout montage qui doit mettre un mot ou un chiffre en valeur.
---

# Typographie cinétique

Les sous-titres disent **tout** ; les titres cinétiques disent **le mot qui compte**. 2 à 4 titres par clip de 40 s, pas plus :
si tout est mis en valeur, plus rien ne l'est.

## Quel mot
Le mot que le spectateur doit retenir : la chute, un chiffre, un concept, une émotion, un nom.
Jamais un mot-outil. Le titre apparaît **0,1 s avant** que le mot soit prononcé (`at` = début du mot − 0,1).

## Quel style (moteur : `titles` dans plan.json, voir `squadsync/shorts/PLAN_FORMAT.md`)

| Style | Pour | Exemple |
|---|---|---|
| `behind` + `"behind": true` | Le mot-thème, sur un plan où la personne est bien détourable | « JAMAIS », « LIBERTÉ » |
| `reveal` | Concept, émotion, citation (serif italique élégant) | « Renaissance », « le vrai luxe » |
| `outline` | Chiffres, prix, statistiques | « 1 000 000 € », « 3 ANS » |
| `slam` | Choc, négation, révélation brutale | « NON. », « VIRÉ » |
| `stack` | 2-3 mots en liste ou en rythme | « TRAVAIL / PATIENCE / RÉSULTAT » |
| `neon` | Nuit, gaming, tech, énergie | « GAME OVER », « 3 H DU MATIN » |
| `marker` | Humour, aparté, ironie | « (spoiler : non) » |

Varier les styles dans un clip (pas deux fois le même d'affilée) mais garder **une famille cohérente par vidéo** :
- sobre/inspirant : `reveal` + `behind` ;
- énergique/hype : `slam` + `stack` + `outline` ;
- tech/gaming : `neon` + `glitch` (transitions) + `outline` ;
- humour : `marker` + `slam`.

## Placement et lisibilité
- `y` = position verticale (0 haut, 1 bas). Sur un visage : 0,25-0,32 (au-dessus des yeux, derrière la tête avec `behind`).
  Sur un B-roll : 0,35-0,45. Jamais en bas (> 0,75 : zone d'interface TikTok/Reels + sous-titres).
- 1 à 12 caractères pour `behind`/`slam` (taille 200-300) ; jusqu'à 20 pour `reveal`/`outline` (ajuster `size`).
- Couleur : blanc par défaut ; jaune `#FFE14D` pour chiffres/argent ; rouge `#FF3B5C` pour danger/négation ;
  cyan `#7CF7FF` pour tech. Une seule couleur d'accent par vidéo, cohérente avec le look.
- `behind` nécessite un sujet net et un fond distinct : sinon utiliser `reveal`/`slam` (le détourage échoue sur fond chargé).
  Coût : ~1 s de calcul par image détourée → réserver aux titres de ≤ 2 s.

## Son associé (automatique)
`slam`/`stack` → impact ; `reveal` → montée (riser) ; `neon` → glitch ; autres → whoosh. Voir **sound-design**.
