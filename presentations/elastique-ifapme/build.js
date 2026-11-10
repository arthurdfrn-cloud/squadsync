// Génère "Entrainement_elastique_IFAPME.pptx" — v3 « TENSION »
// Direction artistique : fond noir profond, vert acide + rose IFAPME, titres Impact,
// texte minimal à l'écran, discours complet dans les notes, transitions Morph.
// Usage : node build.js  (pptxgenjs, react, react-dom, react-icons, sharp ; python3 pour les transitions)
const path = require("path");
const { execFileSync } = require("child_process");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const { applyTheme } = require(process.env.APPLY_THEME || "./apply_theme.js");

const THEME = {
  name: "Tension IFAPME",
  headFontFace: "Impact",
  bodyFontFace: "Arial",
  colors: {
    dk1: "0C0C10", // noir profond (fond)
    lt1: "FFFFFF",
    dk2: "8C8C99", // texte secondaire
    lt2: "1C1C24", // surface
    accent1: "C8FF2E", // vert acide
    accent2: "ED174F", // rose IFAPME
    accent3: "3A3A46", // gris élastique au repos
    accent4: "26262F",
    accent5: "8C8C99",
    accent6: "F4F4EF",
    hlink: "C8FF2E",
    folHlink: "8C8C99",
  },
};
const HEX = THEME.colors;
const LIME = HEX.accent1, PINK = HEX.accent2, INK = HEX.dk1, MUTED = HEX.dk2, SURF = HEX.lt2;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "S'entraîner à l'élastique";
pres.subject = "Formation IFAPME – méthode d'entraînement en résistance élastique";
pres.author = "Formation IFAPME";
const C = pres.SchemeColor;
const OUT = path.join(__dirname, "Entrainement_elastique_IFAPME.pptx");
const LR = 538 / 1200;
const logo = (v) => path.join(__dirname, `logo_ifapme${v}.png`);

async function icon(Comp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: String(size) }));
  return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
}

// ---------- Layouts ----------
const kickerPh = (color) => ({ placeholder: { options: { name: "kicker", type: "body", x: 0.7, y: 0.55, w: 9, h: 0.3, fontFace: "Arial", fontSize: 12, bold: true, color, charSpacing: 4, valign: "middle", align: "left", margin: 0 }, text: "" } });
const titlePh = (color) => ({ placeholder: { options: { name: "title", type: "title", x: 0.7, y: 0.9, w: 10.4, h: 1.05, fontSize: 48, color, valign: "top", align: "left", margin: 0 }, text: "" } });
const sourcePh = (color) => ({ placeholder: { options: { name: "source", type: "body", x: 0.7, y: 6.95, w: 11.0, h: 0.3, fontFace: "Arial", fontSize: 10, color, valign: "middle", align: "left", margin: 0 }, text: "" } });

pres.defineSlideMaster({ title: "COUVERTURE", background: { color: INK }, objects: [] });
pres.defineSlideMaster({
  title: "NOIR", background: { color: INK },
  objects: [
    { image: { path: logo("_blanc"), x: 11.65, y: 0.5, w: 1.0, h: 1.0 * LR, altText: "Logo IFAPME" } },
    kickerPh(C.accent1), titlePh(C.background1), sourcePh(C.text2),
  ],
  slideNumber: { x: 12.15, y: 6.95, w: 0.5, h: 0.3, fontFace: "Arial", fontSize: 10, color: MUTED, align: "right" },
});
pres.defineSlideMaster({
  title: "ACIDE", background: { color: LIME },
  objects: [
    { image: { path: logo("_noir"), x: 11.65, y: 0.5, w: 1.0, h: 1.0 * LR, altText: "Logo IFAPME" } },
    kickerPh(C.text1), sourcePh(C.text1),
  ],
  slideNumber: { x: 12.15, y: 6.95, w: 0.5, h: 0.3, fontFace: "Arial", fontSize: 10, color: INK, align: "right" },
});

