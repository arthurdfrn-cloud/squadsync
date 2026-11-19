import {
  AbsoluteFill, OffthreadVideo, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig,
  interpolate, spring, Easing,
} from 'remotion'
import { Gif } from '@remotion/gif'

// ---------------------------------------------------------------------------
// Un short vertical 1080x1920 tiré d'une vidéo source. Tout le contenu vient
// des props écrites par shorts/build.py (voir SKILL.md pour le format).
// Style : accroche en haut, sous-titres gros et mot à mot, zooms "jump cut",
// punch-ins + secousse sur les mots forts, GIF qui popent, barre de progression.
// ---------------------------------------------------------------------------

const W = 1080
const H = 1920
const YELLOW = '#FFE14D'
const GREEN = '#3DFF8B'
const FONT = "'Inter Display', Inter, 'Montserrat', 'Arial Black', sans-serif"

const noise = (n) => {
  const s = Math.sin(n * 127.1) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

function sampleTrack(track, t) {
  if (!track || track.length === 0) return 0.5
  if (t <= track[0].t) return track[0].x
  for (let i = 1; i < track.length; i++) {
    if (t <= track[i].t) {
      const a = track[i - 1], b = track[i]
      if (b.cut) return a.x // changement de plan : on garde l'ancien cadrage jusqu'à la coupe
      return a.x + (b.x - a.x) * ((t - a.t) / (b.t - a.t))
    }
  }
  return track[track.length - 1].x
}

function zoomAt(t, fps, zooms, jumps) {
  // Zoom "jump cut" : niveau de base qui alterne à chaque saut
  let base = 1
  for (const j of jumps) if (t >= j.t) base = j.scale
  // Punch-in sur les mots forts
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

function VideoLayer({ p, t }) {
  const { fps } = useVideoConfig()
  const z = zoomAt(t, fps, p.zooms, p.jumps)
  const sh = shakeAt(t, p.booms)
  const video = (style) => (
    <OffthreadVideo
      src={staticFile(p.src)}
      trimBefore={Math.round(p.start * fps)}
      trimAfter={Math.round(p.end * fps)}
      style={style}
    />
  )

  if (p.layout === 'fit') {
    // Source large sans visage net : fond flouté + vidéo entière au centre
    const vh = W / p.aspect
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{ transform: 'scale(1.25)', filter: 'blur(38px) brightness(0.5)' }}>
          <OffthreadVideo src={staticFile(p.src)} trimBefore={Math.round(p.start * fps)} trimAfter={Math.round(p.end * fps)}
            muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
        <div style={{
          position: 'absolute', left: 0, top: H * 0.42 - vh / 2, width: W, height: vh,
          transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg) scale(${z * 1.04})`,
        }}>
          <OffthreadVideo src={staticFile(p.src)} trimBefore={Math.round(p.start * fps)} trimAfter={Math.round(p.end * fps)}
            style={{ width: '100%', height: '100%' }} />
        </div>
      </AbsoluteFill>
    )
  }

  // Recadrage 9:16 qui suit le visage (layout "crop") ou plein cadre (source déjà verticale)
  const vw = p.layout === 'crop' ? H * p.aspect : W
  const vh = p.layout === 'crop' ? H : W / p.aspect
  const cx = p.layout === 'crop' ? sampleTrack(p.track, t) : 0.5
  const left = Math.min(0, Math.max(W - vw, W / 2 - cx * vw))
  const top = (H - Math.max(vh, H)) / 2
  return (
    <AbsoluteFill style={{
      transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg) scale(${z})`,
      transformOrigin: `50% ${p.focusY * 100}%`,
    }}>
      {video({ position: 'absolute', left, top, width: vw, height: Math.max(vh, H), objectFit: 'cover' })}
    </AbsoluteFill>
  )
}

function Hook({ text, t }) {
  const { fps } = useVideoConfig()
  if (!text || t > 2.9) return null
  const f = Math.round(t * fps)
  const s = spring({ frame: f, fps, config: { damping: 11, stiffness: 180 } })
  const out = interpolate(t, [2.55, 2.9], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', top: 230, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <div style={{
        maxWidth: 900, padding: '22px 34px', background: '#fff', color: '#0a0a0a', borderRadius: 26,
        fontFamily: FONT, fontWeight: 900, fontSize: 66, lineHeight: 1.05, textAlign: 'center', letterSpacing: -1,
        boxShadow: '0 14px 0 rgba(0,0,0,.35), 0 20px 60px rgba(0,0,0,.45)',
        transform: `rotate(-2deg) scale(${s * out})`, opacity: out,
      }}>
        {text}
      </div>
    </div>
  )
}

function Captions({ chunks, t }) {
  const { fps } = useVideoConfig()
  const c = chunks.find((x) => t >= x.s && t < x.e)
  if (!c) return null
  const f = Math.round((t - c.s) * fps)
  const pop = spring({ frame: f, fps, config: { damping: 12, stiffness: 260 } })
  return (
    <div style={{
      position: 'absolute', left: 60, right: 60, top: H * 0.63, display: 'flex', flexWrap: 'wrap',
      justifyContent: 'center', gap: '0 32px', transform: `scale(${0.75 + 0.25 * pop})`,
    }}>
      {c.words.map((w, i) => {
        const active = t >= w.s && t < (c.words[i + 1]?.s ?? c.e)
        const color = w.emph ? GREEN : active ? YELLOW : '#fff'
        return (
          <span key={i} style={{
            fontFamily: FONT, fontWeight: 900, fontSize: w.emph ? 112 : 92, lineHeight: 1.08,
            textTransform: 'uppercase', letterSpacing: -1, color,
            WebkitTextStroke: '14px #000', paintOrder: 'stroke fill',
            textShadow: '0 9px 0 rgba(0,0,0,.45)',
            display: 'inline-block', transform: `rotate(${w.emph ? -3 : 0}deg) scale(${active ? 1.08 : 1})`,
          }}>
            {w.w}
          </span>
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

export function Short(p) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const t = frame / fps
  const flash = interpolate(t, [0, 0.12], [0.6, 0], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <VideoLayer p={p} t={t} />
      {/* légère vignette pour faire ressortir les textes */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, transparent 22%, transparent 55%, rgba(0,0,0,.45) 100%)' }} />
      {p.gifs.map((g, i) => <GifPop key={i} g={g} t={t} />)}
      <Hook text={p.hook} t={t} />
      <Captions chunks={p.chunks} t={t} />
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
      {/* barre de progression (rétention) */}
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 10, width: `${(frame / durationInFrames) * 100}%`, background: YELLOW }} />
      {p.sfx.map((s, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(s.at * fps))} durationInFrames={Math.round(2.5 * fps)}>
          <Audio src={staticFile(s.file)} volume={s.vol ?? 0.6} />
        </Sequence>
      ))}
      {p.music && (
        <Audio src={staticFile(p.music.file)} trimBefore={Math.round((p.music.offset || 0) * fps)}
          volume={(f) => interpolate(f, [0, 10, durationInFrames - 20, durationInFrames], [0, p.music.vol, p.music.vol, 0], { extrapolateRight: 'clamp' })} />
      )}
    </AbsoluteFill>
  )
}
