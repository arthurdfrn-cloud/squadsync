// Génère "Entrainement_elastique_IFAPME.pptx" (12 diapositives)
// Usage : node build.js  (nécessite pptxgenjs, react, react-dom, react-icons, sharp)
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const { applyTheme } = require(process.env.APPLY_THEME || "./apply_theme.js");

const THEME = {
  name: "Elastique IFAPME",
  headFontFace: "Calibri",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1E2230", // encre
    lt1: "FFFFFF",
    dk2: "4A5163", // gris ardoise (texte secondaire)
    lt2: "F1F3F6", // fond de carte
    accent1: "E4572E", // rouge-corail (bande "rouge")
    accent2: "F2A541", // jaune-orangé (bande "jaune")
    accent3: "2A9D8F", // vert-teal (bande "verte")
    accent4: "3D5A80", // bleu (bande "bleue")
    accent5: "8D99AE",
    accent6: "1E2230",
    hlink: "E4572E",
    folHlink: "8D99AE",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "L'entraînement avec élastiques";
pres.subject = "Formation IFAPME – méthode d'entraînement en résistance élastique";
pres.author = "Formation IFAPME";
const C = pres.SchemeColor;
const W = 13.333;

// ---------- Icônes ----------
async function icon(Comp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Comp, { color: "#" + color, size: String(size) })
  );
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// ---------- Layouts ----------
pres.defineSlideMaster({
  title: "TITRE_SOMBRE",
  background: { color: HEX.dk1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.2, w: 8.4, h: 1.9, fontSize: 48, bold: true, color: C.background1, valign: "bottom", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.3, w: 8.4, h: 1.0, fontSize: 20, color: C.accent2, valign: "top", align: "left", margin: 0 }, text: "" } },
  ],
});

pres.defineSlideMaster({
  title: "CONTENU",
  background: { color: HEX.lt1 },
  margin: [0.5, 0.6, 0.8, 0.6],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.4, w: 11.6, h: 0.9, fontSize: 34, bold: true, color: C.text1, valign: "middle", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "source", type: "body", x: 0.6, y: 6.85, w: 10.8, h: 0.4, fontSize: 10, italic: true, color: C.text2, valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "IFAPME · Résistance élastique", options: { x: 0.6, y: 7.18, w: 5, h: 0.25, fontSize: 9, color: HEX.accent5, margin: 0 } } },
  ],
  slideNumber: { x: 12.3, y: 6.9, w: 0.5, h: 0.35, fontSize: 10, color: HEX.dk2, align: "right" },
});

pres.defineSlideMaster({
  title: "CONCLUSION",
  background: { color: HEX.dk1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.4, w: 11.6, h: 0.9, fontSize: 34, bold: true, color: C.background1, valign: "middle", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 12.3, y: 6.9, w: 0.5, h: 0.35, fontSize: 10, color: HEX.accent5, align: "right" },
});

// ---------- Helpers ----------
let n = 0;
const id = (s) => `${s}_${++n}`;