// ---------- Helpers ----------
let n = 0;
const id = (s) => `${s}_${++n}`;
function txt(slide, text, opts) {
  slide.addText(text, { isTextBox: true, margin: 0, valign: "top", color: HEX.lt1, fontFace: "Arial", fontSize: 16, objectName: id("texte"), ...opts });
}
const big = (slide, text, opts) => txt(slide, text, { fontFace: "Impact", ...opts });
// Le motif : deux élastiques (vert, rose) présents sur chaque diapositive, animés par Morph (noms "!!")
function bands(slide, a, b) {
  for (const [name, col, g] of [["!!elastique", LIME, a], ["!!elastique2", PINK, b]]) {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: g.x, y: g.y, w: g.w, h: g.h, rotate: g.r || 0, rectRadius: g.rad !== undefined ? g.rad : Math.min(g.w, g.h) / 2,
      fill: { color: g.c || col }, line: { type: "none" }, objectName: name,
    });
  }
}
async function iconCircle(slide, Comp, x, y, d, fill, iconColor) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, objectName: id("pastille") });
  const p = d * 0.27;
  slide.addImage({ data: await icon(Comp, iconColor), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, altText: "", objectName: id("icone") });
}
function content(section, kicker, title, source, master = "NOIR") {
  const s = pres.addSlide({ masterName: master, sectionTitle: section });
  s.addText(kicker, { placeholder: "kicker" });
  if (title) s.addText(title, { placeholder: "title" });
  s.addText("SOURCES  " + source, { placeholder: "source" });
  return s;
}

