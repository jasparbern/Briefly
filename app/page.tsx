'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const previewMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('REPLACE_ME')

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(!previewMode)
  const router = useRouter()

  useEffect(() => {
    if (previewMode) return
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) router.replace('/dashboard')
        else setChecking(false)
      })
    })
  }, [router])

  async function signInWithGoogle() {
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
        redirectTo: `${location.origin}/auth/callback`,
        scopes: 'email profile',
      },
    })
  }

  // Reveal-on-scroll for elements with .reveal
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
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [checking])

  if (checking) return null

  return (
    <main id="main" className="overflow-x-hidden">
      <NavBar onSignIn={signInWithGoogle} loading={loading} />
      <Hero onSignIn={signInWithGoogle} loading={loading} />
      <SampleDigest />
      <HowItWorks />
      <Streams />
      <TrustStrip />
      <FinalCTA onSignIn={signInWithGoogle} loading={loading} />
      <Footer />
    </main>
  )
}

/* =========================================================================
 * Nav
 * ========================================================================= */
function NavBar({ onSignIn, loading }: { onSignIn: () => void; loading: boolean }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-[var(--line-soft)]">
      <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
          <Mark />
          <span>Briefly</span>
        </a>
        <div className="flex items-center gap-2 text-sm">
          <a href="#how" className="px-3 py-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">How it works</a>
          <a href="#streams" className="px-3 py-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">Streams</a>
          <button
            type="button"
            onClick={onSignIn}
            disabled={loading}
            className="btn btn-green text-sm py-2 px-4"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </nav>
    </header>
  )
}

function Mark() {
  return (
    <span className="relative inline-flex items-center justify-center w-7 h-7 rounded-md bg-[var(--green-600)]" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8l8 5 8-5" />
        <rect x="3" y="6" width="18" height="13" rx="2" />
      </svg>
    </span>
  )
}

/* =========================================================================
 * Hero
 * ========================================================================= */
function Hero({ onSignIn, loading }: { onSignIn: () => void; loading: boolean }) {
  return (
    <section className="relative pt-20 pb-32 px-6 overflow-hidden">
      {/* Soft gradient + dotted grid backdrop */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-[var(--green-50)] to-white" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 dot-grid opacity-50" />

      {/* Floating envelopes */}
      <FloatingEnvelopes />

      <div className="max-w-3xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[var(--green-200)] text-xs font-medium text-[var(--green-700)] mb-7 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green-500)]" />
          New: AI-picked topic streams
        </div>

        <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] tracking-tight text-balance">
          Your week of email,
          <br />
          <span className="text-[var(--green-700)] italic">in one read.</span>
        </h1>

        <p className="mt-6 text-lg text-[var(--ink-soft)] max-w-xl mx-auto text-pretty">
          Pick who matters. Skip the rest. Briefly reads your inbox and sends a clean recap on your schedule.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onSignIn}
            disabled={loading}
            className="btn btn-primary text-base"
          >
            <GoogleG />
            {loading ? 'Signing in…' : 'Start with Google'}
          </button>
          <a href="#sample" className="btn btn-ghost text-base">
            See a sample digest
          </a>
        </div>

        <p className="mt-4 text-xs text-[var(--ink-mute)]">Free during early access. Read-only Gmail. No spam, ever.</p>
      </div>

      {/* Peeking digest card */}
      <PeekingDigest />
    </section>
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

function FloatingEnvelopes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute top-24 left-[8%] w-16 h-12 rounded-md bg-white border border-[var(--green-200)] shadow-sm float-a" />
      <div className="absolute top-40 right-[10%] w-20 h-14 rounded-md bg-white border border-[var(--green-200)] shadow-sm float-b" />
      <div className="absolute top-60 left-[18%] w-14 h-10 rounded-md bg-[var(--green-50)] border border-[var(--green-300)] float-c" />
      <div className="absolute top-72 right-[22%] w-16 h-12 rounded-md bg-white border border-[var(--green-200)] shadow-sm float-a" />
    </div>
  )
}

