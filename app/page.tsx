'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/dashboard')
      else setChecking(false)
    })
  }, [])

  async function signInWithGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes: 'email profile',
      },
    })
  }

  if (checking) return null

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <span className="text-xl font-bold tracking-tight">📬 Briefly</span>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-24 text-center">
        <span className="inline-block bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
          Weekly email digest
        </span>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight max-w-2xl">
          One email.<br />All the stuff that matters.
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-xl leading-relaxed">
          Briefly reads your Gmail, finds the emails you actually care about,
          and sends you a clean summary every week. No noise. No missed deadlines.
        </p>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="mt-10 flex items-center gap-3 bg-gray-900 text-white px-7 py-4 rounded-xl text-base font-semibold hover:bg-gray-700 transition-colors disabled:opacity-60"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Signing in…' : 'Get started with Google'}
        </button>
        <p className="mt-4 text-xs text-gray-400">Free to use · No credit card required</p>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Connect Gmail', desc: 'Sign in with Google and choose which senders to watch — school, sports, clubs, whatever matters to you.' },
              { step: '2', title: 'Write your rules', desc: 'For each sender, tell Briefly what you care about in plain English. "Only deadlines and payments."' },
              { step: '3', title: 'Get your digest', desc: 'Every Sunday morning (or whenever you choose), one clean email lands in your inbox. That\'s it.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col gap-3">
                <span className="w-8 h-8 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center">{step}</span>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample digest */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">What a digest looks like</h2>
          <div className="border border-gray-200 rounded-2xl p-6 space-y-5 font-mono text-sm bg-white shadow-sm">
            <p className="font-sans font-semibold text-base">📬 Briefly — Cal Poly Digest</p>
            <div>
              <p className="font-sans font-semibold text-red-600 mb-2">🔴 Action Required</p>
              <ul className="space-y-1 text-gray-700">
                <li>• Submit Residency Support Documentation via Adobe Sign — due June 30</li>
                <li>• Send AP/IB scores to Cal Poly through College Board — due July 1</li>
                <li>• Submit all transcripts — due July 1</li>
              </ul>
            </div>
            <div>
              <p className="font-sans font-semibold text-amber-600 mb-2">🟡 Important Updates</p>
              <ul className="space-y-1 text-gray-700">
                <li>• Housing confirmed for AY 2026-2027. Move-in Aug 18. First payment due Sept 1.</li>
                <li>• Fall schedule being built by Registrar. AP scores determine course placement.</li>
              </ul>
            </div>
            <div>
              <p className="font-sans font-semibold text-green-600 mb-2">🟢 Opportunity</p>
              <ul className="space-y-1 text-gray-700">
                <li>• Study Abroad in Seville, Spain (Spring 2027). Info sessions July 15, 27, Aug 13.</li>
              </ul>
            </div>
            <div>
              <p className="font-sans font-semibold text-gray-400 mb-2">⚪ Safe to Ignore</p>
              <ul className="space-y-1 text-gray-400">
                <li>• 15 identical "log in to Application Status Portal" nudge emails</li>
                <li>• Housing payment receipt (already processed)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-gray-900 text-white py-16 px-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to clear your inbox?</h2>
        <p className="text-gray-400 mb-8">Takes 2 minutes to set up.</p>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="bg-white text-gray-900 px-7 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Get started free'}
        </button>
      </section>

      <footer className="text-center text-xs text-gray-400 py-6">
        © {new Date().getFullYear()} Briefly
      </footer>
    </main>
  )
}
