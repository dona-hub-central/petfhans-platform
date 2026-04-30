type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, { title: string; tag: string; gap: string }> = {
  sm: { title: '22px', tag: '11px', gap: '3px' },
  md: { title: '30px', tag: '13px', gap: '4px' },
  lg: { title: '40px', tag: '15px', gap: '6px' },
}

export default function PetfhansLogo({
  size = 'md',
  showTagline = false,
  align = 'center',
}: {
  size?: Size
  showTagline?: boolean
  align?: 'center' | 'left'
}) {
  const s = SIZES[size]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'left' ? 'flex-start' : 'center', gap: s.gap }}>
      <span style={{
        fontFamily: 'var(--pf-font-display)',
        fontSize: s.title,
        fontWeight: 800,
        color: 'var(--pf-coral)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        Petfhans
      </span>
      {showTagline && (
        <span style={{
          fontFamily: 'var(--pf-font-body)',
          fontSize: s.tag,
          fontWeight: 400,
          color: 'var(--pf-muted)',
        }}>
          Inspiring healthy pet lives
        </span>
      )}
    </div>
  )
}