function PeekingDigest() {
  return (
    <div className="relative max-w-2xl mx-auto mt-16">
      <div className="absolute inset-0 -z-10 blur-3xl opacity-50 bg-gradient-to-tr from-[var(--green-200)] to-[var(--green-400)] rounded-[36px]" aria-hidden="true" />
      <article className="bg-white rounded-3xl border border-[var(--line)] shadow-[0_30px_60px_-30px_rgba(5,150,105,0.35)] overflow-hidden translate-y-12">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--line-soft)] text-xs text-[var(--ink-soft)] tnum">
          <span className="w-2.5 h-2.5 rounded-full bg-[#fb7185]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--green-400)]" />
          <span className="ml-3">📬 Briefly — Cal Poly: 2 forms due before Mon</span>
        </div>
        <div className="p-6 space-y-4 text-left">
          <BucketRow color="bucket-red" emoji="🔴" title="Action Required" items={[
            <>Submit final transcript from <strong>Mira Costa High</strong> by <strong>July 1</strong>.</>,
            <>Complete the <strong>Residency Questionnaire</strong> in your portal.</>,
          ]}/>
          <BucketRow color="bucket-amber" emoji="🟡" title="Important Updates" items={[
            <>Housing locked for <strong>AY 26-27</strong>. First payment <strong>Sep 1</strong>.</>,
            <>Roommate groups of 2 can pick a triple. Third roommate assigned later.</>,
          ]}/>
        </div>
      </article>
    </div>
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

/* =========================================================================
 * Sample digest (the real magic-moment scroll)
 * ========================================================================= */
function SampleDigest() {
  return (
    <section id="sample" className="relative py-24 px-6 bg-white">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="reveal">
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--green-700)]">The recap</span>
          <h2 className="font-display text-4xl md:text-5xl leading-tight mt-3 text-balance">
            One email. <span className="italic text-[var(--green-700)]">All the stuff that matters.</span>
          </h2>
          <p className="mt-5 text-[var(--ink-soft)] text-pretty">
            Bullets. Buckets. Bold dates. No filler. Briefly groups things by what you should do now versus what is just noise.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            {[
              ['🔴', 'Things that need a response today'],
              ['🟡', 'Updates worth knowing'],
              ['🟢', 'Optional opportunities'],
              ['⚪', 'Noise grouped and tucked away'],
            ].map(([e, t]) => (
              <li key={t} className="flex items-start gap-3">
                <span aria-hidden="true" className="text-base leading-6">{e}</span>
                <span className="text-[var(--ink-soft)]">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="reveal">
          <FullDigestCard />
        </div>
      </div>
    </section>
  )
}

function FullDigestCard() {
  return (
    <article className="bg-white rounded-3xl border border-[var(--line)] shadow-xl p-7 text-left">
      <div className="flex items-center gap-2 text-[11px] text-[var(--ink-mute)] tnum">
        <Mark />
        <span>Briefly · Sun 9:00 AM</span>
      </div>
      <h3 className="font-display text-2xl mt-3">📬 Cal Poly — 2 forms due before Mon</h3>
      <p className="text-[var(--ink-mute)] text-xs mt-1">Quiet week. Two deadlines, one housing update.</p>

      <div className="mt-5 space-y-5">
        <BucketRow color="bucket-red" emoji="🔴" title="Action Required" items={[
          <>Submit final transcript from <strong>Mira Costa High</strong> by <strong>July 1</strong>.</>,
          <>Complete the <strong>Residency Questionnaire</strong> in your portal.</>,
        ]}/>
        <BucketRow color="bucket-amber" emoji="🟡" title="Important Updates" items={[
          <>Housing locked for <strong>AY 26-27</strong>. First payment <strong>Sep 1</strong>.</>,
          <>Cancel by <strong>Jul 19</strong> if you change your mind.</>,
          <>PolyCard photo accepted. Card hands out at SLO Days.</>,
        ]}/>
        <BucketRow color="bucket-good" emoji="🟢" title="Opportunity" items={[
          <>Spring 2027 study abroad in Seville. Info sessions <strong>Jul 15, 27, Aug 13</strong>.</>,
        ]}/>
        <BucketRow color="bucket-mute" emoji="⚪" title="Safe to Ignore" items={[
          <>15 identical &ldquo;log in to portal&rdquo; nudges, grouped.</>,
          <>Out-of-office reply from University Housing.</>,
        ]}/>
      </div>
    </article>
  )
}

/* =========================================================================
 * How it works
 * ========================================================================= */
function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Connect Gmail',
      body: 'Read-only access. We can never send, modify, or delete mail.',
    },
    {
      n: '02',
      title: 'Pick what to watch',
      body: 'Paste specific senders, or describe what you want and let AI find them.',
    },
    {
      n: '03',
      title: 'Get the recap',
      body: 'Daily, weekly, or your own custom days. Delivered to the inbox you choose.',
    },
  ]
  return (
    <section id="how" className="py-24 px-6 bg-[var(--bg-soft)] border-y border-[var(--line-soft)]">
      <div className="max-w-5xl mx-auto">
        <div className="reveal text-center mb-14">
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--green-700)]">Setup</span>
          <h2 className="font-display text-4xl md:text-5xl mt-3 text-balance">Three steps. Two minutes.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <div key={s.n} className="reveal" style={{ transitionDelay: `${i * 120}ms` }}>
              <div className="bg-white rounded-2xl border border-[var(--line)] p-7 h-full hover:border-[var(--green-300)] hover:-translate-y-1 transition-all duration-300 ease-out shadow-sm hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl text-[var(--green-700)] tnum">{s.n}</span>
                  <span className="w-2 h-2 rounded-full bg-[var(--green-400)]" aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-[var(--ink-soft)] text-pretty">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* =========================================================================
 * Multiple streams
 * ========================================================================= */
