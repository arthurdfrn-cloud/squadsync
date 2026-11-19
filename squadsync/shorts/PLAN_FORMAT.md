# Format de `plan.json`

Un plan décrit les clips d'un job (`shorts/work/<job>/plan.json`). Tous les temps `at` sont en secondes depuis le début du clip.

```jsonc
{
  "look": "warm-film",                 // étalonnage par défaut du job (clean, warm-film, teal-orange, cold-drama, vivid-pop, mono-punch, none)
  "grain": 0.06,                       // grain pellicule 0-0.15 (0 = aucun)
  "music": {"mood": "inspiring cinematic"},   // musique par défaut (ou {"file": "..."}); absente = pas de musique intégrée
  "clips": [{
    "id": "01", "start": 63.2, "end": 104.8,
    "hook": "Il a refusé 1 million 😳",
    "title": "…", "description": "… #hashtags",
    "look": "teal-orange",             // surcharge du look pour ce clip
    "layout": "crop",                  // optionnel : crop | fit | full (sinon automatique)
    "emphasis": ["million", "jamais"], // mots forts → vert + punch-in + pop
    "booms": ["refusé"],               // mots-chocs → secousse + impact

    "titles": [                        // typographie cinétique sur la vidéo principale (skill typo-cinetique)
      {"text": "REFUSÉ", "at": 4.1, "dur": 1.5, "style": "behind", "behind": true, "y": 0.3},
      {"text": "1 000 000 €", "at": 9.0, "dur": 1.3, "style": "outline", "y": 0.35, "color": "#FFE14D"}
    ],
    "broll": [                         // plans de coupe (skill broll) — générés avant avec tools/broll.py
      {"name": "reve", "at": 14.2, "dur": 2.6, "trans": "zoom", "transOut": "whip",
       "title": {"text": "Renaissance", "style": "reveal", "y": 0.38, "behind": false}}
    ],
    "gifs": [{"query": "mind blown", "at": 21.0, "dur": 1.6}],
    "emojis": [{"emoji": "🔥", "at": 9.2, "dur": 1.4, "x": 0.8, "y": 0.5}],
    "leaks": [30.5],                   // fuites de lumière supplémentaires (ajoutées auto sur les B-roll zoom/fade/iris)
    "music": {"mood": "dark suspense", "vol": 0.16, "duck_to": 0.05, "offset": 12},
    "hide_captions_on_broll": false
  }]
}
```

Styles de titres : `behind` (massif, Anton), `reveal` (serif italique révélé), `outline` (contour qui se remplit),
`neon` (néon qui grésille), `stack` (mots empilés qui tombent), `slam` (mot qui s'écrase), `marker` (écriture main).
Polices forçables avec `"font"` : anton, bebas, archivo, playfair, marker, montserrat.

Transitions B-roll : `zoom` (zoom-blur), `whip` (filé latéral), `slide-up`, `iris` (cercle), `glitch`, `fade`.
