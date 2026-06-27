'use client'

import { useEffect, useState } from 'react'
import { BrandLogo } from '../brand-logo'

export default function PricingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)
  const [tier, setTier] = useState<'free' | 'pro' | null>(null)

  useEffect(() => {
    fetch('/api/account/tier')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.tier) setTier(d.tier) })
      .catch(() => {})
  }, [])

  async function startCheckout() {
    setLoading(true)
    setError(null)
    setNeedsSignIn(false)
    setAlreadySubscribed(false)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      if (!res.ok) {
        if (res.status === 401) {
          setNeedsSignIn(true)
          return
        }
        if (res.status === 409) {
          setAlreadySubscribed(true)
          return
        }
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Could not start checkout (HTTP ${res.status})`)
        return
      }
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-[var(--line-soft)]">
        <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <BrandLogo />
        </nav>
      </header>

      <section className="px-6 pt-16 pb-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-display text-5xl md:text-6xl leading-[1.02] text-balance">
            Free forever.
            <br />
            <em className="text-[var(--green-700)]">$7 if you want more.</em>
          </h1>
          <p className="mt-5 text-lg text-[var(--ink)] max-w-xl mx-auto">
            Start on Free and get one digest a week. Upgrade to Pro for more digests and daily delivery. Pro is free for 14 days, no card needed, and you can cancel in one click.
          </p>
        </div>
      </section>

      {needsSignIn && (
        <div className="max-w-md mx-auto mt-2 mb-4 px-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm flex items-center justify-between gap-3">
            <span>Sign in first to start your trial.</span>
            <a href="/?next=%2Fpricing" className="font-semibold underline whitespace-nowrap">Sign in</a>
          </div>
        </div>
      )}
      {alreadySubscribed && (
        <div className="max-w-md mx-auto mt-2 mb-4 px-6">
          <div className="rounded-xl border border-[var(--green-300)] bg-[var(--green-50)] text-[var(--green-700)] px-4 py-3 text-sm flex items-center justify-between gap-3">
            <span>You&apos;re already Pro. Manage billing from the dashboard.</span>
            <a href="/dashboard" className="font-semibold underline whitespace-nowrap">Dashboard</a>
          </div>
        </div>
      )}
      {error && (
        <div className="max-w-md mx-auto mt-2 mb-4 px-6">
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        </div>
      )}

      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-5">

          {/* Free */}
          <article className="bg-white rounded-3xl border border-[var(--line)] p-7 flex flex-col">
            <div>
              <h2 className="font-display text-3xl">Free</h2>
              <p className="mt-2 text-[var(--ink-soft)] text-sm">One digest, once a week.</p>
            </div>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-5xl tnum">$0</span>
              <span className="text-[var(--ink-mute)] text-sm">/forever</span>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm text-[var(--ink)] flex-1">
              <Tick>One digest, sent once a week</Tick>
              <Tick>Watch up to 5 senders</Tick>
              <Tick>Read-only access to your Gmail</Tick>
              <Tick>We never store your emails</Tick>
              <Tick>Delete your account in one click</Tick>
            </ul>
            <a
              href="/"
              className="mt-7 inline-flex justify-center items-center gap-2 rounded-xl border border-[var(--line)] text-[var(--ink)] font-semibold py-3 hover:border-[var(--green-300)] transition-colors"
            >
              Start free
            </a>
          </article>

          {/* Pro */}
          <article className="bg-[var(--bg-deep)] text-white rounded-3xl p-7 flex flex-col relative overflow-hidden">
            <div aria-hidden="true" className="absolute -top-32 -right-32 w-[400px] h-[400px] bg-[var(--green-600)] opacity-30 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-3xl">Pro</h2>
                  <p className="mt-2 text-white/70 text-sm">More digests, sent more often.</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--green-600)] text-white text-[10px] font-semibold uppercase tracking-wider">
                  {tier === 'pro' ? 'Current plan' : '14-day free trial'}
                </span>
              </div>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-5xl tnum">$7</span>
                <span className="text-white/60 text-sm">/month</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-sm flex-1">
                <Tick dark>Up to 5 separate digests</Tick>
                <Tick dark>Watch 25 senders in each</Tick>
                <Tick dark>Send daily, weekly, or on set days</Tick>
                <Tick dark>Send any digest to any inbox</Tick>
                <Tick dark>Find emails by topic, not just sender</Tick>
                <Tick dark>Customize the email layout (soon)</Tick>
              </ul>
              {tier === 'pro' ? (
                <a
                  href="/dashboard"
                  className="mt-7 inline-flex justify-center items-center gap-2 rounded-xl bg-[var(--green-600)] hover:bg-[var(--green-700)] text-white font-semibold py-3 transition-colors"
                >
                  Go to dashboard
                </a>
              ) : (
                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={loading}
                  className="mt-7 inline-flex justify-center items-center gap-2 rounded-xl bg-[var(--green-600)] hover:bg-[var(--green-700)] text-white font-semibold py-3 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Starting checkout…' : 'Start 14-day trial'}
                </button>
              )}
              <p className="mt-3 text-xs text-white/50 text-center">
                {tier === 'pro' ? 'Manage billing from your dashboard.' : 'No card to start. Cancel in one click.'}
              </p>
            </div>
          </article>
        </div>

        <p className="max-w-xl mx-auto mt-10 text-center text-sm text-[var(--ink-mute)]">
          Questions? <a href="/contact" className="underline">Get in touch</a>.
        </p>
      </section>
    </main>
  )
}

function Tick({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`mt-0.5 ${dark ? 'text-[var(--green-300)]' : 'text-[var(--green-600)]'}`} aria-hidden="true">
        <path d="m4 12 5 5L20 6"/>
      </svg>
      <span className={dark ? 'text-white/90' : ''}>{children}</span>
    </li>
  )
}
