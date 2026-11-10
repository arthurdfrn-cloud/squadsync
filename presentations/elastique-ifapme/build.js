// Génère "Entrainement_elastique_IFAPME.pptx" (12 diapositives, design v2 + transitions en fondu)
// Usage : node build.js  (nécessite pptxgenjs, react, react-dom, react-icons, sharp ; python3 pour les transitions)
const path = require("path");
const { execFileSync } = require("child_process");
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
    dk1: "1B1F2E", // encre
    lt1: "FFFFFF",
    dk2: "5A6275", // texte secondaire
    lt2: "F4F5F9", // fond des diapositives de contenu
    accent1: "E4572E", // corail (bande rouge)
    accent2: "F2A541", // ambre (bande jaune)
    accent3: "2A9D8F", // teal (bande verte)
    accent4: "3D5A80", // bleu (bande bleue)
    accent5: "9AA3B5",
    accent6: "7C0040", // bordeaux IFAPME
    hlink: "E4572E",
    folHlink: "9AA3B5",
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
const OUT = path.join(__dirname, "Entrainement_elastique_IFAPME.pptx");
const LOGO = path.join(__dirname, "logo_ifapme.png");
const LOGO_BLANC = path.join(__dirname, "logo_ifapme_blanc.png");
const LR = 538 / 1200;

// ---------- Visuels générés ----------
async function icon(Comp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: String(size) }));
  return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
}