function card(slide, x, y, w, h, fill = C.background2) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { type: "none" }, objectName: id("carte"),
  });
}
async function iconCircle(slide, Comp, x, y, d, fill, iconColor = HEX.lt1) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, objectName: id("pastille") });
  const p = d * 0.25;
  slide.addImage({ data: await icon(Comp, iconColor), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, altText: "", objectName: id("icone") });
}
function txt(slide, text, opts) {
  slide.addText(text, { isTextBox: true, margin: 0, valign: "top", color: C.text1, fontSize: 14, objectName: id("texte"), ...opts });
}
function content(section, title, source) {
  const s = pres.addSlide({ masterName: "CONTENU", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  s.addText("Sources : " + source, { placeholder: "source" });
  return s;
}

(async () => {
  // ===== 1. Titre =====
  pres.addSection({ title: "Introduction" });
  let s = pres.addSlide({ masterName: "TITRE_SOMBRE", sectionTitle: "Introduction" });
  s.addText("L'entraînement avec élastiques", { placeholder: "title" });
  s.addText("Méthode, principes et mise en pratique", { placeholder: "body" });
  txt(s, "Formation IFAPME · Module renforcement musculaire", { x: 0.8, y: 6.5, w: 8, h: 0.4, fontSize: 14, color: HEX.accent5 });
  // Motif : bandes élastiques stylisées (code couleur)
  const bands = [HEX.accent2, HEX.accent1, HEX.accent3, HEX.accent4, "8D99AE"];
  bands.forEach((col, i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 9.9 + i * 0.6, y: 1.2 + i * 0.35, w: 0.38, h: 5.0 - i * 0.35, rectRadius: 0.19,
      fill: { color: col }, line: { type: "none" }, objectName: id("bande"),
    });
  });
  s.addNotes("Accueil. Objectif : maîtriser les principes de la résistance élastique pour l'utiliser de façon sûre et efficace avec différents publics. Chaque diapositive cite ses sources ; la bibliographie complète est en fin de présentation.");

  // ===== 2. Objectifs / sommaire =====
  s = content("Introduction", "Ce que vous saurez faire à la fin du module", "Référentiel métier IFAPME (compétences visées) ; ACSM, 2009.");
  const goals = [
    [fa.FaAtom, "Comprendre", "Le principe physique d'une résistance qui augmente avec l'étirement", HEX.accent1],
    [fa.FaFlask, "Justifier", "L'efficacité de la méthode à partir des données scientifiques", HEX.accent2],
    [fa.FaSlidersH, "Programmer", "Choisir la résistance, doser et faire progresser une séance", HEX.accent3],
    [fa.FaShieldAlt, "Sécuriser", "Encadrer la pratique et entretenir le matériel", HEX.accent4],
  ];
  for (let i = 0; i < goals.length; i++) {
    const [ic, h, d, col] = goals[i];
    const x = 0.6 + i * 3.04;
    card(s, x, 1.8, 2.74, 4.5);
    await iconCircle(s, ic, x + 0.35, 2.15, 0.95, col);
    txt(s, `0${i + 1}`, { x: x + 1.6, y: 2.25, w: 0.9, h: 0.6, fontSize: 28, bold: true, color: col, align: "right" });
    txt(s, h, { x: x + 0.35, y: 3.4, w: 2.1, h: 0.5, fontSize: 22, bold: true });
    txt(s, d, { x: x + 0.35, y: 4.0, w: 2.1, h: 2.0, fontSize: 15, color: C.text2 });
  }
  s.addNotes("Présenter les 4 compétences. Le fil rouge : comprendre → justifier → programmer → sécuriser.");

  // ===== 3. Principe physique =====
  pres.addSection({ title: "Comprendre" });
  s = content("Comprendre", "Une résistance qui augmente avec l'étirement",
    "Simoneau et al., JOSPT 2001 ; McMaster, Cronin & McGuigan, Strength Cond J 2009 ; Uchida et al., J Phys Ther Sci 2016.");
  txt(s, "Loi de Hooke : F = k · Δx", { x: 0.6, y: 1.7, w: 5.4, h: 0.6, fontSize: 24, bold: true, color: C.accent1 });
  txt(s, [
    { text: "Plus l'élastique s'allonge, plus la tension est forte : c'est une résistance variable.", options: { bullet: true, breakLine: true } },
    { text: "La charge est minimale en début de mouvement et maximale en fin d'amplitude.", options: { bullet: true, breakLine: true } },
    { text: "Contrairement à un haltère, la résistance ne dépend pas de la gravité : on peut tirer dans toutes les directions.", options: { bullet: true, breakLine: true } },
    { text: "Repère utile : au-delà d'environ 200-250 % d'allongement, le risque de rupture augmente.", options: { bullet: true } },
  ], { x: 0.6, y: 2.45, w: 5.4, h: 4.0, fontSize: 16, paraSpaceAfter: 10 });
  const pct = ["0", "25", "50", "75", "100", "125", "150", "175", "200"];
  s.addChart(pres.charts.LINE, [{ name: "Tension", labels: pct, values: [0, 1.0, 1.8, 2.5, 3.1, 3.7, 4.3, 4.9, 5.5] }], {
    x: 6.5, y: 1.6, w: 6.2, h: 5.0,
    showTitle: true, title: "Tension selon l'allongement (schéma de principe)", titleFontSize: 14, titleColor: HEX.dk1, titleFontFace: "+mn-lt",
    chartColors: [HEX.accent1], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 7,
    showLegend: false, showValue: false,
    showCatAxisTitle: true, catAxisTitle: "Allongement (% de la longueur de repos)", catAxisTitleFontSize: 11, catAxisTitleColor: HEX.dk2,
    showValAxisTitle: true, valAxisTitle: "Tension relative", valAxisTitleFontSize: 11, valAxisTitleColor: HEX.dk2,
    catAxisLabelColor: HEX.dk2, valAxisLabelColor: HEX.dk2, catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", catAxisTitleFontFace: "+mn-lt", valAxisTitleFontFace: "+mn-lt",
    valGridLine: { color: "E3E6EB", size: 0.75 }, catGridLine: { style: "none" },
  });
  s.addNotes("La courbe est illustrative : les valeurs réelles dépendent de la marque, de l'épaisseur et de la couleur (voir Uchida et al. 2016 pour des valeurs de référence Thera-Band). Message clé : la résistance n'est pas constante, elle suit l'étirement.");

  // ===== 4. Matériel =====
  s = content("Comprendre", "Choisir le bon matériel",
    "Page & Ellenbecker, The Scientific and Clinical Application of Elastic Resistance, Human Kinetics 2003 ; Uchida et al., 2016 ; fiches fabricants.");
  const gear = [
    [fa.FaRibbon, "Bandes plates", "Rééducation, seniors, échauffement. Très modulables (longueur, nœuds).", HEX.accent1],
    [fa.FaGripLines, "Tubes à poignées", "Renforcement général, circuits. Prise en main confortable, ancrage de porte.", HEX.accent2],
    [fa.FaCircleNotch, "Mini-bands", "Membres inférieurs, hanche, activation des fessiers.", HEX.accent3],
    [fa.FaDumbbell, "Power bands", "Grosses boucles : tractions assistées, sport, combinaison avec barre.", HEX.accent4],
  ];
  for (let i = 0; i < gear.length; i++) {
    const [ic, h, d, col] = gear[i];
    const y = 1.65 + i * 1.12;
    await iconCircle(s, ic, 0.6, y, 0.8, col);
    txt(s, h, { x: 1.65, y: y, w: 5.2, h: 0.4, fontSize: 18, bold: true });
    txt(s, d, { x: 1.65, y: y + 0.4, w: 5.2, h: 0.6, fontSize: 14, color: C.text2 });
  }
  card(s, 7.4, 1.65, 5.3, 4.9);
  txt(s, "Code couleur : progression de résistance", { x: 7.75, y: 1.9, w: 4.7, h: 0.4, fontSize: 18, bold: true });
  txt(s, "Exemple d'une gamme courante (Thera-Band) – du plus léger au plus fort", { x: 7.75, y: 2.35, w: 4.7, h: 0.5, fontSize: 12, color: C.text2 });
  const levels = [["Jaune", "F6D743"], ["Rouge", "D63A2F"], ["Vert", "2E9E4F"], ["Bleu", "2F5DA8"], ["Noir", "222222"], ["Argent", "B8BEC6"], ["Or", "C9A227"]];
  levels.forEach(([name, col], i) => {
    const y = 2.95 + i * 0.47;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.75, y, w: 1.0 + i * 0.42, h: 0.3, rectRadius: 0.15, fill: { color: col }, line: { type: "none" }, objectName: id("niveau") });
    txt(s, name, { x: 7.75 + 1.1 + i * 0.42, y: y - 0.04, w: 1.3, h: 0.38, fontSize: 13, valign: "middle" });
  });
  s.addNotes("Insister : le code couleur N'EST PAS universel. Toujours vérifier la fiche du fabricant. Préférer le sans-latex en cas d'allergie.");

  // ===== 5. Efficacité =====
  pres.addSection({ title: "Justifier" });
  s = content("Justifier", "Aussi efficace que les charges classiques",
    "Lopes et al., SAGE Open Med 2019 ; Aboodarda, Page & Behm, Clin Biomech 2016 ; Colado & Triplett, JSCR 2008 ; Martins et al., Arch Gerontol Geriatr 2013.");
  const stats = [
    ["=", "Gains de force similaires", "Méta-analyse : résistance élastique vs machines / poids libres chez des adultes sains et des patients", "Lopes et al., 2019", HEX.accent1],
    ["EMG", "Activation musculaire comparable", "Méta-analyse : niveaux d'activation proches entre élastique et charge isoinertielle", "Aboodarda et al., 2016", HEX.accent2],
    ["10 sem.", "Résultats équivalents aux machines", "Femmes sédentaires d'âge moyen : gains de force et de composition corporelle similaires", "Colado & Triplett, 2008", HEX.accent3],
    ["65+", "Efficace chez les seniors", "Revue systématique : amélioration de la force chez la personne âgée", "Martins et al., 2013", HEX.accent4],
  ];
  stats.forEach(([big, h, d, ref, col], i) => {
    const x = 0.6 + i * 3.04;
    card(s, x, 1.7, 2.74, 4.85);
    txt(s, big, { x: x + 0.3, y: 1.95, w: 2.2, h: 1.0, fontSize: 44, bold: true, color: col });
    txt(s, h, { x: x + 0.3, y: 3.05, w: 2.2, h: 0.9, fontSize: 17, bold: true });
    txt(s, d, { x: x + 0.3, y: 4.0, w: 2.2, h: 1.8, fontSize: 13, color: C.text2 });
    txt(s, ref, { x: x + 0.3, y: 5.95, w: 2.2, h: 0.35, fontSize: 11, italic: true, color: col });
  });
  s.addNotes("Message : la résistance élastique n'est pas un 'sous-entraînement'. À intensité perçue équivalente, les gains de force sont comparables. Nuance : les études portent surtout sur des débutants à intermédiaires.");

  // ===== 6. Avantages / limites =====
  s = content("Justifier", "Atouts et limites de la méthode",
    "Page & Ellenbecker, 2003 ; McMaster et al., 2009 ; Lopes et al., 2019.");
  card(s, 0.6, 1.7, 5.85, 4.85);
  card(s, 6.85, 1.7, 5.85, 4.85);
  await iconCircle(s, fa.FaCheck, 0.95, 1.95, 0.7, HEX.accent3);
  await iconCircle(s, fa.FaExclamation, 7.2, 1.95, 0.7, HEX.accent1);
  txt(s, "Atouts", { x: 1.85, y: 2.05, w: 4, h: 0.5, fontSize: 22, bold: true, valign: "middle" });
  txt(s, "Limites", { x: 8.1, y: 2.05, w: 4, h: 0.5, fontSize: 22, bold: true, valign: "middle" });
  txt(s, [
    { text: "Léger, peu coûteux, transportable (domicile, entreprise, extérieur)", options: { bullet: true, breakLine: true } },
    { text: "Travail multidirectionnel, proche des gestes fonctionnels et sportifs", options: { bullet: true, breakLine: true } },
    { text: "Charge faible en position d'étirement : adapté à la reprise", options: { bullet: true, breakLine: true } },
    { text: "Peu d'inertie : moins de « triche » par l'élan", options: { bullet: true } },
  ], { x: 0.95, y: 2.95, w: 5.2, h: 3.4, fontSize: 15, paraSpaceAfter: 10 });
  txt(s, [
    { text: "Charge difficile à quantifier en kg : on dose à la sensation (RPE)", options: { bullet: true, breakLine: true } },
    { text: "Résistance faible en début de mouvement", options: { bullet: true, breakLine: true } },
    { text: "Plafond de charge pour les sportifs très entraînés", options: { bullet: true, breakLine: true } },
    { text: "Usure, risque de rupture, allergie au latex", options: { bullet: true } },
  ], { x: 7.2, y: 2.95, w: 5.2, h: 3.4, fontSize: 15, paraSpaceAfter: 10 });
  s.addNotes("Faire réagir le groupe : dans quels contextes professionnels les atouts l'emportent-ils ?");

  // ===== 7. Dosage =====
  pres.addSection({ title: "Programmer" });
  s = content("Programmer", "Doser une séance : les repères",
    "ACSM Position Stand, Med Sci Sports Exerc 2009 ; OMS, Lignes directrices activité physique 2020 (Bull et al., BJSM) ; Colado et al., JSCR 2012.");
  const dose = [
    ["2-3", "séances / semaine", "Au moins 2 j/semaine de renforcement (OMS 2020)"],
    ["8-12", "répétitions", "Par série, pour un public débutant à intermédiaire (ACSM 2009)"],
    ["1-3", "séries", "Par exercice, récupération 1 à 2 min"],
  ];
  dose.forEach(([big, unit, d], i) => {
    const x = 0.6 + i * 2.6;
    txt(s, big, { x, y: 1.75, w: 2.4, h: 1.0, fontSize: 54, bold: true, color: C.accent1 });
    txt(s, unit, { x, y: 2.8, w: 2.4, h: 0.4, fontSize: 16, bold: true });
    txt(s, d, { x, y: 3.25, w: 2.3, h: 0.9, fontSize: 13, color: C.text2 });
  });
  card(s, 0.6, 4.45, 7.4, 2.1);
  txt(s, "Comment choisir la bonne couleur ?", { x: 0.9, y: 4.65, w: 6.8, h: 0.4, fontSize: 17, bold: true });
  txt(s, "Choisir la résistance qui permet de réaliser le nombre de répétitions visé avec une technique propre, en finissant la série « difficile » sans aller à l'échec.",
    { x: 0.9, y: 5.1, w: 6.8, h: 1.3, fontSize: 14, color: C.text2 });
  // Échelle OMNI-RES
  card(s, 8.4, 1.7, 4.3, 4.85);
  txt(s, "Échelle OMNI-RES (0-10)", { x: 8.7, y: 1.9, w: 3.8, h: 0.4, fontSize: 17, bold: true });
  txt(s, "Validée avec bandes élastiques", { x: 8.7, y: 2.3, w: 3.8, h: 0.3, fontSize: 12, color: C.text2 });
  const omni = [["0-2", "Très facile", "B8E0D9"], ["3-4", "Facile", "7CC6B9"], ["5-6", "Modéré", HEX.accent2], ["7-8", "Difficile  ← zone cible", HEX.accent1], ["9-10", "Extrêmement difficile", "9E2F14"]];
  omni.forEach(([r, l, col], i) => {
    const y = 2.8 + i * 0.68;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.7, y, w: 0.95, h: 0.5, rectRadius: 0.1, fill: { color: col }, line: { type: "none" }, objectName: id("omni") });
    txt(s, r, { x: 8.7, y, w: 0.95, h: 0.5, fontSize: 14, bold: true, align: "center", valign: "middle", color: i >= 3 ? C.background1 : C.text1 });
    txt(s, l, { x: 9.8, y, w: 2.8, h: 0.5, fontSize: 14, valign: "middle", bold: i === 3 });
  });
  s.addNotes("Comme le poids en kg n'est pas lisible sur un élastique, l'intensité se pilote avec l'échelle OMNI-RES (Colado et al. 2012) : viser 7-8 en fin de série pour le renforcement.");

  // ===== 8. Progression =====
  s = content("Programmer", "Faire progresser : 5 leviers, dans cet ordre",
    "ACSM Position Stand, 2009 (principe de surcharge progressive) ; Page & Ellenbecker, 2003.");
  const levers = [
    ["1", "Technique", "Amplitude complète et contrôlée"],
    ["2", "Volume", "+ répétitions, puis + séries"],
    ["3", "Pré-tension", "S'éloigner de l'ancrage ou raccourcir la bande"],
    ["4", "Résistance", "Couleur supérieure ou bande doublée"],
    ["5", "Tempo", "Freiner le retour (2-3 s excentrique)"],
  ];
  const lw = 2.24, gap = 0.1;
  levers.forEach(([num, h, d], i) => {
    const x = 0.6 + i * (lw + gap);
    const col = [HEX.accent3, HEX.accent3, HEX.accent2, HEX.accent1, HEX.accent1][i];
    s.addShape(pres.shapes.CHEVRON, { x, y: 1.9, w: lw, h: 1.1, fill: { color: col }, line: { type: "none" }, objectName: id("etape") });
    txt(s, num, { x: x + 0.3, y: 1.9, w: lw - 0.6, h: 1.1, fontSize: 32, bold: true, color: C.background1, align: "center", valign: "middle" });
    txt(s, h, { x: x + 0.1, y: 3.3, w: lw - 0.2, h: 0.45, fontSize: 18, bold: true });
    txt(s, d, { x: x + 0.1, y: 3.8, w: lw - 0.2, h: 1.0, fontSize: 14, color: C.text2 });
  });
  card(s, 0.6, 5.15, 12.1, 1.4);
  await iconCircle(s, fa.FaLightbulb, 0.9, 5.4, 0.9, HEX.accent2, HEX.dk1);
  txt(s, "Règle pratique : quand la série cible est réalisée deux séances de suite avec un RPE ≤ 6, on passe au levier suivant. Ne changer qu'un paramètre à la fois.",
    { x: 2.05, y: 5.35, w: 10.4, h: 1.0, fontSize: 15, valign: "middle" });
  s.addNotes("La règle 'deux séances de suite' est une adaptation pratique de la règle '2 pour 2' de l'ACSM. Le levier pré-tension est spécifique à l'élastique : plus on part tendu, plus la charge est élevée sur toute l'amplitude.");

  // ===== 9. Exercices types =====
  s = content("Programmer", "Six exercices de base pour tout le corps",
    "Andersen et al., Phys Ther 2010 ; Page & Ellenbecker, 2003 ; ACSM, 2009.");
  const ex = [
    [fa.FaChild, "Squat", "Bande sous les pieds, poignées aux épaules", "Membres inférieurs"],
    [fa.FaArrowsAltH, "Rowing assis", "Ancrage devant, tirer coudes au corps", "Dos, posture"],
    [fa.FaHandPaper, "Développé debout", "Ancrage derrière, pousser vers l'avant", "Pectoraux, triceps"],
    [fa.FaBed, "Pont fessier", "Mini-band au-dessus des genoux", "Fessiers, chaîne post."],
    [fa.FaSyncAlt, "Rotation externe", "Coude au corps, avant-bras vers l'extérieur", "Coiffe des rotateurs"],
    [fa.FaCompressArrowsAlt, "Pallof press", "Ancrage latéral, bras tendus, résister à la rotation", "Gainage anti-rotation"],
  ];
  for (let i = 0; i < ex.length; i++) {
    const [ic, h, d, tag] = ex[i];
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.6 + col * 4.07, y = 1.65 + row * 2.5;
    card(s, x, y, 3.82, 2.25);
    const cc = [HEX.accent1, HEX.accent2, HEX.accent3][col];
    await iconCircle(s, ic, x + 0.3, y + 0.3, 0.75, cc, col === 1 ? HEX.dk1 : HEX.lt1);
    txt(s, h, { x: x + 1.25, y: y + 0.3, w: 2.4, h: 0.45, fontSize: 18, bold: true });
    txt(s, tag, { x: x + 1.25, y: y + 0.75, w: 2.4, h: 0.35, fontSize: 12, bold: true, color: C.text2 });
    txt(s, d, { x: x + 0.3, y: y + 1.3, w: 3.25, h: 0.8, fontSize: 14, color: C.text2 });
  }
  s.addNotes("Programme équilibré : poussée / tirage / membres inférieurs / tronc. Andersen et al. (2010) montrent une activation comparable aux haltères sur plusieurs exercices de rééducation de l'épaule.");

  // ===== 10. Publics =====
  s = content("Programmer", "Une méthode adaptée à tous les publics",
    "Martins et al., 2013 ; Anderson, Sforzo & Sigg, JSCR 2008 ; Andersen et al., 2010 ; OMS, 2020.");
  const pub = [
    [fa.FaUserMd, "Rééducation", "Reprise progressive, travail de l'épaule et du genou, en lien avec le kinésithérapeute.", HEX.accent4],
    [fa.FaWalking, "Seniors", "Force, équilibre et autonomie ; prévention des chutes en complément d'exercices d'équilibre.", HEX.accent3],
    [fa.FaRunning, "Sportifs", "Élastique + barre (« résistance variable ») : gains de force et de puissance supérieurs à la barre seule.", HEX.accent1],
    [fa.FaBriefcase, "Entreprise & domicile", "Pauses actives, coaching à distance : peu de place et de budget nécessaires.", HEX.accent2],
  ];
  for (let i = 0; i < pub.length; i++) {
    const [ic, h, d, col] = pub[i];
    const c = i % 2, r = Math.floor(i / 2);
    const x = 0.6 + c * 6.15, y = 1.7 + r * 2.5;
    card(s, x, y, 5.95, 2.25);
    await iconCircle(s, ic, x + 0.35, y + 0.35, 1.0, col, i === 3 ? HEX.dk1 : HEX.lt1);
    txt(s, h, { x: x + 1.65, y: y + 0.35, w: 4.0, h: 0.5, fontSize: 20, bold: true });
    txt(s, d, { x: x + 1.65, y: y + 0.9, w: 4.0, h: 1.2, fontSize: 14, color: C.text2 });
  }
  s.addNotes("Anderson et al. (2008) : athlètes universitaires, 7 semaines ; le groupe barre + élastiques a progressé davantage en squat et développé couché 1RM. Pour les publics à pathologie : rester dans son champ de compétence et collaborer avec les professionnels de santé.");

  // ===== 11. Sécurité =====
  pres.addSection({ title: "Sécuriser" });
  s = content("Sécuriser", "Sécurité et entretien du matériel",
    "Page & Ellenbecker, 2003 ; Simoneau et al., 2001 ; recommandations des fabricants (Thera-Band).");
  const safe = [
    [fa.FaSearch, "Inspecter avant chaque séance", "Entailles, zones blanchies, poignées abîmées : on remplace."],
    [fa.FaAnchor, "Ancrer solidement", "Point fixe, porte fermée du bon côté, jamais à hauteur du visage."],
    [fa.FaExpandArrowsAlt, "Limiter l'étirement", "Ne pas dépasser environ 2,5 × la longueur de repos."],
    [fa.FaHandRock, "Contrôler le retour", "Ne jamais lâcher une bande tendue ; trajectoire loin des yeux."],
    [fa.FaAllergies, "Vérifier les allergies", "Latex : proposer des bandes sans latex."],
    [fa.FaSun, "Bien stocker", "À l'abri du soleil et de la chaleur, sans objets coupants."],
  ];
  for (let i = 0; i < safe.length; i++) {
    const [ic, h, d] = safe[i];
    const c = i % 2, r = Math.floor(i / 2);
    const x = 0.6 + c * 6.15, y = 1.65 + r * 1.65;
    await iconCircle(s, ic, x, y + 0.1, 0.85, i < 4 ? HEX.accent1 : HEX.accent4);
    txt(s, h, { x: x + 1.1, y: y + 0.08, w: 4.8, h: 0.45, fontSize: 18, bold: true });
    txt(s, d, { x: x + 1.1, y: y + 0.55, w: 4.8, h: 0.8, fontSize: 14, color: C.text2 });
  }
  s.addNotes("La rupture d'une bande tendue peut provoquer un choc au visage ou aux yeux : c'est le principal risque. Faire une démonstration d'inspection du matériel.");

  // ===== 12. À retenir + références =====
  pres.addSection({ title: "Conclusion" });
  s = pres.addSlide({ masterName: "CONCLUSION", sectionTitle: "Conclusion" });
  s.addText("À retenir", { placeholder: "title" });
  const keys = [
    ["Résistance variable", "La tension augmente avec l'étirement."],
    ["Efficacité prouvée", "Gains de force comparables aux charges classiques."],
    ["Dosage au ressenti", "8-12 répétitions, OMNI-RES 7-8."],
    ["Sécurité d'abord", "Inspecter, ancrer, contrôler le retour."],
  ];
  keys.forEach(([h, d], i) => {
    const y = 1.6 + i * 1.25;
    const col = [HEX.accent1, HEX.accent2, HEX.accent3, HEX.accent4][i];
    s.addShape(pres.shapes.OVAL, { x: 0.6, y: y + 0.05, w: 0.7, h: 0.7, fill: { color: col }, line: { type: "none" }, objectName: id("puce") });
    txt(s, String(i + 1), { x: 0.6, y: y + 0.05, w: 0.7, h: 0.7, fontSize: 20, bold: true, align: "center", valign: "middle", color: i === 1 ? C.text1 : C.background1 });
    txt(s, h, { x: 1.55, y, w: 4.3, h: 0.45, fontSize: 19, bold: true, color: C.background1 });
    txt(s, d, { x: 1.55, y: y + 0.45, w: 4.3, h: 0.5, fontSize: 14, color: "C9CED8" });
  });
  card(s, 5.9, 1.45, 6.85, 5.6, "2A2F40");
  txt(s, "Références", { x: 6.15, y: 1.6, w: 6.3, h: 0.4, fontSize: 16, bold: true, color: C.accent2 });
  const refs = [
    "ACSM (2009). Progression models in resistance training for healthy adults. Med Sci Sports Exerc, 41(3), 687-708.",
    "Aboodarda, S.J., Page, P.A., & Behm, D.G. (2016). Muscle activation comparisons between elastic and isoinertial resistance: a meta-analysis. Clin Biomech, 39, 52-61.",
    "Andersen, L.L. et al. (2010). Muscle activation and perceived loading during rehabilitation exercises: comparison of dumbbells and elastic resistance. Phys Ther, 90(4), 538-549.",
    "Anderson, C.E., Sforzo, G.A., & Sigg, J.A. (2008). The effects of combining elastic and free weight resistance on strength and power in athletes. JSCR, 22(2), 567-574.",
    "Bull, F.C. et al. (2020). WHO guidelines on physical activity and sedentary behaviour. Br J Sports Med, 54, 1451-1462.",
    "Colado, J.C., & Triplett, N.T. (2008). Effects of a short-term resistance program using elastic bands versus weight machines for sedentary middle-aged women. JSCR, 22(5), 1441-1448.",
    "Colado, J.C. et al. (2012). Concurrent validation of the OMNI-Resistance Exercise Scale with Thera-Band resistance bands. JSCR, 26(11), 3018-3024.",
    "Lopes, J.S.S. et al. (2019). Effects of training with elastic resistance versus conventional resistance on muscular strength: a systematic review and meta-analysis. SAGE Open Med, 7.",
    "Martins, W.R. et al. (2013). Elastic resistance training to increase muscle strength in elderly: a systematic review with meta-analysis. Arch Gerontol Geriatr, 57(1), 8-15.",
    "McMaster, D.T., Cronin, J., & McGuigan, M. (2009). Forms of variable resistance training. Strength Cond J, 31(1), 50-64.",
    "Page, P., & Ellenbecker, T.S. (2003). The Scientific and Clinical Application of Elastic Resistance. Human Kinetics.",
    "Simoneau, G.G. et al. (2001). Biomechanics of elastic resistance in therapeutic exercise programs. JOSPT, 31(1), 16-24.",
    "Uchida, M.C. et al. (2016). Thera-band elastic band tension: reference values for physical activity. J Phys Ther Sci, 28(4), 1266-1271.",
  ];
  txt(s, refs.map((r, i) => ({ text: r, options: { breakLine: i < refs.length - 1 } })),
    { x: 6.15, y: 2.05, w: 6.4, h: 4.9, fontSize: 10, color: "DDE1E8", paraSpaceAfter: 2 });
  s.addNotes("Conclure par une mise en pratique : chaque stagiaire construit une mini-séance de 6 exercices avec le choix des couleurs et le dosage OMNI-RES. Références au format APA abrégé.");

  const out = path.join(__dirname, "Entrainement_elastique_IFAPME.pptx");
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("OK", out);
})();
