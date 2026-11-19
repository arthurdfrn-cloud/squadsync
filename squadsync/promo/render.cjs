// Rend promo/composition.html en vidéo verticale 1080x1920 (30 fps) avec bande-son générée.
// Usage : node promo/render.cjs   (après capture.cjs)   — nécessite playwright + ffmpeg.

const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { pathToFileURL } = require('url')

const FPS = 30
const OUT_DIR = path.join(__dirname, 'out')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'squadsync-promo-'))
fs.mkdirSync(OUT_DIR, { recursive: true })

// ---------------------------------------------------------------- audio
// Mono 44.1 kHz. Étapes 1-3 : juste les "clics" de cases cochées (son brut).
// Étape 4 + outro : nappe, sub-kicks sur les coupes, whooshes avant chaque coupe.
function buildAudio(duration, clip, stages, cuts, fillFrames) {
  const SR = 44100
  const n = Math.ceil(duration * SR)
  const buf = new Float32Array(n)
  const add = (start, len, fn) => {
    const s0 = Math.floor(start * SR)
    for (let i = 0; i < len * SR && s0 + i < n; i++) if (s0 + i >= 0) buf[s0 + i] += fn(i / SR)
  }
  let seed = 7
  const white = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1

  // Clics : une case cochée = un tick (même rythme que l'animation de la grille)
  const shotA = cuts[1] - cuts[0]
  for (let s = 0; s < stages; s++) {
    for (let k = 1; k < fillFrames; k++) {
      // inverse approx de easeInOut(p*1.15) => on répartit linéairement, suffisant à l'oreille
      const tt = s * clip + (k / (fillFrames - 1)) * shotA * 0.82
      add(tt, 0.04, (x) => Math.sin(2 * Math.PI * 1900 * x) * Math.exp(-x * 120) * 0.22)
    }
  }

  const fxStart = clip * (stages - 1)
  // Nappe (La mineur) avec fondu d'entrée/sortie
  const chord = [110, 130.81, 164.81, 220, 329.63]
  add(fxStart, duration - fxStart, (x) => {
    const env = Math.min(1, x / 0.6) * Math.min(1, (duration - fxStart - x) / 0.8)
    let v = 0
    chord.forEach((f, i) => (v += Math.sin(2 * Math.PI * f * x + i) * (i === 0 ? 0.5 : 0.25)))
    const pulse = 0.75 + 0.25 * Math.sin(2 * Math.PI * 2 * x) // léger sidechain-like
    return v * 0.09 * env * pulse
  })
  // Hi-hats légers sur la mesure (120 bpm)
  for (let tt = fxStart; tt < duration - 0.5; tt += 0.25) {
    add(tt, 0.05, (x) => white() * Math.exp(-x * 90) * 0.06)
  }
  // Kicks + whooshes sur chaque coupe de l'étape 4 et sur l'outro
  const hits = cuts.map((c) => fxStart + c).concat([clip * stages])
  for (const h of hits) {
    add(h, 0.5, (x) => {
      const f = 38 + 70 * Math.exp(-x * 25)
      return Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 7) * 0.85
    })
    // whoosh : bruit filtré passe-bas dont la coupure monte, enveloppe croissante
    let lp = 0
    add(h - 0.35, 0.35, (x) => {
      const a = 0.02 + 0.5 * (x / 0.35) ** 2
      lp += a * (white() - lp)
      return lp * (x / 0.35) ** 1.5 * 0.5
    })
  }
  // Impact plus gros à l'outro
  add(clip * stages, 1.2, (x) => Math.sin(2 * Math.PI * 32 * x) * Math.exp(-x * 3) * 0.5)

  // normalisation douce
  let peak = 0
  for (const v of buf) peak = Math.max(peak, Math.abs(v))
  const g = peak > 0.95 ? 0.95 / peak : 1
  const pcm = Buffer.alloc(44 + n * 2)
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + n * 2, 4); pcm.write('WAVE', 8)
  pcm.write('fmt ', 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22)
  pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34)
  pcm.write('data', 36); pcm.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * g)) * 32767), 44 + i * 2)
  return pcm
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 })
  await page.goto(pathToFileURL(path.join(__dirname, 'composition.html')).href)
  await page.evaluate(() => window.ready)
  await page.evaluate(() => document.fonts.ready)
  const info = await page.evaluate(() => ({
    duration: window.DURATION, cuts: window.CUTS, frames: window.META.team.frames,
  }))
  const total = Math.round(info.duration * FPS)
  const canvas = page.locator('#canvas')
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.renderFrame(t), f / FPS)
    await canvas.screenshot({ path: path.join(TMP, `f${String(f).padStart(5, '0')}.png`) })
    if (f % 60 === 0) process.stdout.write(`\rimages ${f}/${total}`)
  }
  await browser.close()
  process.stdout.write(`\rimages ${total}/${total}\n`)

  const wav = path.join(TMP, 'audio.wav')
  fs.writeFileSync(wav, buildAudio(info.duration, 4.5, 4, info.cuts, info.frames))

  const out = path.join(OUT_DIR, 'squadsync-promo.mp4')
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(FPS), '-i', path.join(TMP, 'f%05d.png'),
    '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest', out,
  ], { stdio: 'inherit' })
  fs.rmSync(TMP, { recursive: true, force: true })
  console.log('Vidéo :', out)
})()
