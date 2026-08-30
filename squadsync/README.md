# SquadSync

Petite webapp pour centraliser :
- les dispos hebdo des joueurs de tes deux équipes (Pax Horizon, Pepsonnet)
- tes propres créneaux occupés récurrents (brasserie, IFAPME, perso)
- un dashboard qui fusionne les deux pour repérer les meilleurs créneaux de session/VOD, et voir ton temps libre réel

## Comment ça marche

- `/team/pax` et `/team/pepsonnet` : lien à envoyer à chaque équipe. Chaque joueur tape son pseudo et coche sa grille hebdo (17h-23h, lun-dim). Il n'y revient que quand ça change.
- `/settings` : tes créneaux occupés récurrents, tes exceptions ponctuelles (vacances...), le seuil "combien de joueurs dispo minimum" pour qu'un créneau soit mis en avant, et la gestion des rosters.
- `/dashboard` : vue combinée — ton temps libre, et pour chaque équipe une heatmap (plus c'est vert, plus de joueurs dispo) avec tes créneaux occupés grisés/hachurés par-dessus, et les meilleurs créneaux surlignés en orange.

`/dashboard` et `/settings` sont protégés par un code simple (voir `.env`) pour éviter qu'un lien partagé par erreur laisse un joueur bidouiller tes réglages. Ce n'est pas une vraie sécurité (le code tourne côté navigateur), juste un frein.

## Démarrer en local (mode démo)

```bash
npm install
npm run dev
```

Sans configuration Supabase, l'appli tourne en mode démo : tout est stocké dans le `localStorage` de ton navigateur, rien n'est partagé entre appareils. Pratique pour tester l'interface avant de la brancher pour de vrai.

## Passer en mode partagé (Supabase)

C'est l'étape qui permet à tes joueurs de remplir depuis leur tel et que toi tu voies tout depuis le tien.

1. Crée un compte sur [supabase.com](https://supabase.com) (gratuit) et un nouveau projet.
2. Dans **SQL Editor**, colle le contenu de `supabase/schema.sql` et exécute-le. Ça crée les tables et seed les deux équipes (Pax Horizon, Pepsonnet).
3. Dans **Project Settings > API**, récupère l'URL du projet et la clé `anon public`.
4. Copie `.env.example` en `.env` et remplis :
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_COACH_PIN=un-code-a-toi
   ```
5. Relance `npm run dev` — l'appli bascule automatiquement sur Supabase.

Pour changer les noms d'équipe, ajouter une équipe, ou ajuster les horaires couverts par la grille (par défaut 17h-23h), regarde `src/lib/config.js` et la table `teams` dans Supabase.

## Déployer (pour que les liens marchent en dehors de chez toi)

Le plus simple : [Vercel](https://vercel.com) ou [Netlify](https://netlify.app), les deux ont un tier gratuit largement suffisant ici.

1. Pousse le projet sur un repo GitHub (ou upload direct sur Vercel/Netlify).
2. Connecte le repo depuis Vercel/Netlify — ils détectent Vite automatiquement.
3. Ajoute les variables d'env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_COACH_PIN`) dans les réglages du projet sur Vercel/Netlify (pas juste en local).
4. Deploy. Tu obtiens une URL type `squadsync.vercel.app` — c'est ce lien (+ `/team/pax`, `/team/pepsonnet`) que tu partages aux équipes.

L'appli est aussi une PWA basique : depuis un tel, "Ajouter à l'écran d'accueil" donne une icône propre sans passer par le navigateur.

## Limites connues (MVP)

- Pas de vraie authentification joueur — un joueur pourrait techniquement modifier les dispos d'un autre en tapant son nom. Pour deux équipes de potes/coéquipiers, le risque est faible ; si ça devient un problème, la prochaine étape serait un vrai login par joueur.
- Le code d'accès coach (`VITE_COACH_PIN`) est une barrière légère, pas une sécurité réelle.
- Les créneaux sont hebdomadaires et récurrents (pas de calendrier daté) — volontaire, vu que les dispos gaming changent peu semaine à semaine. Les vacances/imprévus passent par les "exceptions" dans `/settings`.
