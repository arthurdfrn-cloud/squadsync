# Notes – rendu 3D du studio de coaching

## Voie utilisée
J'ai pris la **voie scène 3D HTML + Three.js** (`studio3d.html`). Elle a 7 caméras préréglées et des ombres douces (PCF soft shadows). Chaque vue est exportée en PNG par Playwright (`outils/render.mjs`).

J'ai écarté la génération d'image. Le seul outil connecté (Figma `generate_image`) n'accepte qu'un texte : il ne peut pas prendre les photos en référence. Il ne pouvait donc pas garantir la fidélité aux photos ni la checklist (5 postes, aucun logo, palette constante), et chaque appel consomme des crédits payants.

Pour régénérer les images :
```
node rendus-studio/outils/render.mjs          # les 7 vues
node rendus-studio/outils/render.mjs 2 6      # seulement certaines vues
```
Pour la maquette interactive, servez le dossier en local (par exemple `python3 -m http.server` dans `rendus-studio/`) puis ouvrez `studio3d.html`. Les boutons 1 à 7 donnent les vues, « Caméra libre » permet de tourner, et « Exporter PNG » sauvegarde la vue affichée.

## Boucle de contrôle
Il y a eu 3 passes de rendu, suivies d'une vérification par capture.

| Passe | Écarts relevés | Correction |
|---|---|---|
| 1 | Vitrage des Velux invisible de l'intérieur ; vue 1 trop sombre ; panne au premier plan en vue 2 ; kettlebells hors champ en vue 3 ; tronc au premier plan en vue 6 ; étiquettes du rez superposées à l'étage en vue 7 | Vitrage double face, éclairage relevé, caméras 2 et 3 déplacées, pin déplacé, caméra de coupe abaissée, anti-chevauchement des étiquettes |
| 2 | Une panne traversait les Velux (sur IMG_0409, la panne passe sous la fenêtre) ; pilier trop présent en vue 3 ; étiquette « ÉTAGE » coupée | Pannes déplacées sous les fenêtres, caméra 3 décalée, étiquettes de niveau recadrées, étiquettes du rez dirigées vers le bas |
| 3 | Bouleau au premier plan en vue 6 ; 2e Velux non visible en vue 1 | Bouleau retiré. Pour le Velux, une caméra de contrôle confirme qu'il est bien modélisé : depuis la trappe, une ferme le masque. Il est visible en vues 2 et 6. |

### Checklist finale
| Critère | Résultat |
|---|---|
| Charpente visible, pente respectée | ✓ vues 1, 2, 3 et 7 |
| 2 Velux à l'étage | ✓ modélisés tous les deux. Le Velux côté trappe est visible en vues 1 et 3, le Velux côté rangement en vue 2 (au fond), les deux en vue 6. |
| 5 postes, pas plus | ✓ 1 rack + banc sur plateforme, 2 rameur, 3 kettlebells muraux, 4 sac sur support, 5 espalier + mobilité |
| Aucun logo, aucun nid | ✓ Le matériel est générique et sans texte, le tableau de programmes est une grille vierge. Le nid d'IMG_0417 est omis. |
| Palette cohérente | ✓ Bois #C9A27A, noir #1C1C1E, blanc cassé #F2EFE9, sauge #8FA68E et laiton #B08D57 sont partagés par les 7 vues. |
| Mention « non contractuel » | ✓ incrustée en bas de chaque PNG |
| Pas de cote, pas de label, pas de personne | ✓ |

## Écarts connus par rapport aux photos
- **Proportions estimées.** Longueur, largeur, pente (≈ 45°), hauteur des murets, position des entraits et taille de la trappe sont toutes « à l'œil ». Les images ne doivent pas servir à juger si un équipement passe sous un entrait.
- **Charpente simplifiée.** Il y a 3 fermes régulières avec entrait, poinçon et faîtière, 2 pannes par versant et des chevrons régulièrement espacés. Les jambes de force, aisseliers et irrégularités visibles sur les photos ne sont pas reproduits. Les lattes et tuiles sont une texture.
- **Croupe.** L'extrémité côté rangement est modélisée en croupe. C'est mon interprétation d'IMG_0415 à 0417.
- **Velux.** Je les ai placés tous les deux sur le versant côté jardin, ce qui n'est pas confirmé.
- **Pilier en blocs.** Sa section et sa position sont approximatives. Il s'arrête sous l'entrait.
- **Rez fermé.** Les photos montrent un abri **ouvert** au sol en gravier. Le rendu suppose une fermeture vitrée entre les poteaux existants, un sol fini et des murs intérieurs. C'est une hypothèse de concept, pas un constat. Le gravier reste visible devant la façade.
- **Escalier extérieur.** Sa forme et son matériau (acier noir, marches bois) sont simplifiés. **Son arrivée à l'étage n'est pas visible** sur les photos : le rendu s'arrête à un palier, sans représenter de porte.
- **Escalier de la trappe.** Il est conservé, raide et de type échelle de meunier, comme sur IMG_0411. Il arrive dans le salon.
- **Maison en brique et arbres.** Ce sont des volumes de contexte simplifiés. Leurs positions ne sont pas relevées.
- **Placards.** Ils sont repris le long des murets (photos), mais repeints en sauge pour la palette.
- **Retirés.** Cible de fléchettes, toiles, matelas, livres, cartons, téléviseur, vélo, appareils existants, lampe hublot, animal, voiture et nid.

## Mesures nécessaires pour une version dimensionnée
Pour chaque mesure, notez si possible le point de référence (sol fini, dessus de plancher, etc.).

**Étage**
1. Hauteur sous entrait (dessous de l'entrait → plancher), pour chaque ferme.
2. Hauteur sous faîtière, ou sous le poinçon au point le plus haut.
3. Largeur libre à 2 m de haut (entre les deux versants, perpendiculairement au faîtage).
4. Largeur libre à 1 m et à 1,5 m de haut, utile pour le rameur et le sac.
5. Hauteur des murets et profondeur des placards bas.
6. Longueur totale intérieure (pignon → croupe), et position de chaque ferme depuis le pignon.
7. Surface de l'étage (longueur × largeur au sol), et surface utile à plus de 1,80 m de haut.
8. Position et dimensions des 2 Velux (distance au pignon, hauteur de l'appui).
9. Position et section du pilier en blocs.
10. Espacement des chevrons, et section et position des pannes.

**Trappe et escaliers**
11. Trappe : longueur et largeur de l'ouverture, et distance au pignon et au muret.
12. Escalier de la trappe : hauteur totale, largeur, nombre de marches, giron, et emprise au sol au rez.
13. Escalier extérieur : hauteur totale, largeur, emprise et point d'arrivée à l'étage.

**Rez**
14. Hauteur sous solives au rez.
15. Surface du rez (longueur × largeur) et entraxe des poteaux de façade.
16. Nature des parois existantes (arrière, côtés) et du sol sous le gravier.

**Matériel**
17. Les dimensions du rack, du rameur et du support de sac choisis, à confronter aux points 1, 3 et 4.

## Hors périmètre
Ces visuels ne valident rien : accès, charge du plancher, sécurité incendie, urbanisme, assurance. Ces points relèvent de professionnels qualifiés.
