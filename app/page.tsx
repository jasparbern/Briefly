'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from './brand-logo'

const previewMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('REPLACE_ME')

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [authError, setAuthError] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (previewMode) return
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setSignedIn(true)
      })
    })
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('error') === 'auth') setAuthError(true)
    }
  }, [])

  async function handleCta() {
    // Pass through ?next=/foo so the user lands back where they started after auth.
    const next = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null
    const dest = next && next.startsWith('/') ? next : '/dashboard'
    if (signedIn) {
      router.push(dest)
      return
    }
    if (previewMode) {
      window.alert('Preview mode. Add Supabase keys in .env.local to enable sign-in.')
      return
    }
    setLoading(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(dest)}`,
        scopes: 'email profile',
      },
    })
  }

  // Reveal-on-scroll
  useEffect(() => {
    if (typeof window === 'undefined') return
    const els = document.querySelectorAll<HTMLElement>('.reveal')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <main id="main" className="overflow-x-hidden">
      <NavBar onSignIn={handleCta} loading={loading} signedIn={signedIn} />
      {authError && (
        <div className="max-w-md mx-auto mt-4 px-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
            Sign-in didn&apos;t complete. Try again, or email <a href="mailto:jasparbbernstein@gmail.com" className="underline">jasparbbernstein@gmail.com</a> if it keeps happening.
          </div>
        </div>
      )}

      {/* 1. SHOW what it does */}
      <Hero onSignIn={handleCta} loading={loading} signedIn={signedIn} />

      {/* 2. FEATURES */}
      <Sample />
      <Streams />

      {/* 3. HOW — moved below the streams section */}
      <How />

      <Pricing onSignIn={handleCta} loading={loading} signedIn={signedIn} />
      <Faq />
      <Footer />
    </main>
  )
}

/* Inline icons (consistent stroke, single accent) */
const I = {
  mail: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>
    </svg>
  ),
  bell: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/>
    </svg>
  ),
  cal: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>
    </svg>
  ),
  shield: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  check: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m4 12 5 5L20 6"/>
    </svg>
  ),
}

/* ─────────────────────────────────────────────────────────────────────────
 * Nav
 * ─────────────────────────────────────────────────────────────────────── */
function NavBar({ onSignIn, loading, signedIn }: { onSignIn: () => void; loading: boolean; signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-[var(--line-soft)]">
      <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <BrandLogo />
        <div className="flex items-center gap-1 text-sm">
          <a href="#how" className="hidden sm:inline px-3 py-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">How it works</a>
          <a href="#sample" className="hidden sm:inline px-3 py-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">Sample</a>
          <a href="/pricing" className="hidden sm:inline px-3 py-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">Pricing</a>
          <button
            type="button"
            onClick={onSignIn}
            disabled={loading}
            className="btn btn-green text-sm py-2 px-4 ml-2"
          >
            {loading ? 'Signing in…' : signedIn ? 'Dashboard' : 'Sign in'}
          </button>
        </div>
      </nav>
    </header>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Hero — short headline, one subhead, live demo (chaos → digest)
 * ─────────────────────────────────────────────────────────────────────── */
function Hero({ onSignIn, loading, signedIn }: { onSignIn: () => void; loading: boolean; signedIn: boolean }) {
  return (
    <section className="relative pt-16 pb-20 px-6 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-[var(--green-50)] to-white" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 dot-grid opacity-50" />

      <div className="relative max-w-6xl mx-auto grid md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-5">
          <h1 className="font-display text-[clamp(2.75rem,7vw,5rem)] leading-[0.95] tracking-tight text-balance">
            Your week of email,
            <br />
            <em className="text-[var(--green-700)]">summed up</em> for you.
          </h1>
          <p className="mt-6 text-lg text-[var(--ink)] max-w-md text-pretty">
            We read your inbox and send back one short email.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSignIn}
              disabled={loading}
              className="btn btn-primary text-base"
            >
              <GoogleG />
              {loading ? 'Signing in…' : signedIn ? 'Go to dashboard' : 'Start free'}
            </button>
            <a href="#sample" className="btn btn-ghost text-base">See a real digest</a>
          </div>

          {/* Trust row — the Gmail-access objection answered up front */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[var(--green-600)]" aria-hidden="true"><I.shield/></span>
              Read-only. We can&apos;t send or delete mail.
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[var(--green-600)]" aria-hidden="true"><I.check/></span>
              We never store your emails.
            </span>
          </div>
        </div>

        <div className="md:col-span-7">
          <HeroDemo />
        </div>
      </div>
    </section>
  )
}

/* The hero visual: a chaotic inbox scrolling on the left, the one clean email on the right. */
function HeroDemo() {
  const subjects = [
    'PTA: Spring Fundraiser Volunteers Needed!!!',
    'Mrs. Carter — homework packet (please print)',
    'District: 2026-27 calendar draft',
    'School Cafe: Breakfast menu, week of Mar 17',
    'Coach Mike: Practice moved indoors Sat',
    'Principal weekly — 14 updates inside',
    'Bus 217 route change effective Monday',
    'Library overdue: Diary of a Wimpy Kid',
    'Spirit week starts Monday!',
    'Reply all: thanks!! (Allison Park)',
    'Reply all: 🙏 (Sam from room 4)',
    'School Photos: pre-order deadline FRIDAY',
    '5th grade promotion — RSVP needed',
    'Field trip — chaperones sign up here',
    'Lunch balance low for Maya ($2.18 left)',
    'YEAR-END SHOW tickets are LIVE 🎭',
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 items-start">
      {/* LEFT — what you read: the chaotic inbox, scrolling */}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-[var(--ink-mute)] mb-2 text-center">What you read</p>
        <div className="relative h-[320px] sm:h-[420px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-soft)] shadow-sm">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[var(--bg-soft)] to-transparent z-10" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--bg-soft)] to-transparent z-10" />
          <ul className="vscroll-track py-3 px-3.5 space-y-2 text-[12px] sm:text-[13px] leading-tight text-[var(--ink-soft)]">
            {[...subjects, ...subjects].map((s, i) => (
              <li key={i} className="flex items-start gap-2 py-1 border-b border-dashed border-[var(--line-soft)]">
                <span aria-hidden="true" className="text-[var(--ink-mute)] mt-0.5 shrink-0"><I.mail/></span>
                <span className="truncate">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* RIGHT — what you get: the one clean email */}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-[var(--green-700)] mb-2 text-center">What you get</p>
        <article className="bg-white rounded-2xl border border-[var(--green-300)] shadow-[0_24px_50px_-28px_rgba(5,150,105,0.45)] overflow-hidden h-[320px] sm:h-[420px] flex flex-col">
          <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-[var(--line-soft)] text-[11px] text-[var(--ink-mute)] tnum">
            <span className="w-2 h-2 rounded-full bg-[#fb7185]" />
            <span className="w-2 h-2 rounded-full bg-[#fbbf24]" />
            <span className="w-2 h-2 rounded-full bg-[var(--green-400)]" />
            <span className="ml-1.5 truncate">Sun · 9:00 am</span>
          </div>
          <div className="p-3.5 sm:p-4 space-y-3.5 text-left overflow-hidden">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bucket-red">🔴 Action</span>
              <ul className="mt-1.5 space-y-1 text-[12px] sm:text-[13px] text-[var(--ink)] leading-snug">
                <li>Field trip slip <strong>+$14</strong> by Thu</li>
                <li>Picture day reorder <strong>Mar 28</strong></li>
              </ul>
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bucket-amber">🟡 Important</span>
              <ul className="mt-1.5 space-y-1 text-[12px] sm:text-[13px] text-[var(--ink)] leading-snug">
                <li>PTA Tue <strong>7 pm</strong></li>
                <li>Bus 217 reroute Mon</li>
              </ul>
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bucket-mute">⚪ Ignored</span>
              <p className="mt-1.5 text-[12px] sm:text-[13px] text-[var(--ink-soft)] leading-snug">12 reply-all + promo blasts, grouped</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function BucketRow({ color, emoji, title, items }: { color: string; emoji: string; title: string; items: React.ReactNode[] }) {
  return (
    <div>
      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold ${color}`}>
        <span aria-hidden="true">{emoji}</span> {title}
      </span>
      <ul className="mt-2 space-y-1.5 text-sm text-[var(--ink)] pl-1">
        {items.map((it, i) => <li key={i} className="flex gap-2"><span className="text-[var(--ink-mute)]" aria-hidden="true">·</span><span>{it}</span></li>)}
      </ul>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * How it works — briefly explain how + what
 * ─────────────────────────────────────────────────────────────────────── */
