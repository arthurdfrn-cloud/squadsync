import {
  AbsoluteFill, OffthreadVideo, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig,
  interpolate, spring, Easing, random,
} from 'remotion'
import { Gif } from '@remotion/gif'
import { Lottie } from '@remotion/lottie'
import { loadFont } from '@remotion/fonts'

// Polices embarquées (Google Fonts, licence OFL) : shorts/remotion/fonts/, copiées dans le job par build.py
const FONT_FILES = {
  anton: ['SS Anton', 'Anton.woff2', '400', 'normal'],
  bebas: ['SS Bebas', 'BebasNeue.woff2', '400', 'normal'],
  archivo: ['SS Archivo', 'ArchivoBlack.woff2', '400', 'normal'],
  playfair: ['SS Playfair', 'PlayfairItalic.woff2', '900', 'italic'],
  marker: ['SS Marker', 'PermanentMarker.woff2', '400', 'normal'],
  montserrat: ['SS Montserrat', 'Montserrat.woff2', '900', 'normal'],
}
const FONTS = {}
for (const [k, [family, file, weight, style]] of Object.entries(FONT_FILES)) {
  loadFont({ family, url: staticFile('fonts/' + file), weight, style }).catch(() => {})
  FONTS[k] = `'${family}'`
}
const CAPTION_FONT = `${FONTS.montserrat}, 'Inter Display', Inter, sans-serif`

const W = 1080
const H = 1920
const YELLOW = '#FFE14D'
const GREEN = '#3DFF8B'

const noise = (n) => {
  const s = Math.sin(n * 127.1) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}
const clamp01 = (x) => Math.max(0, Math.min(1, x))
const eo = (x) => 1 - Math.pow(1 - clamp01(x), 3)

// ------------------------------------------------------------------ vidéo principale
function sampleTrack(track, t) {
  if (!track || track.length === 0) return 0.5
  if (t <= track[0].t) return track[0].x
  for (let i = 1; i < track.length; i++) {
    if (t <= track[i].t) {
      const a = track[i - 1], b = track[i]
      if (b.cut) return a.x
      return a.x + (b.x - a.x) * ((t - a.t) / (b.t - a.t))
    }
  }
  return track[track.length - 1].x
}