function Streams() {
  return (
    <section id="streams" className="py-24 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="reveal text-center mb-12 max-w-2xl mx-auto">
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--green-700)]">Subscriptions</span>
          <h2 className="font-display text-4xl md:text-5xl mt-3 text-balance">
            One inbox, many <span className="italic text-[var(--green-700)]">streams</span>.
          </h2>
          <p className="mt-5 text-[var(--ink-soft)] text-pretty">
            School news on Mondays. Package tracking every morning. Sports league every Friday. Different stuff stays apart.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <StreamCardPreview accent="green" title="School" cadence="Weekly · Sun" badges={['Calpoly.edu', 'Adobe Sign']} />
          <StreamCardPreview accent="green" title="Packages" cadence="Daily" badges={['Amazon', 'UPS', 'USPS']} />
          <StreamCardPreview accent="green" title="Soccer league" cadence="Fri" badges={['Coach Mike', 'TeamSnap']} />
        </div>
      </div>
    </section>
  )
}

function StreamCardPreview({ title, cadence, badges }: { accent: 'green'; title: string; cadence: string; badges: string[] }) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--line)] p-5 hover:border-[var(--green-300)] hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md reveal">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--green-50)] text-[var(--green-700)] text-[10px] font-semibold uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green-500)]" aria-hidden="true" />
          {cadence}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {badges.map((b) => (
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

/* =========================================================================
 * Trust strip (marquee of value props)
 * ========================================================================= */
function TrustStrip() {
  const items = [
    'Read-only Gmail',
    'Never trains AI on you',
    'Delete in one click',
    'You pick delivery email',
    'No ads, ever',
    'Pause anytime',
  ]
  const doubled = [...items, ...items]
  return (
    <section className="py-10 border-y border-[var(--line-soft)] bg-[var(--bg-soft)] overflow-hidden">
      <div className="flex marquee-track w-max gap-12 px-6">
        {doubled.map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-[var(--ink-soft)] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green-500)]" aria-hidden="true" />
            {t}
          </div>
        ))}
      </div>
    </section>
  )
}

/* =========================================================================
 * Final CTA
 * ========================================================================= */
function FinalCTA({ onSignIn, loading }: { onSignIn: () => void; loading: boolean }) {
  return (
    <section className="relative py-28 px-6 bg-[var(--bg-deep)] text-white overflow-hidden">
      <div aria-hidden="true" className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[var(--green-600)] opacity-25 rounded-full blur-3xl" />
      <div className="relative max-w-3xl mx-auto text-center reveal">
        <h2 className="font-display text-5xl md:text-6xl text-balance">
          Clear your inbox. Keep the <span className="italic text-[var(--green-300)]">important</span>.
        </h2>
        <p className="mt-5 text-white/70 text-lg">Two minutes to set up. Your first digest lands the day you pick.</p>
        <button
          type="button"
          onClick={onSignIn}
          disabled={loading}
          className="mt-9 btn btn-green text-base"
        >
          <GoogleG />
          {loading ? 'Signing in…' : 'Start with Google'}
        </button>
        <p className="mt-3 text-xs text-white/50">No credit card. Free during early access.</p>
      </div>
    </section>
  )
}

/* =========================================================================
 * Footer
 * ========================================================================= */
function Footer() {
  return (
    <footer className="py-10 px-6 border-t border-[var(--line-soft)]">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
        <div className="flex items-center gap-2">
          <Mark />
          <span className="tnum">© {new Date().getFullYear()} Briefly</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="/privacy" className="hover:text-[var(--ink)] transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-[var(--ink)] transition-colors">Terms</a>
          <a href="mailto:jasparbbernstein@gmail.com" className="hover:text-[var(--ink)] transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}