// Fond "hero" : dégradé sombre + élastiques stylisés en courbes
async function hero(curveOpacity, glow) {
  const cols = [HEX.accent2, HEX.accent1, HEX.accent3, HEX.accent4, HEX.accent5];
  const curves = cols.map((c, i) => {
    const o = i * 95;
    return `<path d="M ${1350 + o} 1650 C ${1650 + o} 1050, ${2050 + o} 1250, ${2350 + o} 420 S ${2700 + o} -80, ${2900 + o} -200"
      fill="none" stroke="#${c}" stroke-width="46" stroke-linecap="round" opacity="${curveOpacity}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2667" height="1500" viewBox="0 0 2667 1500">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#171A27"/><stop offset="1" stop-color="#262038"/></linearGradient>
      <radialGradient id="r" cx="0.78" cy="0.35" r="0.55"><stop offset="0" stop-color="#E4572E" stop-opacity="${glow}"/><stop offset="1" stop-color="#E4572E" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="2667" height="1500" fill="url(#g)"/><rect width="2667" height="1500" fill="url(#r)"/>${curves}</svg>`;
  return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
}

(async () => {
  const HERO = await hero(0.95, 0.28);
  const HERO_DIM = await hero(0.12, 0.12);

  // ---------- Layouts ----------
  pres.defineSlideMaster({
    title: "TITRE",
    background: { data: HERO },
    objects: [
      { image: { path: LOGO_BLANC, x: 0.8, y: 0.7, w: 2.2, h: 2.2 * LR, altText: "Logo IFAPME" } },
      { placeholder: { options: { name: "kicker", type: "body", x: 0.8, y: 2.55, w: 7.5, h: 0.4, fontSize: 14, bold: true, color: C.accent2, charSpacing: 3, valign: "bottom", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 3.0, w: 7.5, h: 1.9, fontSize: 54, bold: true, color: C.background1, valign: "top", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 5.0, w: 7.5, h: 0.6, fontSize: 22, color: "C9CED8", valign: "top", align: "left", margin: 0 }, text: "" } },
    ],
  });

  pres.defineSlideMaster({
    title: "CONTENU",
    background: { color: HEX.lt2 },
    margin: [0.5, 0.6, 0.8, 0.6],
    objects: [
      { image: { path: LOGO, x: 11.55, y: 0.5, w: 1.2, h: 1.2 * LR, altText: "Logo IFAPME" } },
      { placeholder: { options: { name: "kicker", type: "body", x: 0.6, y: 0.45, w: 9, h: 0.3, fontSize: 12, bold: true, color: C.accent1, charSpacing: 3, valign: "middle", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.78, w: 10.6, h: 0.8, fontSize: 32, bold: true, color: C.text1, valign: "top", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "source", type: "body", x: 0.6, y: 6.92, w: 11.2, h: 0.35, fontSize: 10, italic: true, color: C.text2, valign: "middle", align: "left", margin: 0 }, text: "" } },
    ],
    slideNumber: { x: 12.25, y: 6.92, w: 0.5, h: 0.35, fontSize: 10, color: HEX.dk2, align: "right" },
  });

  pres.defineSlideMaster({
    title: "CONCLUSION",
    background: { data: HERO_DIM },
    objects: [
      { image: { path: LOGO_BLANC, x: 11.55, y: 0.5, w: 1.2, h: 1.2 * LR, altText: "Logo IFAPME" } },
      { placeholder: { options: { name: "kicker", type: "body", x: 0.6, y: 0.45, w: 9, h: 0.3, fontSize: 12, bold: true, color: C.accent2, charSpacing: 3, valign: "middle", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.78, w: 10.6, h: 0.8, fontSize: 32, bold: true, color: C.background1, valign: "top", align: "left", margin: 0 }, text: "" } },
    ],
    slideNumber: { x: 12.25, y: 6.92, w: 0.5, h: 0.35, fontSize: 10, color: HEX.accent5, align: "right" },
  });

  // ---------- Helpers ----------
  let n = 0;
  const id = (s) => `${s}_${++n}`;
  const shadow = () => ({ type: "outer", blur: 10, offset: 3, angle: 90, color: "1B1F2E", opacity: 0.08 });
  function card(slide, x, y, w, h, fill = C.background1, withShadow = true) {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w, h, rectRadius: 0.16, fill: { color: fill }, line: { type: "none" },
      ...(withShadow ? { shadow: shadow() } : {}), objectName: id("carte"),
    });
  }
  async function iconCircle(slide, Comp, x, y, d, fill, iconColor = HEX.lt1) {
    slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, objectName: id("pastille") });
    const p = d * 0.26;
    slide.addImage({ data: await icon(Comp, iconColor), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, altText: "", objectName: id("icone") });
  }
  function pill(slide, text, x, y, w, fill, color = C.background1) {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.32, rectRadius: 0.16, fill: { color: fill }, line: { type: "none" }, objectName: id("etiquette") });
    txt(slide, text, { x, y, w, h: 0.32, fontSize: 11, bold: true, color, align: "center", valign: "middle" });
  }
  function txt(slide, text, opts) {
    slide.addText(text, { isTextBox: true, margin: 0, valign: "top", color: C.text1, fontSize: 14, objectName: id("texte"), ...opts });
  }
  const bullets = (arr) => arr.map((t, i) => ({ text: t, options: { bullet: { indent: 18 }, breakLine: i < arr.length - 1 } }));
  function content(section, num, title, source) {
    const s = pres.addSlide({ masterName: "CONTENU", sectionTitle: section });
    s.addText(`${num}  ·  ${section.toUpperCase()}`, { placeholder: "kicker" });
    s.addText(title, { placeholder: "title" });
    s.addText("Sources : " + source, { placeholder: "source" });
    return s;
  }

  // ===== 1. Titre =====
  pres.addSection({ title: "Introduction" });
  let s = pres.addSlide({ masterName: "TITRE", sectionTitle: "Introduction" });
  s.addText("MODULE RENFORCEMENT MUSCULAIRE", { placeholder: "kicker" });
  s.addText("L'entraînement avec élastiques", { placeholder: "title" });
  s.addText("Méthode, principes et mise en pratique", { placeholder: "body" });
  txt(s, "Formation IFAPME", { x: 0.8, y: 6.55, w: 6, h: 0.35, fontSize: 13, color: HEX.accent5 });
  s.addNotes("Accueil. Objectif : maîtriser les principes de la résistance élastique pour l'utiliser de façon sûre et efficace avec différents publics. Chaque diapositive cite ses sources ; la bibliographie complète est en fin de présentation.");

  // ===== 2. Objectifs =====
  s = content("Introduction", "01", "Ce que vous saurez faire à la fin du module", "Référentiel de compétences de la formation ; ACSM, 2009.");
  const goals = [
    [fa.FaAtom, "Comprendre", "Le principe d'une résistance qui augmente avec l'étirement", HEX.accent1],
    [fa.FaFlask, "Justifier", "L'efficacité de la méthode à partir des données scientifiques", HEX.accent2],
    [fa.FaSlidersH, "Programmer", "Choisir la résistance, doser et faire progresser une séance", HEX.accent3],
    [fa.FaShieldAlt, "Sécuriser", "Encadrer la pratique et entretenir le matériel", HEX.accent4],
  ];
  for (let i = 0; i < goals.length; i++) {
    const [ic, h, d, col] = goals[i];
    const x = 0.6 + i * 3.08;
    card(s, x, 1.95, 2.85, 4.6);
    await iconCircle(s, ic, x + 0.4, 2.35, 1.0, col, i === 1 ? HEX.dk1 : HEX.lt1);
    txt(s, `0${i + 1}`, { x: x + 1.55, y: 2.4, w: 0.95, h: 0.8, fontSize: 40, bold: true, color: "E3E6EE", align: "right" });
    txt(s, h, { x: x + 0.4, y: 3.7, w: 2.1, h: 0.5, fontSize: 22, bold: true });
    txt(s, d, { x: x + 0.4, y: 4.3, w: 2.1, h: 1.9, fontSize: 15, color: C.text2 });
  }
  s.addNotes("Présenter les 4 compétences. Le fil rouge : comprendre → justifier → programmer → sécuriser.");

  // ===== 3. Principe physique =====
  pres.addSection({ title: "Comprendre" });
  s = content("Comprendre", "02", "Une résistance qui augmente avec l'étirement",
    "Simoneau et al., JOSPT 2001 ; McMaster, Cronin & McGuigan, Strength Cond J 2009 ; Uchida et al., J Phys Ther Sci 2016.");
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.95, w: 3.6, h: 0.75, rectRadius: 0.16, fill: { color: C.text1 }, line: { type: "none" }, objectName: id("formule") });
  txt(s, [{ text: "Loi de Hooke   ", options: { fontSize: 13, color: HEX.accent5 } }, { text: "F = k · Δx", options: { fontSize: 24, bold: true, color: HEX.lt1 } }],
    { x: 0.85, y: 1.95, w: 3.3, h: 0.75, valign: "middle" });
  txt(s, bullets([
    "Plus l'élastique s'allonge, plus la tension est forte : c'est une résistance variable.",
    "Charge minimale en début de mouvement, maximale en fin d'amplitude.",
    "La résistance ne dépend pas de la gravité : on peut tirer dans toutes les directions.",
    "Au-delà d'environ 200-250 % d'allongement, le risque de rupture augmente.",
  ]), { x: 0.6, y: 3.0, w: 5.3, h: 3.6, fontSize: 16, paraSpaceAfter: 12, color: C.text1 });
  card(s, 6.3, 1.95, 6.45, 4.65);
  const pct = ["0", "25", "50", "75", "100", "125", "150", "175", "200"];
  s.addChart(pres.charts.LINE, [{ name: "Tension", labels: pct, values: [0, 1.0, 1.8, 2.5, 3.1, 3.7, 4.3, 4.9, 5.5] }], {
    x: 6.5, y: 2.1, w: 6.05, h: 4.35,
    showTitle: true, title: "Tension selon l'allongement (schéma de principe)", titleFontSize: 14, titleColor: HEX.dk1, titleFontFace: "+mn-lt",
    chartColors: [HEX.accent1], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 7, lineSmooth: true,
    showLegend: false, showValue: false,
    showCatAxisTitle: true, catAxisTitle: "Allongement (% de la longueur de repos)", catAxisTitleFontSize: 11, catAxisTitleColor: HEX.dk2,
    showValAxisTitle: true, valAxisTitle: "Tension relative", valAxisTitleFontSize: 11, valAxisTitleColor: HEX.dk2,
    catAxisLabelColor: HEX.dk2, valAxisLabelColor: HEX.dk2, catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", catAxisTitleFontFace: "+mn-lt", valAxisTitleFontFace: "+mn-lt",
    catAxisLineShow: false, valAxisLineShow: false,
    valGridLine: { color: "E6E8EE", size: 0.75 }, catGridLine: { style: "none" },
  });
  s.addNotes("La courbe est illustrative : les valeurs réelles dépendent de la marque, de l'épaisseur et de la couleur (voir Uchida et al. 2016 pour des valeurs de référence Thera-Band). Message clé : la résistance n'est pas constante, elle suit l'étirement.");

  // ===== 4. Matériel =====
  s = content("Comprendre", "03", "Choisir le bon matériel",
    "Page & Ellenbecker, The Scientific and Clinical Application of Elastic Resistance, Human Kinetics 2003 ; Uchida et al., 2016 ; fiches fabricants.");
  const gear = [
    [fa.FaRibbon, "Bandes plates", "Rééducation, seniors, échauffement. Très modulables.", HEX.accent1],
    [fa.FaGripLines, "Tubes à poignées", "Renforcement général, circuits, ancrage de porte.", HEX.accent2],
    [fa.FaCircleNotch, "Mini-bands", "Membres inférieurs, hanche, activation des fessiers.", HEX.accent3],
    [fa.FaDumbbell, "Power bands", "Tractions assistées, sport, combinaison avec barre.", HEX.accent4],
  ];
  for (let i = 0; i < gear.length; i++) {
    const [ic, h, d, col] = gear[i];
    const c = i % 2, r = Math.floor(i / 2);
    const x = 0.6 + c * 3.4, y = 1.95 + r * 2.375;
    card(s, x, y, 3.2, 2.175);
    await iconCircle(s, ic, x + 0.3, y + 0.3, 0.75, col, i === 1 ? HEX.dk1 : HEX.lt1);
    txt(s, h, { x: x + 0.3, y: y + 1.15, w: 2.6, h: 0.4, fontSize: 18, bold: true });
    txt(s, d, { x: x + 0.3, y: y + 1.55, w: 2.65, h: 0.55, fontSize: 13, color: C.text2 });
  }
  card(s, 7.55, 1.95, 5.2, 4.55, C.text1);
  txt(s, "Code couleur de résistance", { x: 7.9, y: 2.2, w: 4.6, h: 0.4, fontSize: 18, bold: true, color: HEX.lt1 });
  txt(s, "Exemple : gamme Thera-Band, du plus léger au plus fort", { x: 7.9, y: 2.6, w: 4.6, h: 0.3, fontSize: 12, color: HEX.accent5 });
  const levels = [["Jaune", "F6D743"], ["Rouge", "D63A2F"], ["Vert", "2E9E4F"], ["Bleu", "3B6CC4"], ["Noir", "0B0D14"], ["Argent", "B8BEC6"], ["Or", "C9A227"]];
  levels.forEach(([name, col], i) => {
    const y = 3.1 + i * 0.47;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.9, y, w: 0.9 + i * 0.4, h: 0.28, rectRadius: 0.14, fill: { color: col }, line: name === "Noir" ? { color: "5A6275", width: 0.75 } : { type: "none" }, objectName: id("niveau") });
    txt(s, name, { x: 7.9 + 1.0 + i * 0.4, y: y - 0.05, w: 1.2, h: 0.38, fontSize: 13, valign: "middle", color: "DDE1E8" });
  });
  s.addNotes("Insister : le code couleur N'EST PAS universel. Toujours vérifier la fiche du fabricant. Préférer le sans-latex en cas d'allergie.");

  // ===== 5. Efficacité =====
  pres.addSection({ title: "Justifier" });
  s = content("Justifier", "04", "Aussi efficace que les charges classiques",
    "Lopes et al., SAGE Open Med 2019 ; Aboodarda, Page & Behm, Clin Biomech 2016 ; Colado & Triplett, JSCR 2008 ; Martins et al., Arch Gerontol Geriatr 2013.");
  const stats = [
    [fa.FaBalanceScale, "Méta-analyse", "Gains de force similaires", "Élastique vs machines ou poids libres, chez des adultes sains et des patients.", "Lopes et al., 2019", HEX.accent1],
    [fa.FaWaveSquare, "Méta-analyse", "Activation musculaire comparable", "Niveaux d'activation (EMG) proches entre élastique et charge classique.", "Aboodarda et al., 2016", HEX.accent2],
    [fa.FaCalendarCheck, "Essai · 10 sem.", "Résultats équivalents aux machines", "Femmes sédentaires d'âge moyen : force et composition corporelle similaires.", "Colado & Triplett, 2008", HEX.accent3],
    [fa.FaUserFriends, "Revue syst.", "Efficace chez les seniors", "Amélioration significative de la force chez la personne âgée.", "Martins et al., 2013", HEX.accent4],
  ];
  for (let i = 0; i < stats.length; i++) {
    const [ic, tag, h, d, ref, col] = stats[i];
    const x = 0.6 + i * 3.08;
    card(s, x, 1.95, 2.85, 4.6);
    await iconCircle(s, ic, x + 0.35, 2.3, 0.85, col, i === 1 ? HEX.dk1 : HEX.lt1);
    pill(s, tag, x + 1.35, 2.565, 1.3, "EEF0F5", C.text2);
    txt(s, h, { x: x + 0.35, y: 3.4, w: 2.2, h: 1.0, fontSize: 18, bold: true });
    txt(s, d, { x: x + 0.35, y: 4.55, w: 2.2, h: 1.3, fontSize: 13, color: C.text2 });
    txt(s, ref, { x: x + 0.35, y: 5.95, w: 2.2, h: 0.35, fontSize: 11, bold: true, italic: true, color: col });
  }
  s.addNotes("Message : la résistance élastique n'est pas un 'sous-entraînement'. À intensité perçue équivalente, les gains de force sont comparables. Nuance : les études portent surtout sur des débutants à intermédiaires.");

  // ===== 6. Atouts / limites =====
  s = content("Justifier", "05", "Atouts et limites de la méthode", "Page & Ellenbecker, 2003 ; McMaster et al., 2009 ; Lopes et al., 2019.");
  const cols6 = [
    [fa.FaCheck, "Atouts", HEX.accent3, [
      "Léger, peu coûteux, transportable (domicile, entreprise, extérieur)",
      "Travail multidirectionnel, proche des gestes fonctionnels et sportifs",
      "Charge faible en position d'étirement : adapté à la reprise",
      "Peu d'inertie : moins de « triche » par l'élan",
    ]],
    [fa.FaExclamation, "Limites", HEX.accent1, [
      "Charge difficile à quantifier en kg : on dose à la sensation (RPE)",
      "Résistance faible en début de mouvement",
      "Plafond de charge pour les sportifs très entraînés",
      "Usure, risque de rupture, allergie au latex",
    ]],
  ];
  for (let i = 0; i < 2; i++) {
    const [ic, h, col, items] = cols6[i];
    const x = 0.6 + i * 6.15;
    card(s, x, 1.95, 5.95, 4.6);
    await iconCircle(s, ic, x + 0.4, 2.3, 0.75, col);
    txt(s, h, { x: x + 1.35, y: 2.3, w: 4, h: 0.75, fontSize: 24, bold: true, valign: "middle" });
    txt(s, bullets(items), { x: x + 0.4, y: 3.35, w: 5.2, h: 3.0, fontSize: 15, paraSpaceAfter: 12, color: C.text1 });
  }
  s.addNotes("Faire réagir le groupe : dans quels contextes professionnels les atouts l'emportent-ils ?");

  // ===== 7. Dosage =====
  pres.addSection({ title: "Programmer" });
  s = content("Programmer", "06", "Doser une séance : les repères",
    "ACSM Position Stand, Med Sci Sports Exerc 2009 ; OMS 2020 (Bull et al., BJSM) ; Colado et al., JSCR 2012.");
  const dose = [
    ["2-3", "séances / semaine", "Au moins 2 j/semaine de renforcement (OMS 2020)"],
    ["8-12", "répétitions", "Par série, public débutant à intermédiaire (ACSM 2009)"],
    ["1-3", "séries", "Par exercice, récupération 1 à 2 min"],
  ];
  dose.forEach(([big, unit, d], i) => {
    const x = 0.6 + i * 2.55;
    card(s, x, 1.95, 2.35, 2.45);
    txt(s, big, { x: x + 0.3, y: 2.1, w: 1.9, h: 0.9, fontSize: 46, bold: true, color: C.accent1 });
    txt(s, unit, { x: x + 0.3, y: 3.0, w: 1.9, h: 0.35, fontSize: 15, bold: true });
    txt(s, d, { x: x + 0.3, y: 3.38, w: 1.85, h: 0.9, fontSize: 12, color: C.text2 });
  });
  card(s, 0.6, 4.6, 7.45, 1.95);
  await iconCircle(s, fa.FaPalette, 0.9, 4.9, 0.7, HEX.accent2, HEX.dk1);
  txt(s, "Comment choisir la bonne couleur ?", { x: 1.85, y: 4.9, w: 5.9, h: 0.4, fontSize: 17, bold: true });
  txt(s, "La résistance qui permet de réaliser les répétitions visées avec une technique propre, en finissant la série « difficile », sans aller à l'échec.",
    { x: 1.85, y: 5.35, w: 5.95, h: 1.05, fontSize: 14, color: C.text2 });
  card(s, 8.35, 1.95, 4.4, 4.6, C.text1);
  txt(s, "Échelle OMNI-RES (0-10)", { x: 8.7, y: 2.2, w: 3.8, h: 0.4, fontSize: 18, bold: true, color: HEX.lt1 });
  txt(s, "Validée avec bandes élastiques", { x: 8.7, y: 2.6, w: 3.8, h: 0.3, fontSize: 12, color: HEX.accent5 });
  const omni = [["0-2", "Très facile", "B8E0D9"], ["3-4", "Facile", "7CC6B9"], ["5-6", "Modéré", HEX.accent2], ["7-8", "Difficile · zone cible", HEX.accent1], ["9-10", "Extrêmement difficile", "9E2F14"]];
  omni.forEach(([r, l, col], i) => {
    const y = 3.1 + i * 0.64;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.7, y, w: 0.95, h: 0.48, rectRadius: 0.12, fill: { color: col }, line: { type: "none" }, objectName: id("omni") });
    txt(s, r, { x: 8.7, y, w: 0.95, h: 0.48, fontSize: 14, bold: true, align: "center", valign: "middle", color: i >= 3 ? HEX.lt1 : HEX.dk1 });
    txt(s, l, { x: 9.8, y, w: 2.8, h: 0.48, fontSize: 14, valign: "middle", bold: i === 3, color: i === 3 ? HEX.lt1 : "C9CED8" });
  });
  s.addNotes("Comme le poids en kg n'est pas lisible sur un élastique, l'intensité se pilote avec l'échelle OMNI-RES (Colado et al. 2012) : viser 7-8 en fin de série pour le renforcement.");

  // ===== 8. Progression =====
  s = content("Programmer", "07", "Faire progresser : 5 leviers, dans cet ordre",
    "ACSM Position Stand, 2009 (principe de surcharge progressive) ; Page & Ellenbecker, 2003.");
  const levers = [
    ["1", "Technique", "Amplitude complète et contrôlée"],
    ["2", "Volume", "+ répétitions, puis + séries"],
    ["3", "Pré-tension", "S'éloigner de l'ancrage ou raccourcir la bande"],
    ["4", "Résistance", "Couleur supérieure ou bande doublée"],
    ["5", "Tempo", "Freiner le retour (2-3 s excentrique)"],
  ];
  const lw = 2.3, gap = 0.15;
  levers.forEach(([num, h, d], i) => {
    const x = 0.6 + i * (lw + gap);
    const col = [HEX.accent3, HEX.accent3, HEX.accent2, HEX.accent1, HEX.accent1][i];
    card(s, x, 1.95, lw, 3.0);
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: 2.25, w: 0.75, h: 0.75, fill: { color: col }, line: { type: "none" }, objectName: id("etape") });
    txt(s, num, { x: x + 0.3, y: 2.25, w: 0.75, h: 0.75, fontSize: 24, bold: true, color: i === 2 ? HEX.dk1 : HEX.lt1, align: "center", valign: "middle" });
    txt(s, h, { x: x + 0.3, y: 3.25, w: lw - 0.5, h: 0.45, fontSize: 18, bold: true });
    txt(s, d, { x: x + 0.3, y: 3.75, w: lw - 0.5, h: 1.0, fontSize: 14, color: C.text2 });
  });
  card(s, 0.6, 5.25, 12.15, 1.3, C.text1);
  await iconCircle(s, fa.FaLightbulb, 0.95, 5.5, 0.8, HEX.accent2, HEX.dk1);
  txt(s, [{ text: "Règle pratique : ", options: { bold: true, color: HEX.accent2 } },
    { text: "quand la série cible est réussie deux séances de suite avec un RPE ≤ 6, on passe au levier suivant. Un seul paramètre à la fois.", options: { color: HEX.lt1 } }],
    { x: 2.05, y: 5.25, w: 10.4, h: 1.3, fontSize: 16, valign: "middle" });
  s.addNotes("La règle 'deux séances de suite' est une adaptation pratique de la règle '2 pour 2' de l'ACSM. Le levier pré-tension est spécifique à l'élastique : plus on part tendu, plus la charge est élevée sur toute l'amplitude.");

  // ===== 9. Exercices =====
  s = content("Programmer", "08", "Six exercices de base pour tout le corps", "Andersen et al., Phys Ther 2010 ; Page & Ellenbecker, 2003 ; ACSM, 2009.");
  const ex = [
    [fa.FaChild, "Squat", "Bande sous les pieds, poignées aux épaules", "Membres inférieurs"],
    [fa.FaArrowsAltH, "Rowing assis", "Ancrage devant, tirer coudes au corps", "Dos, posture"],
    [fa.FaHandPaper, "Développé debout", "Ancrage derrière, pousser vers l'avant", "Pectoraux, triceps"],
    [fa.FaBed, "Pont fessier", "Mini-band au-dessus des genoux", "Fessiers"],
    [fa.FaSyncAlt, "Rotation externe", "Coude au corps, avant-bras vers l'extérieur", "Coiffe des rotateurs"],
    [fa.FaCompressArrowsAlt, "Pallof press", "Ancrage latéral, résister à la rotation", "Gainage"],
  ];
  for (let i = 0; i < ex.length; i++) {
    const [ic, h, d, tag] = ex[i];
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.6 + col * 4.1, y = 1.95 + row * 2.35;
    card(s, x, y, 3.95, 2.15);
    const cc = [HEX.accent1, HEX.accent2, HEX.accent3][col];
    await iconCircle(s, ic, x + 0.3, y + 0.3, 0.75, cc, col === 1 ? HEX.dk1 : HEX.lt1);
    txt(s, h, { x: x + 1.25, y: y + 0.3, w: 2.5, h: 0.4, fontSize: 18, bold: true });
    pill(s, tag, x + 1.25, y + 0.72, 1.9, "EEF0F5", C.text2);
    txt(s, d, { x: x + 0.3, y: y + 1.3, w: 3.4, h: 0.7, fontSize: 14, color: C.text2 });
  }
  s.addNotes("Programme équilibré : poussée / tirage / membres inférieurs / tronc. Andersen et al. (2010) montrent une activation comparable aux haltères sur plusieurs exercices de rééducation de l'épaule.");

  // ===== 10. Publics =====
  s = content("Programmer", "09", "Une méthode adaptée à tous les publics", "Martins et al., 2013 ; Anderson, Sforzo & Sigg, JSCR 2008 ; Andersen et al., 2010 ; OMS, 2020.");
  const pub = [
    [fa.FaUserMd, "Rééducation", "Reprise progressive, épaule et genou, en lien avec le kinésithérapeute.", HEX.accent4],
    [fa.FaWalking, "Seniors", "Force, équilibre, autonomie ; prévention des chutes avec des exercices d'équilibre.", HEX.accent3],
    [fa.FaRunning, "Sportifs", "Élastique + barre : gains de force et de puissance supérieurs à la barre seule.", HEX.accent1],
    [fa.FaBriefcase, "Entreprise & domicile", "Pauses actives, coaching à distance : peu de place et de budget.", HEX.accent2],
  ];
  for (let i = 0; i < pub.length; i++) {
    const [ic, h, d, col] = pub[i];
    const c = i % 2, r = Math.floor(i / 2);
    const x = 0.6 + c * 6.15, y = 1.95 + r * 2.35;
    card(s, x, y, 5.95, 2.15);
    await iconCircle(s, ic, x + 0.35, y + 0.4, 1.0, col, i === 3 ? HEX.dk1 : HEX.lt1);
    txt(s, h, { x: x + 1.7, y: y + 0.35, w: 4.0, h: 0.5, fontSize: 20, bold: true });
    txt(s, d, { x: x + 1.7, y: y + 0.9, w: 3.95, h: 1.1, fontSize: 14, color: C.text2 });
  }
  s.addNotes("Anderson et al. (2008) : athlètes universitaires, 7 semaines ; le groupe barre + élastiques a progressé davantage en squat et développé couché 1RM. Pour les publics à pathologie : rester dans son champ de compétence et collaborer avec les professionnels de santé.");

  // ===== 11. Sécurité =====
  pres.addSection({ title: "Sécuriser" });
  s = content("Sécuriser", "10", "Sécurité et entretien du matériel", "Page & Ellenbecker, 2003 ; Simoneau et al., 2001 ; recommandations des fabricants (Thera-Band).");
  const safe = [
    [fa.FaSearch, "Inspecter", "Entailles, zones blanchies, poignées abîmées : on remplace."],
    [fa.FaAnchor, "Ancrer solidement", "Point fixe, porte fermée du bon côté, jamais à hauteur du visage."],
    [fa.FaExpandArrowsAlt, "Limiter l'étirement", "Ne pas dépasser environ 2,5 × la longueur de repos."],
    [fa.FaHandRock, "Contrôler le retour", "Ne jamais lâcher une bande tendue ; trajectoire loin des yeux."],
    [fa.FaAllergies, "Vérifier les allergies", "Latex : proposer des bandes sans latex."],
    [fa.FaSun, "Bien stocker", "À l'abri du soleil, de la chaleur et des objets coupants."],
  ];
  card(s, 0.6, 1.95, 12.15, 4.6);
  for (let i = 0; i < safe.length; i++) {
    const [ic, h, d] = safe[i];
    const c = i % 3, r = Math.floor(i / 3);
    const x = 0.95 + c * 3.95, y = 2.3 + r * 2.1;
    await iconCircle(s, ic, x, y, 0.7, i < 4 ? HEX.accent1 : HEX.accent4);
    txt(s, h, { x, y: y + 0.82, w: 3.5, h: 0.4, fontSize: 18, bold: true });
    txt(s, d, { x, y: y + 1.22, w: 3.4, h: 0.6, fontSize: 14, color: C.text2 });
  }
  s.addNotes("La rupture d'une bande tendue peut provoquer un choc au visage ou aux yeux : c'est le principal risque. Faire une démonstration d'inspection du matériel.");

  // ===== 12. À retenir + références =====
  pres.addSection({ title: "Conclusion" });
  s = pres.addSlide({ masterName: "CONCLUSION", sectionTitle: "Conclusion" });
  s.addText("11  ·  CONCLUSION", { placeholder: "kicker" });
  s.addText("À retenir", { placeholder: "title" });
  const keys = [
    ["Résistance variable", "La tension augmente avec l'étirement."],
    ["Efficacité prouvée", "Gains de force comparables aux charges classiques."],
    ["Dosage au ressenti", "8-12 répétitions, OMNI-RES 7-8."],
    ["Sécurité d'abord", "Inspecter, ancrer, contrôler le retour."],
  ];
  keys.forEach(([h, d], i) => {
    const y = 1.95 + i * 1.2;
    const col = [HEX.accent1, HEX.accent2, HEX.accent3, HEX.accent4][i];
    s.addShape(pres.shapes.OVAL, { x: 0.6, y: y + 0.05, w: 0.7, h: 0.7, fill: { color: col }, line: { type: "none" }, objectName: id("puce") });
    txt(s, String(i + 1), { x: 0.6, y: y + 0.05, w: 0.7, h: 0.7, fontSize: 20, bold: true, align: "center", valign: "middle", color: i === 1 ? HEX.dk1 : HEX.lt1 });
    txt(s, h, { x: 1.55, y, w: 4.1, h: 0.42, fontSize: 19, bold: true, color: HEX.lt1 });
    txt(s, d, { x: 1.55, y: y + 0.42, w: 4.1, h: 0.5, fontSize: 14, color: "C9CED8" });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.9, y: 1.75, w: 6.85, h: 5.35, rectRadius: 0.16, fill: { color: "FFFFFF", transparency: 93 }, line: { color: "FFFFFF", transparency: 80, width: 0.75 }, objectName: id("refs") });
  txt(s, "Références", { x: 6.2, y: 1.92, w: 6.3, h: 0.4, fontSize: 16, bold: true, color: HEX.accent2 });
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
    { x: 6.2, y: 2.35, w: 6.35, h: 4.6, fontSize: 10, color: "DDE1E8", paraSpaceAfter: 2 });
  s.addNotes("Conclure par une mise en pratique : chaque stagiaire construit une mini-séance de 6 exercices avec le choix des couleurs et le dosage OMNI-RES. Références au format APA abrégé.");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  execFileSync("python3", [path.join(__dirname, "add_transitions.py"), OUT], { stdio: "inherit" });
  console.log("OK", OUT);
})();
