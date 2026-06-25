// Abridgly logo. Uses the uploaded artwork exactly as provided (background removed).
// BrandLogo = the full wordmark logo, used everywhere the full logo goes.

export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <a href="/" aria-label="Abridgly — home" className={`inline-flex items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Abridgly" className="h-9 w-auto" />
    </a>
  )
}
