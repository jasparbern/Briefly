'use client'

import { useState } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [type, setType] = useState<'feedback' | 'bug' | 'question' | 'other'>('feedback')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, type, message, website }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setError(data.error ?? 'Something went wrong.')
        return
      }
      setStatus('sent')
      setName(''); setEmail(''); setMessage(''); setType('feedback')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'unknown')
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <nav className="border-b border-[var(--line-soft)] px-6 py-4">
        <a href="/" className="font-semibold tracking-tight text-[15px]">
          <span className="wordmark">Abr<span className="dot" aria-hidden="true"/>dgly</span>
        </a>
      </nav>

      <section className="px-6 pt-16 pb-10">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-display text-5xl md:text-6xl leading-[1.02] text-balance">
            Say something.
            <br />
            <em className="text-[var(--green-700)]">We&apos;re listening.</em>
          </h1>
          <p className="mt-5 text-lg text-[var(--ink)] max-w-xl mx-auto">
            Feedback, bugs, weird ideas, &ldquo;why does it do this.&rdquo; All welcome.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-[var(--line)] p-7">
          {status === 'sent' ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--green-50)] text-[var(--green-700)] mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m4 12 5 5L20 6"/>
                </svg>
              </div>
              <h2 className="font-display text-2xl">Got it. Thanks.</h2>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                I read every one. If you left an email I&apos;ll reply when I can.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-6 text-sm text-[var(--green-700)] underline"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                aria-hidden="true"
                className="hidden"
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[var(--ink)] mb-1.5">Name <span className="text-[var(--ink-mute)] font-normal">(optional)</span></label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--green-300)] focus:ring-2 focus:ring-[var(--green-50)]"
                    placeholder="Anya"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--ink)] mb-1.5">Email <span className="text-[var(--ink-mute)] font-normal">(optional)</span></label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--green-300)] focus:ring-2 focus:ring-[var(--green-50)]"
                    placeholder="you@somewhere.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-[var(--ink)] mb-1.5">What kind?</label>
                <div className="inline-flex rounded-xl border border-[var(--line)] overflow-hidden text-sm">
                  {(['feedback', 'bug', 'question', 'other'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`px-3 py-2 transition-colors ${
                        type === t
                          ? 'bg-[var(--green-600)] text-white'
                          : 'bg-white text-[var(--ink-soft)] hover:bg-[var(--bg-soft)]'
                      }`}
                    >
                      {t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-[var(--ink)] mb-1.5">Your message</label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--green-300)] focus:ring-2 focus:ring-[var(--green-50)] resize-none"
                  placeholder="Tell me what's up."
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={status === 'sending' || !message.trim()}
                className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-[var(--green-600)] hover:bg-[var(--green-700)] text-white font-semibold py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'sending' ? 'Sending…' : 'Send'}
              </button>

              <p className="text-xs text-[var(--ink-mute)] text-center">
                Or email <a href="mailto:jasparbbernstein@gmail.com" className="underline">jasparbbernstein@gmail.com</a> directly.
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
