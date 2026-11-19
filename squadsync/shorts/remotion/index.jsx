import { registerRoot, Composition } from 'remotion'
import { Short } from './Short'

const defaults = {
  src: 'source.mp4', start: 0, end: 10, duration: 10, aspect: 16 / 9, layout: 'fit', focusY: 0.35,
  track: [], zooms: [], jumps: [], booms: [], chunks: [], gifs: [], sfx: [], hook: '', music: null,
}

function Root() {
  return (
    <Composition
      id="Short"
      component={Short}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={300}
      defaultProps={defaults}
      calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, Math.round(props.duration * 30)) })}
    />
  )
}

registerRoot(Root)
