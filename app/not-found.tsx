import Link from 'next/link'

export const metadata = {
  title: 'Not found — Abridgly',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold tracking-widest uppercase text-[var(--green-700)]">404</p>
        <h1 className="mt-4 font-display text-5xl text-balance">Nothing here.</h1>
        <p className="mt-4 text-[var(--ink-soft)]">
          The page you wanted doesn&apos;t exist (anymore). Try the homepage.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[var(--green-600)] hover:bg-[var(--green-700)] text-white font-semibold px-5 py-3 transition-colors"
        >
          Back to Abridgly
        </Link>
      </div>
    </main>
  )
}
