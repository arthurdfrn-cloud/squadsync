// Capture les "rushes" de l'appli pour le montage promo.
// Usage : (dans un autre terminal) npm run dev   puis   node promo/capture.cjs [url]
// Écrit des PNG + promo/assets/meta.js (positions des cellules utiles au zoom/tracking).

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = process.argv[2] || 'http://localhost:5173'
const OUT = path.join(__dirname, 'assets')
fs.mkdirSync(OUT, { recursive: true })

// --- Données de démo déterministes (pseudo-aléatoire seedé) ---
const names = {
  pax: ['Zeyko', 'Mathis', 'Kaze', 'Lowan', 'Nyro'],
  pepsonnet: ['Pepz', 'Ruby', 'Tonio', 'Saky', 'Vex'],
}
let seed = 42
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
const players = []
for (const [team, list] of Object.entries(names)) {
  list.forEach((name, i) => {
    const slots = []
    for (let d = 0; d < 7; d++) {
      for (const h of [17, 18, 19, 20, 21, 22]) {
        const p = (d === 2 || d === 4) && h >= 19 && h <= 21 ? 0.92 : d >= 5 ? 0.55 : 0.35
        if (rnd() < p) slots.push(`${d}-${h}`)
      }
    }
    players.push({ id: team + i, teamSlug: team, name, slots, updatedAt: new Date().toISOString() })
  })
}
const state = {
  teams: [
    { slug: 'pax', name: 'Pax Horizon' },
    { slug: 'pepsonnet', name: 'Pepsonnet' },
  ],
  players,
  coach: {
    busySlots: ['0-17', '0-18', '1-17', '1-18', '1-19', '3-17', '3-18', '5-17', '5-18', '6-22'],
    exceptions: [],
    minPlayers: 3,
  },
}

// Cellules que "le joueur" coche, dans l'ordre (jour-heure).
const FILL = ['2-19', '2-20', '2-21', '4-19', '4-20', '4-21', '5-20', '6-19']
const cellIndex = (k) => {
  const [d, h] = k.split('-').map(Number)
  return (h - 17) * 7 + d
}
const FOCUS_KEY = '2-20' // Mercredi 20h : le créneau "star" du montage

function rel(box, clip) {
  return {
    x: (box.x - clip.x) / clip.width,
    y: (box.y - clip.y) / clip.height,
    w: box.width / clip.width,
    h: box.height / clip.height,
  }
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 4 })
  await ctx.addInitScript((s) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('squadsync_v1', s)
      sessionStorage.setItem('seeded', '1')
    }
    sessionStorage.setItem('squadsync_unlocked', '1')
  }, JSON.stringify(state))
  const page = await ctx.newPage()
  const meta = {}

  // 1) Page équipe : le joueur remplit sa grille
  await page.goto(BASE + '/team/pax')
  await page.waitForSelector('div.overflow-x-auto button')
  await page.locator('input').first().fill('Kiro')
  await page.waitForTimeout(200)
  const h1 = await page.locator('h1').boundingBox()
  const grid = await page.locator('div.overflow-x-auto').first().boundingBox()
  const teamClip = { x: 0, y: h1.y - 18, width: 430, height: grid.y + grid.height + 18 - (h1.y - 18) }
  const cells = page.locator('div.overflow-x-auto button')
  meta.team = {
    w: teamClip.width,
    h: teamClip.height,
    frames: FILL.length + 1,
    focus: rel(await cells.nth(cellIndex(FOCUS_KEY)).boundingBox(), teamClip),
  }
  await page.screenshot({ path: path.join(OUT, 'team_0.png'), clip: teamClip, fullPage: true })
  for (let i = 0; i < FILL.length; i++) {
    await cells.nth(cellIndex(FILL[i])).click()
    await page.waitForTimeout(120)
    await page.screenshot({ path: path.join(OUT, `team_${i + 1}.png`), clip: teamClip, fullPage: true })
  }
  await page.getByRole('button', { name: /enregistrer/i }).click()
  await page.waitForTimeout(300)

  // 2) Dashboard : heatmap de l'équipe Pax Horizon
  await page.goto(BASE + '/dashboard')
  await page.waitForSelector('section')
  await page.waitForTimeout(400)
  const section = page.locator('section').nth(1)
  const sb = await section.boundingBox()
  const dashClip = { x: 0, y: sb.y - 14, width: 430, height: sb.height + 28 }
  meta.dash = {
    w: dashClip.width,
    h: dashClip.height,
    focus: rel(await section.locator('button').nth(cellIndex(FOCUS_KEY)).boundingBox(), dashClip),
    grid: rel(await section.locator('div.overflow-x-auto').boundingBox(), dashClip),
  }
  await page.screenshot({ path: path.join(OUT, 'dash.png'), clip: dashClip, fullPage: true })

  fs.writeFileSync(path.join(OUT, 'meta.js'), `window.META = ${JSON.stringify(meta, null, 2)}\n`)
  await browser.close()
  console.log('Rushes capturés dans', OUT)
})()