function How() {
  const steps = [
    { icon: <I.shield/>, title: 'Connect your Gmail', body: 'Sign in with Google. Read-only — we can read your mail but can\'t send, change, or delete anything.' },
    { icon: <I.mail/>,   title: 'Tell us what to watch', body: 'List the senders you care about, or describe a topic and we find the matching emails.' },
    { icon: <I.cal/>,    title: 'Pick when to get it', body: 'Daily, weekly, or set days. At that time we send one email with everything that matters.' },
  ]
  return (
    <section id="how" className="py-16 px-6 bg-[var(--bg-soft)] border-y border-[var(--line-soft)]">
      <div className="max-w-5xl mx-auto">
        <div className="reveal text-center mb-10">
          <h2 className="font-display text-4xl md:text-5xl text-balance">
            Three steps. <em className="text-[var(--green-700)]">Two minutes.</em>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <div key={s.title} className="reveal" style={{ transitionDelay: `${i * 120}ms` }}>
              <div className="bg-white rounded-2xl border border-[var(--line)] p-6 h-full hover:border-[var(--green-300)] hover:-translate-y-1 transition-all duration-300 ease-out shadow-sm hover:shadow-lg">
                <div className="flex items-center justify-between text-[var(--green-700)]">
                  {s.icon}
                  <span className="font-display text-2xl italic text-[var(--green-700)] tnum">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-[var(--ink)] text-pretty leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Sample — the full email you get
 * ─────────────────────────────────────────────────────────────────────── */
function Sample() {
  return (
    <section id="sample" className="py-16 px-6 bg-white">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="reveal">
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05] text-balance">
            This is the email <em className="text-[var(--green-700)]">you get</em>.
          </h2>
          <p className="mt-5 text-[var(--ink)] text-pretty">
            Everything is sorted into four groups, so you know what needs you and what doesn&apos;t:
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {[
              ['🔴', 'Things you have to do'],
              ['🟡', 'Worth knowing, no action needed'],
              ['🟢', 'Optional — deals, drops, signups'],
              ['⚪', 'Noise, grouped and skippable'],
            ].map(([e, t]) => (
              <li key={t} className="flex items-start gap-3">
                <span aria-hidden="true" className="text-base leading-6">{e}</span>
                <span className="text-[var(--ink-soft)]">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="reveal">
          <FullDigest />
        </div>
      </div>
    </section>
  )
}

function FullDigest() {
  return (
    <article className="bg-white rounded-3xl border border-[var(--line)] shadow-xl p-7 text-left rotate-[0.4deg] hover:rotate-0 transition-transform duration-500">
      <div className="flex items-center justify-between text-[11px] text-[var(--ink-mute)] tnum">
        <span className="uppercase tracking-widest">Sun · 9:00 am</span>
        <span>Abridgly</span>
      </div>
      <h3 className="font-display text-2xl mt-3 leading-tight">📬 Your week of subscriptions — 1 renewal, 3 reads</h3>
      <p className="text-[var(--ink-mute)] text-xs mt-1">Here&apos;s what was worth your time.</p>

      <div className="mt-5 space-y-5">
        <BucketRow color="bucket-red" emoji="🔴" title="Action Required" items={[
          <>Spotify auto-renews <strong>Thu</strong>. <strong>$16.99</strong>. Cancel here.</>,
          <>Update payment for Notion. Card on file expires <strong>Mar 31</strong>.</>,
        ]}/>
        <BucketRow color="bucket-amber" emoji="🟡" title="Important" items={[
          <>Lenny&apos;s Newsletter: new post on growth loops.</>,
          <>NYT: 3 long reads saved to your feed.</>,
        ]}/>
        <BucketRow color="bucket-good" emoji="🟢" title="Opportunity" items={[
          <>Apple TV+ free month if you resub by <strong>Apr 4</strong>.</>,
        ]}/>
        <BucketRow color="bucket-mute" emoji="⚪" title="Safe to Ignore" items={[
          <>12 promo blasts grouped (sale, sale, last chance).</>,
          <>8 &ldquo;new login&rdquo; notices, all you.</>,
        ]}/>
      </div>
    </article>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Streams — one digest per context
 * ─────────────────────────────────────────────────────────────────────── */
function Streams() {
  return (
    <section className="py-16 px-6 bg-[var(--bg-soft)] border-y border-[var(--line-soft)]">
      <div className="max-w-5xl mx-auto">
        <div className="reveal max-w-2xl">
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05] text-balance">
            One inbox. <em className="text-[var(--green-700)]">A separate digest for each thing.</em>
          </h2>
          <p className="mt-4 text-[var(--ink)] text-pretty">
            Make a separate digest for each thing you care about. Each one watches its own senders or topics on its own schedule. They never mix.
          </p>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StreamCard name="School" cadence="Weekly · Sun" senders={['Lincoln PTA', 'Principal', 'Coach Mike']} />
          <StreamCard name="Work" cadence="Daily" senders={['Slack digest', 'Calendar', 'Notion updates']} />
          <StreamCard name="Packages" cadence="Daily" senders={['Amazon', 'UPS', 'USPS', 'FedEx']} />
          <StreamCard name="Hobbies" cadence="Sat" senders={['Climbing gym', 'Cooking newsletter', 'NYT Games']} />
        </div>
      </div>
    </section>
  )
}

function StreamCard({ name, cadence, senders }: { name: string; cadence: string; senders: string[] }) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--line)] p-5 hover:border-[var(--green-300)] hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md reveal">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{name}</h3>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--green-50)] text-[var(--green-700)] text-[10px] font-semibold uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green-500)]" aria-hidden="true" />
          {cadence}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {senders.map((b) => (
          <span key={b} className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-soft)] text-[var(--ink-soft)] border border-[var(--line)]">{b}</span>
        ))}
      </div>
      <div className="mt-5 space-y-1.5">
        <div className="h-2 rounded-full bg-[var(--line-soft)] w-3/4" />
        <div className="h-2 rounded-full bg-[var(--line-soft)] w-2/3" />
        <div className="h-2 rounded-full bg-[var(--line-soft)] w-4/5" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * FAQ
 * ─────────────────────────────────────────────────────────────────────── */
function Faq() {
  const qs = [
    {
      q: 'Will Abridgly miss something important?',
      a: 'Anything with a deadline, dollar amount, signed form, or schedule change lands in Action Required or Important. Reply-all noise gets grouped, not dropped.',
    },
    {
      q: 'Do you keep my emails?',
      a: 'No. We read them only to build your digest and discard them the second it sends. We save your settings and the digests themselves, nothing more. Never sold, never used to train AI.',
    },
    {
      q: 'Can someone else get the same digest?',
      a: 'Yes. Set a "send to" email on any stream. You own the Gmail. They get the recap.',
    },
    {
      q: 'How much does it cost?',
      a: 'Free for one digest a week, 5 senders. Pro is $7/month: 5 digests, daily delivery, 25 senders each, send to any inbox. Pro starts with 14 days free, no card.',
    },
  ]
  return (
    <section id="faq" className="py-16 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="reveal mb-8">
          <h2 className="font-display text-4xl md:text-5xl text-balance">
            Questions people ask.
          </h2>
        </div>
        <div className="space-y-3">
          {qs.map((it) => (
            <details key={it.q} className="reveal group bg-[var(--bg-soft)] rounded-2xl border border-[var(--line)] p-5 hover:border-[var(--green-300)] transition-colors">
              <summary className="flex items-center justify-between cursor-pointer list-none font-medium">
                <span>{it.q}</span>
                <span aria-hidden="true" className="ml-4 text-[var(--ink-mute)] transition-transform group-open:rotate-45 text-xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-[var(--ink)] leading-relaxed text-pretty">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Pricing + CTA
 * ─────────────────────────────────────────────────────────────────────── */
function Pricing({ onSignIn, loading, signedIn }: { onSignIn: () => void; loading: boolean; signedIn: boolean }) {
  return (
    <section id="pricing" className="py-20 px-6 bg-white border-t border-[var(--line-soft)]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center reveal mb-10">
          <h2 className="font-display text-4xl md:text-5xl text-balance">
            Start free. <em className="text-[var(--green-700)]">Upgrade if you want more.</em>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto reveal">
          {/* Free */}
          <article className="bg-white rounded-3xl border border-[var(--line)] p-7 flex flex-col">
            <h3 className="font-display text-2xl">Free</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-4xl tnum">$0</span>
              <span className="text-[var(--ink-mute)] text-sm">/forever</span>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm text-[var(--ink)] flex-1">
              <Tick>One digest, once a week</Tick>
              <Tick>Watch up to 5 senders</Tick>
              <Tick>Read-only access to your Gmail</Tick>
            </ul>
            <button
              type="button"
              onClick={onSignIn}
              disabled={loading}
              className="mt-7 inline-flex justify-center items-center gap-2 rounded-xl border border-[var(--line)] text-[var(--ink)] font-semibold py-3 hover:border-[var(--green-300)] transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in…' : signedIn ? 'Go to dashboard' : 'Start free'}
            </button>
          </article>

          {/* Pro */}
          <article className="bg-[var(--bg-deep)] text-white rounded-3xl p-7 flex flex-col relative overflow-hidden">
            <div aria-hidden="true" className="absolute -top-32 -right-32 w-[400px] h-[400px] bg-[var(--green-600)] opacity-30 rounded-full blur-3xl" />
            <div className="relative flex flex-col flex-1">
              <div className="flex items-start justify-between">
                <h3 className="font-display text-2xl">Pro</h3>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--green-600)] text-white text-[10px] font-semibold uppercase tracking-wider">
                  14-day free trial
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl tnum">$7</span>
                <span className="text-white/60 text-sm">/month</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-sm flex-1">
                <Tick dark>Up to 5 separate digests</Tick>
                <Tick dark>Watch 25 senders in each</Tick>
                <Tick dark>Send daily, weekly, or on set days</Tick>
                <Tick dark>Find emails by topic, not just sender</Tick>
                <Tick dark>Send any digest to any inbox</Tick>
              </ul>
              <a
                href="/pricing"
                className="mt-7 inline-flex justify-center items-center gap-2 rounded-xl bg-[var(--green-600)] hover:bg-[var(--green-700)] text-white font-semibold py-3 transition-colors"
              >
                Start 14-day trial
              </a>
              <p className="mt-3 text-xs text-white/50 text-center">No card to start. Cancel in one click.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

function Tick({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`mt-0.5 shrink-0 ${dark ? 'text-[var(--green-300)]' : 'text-[var(--green-600)]'}`} aria-hidden="true">
        <path d="m4 12 5 5L20 6"/>
      </svg>
      <span className={dark ? 'text-white/90' : ''}>{children}</span>
    </li>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Footer
 * ─────────────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="py-10 px-6 border-t border-[var(--line-soft)]">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
        <div className="flex items-center gap-3">
          <BrandLogo />
          <span className="tnum text-[var(--ink-mute)]">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#how" className="hover:text-[var(--ink)] transition-colors">How it works</a>
          <a href="/pricing" className="hover:text-[var(--ink)] transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-[var(--ink)] transition-colors">FAQ</a>
          <a href="/privacy" className="hover:text-[var(--ink)] transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-[var(--ink)] transition-colors">Terms</a>
          <a href="/contact" className="hover:text-[var(--ink)] transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}