(async () => {
  // ===== 1. Couverture =====
  pres.addSection({ title: "Ouverture" });
  let s = pres.addSlide({ masterName: "COUVERTURE", sectionTitle: "Ouverture" });
  bands(s, { x: 7.6, y: 5.55, w: 6.6, h: 0.46, r: -24 }, { x: 8.4, y: 1.7, w: 6.2, h: 0.46, r: -24 });
  s.addImage({ path: logo("_blanc"), x: 0.7, y: 0.6, w: 1.6, h: 1.6 * LR, altText: "Logo IFAPME", objectName: "logo" });
  txt(s, "FORMATION IFAPME  ·  RENFORCEMENT MUSCULAIRE", { x: 0.7, y: 1.95, w: 8, h: 0.3, fontSize: 12, bold: true, color: LIME, charSpacing: 4 });
  big(s, "S'ENTRAÎNER À", { x: 0.7, y: 2.45, w: 9, h: 0.95, fontSize: 60 });
  big(s, "L'ÉLASTIQUE", { x: 0.62, y: 3.5, w: 10, h: 2.0, fontSize: 140, color: LIME });
  txt(s, "Comprendre  ·  Prouver  ·  Programmer  ·  Sécuriser", { x: 0.7, y: 5.7, w: 8, h: 0.4, fontSize: 18, color: MUTED });
  s.addNotes(`[30 s] Bonsoir à tous. Ce soir : un outil qui tient dans une poche et qui coûte moins cher qu'un abonnement d'un mois — l'élastique.
Le plan en 4 temps : comprendre comment ça marche, prouver que ça marche, programmer une séance, et la pratiquer en sécurité.
Chaque affirmation est sourcée en bas de diapositive ; la bibliographie complète est sur la dernière diapositive et dans les notes.`);

  // ===== 2. Accroche =====
  s = content("Ouverture", "LA QUESTION DU JOUR", null, "réponse et références à la diapositive 5.");
  bands(s, { x: 0.7, y: 6.05, w: 2.6, h: 0.3 }, { x: 12.25, y: 2.5, w: 0.3, h: 1.6 });
  big(s, [
    { text: "UN SIMPLE ÉLASTIQUE", options: { color: LIME, breakLine: true } },
    { text: "PEUT-IL REMPLACER", options: { breakLine: true } },
    { text: "UNE MACHINE DE MUSCU ?" },
  ], { x: 0.7, y: 1.35, w: 11.2, h: 4.2, fontSize: 72, lineSpacingMultiple: 0.95 });
  txt(s, "Réponse dans trois diapositives.", { x: 0.7, y: 5.55, w: 8, h: 0.4, fontSize: 18, color: MUTED });
  s.addNotes(`[45 s] Posez la question au groupe et faites voter à main levée : qui pense que oui ? qui pense que non ?
Ne donnez pas la réponse tout de suite : on y revient à la diapositive 5 avec les études. Ça crée l'attente et réveille la salle.`);

  // ===== 3. Principe =====
  pres.addSection({ title: "Comprendre" });
  s = content("Comprendre", "01  ·  LE PRINCIPE", "PLUS ÇA S'ÉTIRE, PLUS ÇA RÉSISTE", "Simoneau et al., JOSPT 2001 ; McMaster, Cronin & McGuigan, Strength Cond J 2009.");
  const rows = [["AU REPOS", 2.0, 0.5, "+", MUTED], ["ÉTIRÉ ×2", 4.4, 0.38, "++", "B5B5C0"], ["ÉTIRÉ ×3", 7.0, 0.28, "+++", LIME]];
  rows.forEach(([lab, len, h, plus, col], i) => {
    const y = 2.55 + i * 1.12;
    txt(s, lab, { x: 0.7, y: y - 0.05, w: 1.6, h: 0.45, fontSize: 14, bold: true, color: MUTED, charSpacing: 2, valign: "middle" });
    if (i < 2) s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 2.45, y: y + 0.2 - h / 2, w: len, h, rectRadius: h / 2, fill: { color: HEX.accent3 }, line: { type: "none" }, objectName: id("bande") });
    big(s, plus, { x: 2.45 + len + 0.3, y: y - 0.2, w: 1.6, h: 0.8, fontSize: 40, color: col, valign: "middle" });
  });
  bands(s, { x: 2.45, y: 4.79 + 0.2 - 0.14, w: 7.0, h: 0.28 }, { x: 12.25, y: 2.5, w: 0.3, h: 1.6 });
  txt(s, [{ text: "Faible au départ, ", options: { color: HEX.lt1 } }, { text: "maximale en fin de mouvement.", options: { color: LIME, bold: true } }],
    { x: 0.7, y: 5.75, w: 9.5, h: 0.5, fontSize: 22 });
  txt(s, "Loi de Hooke  ·  F = k · Δx", { x: 0.7, y: 6.3, w: 6, h: 0.35, fontSize: 14, color: MUTED });
  s.addNotes(`[1 min 30] Le cœur de la méthode : une résistance VARIABLE.
Une haltère pèse le même poids du début à la fin du mouvement. L'élastique, lui, oppose une tension qui augmente avec l'étirement (loi de Hooke : la force est proportionnelle à l'allongement).
Conséquences pratiques :
• Facile en début de mouvement, dur en fin d'amplitude.
• Pas besoin de gravité : on peut tirer dans toutes les directions (rotations, mouvements sportifs).
• Repère sécurité : au-delà d'environ 2,5 fois la longueur de repos, le risque de rupture augmente.
Démo conseillée : étirez une bande devant le groupe et faites sentir la différence à un volontaire.
Sources : Simoneau et al. 2001 ; McMaster et al. 2009 ; valeurs de référence de tension : Uchida et al. 2016.`);

  // ===== 4. Matériel =====
  s = content("Comprendre", "02  ·  LE MATÉRIEL", "4 OUTILS, 1 CODE COULEUR", "Page & Ellenbecker, Human Kinetics 2003 ; Uchida et al., J Phys Ther Sci 2016 ; gamme Thera-Band.");
  const gear = [[fa.FaRibbon, "BANDE PLATE", "Rééducation, seniors"], [fa.FaGripLines, "TUBE À POIGNÉES", "Renfo général"], [fa.FaCircleNotch, "MINI-BAND", "Hanches, fessiers"], [fa.FaDumbbell, "POWER BAND", "Sport, tractions"]];
  for (let i = 0; i < gear.length; i++) {
    const [ic, h, d] = gear[i];
    const x = 0.7 + i * 3.0;
    await iconCircle(s, ic, x, 2.3, 1.0, SURF, LIME);
    big(s, h, { x, y: 3.5, w: 2.8, h: 0.6, fontSize: 28 });
    txt(s, d, { x, y: 4.1, w: 2.8, h: 0.4, fontSize: 16, color: MUTED });
  }
  txt(s, "DU + LÉGER", { x: 0.7, y: 5.45, w: 1.6, h: 0.4, fontSize: 12, bold: true, color: MUTED, charSpacing: 2, valign: "middle" });
  txt(s, "AU + FORT", { x: 10.25, y: 5.45, w: 1.4, h: 0.4, fontSize: 12, bold: true, color: MUTED, charSpacing: 2, valign: "middle" });
  bands(s, { x: 2.35, y: 5.52, w: 7.7, h: 0.26 }, { x: 12.25, y: 2.5, w: 0.3, h: 1.6 });
  ["F6D743", "D63A2F", "2E9E4F", "3B6CC4", "111111", "B8BEC6", "C9A227"].forEach((col, i) => {
    s.addShape(pres.shapes.OVAL, { x: 2.6 + i * 1.08, y: 5.35, w: 0.6, h: 0.6, fill: { color: col }, line: { color: INK, width: 3 }, objectName: id("couleur") });
  });
  txt(s, "Jaune → Rouge → Vert → Bleu → Noir → Argent → Or   (Thera-Band — varie selon la marque)", { x: 2.35, y: 6.1, w: 9, h: 0.35, fontSize: 13, color: MUTED });
  s.addNotes(`[1 min] Quatre familles d'élastiques :
• Bande plate : rééducation, seniors, échauffement ; très modulable (on la raccourcit, on fait des nœuds).
• Tube à poignées : renforcement général, circuits ; s'accroche à une porte avec un ancrage.
• Mini-band (boucle courte) : membres inférieurs, hanches, activation des fessiers.
• Power band (grosse boucle) : tractions assistées, sportifs, combinaison avec une barre.
Le code couleur indique la résistance — ici la gamme Thera-Band, du jaune (le plus léger) à l'or (le plus fort). ATTENTION : il n'est pas universel, chaque marque a le sien. Toujours vérifier la fiche du fabricant. Proposer des bandes sans latex en cas d'allergie.
Sources : Page & Ellenbecker 2003 ; Uchida et al. 2016.`);

  // ===== 5. La réponse : OUI =====
  pres.addSection({ title: "Prouver" });
  s = content("Prouver", "03  ·  CE QUE DIT LA SCIENCE", null,
    "Lopes et al., SAGE Open Med 2019 ; Aboodarda et al., Clin Biomech 2016 ; Colado & Triplett, JSCR 2008 ; Martins et al., Arch Gerontol Geriatr 2013.", "ACIDE");
  bands(s, { x: 7.0, y: 6.15, w: 5.9, h: 0.3, c: INK }, { x: 0.75, y: 5.55, w: 2.4, h: 0.3 });
  big(s, "OUI.", { x: 0.55, y: 0.95, w: 6.2, h: 4.2, fontSize: 250, color: INK, valign: "middle" });
  txt(s, "Mêmes gains de force qu'avec des machines ou des haltères.", { x: 6.9, y: 1.6, w: 5.2, h: 1.4, fontSize: 28, bold: true, color: INK });
  const proofs = [["MÉTA-ANALYSE", "Force équivalente", "Lopes 2019"], ["MÉTA-ANALYSE", "Activation musculaire comparable", "Aboodarda 2016"], ["ESSAI 10 SEMAINES", "Résultats = machines", "Colado 2008"], ["REVUE SYSTÉMATIQUE", "Efficace chez les seniors", "Martins 2013"]];
  proofs.forEach(([t, h, r], i) => {
    const y = 3.2 + i * 0.68;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.9, y, w: 5.75, h: 0.54, rectRadius: 0.27, fill: { color: INK }, line: { type: "none" }, objectName: id("preuve") });
    txt(s, [{ text: h, options: { bold: true, color: HEX.lt1 } }, { text: "   " + r, options: { color: LIME } }], { x: 7.15, y, w: 5.3, h: 0.54, fontSize: 15, valign: "middle" });
  });
  s.addNotes(`[1 min 30] Réponse à la question du début : OUI.
• Lopes et al. 2019 (méta-analyse) : l'entraînement avec élastiques produit des gains de force similaires à l'entraînement « classique » (machines, poids libres), chez des personnes saines comme chez des patients.
• Aboodarda et al. 2016 (méta-analyse) : l'activation musculaire (EMG) est comparable entre élastique et charge classique.
• Colado & Triplett 2008 : 10 semaines, femmes sédentaires d'âge moyen — résultats équivalents aux machines.
• Martins et al. 2013 : chez les seniors, amélioration significative de la force.
Nuance honnête : la plupart des études portent sur des débutants à intermédiaires. Pour des athlètes très forts, l'élastique se combine plutôt à la barre (diapositive suivante).`);

  // ===== 6. Pour qui =====
  s = content("Prouver", "04  ·  POUR QUI ?", "POUR TOUT LE MONDE", "Martins et al., 2013 ; Anderson, Sforzo & Sigg, JSCR 2008 ; Andersen et al., Phys Ther 2010 ; OMS 2020.");
  bands(s, { x: 0.7, y: 2.2, w: 0.3, h: 4.3 }, { x: 12.25, y: 2.5, w: 0.3, h: 1.6 });
  const pub = [["RÉÉDUCATION", "Reprise en douceur, avec le kiné"], ["SENIORS", "Force, équilibre, autonomie"], ["SPORTIFS", "Barre + élastique = plus de puissance"], ["ENTREPRISE & DOMICILE", "Peu de place, petit budget"]];
  pub.forEach(([h, d], i) => {
    const y = 2.15 + i * 1.1;
    big(s, h, { x: 1.35, y, w: 5.6, h: 0.85, fontSize: 44, color: i % 2 ? HEX.lt1 : LIME, valign: "middle" });
    txt(s, d, { x: 7.1, y, w: 4.9, h: 0.85, fontSize: 20, color: MUTED, valign: "middle" });
  });
  s.addNotes(`[1 min] Quatre publics :
• Rééducation : charge faible en position d'étirement, idéale pour la reprise — toujours en lien avec le kinésithérapeute ; restez dans votre champ de compétence.
• Seniors : force, équilibre, autonomie (Martins et al. 2013). Pour la prévention des chutes, à combiner avec des exercices d'équilibre.
• Sportifs : Anderson et al. 2008 — 7 semaines, athlètes ; le groupe barre + élastiques a progressé davantage en force et en puissance que la barre seule.
• Entreprise et domicile : pauses actives, coaching à distance. L'OMS recommande au moins 2 séances de renforcement par semaine : l'élastique lève l'obstacle du matériel.`);

  // ===== 7. Pour / contre =====
  s = content("Prouver", "05  ·  LE BILAN", "LE POUR ET LE CONTRE", "Page & Ellenbecker, 2003 ; McMaster et al., 2009 ; Lopes et al., 2019.");
  bands(s, { x: 6.55, y: 2.1, w: 0.22, h: 4.5 }, { x: 7.2, y: 2.68, w: 0.8, h: 0.22 });
  const pc = [["+", LIME, ["Léger, pas cher", "Toutes les directions", "Doux pour la reprise", "Pas d'élan, pas de triche"]],
    ["−", PINK, ["Pas de kilos affichés", "Faible en début de mouvement", "Limité pour les très forts", "S'use, peut casser · latex"]]];
  pc.forEach(([sym, col, items], i) => {
    const x = 0.7 + i * 6.45;
    if (i === 0) big(s, sym, { x, y: 1.95, w: 1.2, h: 1.6, fontSize: 110, color: col, valign: "middle" });
    txt(s, items.map((t, k) => ({ text: t, options: { breakLine: k < items.length - 1 } })), { x: x + 1.35, y: 2.3, w: 4.6, h: 4.2, fontSize: 20, paraSpaceAfter: 26, bold: true });
  });
  s.addNotes(`[1 min] Atouts : léger, peu coûteux, transportable ; travail dans toutes les directions, proche des gestes de la vie et du sport ; charge faible en position étirée, donc adapté à la reprise ; peu d'inertie, donc moins de triche par l'élan.
Limites : on ne lit pas de kilos, il faut doser au ressenti (diapositive 8) ; résistance faible en début de mouvement ; plafond de charge pour les sportifs très entraînés ; usure, risque de rupture, allergie au latex.
Question au groupe : dans votre futur métier, où les atouts l'emportent-ils ?`);

  // ===== 8. Dosage =====
  pres.addSection({ title: "Programmer" });
  s = content("Programmer", "06  ·  LE DOSAGE", "LA RECETTE", "ACSM Position Stand, MSSE 2009 ; OMS 2020 (Bull et al., BJSM) ; Colado et al., JSCR 2012 (échelle OMNI-RES).");
  const dose = [["2-3", "SÉANCES / SEMAINE", LIME], ["8-12", "RÉPÉTITIONS", LIME], ["1-3", "SÉRIES", LIME], ["7-8", "SUR 10 D'EFFORT", PINK]];
  dose.forEach(([num, lab, col], i) => {
    const x = 0.7 + i * 3.05;
    big(s, num, { x, y: 1.95, w: 2.9, h: 1.75, fontSize: 110, color: col, valign: "middle" });
    txt(s, lab, { x, y: 3.75, w: 2.9, h: 0.35, fontSize: 14, bold: true, color: HEX.lt1, charSpacing: 2 });
  });
  bands(s, { x: 0.7, y: 4.85, w: 0.3, h: 0.3, c: LIME }, { x: 8.06, y: 5.33, w: 1.84, h: 0.08 });
  for (let k = 0; k <= 10; k++) {
    const on = k === 7 || k === 8;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 1.2 + k * 0.98, y: 4.75, w: 0.88, h: 0.5, rectRadius: 0.1, fill: { color: on ? PINK : SURF }, line: { type: "none" }, objectName: id("omni") });
    txt(s, String(k), { x: 1.2 + k * 0.98, y: 4.75, w: 0.88, h: 0.5, fontSize: 16, bold: true, align: "center", valign: "middle", color: on ? HEX.lt1 : MUTED });
  }
  txt(s, [{ text: "Échelle OMNI-RES : ", options: { color: MUTED } }, { text: "finir la série « difficile », jamais à l'échec.", options: { bold: true } }],
    { x: 1.2, y: 5.55, w: 10.6, h: 0.5, fontSize: 20 });
  s.addNotes(`[1 min 30] La recette pour un public débutant à intermédiaire :
• 2 à 3 séances par semaine (l'OMS recommande au moins 2 jours de renforcement musculaire).
• 8 à 12 répétitions par série, 1 à 3 séries par exercice, 1 à 2 minutes de récupération (ACSM 2009).
• Intensité : comme on ne lit pas de kilos sur un élastique, on utilise l'échelle d'effort perçu OMNI-RES de 0 à 10, validée avec des bandes élastiques (Colado et al. 2012). Cible : 7-8 sur 10 en fin de série.
Choisir la couleur : celle qui permet de faire les répétitions visées avec une technique propre, en finissant « difficile » mais sans aller à l'échec.`);

  // ===== 9. Progression =====
  s = content("Programmer", "07  ·  PROGRESSER", "5 LEVIERS, DANS L'ORDRE", "ACSM Position Stand, 2009 (surcharge progressive) ; Page & Ellenbecker, 2003.");
  txt(s, [{ text: "Série réussie 2 séances de suite ? ", options: { color: MUTED } }, { text: "→ levier suivant.", options: { bold: true, color: LIME } }],
    { x: 0.7, y: 1.95, w: 10, h: 0.4, fontSize: 18 });
  const lv = [["TECHNIQUE", "Amplitude contrôlée"], ["VOLUME", "+ reps, + séries"], ["PRÉ-TENSION", "Reculer de l'ancrage"], ["RÉSISTANCE", "Couleur au-dessus"], ["TEMPO", "Freiner le retour"]];
  const bw = 2.25, bottom = 6.6;
  lv.forEach(([h, d], i) => {
    const x = 0.7 + i * 2.43, hh = 0.9 + i * 0.5, top = bottom - hh;
    if (i < 4) s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: top, w: bw, h: hh, rectRadius: 0.12, fill: { color: SURF }, line: { type: "none" }, objectName: id("marche") });
    if (i < 4) big(s, String(i + 1), { x: x + 0.2, y: top + 0.05, w: 1, h: 0.8, fontSize: 40, color: LIME });
    big(s, h, { x, y: top - 0.95, w: bw + 0.1, h: 0.5, fontSize: 26 });
    txt(s, d, { x, y: top - 0.45, w: bw, h: 0.35, fontSize: 14, color: MUTED });
  });
  // le dernier palier est l'élastique vert lui-même (Morph : il s'étire en marche)
  bands(s, { x: 0.7 + 4 * 2.43, y: bottom - 2.9, w: bw, h: 2.9, rad: 0.12 }, { x: 7.6, y: 2.07, w: 0.9, h: 0.16 });
  // replacer le chiffre 5 au-dessus de l'élastique
  big(s, "5", { x: 0.7 + 4 * 2.43 + 0.2, y: bottom - 2.9 + 0.05, w: 1, h: 0.8, fontSize: 40, color: INK });
  s.addNotes(`[1 min 30] Pour faire progresser, on actionne les leviers DANS CET ORDRE, un seul à la fois :
1. Technique : amplitude complète et contrôlée avant tout.
2. Volume : ajouter des répétitions, puis des séries.
3. Pré-tension : levier propre à l'élastique — s'éloigner du point d'ancrage ou raccourcir la bande ; plus on part tendu, plus c'est dur sur toute l'amplitude.
4. Résistance : passer à la couleur supérieure ou doubler la bande.
5. Tempo : freiner le retour (2-3 secondes en excentrique).
Règle pratique : quand la série cible est réussie deux séances de suite avec un effort ≤ 6/10, on passe au levier suivant (adaptation de la règle « 2 pour 2 » de l'ACSM).`);

  // ===== 10. Exercices =====
  s = content("Programmer", "08  ·  LA SÉANCE TYPE", "6 EXERCICES, TOUT LE CORPS", "Andersen et al., Phys Ther 2010 ; Page & Ellenbecker, 2003 ; ACSM, 2009.");
  bands(s, { x: 0.7, y: 6.45, w: 11.9, h: 0.12 }, { x: 0.7, y: 6.45, w: 2.0, h: 0.12 });
  const ex = [[fa.FaChild, "SQUAT", "Jambes"], [fa.FaArrowsAltH, "ROWING", "Dos, posture"], [fa.FaHandPaper, "DÉVELOPPÉ", "Pectoraux"], [fa.FaBed, "PONT FESSIER", "Fessiers"], [fa.FaSyncAlt, "ROTATION ÉP.", "Épaules (coiffe)"], [fa.FaCompressArrowsAlt, "PALLOF PRESS", "Gainage"]];
  for (let i = 0; i < ex.length; i++) {
    const [ic, h, d] = ex[i];
    const c = i % 3, r = Math.floor(i / 3);
    const x = 0.7 + c * 3.85, y = 2.2 + r * 2.0;
    await iconCircle(s, ic, x, y + 0.1, 0.95, SURF, LIME);
    big(s, `0${i + 1}`, { x: x + 1.2, y, w: 1, h: 0.4, fontSize: 18, color: PINK });
    big(s, h, { x: x + 1.2, y: y + 0.38, w: 2.55, h: 0.6, fontSize: 28 });
    txt(s, d, { x: x + 1.2, y: y + 0.98, w: 2.5, h: 0.35, fontSize: 16, color: MUTED });
  }
  s.addNotes(`[1 min 30] Une séance complète et équilibrée : pousser, tirer, jambes, tronc.
1. Squat : bande sous les pieds, poignées aux épaules.
2. Rowing assis : ancrage devant, tirer les coudes le long du corps.
3. Développé debout : ancrage derrière, pousser vers l'avant.
4. Pont fessier : mini-band au-dessus des genoux, pousser les genoux vers l'extérieur.
5. Rotation externe d'épaule : coude collé au corps, avant-bras vers l'extérieur — la coiffe des rotateurs.
6. Pallof press : ancrage sur le côté, bras tendus devant, on résiste à la rotation.
Andersen et al. 2010 : activation musculaire comparable aux haltères sur des exercices d'épaule. Idéal : faire une démonstration de 2-3 exercices.`);

  // ===== 11. Sécurité =====
  pres.addSection({ title: "Sécuriser" });
  s = content("Sécuriser", "09  ·  SÉCURITÉ", "AVANT, PENDANT, APRÈS", "Page & Ellenbecker, 2003 ; Simoneau et al., 2001 ; recommandations du fabricant (Thera-Band).");
  bands(s, { x: 0.7, y: 2.15, w: 11.95, h: 0.12, c: HEX.accent3 }, { x: 0.7, y: 2.1, w: 3.6, h: 0.22 });
  const sec = [["AVANT", ["Inspecter la bande : entaille = poubelle", "Allergie au latex ? Bande sans latex"]],
    ["PENDANT", ["Ancrage solide, jamais à hauteur du visage", "Max 2,5 × la longueur de repos", "Ne jamais lâcher une bande tendue"]],
    ["APRÈS", ["Ranger à l'abri du soleil et de la chaleur"]]];
  sec.forEach(([h, items], i) => {
    const x = 0.7 + i * 4.1;
    big(s, h, { x, y: 2.55, w: 3.8, h: 0.8, fontSize: 46, color: i === 0 ? PINK : HEX.lt1 });
    txt(s, items.map((t, k) => ({ text: t, options: { breakLine: k < items.length - 1 } })), { x, y: 3.55, w: 3.7, h: 3.0, fontSize: 19, paraSpaceAfter: 16, color: "D9D9E0" });
  });
  s.addNotes(`[1 min] Le principal risque : la rupture d'une bande tendue, avec un choc au visage ou aux yeux.
AVANT : inspecter chaque bande (entailles, zones blanchies, poignées abîmées) — au moindre doute, on remplace. Demander les allergies : proposer du sans latex.
PENDANT : ancrage sur un point fixe, porte fermée du bon côté, jamais à hauteur du visage ; ne pas étirer au-delà d'environ 2,5 fois la longueur de repos ; contrôler le retour, ne jamais lâcher une bande tendue.
APRÈS : stocker à l'abri du soleil, de la chaleur et des objets coupants.
Démonstration conseillée : montrer comment inspecter une bande.`);

  // ===== 12. À retenir + références =====
  pres.addSection({ title: "Conclusion" });
  s = content("Conclusion", "À RETENIR", null, "bibliographie complète dans les notes de cette diapositive.");
  bands(s, { x: 9.1, y: 6.25, w: 3.2, h: 0.34, r: -22 }, { x: 9.1, y: 6.25, w: 3.2, h: 0.34, r: 22 });
  const keys = [["ÇA RÉSISTE QUAND ÇA S'ÉTIRE.", HEX.lt1], ["ÇA MARCHE AUTANT QUE LA FONTE.", LIME], ["ON DOSE AU RESSENTI : 7-8/10.", HEX.lt1], ["LA SÉCURITÉ D'ABORD.", PINK]];
  keys.forEach(([t, col], i) => {
    const y = 0.95 + i * 0.82;
    big(s, `0${i + 1}`, { x: 0.7, y, w: 0.8, h: 0.75, fontSize: 22, color: MUTED, valign: "middle" });
    big(s, t, { x: 1.5, y, w: 7.4, h: 0.75, fontSize: 40, color: col, valign: "middle" });
  });
  txt(s, "RÉFÉRENCES", { x: 0.7, y: 4.45, w: 4, h: 0.3, fontSize: 11, bold: true, color: LIME, charSpacing: 4 });
  const refs = [
    "ACSM (2009) · Med Sci Sports Exerc 41(3)", "Aboodarda et al. (2016) · Clin Biomech 39", "Andersen et al. (2010) · Phys Ther 90(4)",
    "Anderson et al. (2008) · J Strength Cond Res 22(2)", "Bull et al. – OMS (2020) · Br J Sports Med 54", "Colado & Triplett (2008) · JSCR 22(5)",
    "Colado et al. (2012) · JSCR 26(11)", "Lopes et al. (2019) · SAGE Open Med 7", "Martins et al. (2013) · Arch Gerontol Geriatr 57(1)",
    "McMaster et al. (2009) · Strength Cond J 31(1)", "Page & Ellenbecker (2003) · Human Kinetics", "Simoneau et al. (2001) · JOSPT 31(1)",
    "Uchida et al. (2016) · J Phys Ther Sci 28(4)",
  ];
  [refs.slice(0, 5), refs.slice(5, 10), refs.slice(10)].forEach((col, i) => {
    txt(s, col.map((r, k) => ({ text: r, options: { breakLine: k < col.length - 1 } })), { x: 0.7 + i * 4.05, y: 4.85, w: 3.9, h: 1.9, fontSize: 10, color: MUTED, paraSpaceAfter: 4 });
  });
  s.addNotes(`[1 min] Les quatre messages à emporter : 1) la résistance augmente avec l'étirement ; 2) c'est aussi efficace que les charges classiques ; 3) on dose au ressenti, 7-8 sur 10 ; 4) la sécurité d'abord. Proposer ensuite la mise en pratique : chaque stagiaire construit une mini-séance de 6 exercices avec choix des couleurs et dosage.

BIBLIOGRAPHIE COMPLÈTE (APA)
ACSM (2009). Progression models in resistance training for healthy adults. Medicine & Science in Sports & Exercise, 41(3), 687-708.
Aboodarda, S.J., Page, P.A., & Behm, D.G. (2016). Muscle activation comparisons between elastic and isoinertial resistance: a meta-analysis. Clinical Biomechanics, 39, 52-61.
Andersen, L.L. et al. (2010). Muscle activation and perceived loading during rehabilitation exercises: comparison of dumbbells and elastic resistance. Physical Therapy, 90(4), 538-549.
Anderson, C.E., Sforzo, G.A., & Sigg, J.A. (2008). The effects of combining elastic and free weight resistance on strength and power in athletes. Journal of Strength and Conditioning Research, 22(2), 567-574.
Bull, F.C. et al. (2020). World Health Organization 2020 guidelines on physical activity and sedentary behaviour. British Journal of Sports Medicine, 54, 1451-1462.
Colado, J.C., & Triplett, N.T. (2008). Effects of a short-term resistance program using elastic bands versus weight machines for sedentary middle-aged women. JSCR, 22(5), 1441-1448.
Colado, J.C. et al. (2012). Concurrent validation of the OMNI-Resistance Exercise Scale of perceived exertion with Thera-Band resistance bands. JSCR, 26(11), 3018-3024.
Lopes, J.S.S. et al. (2019). Effects of training with elastic resistance versus conventional resistance on muscular strength: a systematic review and meta-analysis. SAGE Open Medicine, 7.
Martins, W.R. et al. (2013). Elastic resistance training to increase muscle strength in elderly: a systematic review with meta-analysis. Archives of Gerontology and Geriatrics, 57(1), 8-15.
McMaster, D.T., Cronin, J., & McGuigan, M. (2009). Forms of variable resistance training. Strength and Conditioning Journal, 31(1), 50-64.
Page, P., & Ellenbecker, T.S. (2003). The Scientific and Clinical Application of Elastic Resistance. Champaign, IL: Human Kinetics.
Simoneau, G.G. et al. (2001). Biomechanics of elastic resistance in therapeutic exercise programs. Journal of Orthopaedic & Sports Physical Therapy, 31(1), 16-24.
Uchida, M.C. et al. (2016). Thera-band elastic band tension: reference values for physical activity. Journal of Physical Therapy Science, 28(4), 1266-1271.`);

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  execFileSync("python3", [path.join(__dirname, "add_transitions.py"), OUT], { stdio: "inherit" });
  console.log("OK", OUT);
})();
