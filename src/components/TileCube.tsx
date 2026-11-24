// The VancoBiz tile cube: the Tile Grid logo (V and B on the purple diagonal, orange on the
// other) wrapped around a 3D cube. Drawn with CSS 3D transforms only, so there is no 3D library
// to download. Colours come from theme.css (--brand-*); the motion lives in base.css.

type TileKind = 'V' | 'B' | 'orange' | 'purple'

// Front and back show the logo; the sides are plain orange or purple, as on the main site's cube.
const LOGO: TileKind[] = ['V', 'orange', 'orange', 'B']
const FACES: { side: string; tiles: TileKind[] }[] = [
  { side: 'front', tiles: LOGO },
  { side: 'back', tiles: LOGO },
  { side: 'right', tiles: ['orange', 'orange', 'orange', 'orange'] },
  { side: 'left', tiles: ['purple', 'purple', 'purple', 'purple'] },
  { side: 'top', tiles: ['orange', 'orange', 'orange', 'orange'] },
  { side: 'bottom', tiles: ['purple', 'purple', 'purple', 'purple'] },
]

function Tile({ kind }: { kind: TileKind }) {
  return (
    <span className={`tile ${kind === 'orange' ? 'tile-orange' : 'tile-purple'}`}>
      {kind === 'V' && (
        <svg viewBox="0 0 56 56" aria-hidden="true">
          <polygon points="13,12 22.6,12 27.9,29.3 33.2,12 42.8,12 32.7,42.7 23.1,42.7" />
        </svg>
      )}
      {kind === 'B' && (
        <svg viewBox="0 0 56 56" aria-hidden="true">
          <path d="M18.5 12.6 H28.1 A7.7 7.7 0 0 1 28.1 28 H18.5 Z" />
          <path d="M18.5 28 H29.5 A7.7 7.7 0 0 1 29.5 43.4 H18.5 Z" />
        </svg>
      )}
    </span>
  )
}

export function TileCube({ label }: { label: string }) {
  return (
    // dir="ltr" keeps the V top-left and the B bottom-right in Farsi too: a logo is not mirrored.
    <div className="cube-stage" role="img" aria-label={label} dir="ltr">
      <div className="cube">
        {FACES.map((f) => (
          <div key={f.side} className={`cube-face cube-${f.side}`}>
            {f.tiles.map((k, i) => (
              <Tile key={i} kind={k} />
            ))}
          </div>
        ))}
      </div>
      <div className="cube-shadow" />
    </div>
  )
}
