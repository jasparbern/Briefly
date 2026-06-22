'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const previewMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('REPLACE_ME')

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (previewMode) return
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setSignedIn(true)
      })
    })
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
      <Hero onSignIn={handleCta} loading={loading} signedIn={signedIn} />
      <BeforeAfter />
      <Sample />
      <Streams />
      <How />
      <Faq />
      <Pricing onSignIn={handleCta} loading={loading} signedIn={signedIn} />
      <Footer />
    </main>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Brand mark
 * ─────────────────────────────────────────────────────────────────────── */
function Wordmark({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const cls = size === 'sm' ? 'text-[17px]' : 'text-3xl'
  return (
    <span className={`wordmark font-semibold tracking-tight ${cls}`}>
      Br<span className="dot" aria-hidden="true" />efly
    </span>
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
        <a href="/" className="flex items-center"><Wordmark /></a>
        <div className="flex items-center gap-1 text-sm">
          <a href="#sample" className="hidden sm:inline px-3 py-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">Sample</a>
          <a href="#how" className="hidden sm:inline px-3 py-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">How it works</a>
          <a href="/pricing" className="hidden sm:inline px-3 py-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">Pricing</a>
          <a href="#faq" className="hidden sm:inline px-3 py-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">FAQ</a>
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
 * Hero — parent-focused
 * ─────────────────────────────────────────────────────────────────────── */
function Hero({ onSignIn, loading, signedIn }: { onSignIn: () => void; loading: boolean; signedIn: boolean }) {
  return (
    <section className="relative pt-16 pb-20 px-6 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-[var(--green-50)] to-white" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 dot-grid opacity-50" />

      <div className="relative max-w-6xl mx-auto grid md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-7">
          <p className="text-sm text-[var(--green-700)] font-medium mb-4">
            School. Work. Packages. Hobbies. Anything in your inbox.
          </p>
          <h1 className="font-display text-[clamp(2.75rem,7vw,5.25rem)] leading-[0.95] tracking-tight text-balance">
            Your week of email,
            <br />
            <em className="text-[var(--green-700)]">summed up</em> for you.
          </h1>
          <p className="mt-6 text-lg text-[var(--ink)] max-w-md text-pretty">
            We read the emails you don&apos;t have time for, and turn them into one simple digest delivered on your schedule.
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

          <p className="mt-4 text-xs text-[var(--ink-mute)]">
            Free during early access. Read-only Gmail. Cancel in one click.
          </p>
        </div>

        <div className="md:col-span-5 relative">
          <PeekingDigest />
          {/* Small sticky note — the joke, not the room */}
          <div className="sticky-note absolute -bottom-10 -left-6 md:-left-12 rotate-[-4deg] w-44 p-3 rounded-md font-display italic text-sm leading-snug select-none">
            &ldquo;i ain&apos;t reading allat.&rdquo;
            <span className="block not-italic text-[11px] font-sans mt-1 text-[#7a5d24]">cool. we got it.</span>
          </div>
        </div>
      </div>
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

function PeekingDigest() {
  return (
    <div className="relative max-w-md mx-auto md:ml-auto md:mr-0">
      <div className="absolute inset-0 -z-10 blur-3xl opacity-60 bg-gradient-to-tr from-[var(--green-200)] via-[var(--green-100)] to-[var(--green-400)] rounded-[36px]" aria-hidden="true" />
      <article className="bg-white rounded-3xl border border-[var(--line)] shadow-[0_30px_60px_-30px_rgba(5,150,105,0.4)] overflow-hidden -rotate-1 hover:rotate-0 transition-transform duration-500">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--line-soft)] text-xs text-[var(--ink-soft)] tnum">
          <span className="w-2.5 h-2.5 rounded-full bg-[#fb7185]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--green-400)]" />
          <span className="ml-3 truncate">Lincoln Elementary · 2 forms due Thursday</span>
        </div>
        <div className="p-5 space-y-3 text-left">
          <BucketRow color="bucket-red" emoji="🔴" title="Action Required" items={[
            <>Permission slip for Thursday field trip. <strong>$14</strong>.</>,
            <>Return signed <strong>COVID waiver</strong> by Wed.</>,
          ]}/>
          <BucketRow color="bucket-amber" emoji="🟡" title="Important" items={[
            <>Picture day moved to <strong>Fri the 28th</strong>.</>,
            <>PTA meeting Tue <strong>7 pm</strong>, gym entrance.</>,
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

/* ─────────────────────────────────────────────────────────────────────────
 * Before / After — animated scroll on the chaotic side
 * ─────────────────────────────────────────────────────────────────────── */
function BeforeAfter() {
  // School-flavored fake email subjects for the chaotic column
  const subjects = [
    'PTA: Spring Fundraiser Volunteers Needed!!! [reminder #4]',
    'Mrs. Carter — homework packet PDF (please print at home)',
    'District: 2026-27 calendar draft for public comment',
    'School Cafe: Breakfast menu — week of March 17',
    'Coach Mike: Soccer practice this Sat moved indoors',
    'Principal weekly email — 14 important updates inside',
    'Bus 217 route change effective Monday — read carefully',
    'Library overdue notice: 1 book — Diary of a Wimpy Kid',
    'Spirit week starts Monday! Theme days attached.',
    'Reply all: thanks!!  (Allison Park)',
    'Reply all: + thank you so much  (David Liu)',
    'Reply all: 🙏  (Sam from room 4)',
    'School Photos: pre-order deadline FRIDAY',
    '5th grade promotion ceremony — RSVP needed',
    'Nurse: pollen alert. Inhaler reminders.',
    'Picture day moved (formerly Mar 14 → Mar 28)',
    'Field trip — chaperones, sign up here',
    'Lunch balance low for Maya ($2.18 remaining)',
    'Reply all: count me in for snacks  (PTA Liz)',
    'YEAR-END SHOW tickets are LIVE 🎭',
  ]
  return (
    <section className="py-16 px-6 bg-white border-t border-[var(--line-soft)]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-4 reveal">
          <h2 className="font-display text-4xl md:text-5xl leading-[1.02] tracking-tight text-balance">
            <span className="tnum">247</span> emails this week.
          </h2>
          <h2 className="font-display text-4xl md:text-5xl leading-[1.02] tracking-tight text-balance mt-2">
            <em className="text-[var(--green-700)]">One</em> worth reading.
          </h2>
          <p className="mt-5 text-[var(--ink)] text-pretty">
            The example below is a school inbox. Works the same for work, newsletters, packages, anything.
          </p>
        </div>

        <div className="md:col-span-8 grid grid-cols-5 gap-4 reveal">
          {/* BEFORE — animated vertical scroll */}
          <div className="col-span-2 min-w-0">
            <p className="text-xs uppercase tracking-widest text-[var(--ink-mute)] mb-2">Before</p>
            <div className="relative h-[280px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-soft)]">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[var(--bg-soft)] to-transparent z-10" />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--bg-soft)] to-transparent z-10" />
              <ul className="vscroll-track py-3 px-4 space-y-1.5 text-[12px] leading-tight text-[var(--ink-soft)]">
                {[...subjects, ...subjects].map((s, i) => (
                  <li key={i} className="flex items-start gap-2 py-1 border-b border-dashed border-[var(--line-soft)]">
                    <span aria-hidden="true" className="text-[var(--ink-mute)] mt-0.5"><I.mail/></span>
                    <span className="truncate">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* AFTER */}
          <div className="col-span-3 min-w-0">
            <p className="text-xs uppercase tracking-widest text-[var(--ink-mute)] mb-2">After</p>
            <div className="p-5 bg-white border border-[var(--green-300)] rounded-2xl h-[280px] shadow-sm flex flex-col gap-3 justify-center">
              <span className="inline-flex w-max items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bucket-red">🔴 Action Required</span>
              <div className="text-sm text-[var(--ink)]">Field trip slip <strong>+$14</strong> by Thu. Picture day reorder <strong>Mar 28</strong>.</div>
              <span className="inline-flex w-max items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bucket-amber">🟡 Important</span>
              <div className="text-sm text-[var(--ink)]">PTA Tue <strong>7 pm</strong>. Bus 217 reroute Mon.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Sample — a full digest, school flavor
 * ─────────────────────────────────────────────────────────────────────── */
function Sample() {
  return (
    <section id="sample" className="py-16 px-6 bg-[var(--bg-soft)] border-y border-[var(--line-soft)]">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="reveal">
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05] text-balance">
            What lands in your inbox <em className="text-[var(--green-700)]">Sunday morning</em>.
          </h2>
          <p className="mt-5 text-[var(--ink)] text-pretty">
            Short bullets. Bold dates. The dollar amounts. No filler.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {[
              ['🔴', 'Forms, payments, deadlines this week'],
              ['🟡', 'Schedule moves, confirmations, key updates'],
              ['🟢', 'Optional — events, signups, opportunities'],
              ['⚪', 'Reply-all chains and noise, tucked away'],
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
        <span>Briefly</span>
      </div>
      <h3 className="font-display text-2xl mt-3 leading-tight">📬 Lincoln Elementary — 2 forms due Thursday</h3>
      <p className="text-[var(--ink-mute)] text-xs mt-1">Quiet week. Two forms, one schedule change, one bus reroute.</p>

      <div className="mt-5 space-y-5">
        <BucketRow color="bucket-red" emoji="🔴" title="Action Required" items={[
          <>Sign and return field trip slip for <strong>Thu Mar 21</strong>. Include <strong>$14</strong>.</>,
          <>Submit annual <strong>COVID waiver</strong> by Wed.</>,
        ]}/>
        <BucketRow color="bucket-amber" emoji="🟡" title="Important" items={[
          <>Picture day moved to <strong>Fri Mar 28</strong>.</>,
          <>PTA meeting <strong>Tue 7 pm</strong>, enter through the gym.</>,
          <>Bus 217 route adjustment starts <strong>Mon</strong>.</>,
        ]}/>
        <BucketRow color="bucket-good" emoji="🟢" title="Opportunity" items={[
          <>Spring soccer signups now open. <strong>Closes Apr 4</strong>.</>,
        ]}/>
        <BucketRow color="bucket-mute" emoji="⚪" title="Safe to Ignore" items={[
          <>12 reply-all &ldquo;thank you&rdquo; chains, grouped.</>,
          <>4 cafeteria menu emails, identical.</>,
        ]}/>
      </div>
    </article>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Streams — one digest per context (school, work, packages, anything)
 * ─────────────────────────────────────────────────────────────────────── */
function Streams() {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="reveal max-w-2xl">
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05] text-balance">
            One inbox. <em className="text-[var(--green-700)]">A digest for each thing.</em>
          </h2>
          <p className="mt-4 text-[var(--ink)] text-pretty">
            School on Sundays. Work daily. Packages in the morning. Each one a separate digest, on its own schedule.
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
 * How it works
 * ─────────────────────────────────────────────────────────────────────── */
function How() {
  const steps = [
    { icon: <I.shield/>, title: 'Sign in with Google', body: 'Read-only access. We can\'t send, edit, or delete a thing.' },
    { icon: <I.mail/>,   title: 'Pick what to watch', body: 'Paste a few senders, or describe what you want and we find them.' },
    { icon: <I.cal/>,    title: 'Choose your day', body: 'Daily, weekly, or specific days. One email lands when you want it.' },
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
 * FAQ
 * ─────────────────────────────────────────────────────────────────────── */
function Faq() {
  const qs = [
    {
      q: 'Will Briefly miss something important?',
      a: 'We use a conservative bias. Anything that looks like a deadline, dollar amount, signed form, or schedule change lands in Action Required or Important. Reply-all noise gets grouped, not deleted.',
    },
    {
      q: 'Can someone else get the same digest?',
      a: 'Yes. Set a "delivery to" email on any stream. One person owns the Gmail. Anyone you choose gets the digest.',
    },
    {
      q: 'Can I have different cadences for different things?',
      a: 'Yes. Each stream has its own schedule. Work daily, school on Sundays, packages whenever. They never mix.',
    },
    {
      q: 'What does Briefly do with my email?',
      a: 'We read it to generate the digest, then forget it. We never sell anything. We never train AI on your mail. Delete your account and everything is gone within 24 hours.',
    },
    {
      q: 'Can I see exactly what was read?',
      a: 'Every email Briefly processed is listed in your dashboard. You can remove any one of them from our records with one click.',
    },
    {
      q: 'How much will it cost?',
      a: 'Free during early access. When we launch paid plans we will email you first, and the free tier will still let you watch a handful of senders.',
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
    <section id="pricing" className="relative py-20 px-6 bg-[var(--bg-deep)] text-white overflow-hidden">
      <div aria-hidden="true" className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[var(--green-600)] opacity-25 rounded-full blur-3xl" />
      <div className="relative max-w-3xl mx-auto text-center reveal">
        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[var(--green-300)] mb-4">Pricing</span>
        <h2 className="font-display text-5xl md:text-6xl text-balance">
          Free to try.
          <br />
          <em className="text-[var(--green-300)]">$7/mo if you stay.</em>
        </h2>
        <p className="mt-5 text-white/70 max-w-md mx-auto">
          Free forever for one stream, weekly. Pro adds up to 5 streams, daily delivery, and digests sent to any inbox. 14-day Pro trial. No card to start.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onSignIn}
            disabled={loading}
            className="btn btn-green text-base"
          >
            <GoogleG />
            {loading ? 'Signing in…' : signedIn ? 'Go to dashboard' : 'Start free with Google'}
          </button>
          <a href="/pricing" className="btn btn-ghost text-base text-white hover:text-white border border-white/20 hover:border-white/40">
            See plans
          </a>
        </div>
        <p className="mt-3 text-xs text-white/50">Cancel anytime in one click.</p>
      </div>
    </section>
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
          <Wordmark />
          <span className="tnum text-[var(--ink-mute)]">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#how" className="hover:text-[var(--ink)] transition-colors">How it works</a>
          <a href="/pricing" className="hover:text-[var(--ink)] transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-[var(--ink)] transition-colors">FAQ</a>
          <a href="/privacy" className="hover:text-[var(--ink)] transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-[var(--ink)] transition-colors">Terms</a>
          <a href="mailto:jasparbbernstein@gmail.com" className="hover:text-[var(--ink)] transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}
