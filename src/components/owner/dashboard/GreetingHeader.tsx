export default function GreetingHeader({ name }: { name: string }) {
  const firstName = name?.split(' ')[0] ?? 'tú'
  return (
    <div>
      <p style={{
        fontFamily: 'var(--pf-font-body)',
        fontSize: 13, fontWeight: 600, color: 'var(--pf-muted)',
        textTransform: 'uppercase', letterSpacing: '.07em', margin: 0,
      }}>
        Bienvenido de vuelta
      </p>
      <h1 style={{
        fontFamily: 'var(--pf-font-display)',
        fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em',
        color: 'var(--pf-ink)', margin: '4px 0 0',
      }}>
        Hola, {firstName} 👋
      </h1>
    </div>
  )
}
