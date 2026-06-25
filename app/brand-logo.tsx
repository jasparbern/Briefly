// Shared Abridgly brand mark + wordmark. The icon is a clock whose hands form the
// letter A, so the mark doubles as the capital A in "Abridgly" (mark + "bridgly").
// Used in every page header so the top-left logo is identical everywhere.

export function ClockAMark({ className = '', title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" role="img" aria-label={title ?? 'Abridgly'}>
      <circle cx="50" cy="50" r="40" stroke="#10241b" strokeWidth="6" />
      <g stroke="#10241b" strokeWidth="5" strokeLinecap="round">
        <line x1="50" y1="12" x2="50" y2="19" />
        <line x1="88" y1="50" x2="81" y2="50" />
        <line x1="50" y1="88" x2="50" y2="81" />
        <line x1="12" y1="50" x2="19" y2="50" />
      </g>
      <path d="M32 74 L50 42 L68 74 M39 62 L61 62" stroke="#047857" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="42" r="3.5" fill="#047857" />
    </svg>
  )
}

export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <a href="/" aria-label="Abridgly — home" className={`inline-flex items-center gap-1.5 ${className}`}>
      <ClockAMark className="h-7 w-7 shrink-0" />
      <span className="font-display font-semibold text-[19px] leading-none tracking-tight text-[#047857]">bridgly</span>
    </a>
  )
}