function zoomAt(t, zooms, jumps) {
  let base = 1
  for (const j of jumps) if (t >= j.t) base = j.scale
  let punch = 0
  for (const z of zooms) {
    const d = t - z.t
    if (d >= 0 && d < 0.9) {
      const up = interpolate(d, [0, 0.12], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
      const down = interpolate(d, [0.55, 0.9], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      punch = Math.max(punch, z.amount * up * down)
    }
  }
  return base + punch
}

function shakeAt(t, booms) {
  let k = 0
  for (const b of booms) {
    const d = t - b
    if (d >= 0 && d < 0.45) k = Math.max(k, Math.exp(-d * 9))
  }
  return { x: noise(t * 50) * 18 * k, y: noise(t * 50 + 4) * 18 * k, r: noise(t * 50 + 9) * 1.4 * k }
}

// Géométrie partagée par la vidéo et par son détourage (pour qu'ils restent superposés au pixel près)
function useGeometry(p, t) {
  const z = zoomAt(t, p.zooms, p.jumps)
  const sh = shakeAt(t, p.booms)
  const vw = p.layout === 'crop' ? H * p.aspect : W
  const vh = p.layout === 'crop' ? H : W / p.aspect
  const cx = p.layout === 'crop' ? sampleTrack(p.track, t) : 0.5
  const left = Math.min(0, Math.max(W - vw, W / 2 - cx * vw))
  return { z, sh, vw, vh: Math.max(vh, H), left, top: (H - Math.max(vh, H)) / 2 }
}

function MainVideo({ p, t, src, trimBefore, transparent }) {
  const { fps } = useVideoConfig()
  const g = useGeometry(p, t)
  const tb = trimBefore ?? Math.round(p.start * fps)
  const common = { src: staticFile(src || p.src), trimBefore: tb, transparent, muted: !!src }
  if (p.layout === 'fit') {
    const vh = W / p.aspect
    return (
      <AbsoluteFill>
        {!src && (
          <AbsoluteFill style={{ transform: 'scale(1.25)', filter: 'blur(38px) brightness(0.5)' }}>
            <OffthreadVideo {...common} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </AbsoluteFill>
        )}
        <div style={{
          position: 'absolute', left: 0, top: H * 0.42 - vh / 2, width: W, height: vh,
          transform: `translate(${g.sh.x}px, ${g.sh.y}px) rotate(${g.sh.r}deg) scale(${g.z * 1.04})`,
        }}>
          <OffthreadVideo {...common} style={{ width: '100%', height: '100%' }} />
        </div>
      </AbsoluteFill>
    )
  }
  return (
    <AbsoluteFill style={{
      transform: `translate(${g.sh.x}px, ${g.sh.y}px) rotate(${g.sh.r}deg) scale(${g.z})`,
      transformOrigin: `50% ${p.focusY * 100}%`,
    }}>
      <OffthreadVideo {...common}
        style={{ position: 'absolute', left: g.left, top: g.top, width: g.vw, height: g.vh, objectFit: 'cover' }} />
    </AbsoluteFill>
  )
}

// ------------------------------------------------------------------ titres cinétiques
const TITLE_STYLES = {
  // gros mot massif, souvent placé derrière le sujet (fg)
  behind: { font: 'anton', size: 300, color: '#fff', shadow: '0 10px 40px rgba(0,0,0,.35)' },
  // révélation par masque, élégant (citations, émotions)
  reveal: { font: 'playfair', size: 150, color: '#fff', shadow: '0 6px 30px rgba(0,0,0,.6)' },
  // contour qui se remplit (chiffres, mots-clés)
  outline: { font: 'archivo', size: 170, color: YELLOW },
  // néon qui grésille (nuit, gaming, énergie)
  neon: { font: 'bebas', size: 230, color: '#7CF7FF' },
  // mots empilés qui tombent un à un (listes, punchlines en 2-3 mots)
  stack: { font: 'anton', size: 190, color: '#fff' },
  // un mot qui s'écrase avec secousse (choc)
  slam: { font: 'archivo', size: 200, color: '#FF3B5C' },
  // écriture main (humour, aparté)
  marker: { font: 'marker', size: 140, color: YELLOW },
}

function KineticTitle({ k, t }) {
  const { fps } = useVideoConfig()
  const d = t - k.at
  if (d < 0 || d > k.dur) return null
  const st = { ...TITLE_STYLES[k.style] || TITLE_STYLES.behind, ...(k.color ? { color: k.color } : {}) }
  const fam = FONTS[k.font || st.font]
  const out = interpolate(d, [k.dur - 0.25, k.dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const f = Math.round(d * fps)
  const sp = spring({ frame: f, fps, config: { damping: 13, stiffness: 160 } })
  const y = (k.y ?? 0.3) * H
  const base = {
    position: 'absolute', left: 0, right: 0, top: y, transform: 'translateY(-50%)', textAlign: 'center',
    fontFamily: fam, fontSize: k.size || st.size, lineHeight: 0.9, color: st.color, opacity: out,
    textTransform: k.style === 'reveal' || k.style === 'marker' ? 'none' : 'uppercase', whiteSpace: 'pre-wrap',
    padding: '0 40px',
  }
  const text = k.text

  if (k.style === 'reveal') {
    const p = eo(d / 0.7)
    return <div style={{ ...base, clipPath: `inset(${(1 - p) * 100}% 0 0 0)`, letterSpacing: `${(1 - p) * 30}px`, textShadow: st.shadow }}>{text}</div>
  }
  if (k.style === 'outline') {
    const p = eo((d - 0.15) / 0.6)
    return (
      <div style={{
        ...base, color: 'transparent', WebkitTextStroke: `6px ${st.color}`,
        backgroundImage: `linear-gradient(90deg, ${st.color} ${p * 100}%, transparent ${p * 100}%)`,
        WebkitBackgroundClip: 'text', backgroundClip: 'text', transform: `translateY(-50%) scale(${0.85 + 0.15 * sp})`,
      }}>{text}</div>
    )
  }
  if (k.style === 'neon') {
    const flick = d < 0.5 ? (random(`n${f}`) > 0.45 ? 1 : 0.25) : 0.92 + 0.08 * Math.sin(d * 40)
    return <div style={{ ...base, opacity: out * flick, textShadow: `0 0 12px ${st.color}, 0 0 40px ${st.color}, 0 0 90px ${st.color}` }}>{text}</div>
  }
  if (k.style === 'stack') {
    const words = text.split(' ')
    return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {words.map((w, i) => {
          const s = spring({ frame: f - i * 5, fps, config: { damping: 10, stiffness: 220 } })
          return <div key={i} style={{ transform: `scale(${2 - s}) translateY(${(1 - s) * -60}px)`, opacity: Math.min(1, s * 2), textShadow: '0 10px 0 rgba(0,0,0,.4)' }}>{w}</div>
        })}
      </div>
    )
  }
  if (k.style === 'slam') {
    const s = spring({ frame: f, fps, config: { damping: 9, stiffness: 300 } })
    const shake = Math.exp(-d * 10)
    return <div style={{ ...base, transform: `translateY(-50%) translate(${noise(d * 80) * 14 * shake}px, ${noise(d * 80 + 3) * 14 * shake}px) scale(${3 - 2 * s})`, filter: `blur(${(1 - s) * 8}px)`, textShadow: '0 12px 0 rgba(0,0,0,.45)' }}>{text}</div>
  }
  // behind / marker : montée douce + léger zoom continu
  return <div style={{ ...base, transform: `translateY(calc(-50% + ${(1 - sp) * 80}px)) scale(${1 + d * 0.03})`, textShadow: st.shadow }}>{text}</div>
}

// ------------------------------------------------------------------ transitions B-roll
function transitionStyle(kind, p, entering) {
  // p : 0 → 1 pendant la transition. entering=false pour la sortie (on rejoue à l'envers).
  const q = entering ? eo(p) : 1 - eo(p)
  switch (kind) {
    case 'whip':
      return { transform: `translateX(${(1 - q) * (entering ? 1 : -1) * W}px) skewX(${(1 - q) * -12}deg)`, filter: `blur(${(1 - q) * 18}px)` }
    case 'slide-up':
      return { transform: `translateY(${(1 - q) * H}px)` }
    case 'iris':
      return { clipPath: `circle(${q * 120}% at 50% 45%)` }
    case 'glitch': {
      const j = q < 1 ? (random(`g${p}`) - 0.5) * 80 * (1 - q) : 0
      return { transform: `translateX(${j}px)`, opacity: q < 0.5 ? (random(`o${p}`) > 0.5 ? 1 : 0) : 1, filter: `hue-rotate(${(1 - q) * 120}deg) saturate(${1 + (1 - q) * 2})` }
    }
    case 'fade':
      return { opacity: q }
    case 'zoom':
    default:
      return { transform: `scale(${1 + (1 - q) * 0.6})`, filter: `blur(${(1 - q) * 22}px)`, opacity: q }
  }
}

function BRoll({ b, t, p }) {
  const { fps } = useVideoConfig()
  const d = t - b.at
  if (d < 0 || d > b.dur) return null
  const T = 0.32
  let style = {}
  if (d < T) style = transitionStyle(b.transIn || 'zoom', d / T, true)
  else if (d > b.dur - T) style = transitionStyle(b.transOut || b.transIn || 'zoom', (d - (b.dur - T)) / T, false)
  return (
    <AbsoluteFill style={style}>
      <Sequence from={Math.round(b.at * fps)} layout="none">
        <OffthreadVideo src={staticFile(b.file)} muted style={{ width: W, height: H, objectFit: 'cover' }} />
      </Sequence>
      {b.title && <KineticTitle k={{ ...b.title, at: b.at + (b.title.delay ?? 0.15), dur: b.dur - (b.title.delay ?? 0.15) }} t={t} />}
      {b.title && b.fg && (
        <Sequence from={Math.round(b.at * fps)} layout="none">
          <OffthreadVideo src={staticFile(b.fg)} transparent muted style={{ position: 'absolute', inset: 0, width: W, height: H, objectFit: 'cover' }} />
        </Sequence>
      )}
    </AbsoluteFill>
  )
}

// ------------------------------------------------------------------ accroche, sous-titres, GIF, emojis
function Hook({ text, t }) {
  const { fps } = useVideoConfig()
  if (!text || t > 2.9) return null
  const f = Math.round(t * fps)
  const s = spring({ frame: f, fps, config: { damping: 11, stiffness: 180 } })
  const out = interpolate(t, [2.55, 2.9], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', top: 230, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <div style={{
        maxWidth: 980, padding: '22px 34px', background: '#fff', color: '#0a0a0a', borderRadius: 26,
        fontFamily: CAPTION_FONT, fontWeight: 900, fontSize: 64, lineHeight: 1.05, textAlign: 'center', letterSpacing: -1,
        boxShadow: '0 14px 0 rgba(0,0,0,.35), 0 20px 60px rgba(0,0,0,.45)',
        transform: `rotate(-2deg) scale(${s * out})`, opacity: out,
      }}>{text}</div>
    </div>
  )
}

function Captions({ chunks, t, hidden }) {
  const { fps } = useVideoConfig()
  const c = chunks.find((x) => t >= x.s && t < x.e)
  if (!c || hidden) return null
  const f = Math.round((t - c.s) * fps)
  const pop = spring({ frame: f, fps, config: { damping: 12, stiffness: 260 } })
  return (
    <div style={{
      position: 'absolute', left: 60, right: 60, top: H * 0.63, display: 'flex', flexWrap: 'wrap',
      justifyContent: 'center', gap: '0 30px', transform: `scale(${0.75 + 0.25 * pop})`,
    }}>
      {c.words.map((w, i) => {
        const active = t >= w.s && t < (c.words[i + 1]?.s ?? c.e)
        const color = w.emph ? GREEN : active ? YELLOW : '#fff'
        return (
          <span key={i} style={{
            fontFamily: CAPTION_FONT, fontWeight: 900, fontSize: w.emph ? 108 : 90, lineHeight: 1.08,
            textTransform: 'uppercase', letterSpacing: -1, color, WebkitTextStroke: '14px #000', paintOrder: 'stroke fill',
            textShadow: '0 9px 0 rgba(0,0,0,.45)', display: 'inline-block',
            transform: `rotate(${w.emph ? -3 : 0}deg) scale(${active ? 1.08 : 1})`,
          }}>{w.w}</span>
        )
      })}
    </div>
  )
}

function GifPop({ g, t }) {
  const { fps } = useVideoConfig()
  const d = t - g.at
  if (d < 0 || d > g.dur) return null
  const s = spring({ frame: Math.round(d * fps), fps, config: { damping: 10, stiffness: 200 } })
  const out = interpolate(d, [g.dur - 0.18, g.dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const w = 600
  return (
    <div style={{
      position: 'absolute', left: (W - w) / 2, top: 470, width: w, height: w / (g.aspect || 1.33),
      borderRadius: 30, overflow: 'hidden', border: '8px solid #fff',
      boxShadow: '0 20px 60px rgba(0,0,0,.55)', transform: `rotate(${g.rot ?? 4}deg) scale(${s * out})`,
    }}>
      <Gif src={staticFile(g.file)} width={w} height={w / (g.aspect || 1.33)} fit="cover" />
    </div>
  )
}

function EmojiPop({ e, t }) {
  const { fps } = useVideoConfig()
  const d = t - e.at
  if (d < 0 || d > e.dur || !e.data) return null
  const s = spring({ frame: Math.round(d * fps), fps, config: { damping: 9, stiffness: 220 } })
  const out = interpolate(d, [e.dur - 0.2, e.dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const size = e.size || 260
  return (
    <div style={{ position: 'absolute', left: (e.x ?? 0.78) * W - size / 2, top: (e.y ?? 0.52) * H - size / 2, width: size, height: size, transform: `scale(${s * out}) rotate(${(1 - s) * 30}deg)` }}>
      <Sequence from={Math.round(e.at * fps)} layout="none">
        <Lottie animationData={e.data} loop style={{ width: size, height: size }} />
      </Sequence>
    </div>
  )
}

// ------------------------------------------------------------------ finition
function Grain({ frame, amount }) {
  if (!amount) return null
  return (
    <AbsoluteFill style={{ opacity: amount, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
      <svg width={W} height={H}>
        <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 97} stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  )
}

function LightLeak({ t, at }) {
  const d = t - at
  if (d < -0.15 || d > 0.6) return null
  const a = Math.sin(Math.PI * clamp01((d + 0.15) / 0.75))
  return (
    <AbsoluteFill style={{
      mixBlendMode: 'screen', opacity: a * 0.85, pointerEvents: 'none',
      background: `radial-gradient(60% 40% at ${20 + d * 120}% 30%, rgba(255,140,40,.9), transparent 70%),
                   radial-gradient(50% 35% at ${90 - d * 80}% 70%, rgba(255,60,120,.7), transparent 70%)`,
    }} />
  )
}

// ------------------------------------------------------------------ composition
export function Short(p) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const t = frame / fps
  const flash = interpolate(t, [0, 0.12], [0.6, 0], { extrapolateRight: 'clamp' })
  const inBroll = (p.broll || []).some((b) => t >= b.at && t <= b.at + b.dur)
  const duckVol = (f) => {
    const tt = f / fps
    const k = p.music?.duck || []
    if (!k.length) return p.music?.vol ?? 0.1
    let v = k[0][1]
    for (let i = 1; i < k.length; i++) {
      if (tt < k[i][0]) { const a = k[i - 1], b = k[i]; v = a[1] + (b[1] - a[1]) * ((tt - a[0]) / (b[0] - a[0])); break }
      v = k[i][1]
    }
    const fade = interpolate(f, [0, 10, durationInFrames - 20, durationInFrames], [0, 1, 1, 0], { extrapolateRight: 'clamp' })
    return v * fade
  }

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <MainVideo p={p} t={t} />
      {(p.titles || []).map((k, i) => (
        <AbsoluteFill key={'k' + i}>
          <KineticTitle k={k} t={t} />
          {k.fg && t >= k.at && t <= k.at + k.dur && (
            <Sequence from={Math.round(k.at * fps)} layout="none">
              <MainVideo p={p} t={t} src={k.fg} trimBefore={0} transparent />
            </Sequence>
          )}
        </AbsoluteFill>
      ))}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, transparent 22%, transparent 55%, rgba(0,0,0,.45) 100%)' }} />
      {(p.broll || []).map((b, i) => <BRoll key={'b' + i} b={b} t={t} p={p} />)}
      {(p.gifs || []).map((g, i) => <GifPop key={'g' + i} g={g} t={t} />)}
      {(p.emojis || []).map((e, i) => <EmojiPop key={'e' + i} e={e} t={t} />)}
      <Hook text={p.hook} t={t} />
      <Captions chunks={p.chunks} t={t} hidden={inBroll && p.hideCaptionsOnBroll} />
      <Grain frame={frame} amount={p.grain ?? 0.06} />
      {(p.leaks || []).map((at, i) => <LightLeak key={'l' + i} t={t} at={at} />)}
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 10, width: `${(frame / durationInFrames) * 100}%`, background: YELLOW }} />
      {(p.sfx || []).map((s, i) => (
        <Sequence key={'s' + i} from={Math.max(0, Math.round(s.at * fps))} durationInFrames={Math.round((s.len || 2.5) * fps)}>
          <Audio src={staticFile(s.file)} volume={s.vol ?? 0.6} />
        </Sequence>
      ))}
      {p.music && <Audio src={staticFile(p.music.file)} trimBefore={Math.round((p.music.offset || 0) * fps)} volume={duckVol} />}
    </AbsoluteFill>
  )
}
