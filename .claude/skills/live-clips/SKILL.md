---
name: live-clips
description: Surveiller des lives Twitch et YouTube en parallèle (scène francophone : Squeezie, etc.), détecter automatiquement les moments forts (pics de chat, fous rires, cris, réactions) et en faire des shorts verticaux format stream (webcam en haut, jeu en bas). À utiliser quand l'utilisateur veut clipper un live, surveiller des streamers, ou traiter les clips d'un live passé.
---

# Clips de lives

## 1. Chaînes surveillées
`squadsync/shorts/live/channels.json` : `{"name", "url", "enabled"}`.
- Twitch : `https://www.twitch.tv/<login>` — enregistrement (streamlink) et chat (IRC anonyme, lecture seule) fiables.
- YouTube : `https://www.youtube.com/@<handle>/live` — YouTube bloque souvent les serveurs cloud (« not a bot ») :
  sans `YTDLP_COOKIES` (fichier cookies d'un compte secondaire), l'enregistrement peut échouer par moments ; le script réessaie.

## 2. Surveiller
```bash
python3 shorts/live/live_watch.py --hours 6            # toutes les chaînes activées, en parallèle
python3 shorts/live/live_watch.py --only squeezie --threshold 3
```
Lancer en tâche de fond (Bash `run_in_background`, 2 h max par commande : relancer ensuite). Le conteneur cloud
s'arrête après inactivité de la session : pour du 24/7, conseiller de faire tourner le script sur la machine de
l'utilisateur ou un petit serveur (il est autonome : Python, ffmpeg, streamlink, yt-dlp, websocket-client).

Détection (toutes les 10 s, sur l'instant ~10 s plus tôt car le chat réagit en retard) :
- pic de messages par rapport à la médiane des 10 dernières minutes (`chat_z`) ;
- part de messages de réaction (mdr, ptdr, jpp, KEKW, OMEGALUL, 😂💀, quoi??, wtf, « clip ») ;
- pic de volume du stream (`audio_z`) : cri, fou rire, explosion.
Seuil par défaut 3,0 ; abaisser (2-2,5) sur un live calme, monter (4+) sur un live très actif (trop de clips).
Chaque moment ≥ seuil → clip de 50 s (35 s avant, 15 s après) dans `shorts/work/live/<chaîne>/clips/` + `.json`.
Tous les scores sont dans `moments.jsonl` (permet de revoir le seuil après coup).

## 3. Trier et préparer
```bash
python3 shorts/live/prepare_clips.py shorts/work/live/<chaîne> --top 10
```
Lire chaque récapitulatif (chat + transcription) et ne garder que les clips qui marchent **sans contexte** :
réaction forte et lisible sur le visage, chute claire, phrase culte, moment drôle compréhensible par quelqu'un
qui ne suit pas le live. Écarter : pics dus à un raid/abonnements/cadeaux, moments qui demandent 5 min de contexte,
pubs, écrans de pause, contenu sensible (vie privée d'un tiers, propos visant une personne).

## 4. Monter
Dans chaque job retenu, écrire `plan.json` (skill **shorts** + `squadsync/shorts/PLAN_FORMAT.md`) :
- bornes serrées autour du moment (souvent 15-35 s : le contexte minimum + la réaction + 2 s après) ;
- `hook` qui pose la situation (« Squeezie découvre … 😭 ») — le spectateur doit comprendre en 2 s ;
- vérifier dans la transcription que c'est **le streamer** qui parle (pas les dialogues du jeu, souvent en anglais) :
  sinon les sous-titres affichent le jeu → choisir un autre passage ou couper les sous-titres sur ce segment ;
- layout automatique `split` si une webcam est détectée dans un coin (`facecam.json`, repérée par visage récurrent + bords fixes) (webcam en haut 42 %, jeu en bas, sous-titres à la jonction) ;
  forcer `"layout": "crop"` pour un « just chatting » plein cadre ;
- titres `slam`/`stack` sur la réaction, emojis 😭💀😂, peu de B-roll (le live suffit), look `clean` ou `vivid-pop`.
Puis `python3 shorts/build.py <job>` et le skill **finition-qa**.

## 5. Droits et éthique (à rappeler à l'utilisateur)
Les lives appartiennent à leurs créateurs. Publier leurs clips sur une autre chaîne est toléré quand le créateur
l'autorise (beaucoup encouragent les « clippeurs », parfois avec un programme officiel), interdit sinon (retrait,
avertissement, démonétisation). Vérifier/obtenir l'accord du créateur, le créditer (nom + lien du live) dans chaque
publication, ne jamais faire passer le clip pour du contenu original. Le chat est lu en anonyme et n'est jamais
publié avec les pseudos des spectateurs.
