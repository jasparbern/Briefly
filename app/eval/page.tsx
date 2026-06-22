'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type FixtureMeta = { id: string; name: string; expectation: string; count: number }
type RunResult = {
  fixture: FixtureMeta
  subject: string
  body: string
  ms: number
}

export default function EvalPage() {
  const router = useRouter()
  const supabase = createClient()
  const [authChecked, setAuthChecked] = useState(false)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [fixtures, setFixtures] = useState<FixtureMeta[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [result, setResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/')
        return
      }
      setAdminEmail(user.email ?? null)
      setAuthChecked(true)
      fetch('/api/eval')
        .then(async (r) => {
          if (!r.ok) {
            setError((await r.json()).error ?? `HTTP ${r.status}`)
            return []
          }
          return r.json()
        })
        .then((data: FixtureMeta[]) => {
          setFixtures(Array.isArray(data) ? data : [])
          if (Array.isArray(data) && data.length > 0) setSelectedId(data[0].id)
        })
    })
  }, [router, supabase])

  async function run() {
    if (!selectedId) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtureId: selectedId }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? `HTTP ${res.status}`)
      else setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown')
    } finally {
      setRunning(false)
    }
  }

  if (!authChecked) return null

  return (
    <main className="min-h-screen bg-[var(--bg-soft)]">
      <nav className="bg-white border-b border-[var(--line-soft)] px-6 py-3 flex items-center justify-between">
        <a href="/dashboard" className="font-semibold tracking-tight">← Dashboard</a>
        <span className="text-sm text-[var(--ink-mute)]">eval · {adminEmail}</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 grid md:grid-cols-12 gap-6">

        {/* Picker */}
        <section className="md:col-span-5 bg-white rounded-2xl border border-[var(--line)] p-5">
          <h1 className="font-display text-2xl mb-1">Prompt eval</h1>
          <p className="text-sm text-[var(--ink-soft)] mb-5">
            Pick a fixture, click run. No real emails are touched. Compare the output against the expectation to spot regressions.
          </p>

          {error && (
            <div className="mb-4 text-sm rounded-xl px-4 py-3 bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {fixtures.length === 0 && !error && (
            <p className="text-sm text-[var(--ink-mute)]">Loading fixtures…</p>
          )}

          <ul className="space-y-2">
            {fixtures.map((f) => (
              <li key={f.id}>
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedId === f.id ? 'border-[var(--green-500)] bg-[var(--green-50)]' : 'border-[var(--line)] hover:border-[var(--green-300)]'
                }`}>
                  <input
                    type="radio"
                    name="fixture"
                    value={f.id}
                    checked={selectedId === f.id}
                    onChange={() => setSelectedId(f.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{f.name}</span>
                      <span className="text-xs text-[var(--ink-mute)] tnum">{f.count} emails</span>
                    </div>
                    <p className="text-xs text-[var(--ink-soft)] mt-1 leading-relaxed">{f.expectation}</p>
                  </div>
                </label>
              </li>
            ))}
          </ul>

          <button
            onClick={run}
            disabled={running || !selectedId}
            className="mt-5 text-sm bg-[var(--green-600)] text-white px-4 py-2 rounded-lg hover:bg-[var(--green-700)] transition-colors disabled:opacity-50 w-full"
          >
            {running ? 'Running…' : 'Run digest'}
          </button>
        </section>

        {/* Output */}
        <section className="md:col-span-7 bg-white rounded-2xl border border-[var(--line)] p-5 min-h-[400px]">
          <h2 className="text-sm font-semibold tracking-widest uppercase text-[var(--ink-mute)] mb-3">Output</h2>

          {!result && !running && (
            <p className="text-sm text-[var(--ink-mute)] italic">Run a fixture to see the digest output here.</p>
          )}

          {running && (
            <p className="text-sm text-[var(--ink-soft)]">Calling Claude…</p>
          )}

          {result && (
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--ink-mute)] mb-3 tnum">
                <span>{result.fixture.name}</span>
                <span>{result.ms} ms</span>
              </div>
              <div className="font-display text-xl mb-3 leading-tight">{result.subject}</div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-[var(--bg-soft)] rounded-xl p-4 border border-[var(--line)]">{result.body}</pre>
              <details className="mt-4">
                <summary className="text-xs text-[var(--ink-mute)] cursor-pointer">Expected (for comparison)</summary>
                <p className="mt-2 text-xs text-[var(--ink-soft)] leading-relaxed">{result.fixture.expectation}</p>
              </details>
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
