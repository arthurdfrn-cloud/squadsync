import { registerRoot, Composition, AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'

// Point d'entrée Remotion. Les compositions du montage promo s'ajoutent ici.
function Hello() {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: '#0b0d12', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#34d399', fontSize: 120, fontWeight: 900, fontFamily: 'Inter', transform: `scale(${interpolate(f, [0, 15], [1.4, 1], { extrapolateRight: 'clamp' })})` }}>
        SquadSync
      </div>
    </AbsoluteFill>
  )
}

function Root() {
  return <Composition id="Hello" component={Hello} durationInFrames={30} fps={30} width={1080} height={1920} />
}

registerRoot(Root)
