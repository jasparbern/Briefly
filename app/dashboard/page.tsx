'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Sender = {
  id: string
  email: string
  label: string
  instructions: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function Dashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  )
}

function DashboardInner() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()

  const [user, setUser] = useState<{ email: string; id: string } | null>(null)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [senders, setSenders] = useState<Sender[]>([])
  const [schedule, setSchedule] = useState({ day_of_week: 0, hour_utc: 9 })

  // New sender form state
  const [newEmail, setNewEmail] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newInstructions, setNewInstructions] = useState('')
  const [addingRow, setAddingRow] = useState(false)

  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/'); return }
      setUser({ email: user.email!, id: user.id })
    })
  }, [])

  useEffect(() => {
    if (params.get('gmail') === 'connected') setGmailConnected(true)
  }, [params])

  useEffect(() => {
    if (!user) return
    // Check Gmail connected
    fetch('/api/gmail/status').then((r) => r.json()).then((d) => {
      if (d.connected) setGmailConnected(true)
    })
    // Load senders
    fetch('/api/senders').then((r) => r.json()).then(setSenders)
    // Load schedule
    fetch('/api/schedule').then((r) => r.json()).then(setSchedule)
  }, [user])

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  async function addSender() {
    if (!newEmail.trim()) return
    setSaving(true)
    const res = await fetch('/api/senders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail.trim(), label: newLabel.trim(), instructions: newInstructions.trim() }),
    })
    const sender = await res.json()
    setSenders((prev) => [...prev.filter((s) => s.id !== sender.id), sender])
    setNewEmail(''); setNewLabel(''); setNewInstructions(''); setAddingRow(false)
    setSaving(false)
  }

  async function deleteSender(id: string) {
    await fetch('/api/senders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setSenders((prev) => prev.filter((s) => s.id !== id))
  }

  async function saveSchedule() {
    setSaving(true)
    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule),
    })
    setSaving(false)
    setSuccessMsg('Schedule saved!')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  async function sendNow() {
    setSending(true)
    try {
      const res = await fetch('/api/digest', { method: 'POST' })
      const data = await res.json()
      const first = data.results?.[0]
      if (first?.status === 'fulfilled') {
        setSuccessMsg('Digest sent! Check your inbox.')
      } else if (first?.error) {
        // Surface the real error inline (truncate long Anthropic/Gmail messages)
        const raw = String(first.error)
        const friendly = raw.length > 240 ? raw.slice(0, 240) + '…' : raw
        setSuccessMsg(`Error: ${friendly}`)
      } else {
        setSuccessMsg('Something went wrong. Check your setup.')
      }
    } catch (e) {
      setSuccessMsg(`Network error: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setSending(false)
    }
    setTimeout(() => setSuccessMsg(''), 12000)
  }

  const localHour = new Date(Date.UTC(2000, 0, 1, schedule.hour_utc)).toLocaleTimeString([], {
    hour: 'numeric', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold">📬 Briefly</span>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{user?.email}</span>
          <button onClick={signOut} className="hover:text-gray-900 transition-colors">Sign out</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-3 text-sm">
            {successMsg}
          </div>
        )}

        {/* Step 1: Connect Gmail */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold mb-1">1. Connect Gmail</h2>
              <p className="text-sm text-gray-500">
                Briefly needs read-only access to your Gmail to find emails from your watched senders.
              </p>
            </div>
            {gmailConnected ? (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
                ✓ Connected
              </span>
            ) : (
              <a
                href="/api/gmail/connect"
                className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                Connect Gmail
              </a>
            )}
          </div>
        </section>

        {/* Step 2: Senders */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-1">2. Senders to watch</h2>
          <p className="text-sm text-gray-500 mb-5">
            Add email addresses you want Briefly to monitor. For each one, write what you actually care about.
          </p>

          <div className="space-y-3">
            {senders.map((s) => (
              <div key={s.id} className="flex items-start gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{s.label || s.email}</span>
                    {s.label && <span className="text-xs text-gray-400">{s.email}</span>}
                  </div>
                  {s.instructions && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{s.instructions}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteSender(s.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}

            {addingRow ? (
              <div className="border border-blue-200 rounded-xl p-4 space-y-3 bg-blue-50/30">
                <input
                  type="email"
                  placeholder="sender@example.com *"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <input
                  type="text"
                  placeholder="Friendly name (e.g. Cal Poly Housing)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <textarea
                  placeholder="What do you care about from this sender? (e.g. Only deadlines and payment due dates)"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addSender}
                    disabled={saving || !newEmail}
                    className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Add'}
                  </button>
                  <button
                    onClick={() => { setAddingRow(false); setNewEmail(''); setNewLabel(''); setNewInstructions('') }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingRow(true)}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
              >
                + Add a sender
              </button>
            )}
          </div>
        </section>

        {/* Step 3: Schedule */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-1">3. Delivery schedule</h2>
          <p className="text-sm text-gray-500 mb-5">
            Pick which day and time you want your digest delivered.
          </p>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Day</label>
              <select
                value={schedule.day_of_week}
                onChange={(e) => setSchedule((s) => ({ ...s, day_of_week: Number(e.target.value) }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Time (UTC)</label>
              <select
                value={schedule.hour_utc}
                onChange={(e) => setSchedule((s) => ({ ...s, hour_utc: Number(e.target.value) }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')}:00 UTC
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save schedule'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            That's {localHour} in your local timezone (approx).
          </p>
        </section>

        {/* Send now */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-1">Test it now</h2>
          <p className="text-sm text-gray-500 mb-4">
            Grab emails from the last 7 days and send yourself a digest right now.
          </p>
          <button
            onClick={sendNow}
            disabled={sending || !gmailConnected || senders.length === 0}
            className="bg-amber-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {sending ? 'Generating digest…' : 'Send digest now'}
          </button>
          {(!gmailConnected || senders.length === 0) && (
            <p className="text-xs text-gray-400 mt-2">
              {!gmailConnected ? 'Connect Gmail first.' : 'Add at least one sender first.'}
            </p>
          )}
        </section>

      </div>
    </div>
  )
}
