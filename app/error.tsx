'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold tracking-widest uppercase text-red-600">Something broke</p>
        <h1 className="mt-4 font-display text-5xl text-balance">Hmm, that didn&apos;t work.</h1>
        <p className="mt-4 text-[var(--ink-soft)]">
          Try again. If it keeps happening, email <a href="mailto:jasparbbernstein@gmail.com" className="underline">jasparbbernstein@gmail.com</a>.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-xl bg-[var(--green-600)] hover:bg-[var(--green-700)] text-white font-semibold px-5 py-3 transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-xl border border-[var(--line)] text-[var(--ink)] font-semibold px-5 py-3 hover:border-[var(--green-300)] transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  )
}
