'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Sender = {
  id: string
  email: string
  label: string | null
  instructions: string | null
}

type Schedule = {
  day_of_week: number
  hour_utc: number
  cadence: 'daily' | 'weekly' | 'custom'
  custom_days: number[] | null
  lookback_days: number
  delivery_email: string | null
}

type DigestEmail = {
  id: string
  gmail_message_id: string
  sender: string
  subject: string | null
  snippet: string | null
  received_at: string | null
  created_at: string
}

type Suggestion = {
  email: string
  label: string
  sample_subject: string
  reason: string
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEFAULT_SCHEDULE: Schedule = {
  day_of_week: 0,
  hour_utc: 9,
  cadence: 'weekly',
  custom_days: null,
  lookback_days: 7,
  delivery_email: null,
}

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
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE)

  // Sender add form
  const [addMode, setAddMode] = useState<'closed' | 'exact' | 'suggest'>('closed')
  const [newEmail, setNewEmail] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newInstructions, setNewInstructions] = useState('')
  const [description, setDescription] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggesting, setSuggesting] = useState(false)

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)

  // Email transparency
  const [showProcessed, setShowProcessed] = useState(false)
  const [processedEmails, setProcessedEmails] = useState<DigestEmail[]>([])
  const [loadingProcessed, setLoadingProcessed] = useState(false)

  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState('')
  const [flash, setFlash] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null)

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
    fetch('/api/gmail/status').then((r) => r.json()).then((d) => {
      if (d.connected) setGmailConnected(true)
    })
    fetch('/api/senders').then((r) => r.json()).then(setSenders)
    fetch('/api/schedule').then((r) => r.json()).then((d) => setSchedule({ ...DEFAULT_SCHEDULE, ...d }))
  }, [user])

  function showFlash(text: string, tone: 'good' | 'bad' = 'good') {
    setFlash({ text, tone })
    setTimeout(() => setFlash(null), 6000)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  /* ---------- Senders ---------- */

  async function addSender(emailOverride?: string, labelOverride?: string) {
    const email = (emailOverride ?? newEmail).trim()
    if (!email) return
    setSaving(true)
    const res = await fetch('/api/senders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        label: (labelOverride ?? newLabel).trim() || null,
        instructions: newInstructions.trim() || null,
      }),
    })
    const sender = await res.json()
    setSenders((prev) => [...prev.filter((s) => s.id !== sender.id), sender])
    setNewEmail(''); setNewLabel(''); setNewInstructions('')
    setAddMode('closed')
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

  async function patchSender(id: string, patch: Partial<Pick<Sender, 'email' | 'label' | 'instructions'>>) {
    const res = await fetch('/api/senders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    const updated = await res.json()
    setSenders((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }

  async function suggestSenders() {
    if (!description.trim()) return
    setSuggesting(true)
    setSuggestions([])
    try {
      const res = await fetch('/api/senders/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })
      const data = await res.json()
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
      if ((data.suggestions ?? []).length === 0) {
        showFlash('No matching senders found in your inbox.', 'bad')
      }
    } catch (e) {
      showFlash(`Couldn't reach AI: ${e instanceof Error ? e.message : 'unknown'}`, 'bad')
    } finally {
      setSuggesting(false)
    }
  }

  /* ---------- Schedule ---------- */

  async function saveSchedule() {
    setSaving(true)
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule),
    })
    setSaving(false)
    if (res.ok) showFlash('Schedule saved.')
    else showFlash('Could not save schedule.', 'bad')
  }

  /* ---------- Send now ---------- */

  async function sendNow() {
    setSending(true)
    setSendStatus('Reading your inbox…')
    const phaseTimers = [
      setTimeout(() => setSendStatus('Asking Claude to summarize…'), 4000),
      setTimeout(() => setSendStatus('Sending the digest…'), 12000),
    ]
    try {
      const res = await fetch('/api/digest', { method: 'POST' })
      const data = await res.json()
      const first = data.results?.[0]
      if (first?.status === 'fulfilled') {
        showFlash('Digest sent. Check your inbox.')
        if (showProcessed) loadProcessed()
      } else if (first?.error) {
        const raw = String(first.error)
        const friendly = raw.length > 240 ? raw.slice(0, 240) + '…' : raw
        showFlash(`Error: ${friendly}`, 'bad')
      } else {
        showFlash('Something went wrong. Check your setup.', 'bad')
      }
    } catch (e) {
      showFlash(`Network error: ${e instanceof Error ? e.message : 'unknown'}`, 'bad')
    } finally {
      phaseTimers.forEach(clearTimeout)
      setSendStatus('')
      setSending(false)
    }
  }

  /* ---------- Processed emails ---------- */

  async function loadProcessed() {
    setLoadingProcessed(true)
    const res = await fetch('/api/digest-emails?limit=50')
    const data = await res.json()
    setProcessedEmails(Array.isArray(data) ? data : [])
    setLoadingProcessed(false)
  }

  async function deleteProcessed(id: string) {
    await fetch('/api/digest-emails', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setProcessedEmails((prev) => prev.filter((e) => e.id !== id))
  }

  function toggleCustomDay(d: number) {
    setSchedule((s) => {
      const days = new Set(s.custom_days ?? [])
      if (days.has(d)) days.delete(d)
      else days.add(d)
      return { ...s, custom_days: Array.from(days).sort() }
    })
  }

  const localHour = new Date(Date.UTC(2000, 0, 1, schedule.hour_utc)).toLocaleTimeString([], {
    hour: 'numeric', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-lg font-bold text-gray-900 hover:opacity-80 transition-opacity">
          📬 Briefly
        </a>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{user?.email}</span>
          <button onClick={signOut} className="hover:text-gray-900 transition-colors">Sign out</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

        {flash && (
          <div className={`rounded-xl px-5 py-3 text-sm border ${
            flash.tone === 'good'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {flash.text}
          </div>
        )}

        {/* Step 1: Gmail */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold mb-1 text-gray-900">1. Connect Gmail</h2>
              <p className="text-sm text-gray-600">
                Briefly needs read-only access to your Gmail to find emails from your watched senders.
              </p>
            </div>
            {gmailConnected ? (
              <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium bg-green-50 px-3 py-1 rounded-full whitespace-nowrap">
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
          <h2 className="text-base font-semibold mb-1 text-gray-900">2. Senders to watch</h2>
          <p className="text-sm text-gray-600 mb-5">
            Tell Briefly which emails to read. You can paste exact addresses or describe what you want and let AI find them.
          </p>

          <div className="space-y-3">
            {senders.map((s) => (
              <SenderRow
                key={s.id}
                sender={s}
                editing={editingId === s.id}
                onStartEdit={() => setEditingId(s.id)}
                onCancelEdit={() => setEditingId(null)}
                onSave={async (patch) => {
                  await patchSender(s.id, patch)
                  setEditingId(null)
                }}
                onDelete={() => deleteSender(s.id)}
              />
            ))}

            {addMode === 'closed' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAddMode('exact')}
                  className="border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
                >
                  + Add by email
                </button>
                <button
                  onClick={() => setAddMode('suggest')}
                  disabled={!gmailConnected}
                  className="border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✨ Help me find senders
                </button>
              </div>
            )}

            {addMode === 'exact' && (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                <input
                  type="email"
                  placeholder="sender@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Friendly name (optional)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <textarea
                  placeholder="Instructions for the AI (optional). Leave blank for a sensible default."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => addSender()}
                    disabled={saving || !newEmail}
                    className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Add sender'}
                  </button>
                  <button
                    onClick={() => { setAddMode('closed'); setNewEmail(''); setNewLabel(''); setNewInstructions('') }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {addMode === 'suggest' && (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                <p className="text-xs text-gray-600">
                  Describe in plain English what you want to watch. Examples: <span className="italic">"school stuff"</span>, <span className="italic">"package tracking"</span>, <span className="italic">"my soccer league"</span>.
                </p>
                <input
                  type="text"
                  placeholder="What do you want to follow?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') suggestSenders() }}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={suggestSenders}
                    disabled={suggesting || !description.trim()}
                    className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {suggesting ? 'Scanning your inbox…' : 'Find them'}
                  </button>
                  <button
                    onClick={() => { setAddMode('closed'); setDescription(''); setSuggestions([]) }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>

                {suggestions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-gray-700">Pick the ones you want:</p>
                    {suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900">{s.label}</div>
                          <div className="text-xs text-gray-500 truncate">{s.email}</div>
                          <div className="text-xs text-gray-500 mt-1 italic">{s.reason}</div>
                        </div>
                        <button
                          onClick={() => addSender(s.email, s.label)}
                          className="text-sm bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-gray-700 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Step 3: Schedule */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-1 text-gray-900">3. Delivery schedule</h2>
          <p className="text-sm text-gray-600 mb-5">
            How often and when your digest arrives.
          </p>

          <div className="space-y-5">
            {/* Cadence */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Frequency</label>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                {(['daily', 'weekly', 'custom'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setSchedule((s) => ({ ...s, cadence: c }))}
                    className={`px-4 py-1.5 transition-colors ${
                      schedule.cadence === c
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {c[0].toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Day picker — weekly */}
            {schedule.cadence === 'weekly' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Day</label>
                <select
                  value={schedule.day_of_week}
                  onChange={(e) => setSchedule((s) => ({ ...s, day_of_week: Number(e.target.value) }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {DAYS_LONG.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            )}

            {/* Day picker — custom */}
            {schedule.cadence === 'custom' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Pick days</label>
                <div className="flex gap-1">
                  {DAYS_SHORT.map((d, i) => {
                    const active = (schedule.custom_days ?? []).includes(i)
                    return (
                      <button
                        key={i}
                        onClick={() => toggleCustomDay(i)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          active
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Time (informational on free tier — cron fires daily at 9 UTC) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Time (UTC)</label>
              <select
                value={schedule.hour_utc}
                onChange={(e) => setSchedule((s) => ({ ...s, hour_utc: Number(e.target.value) }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00 UTC</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {localHour} local. On the free plan delivery lands once a day around 9:00 UTC; this picker stores your preference for when we upgrade.
              </p>
            </div>

            {/* Lookback window */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Look back how far</label>
              <select
                value={schedule.lookback_days}
                onChange={(e) => setSchedule((s) => ({ ...s, lookback_days: Number(e.target.value) }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {[1, 3, 7, 14, 30].map((n) => (
                  <option key={n} value={n}>{n} day{n === 1 ? '' : 's'}</option>
                ))}
              </select>
            </div>

            {/* Delivery email override */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Send the digest to</label>
              <input
                type="email"
                placeholder={user?.email ?? 'your-other@email.com'}
                value={schedule.delivery_email ?? ''}
                onChange={(e) => setSchedule((s) => ({ ...s, delivery_email: e.target.value || null }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 w-full max-w-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to deliver to your Gmail.
              </p>
            </div>

            <button
              onClick={saveSchedule}
              disabled={saving}
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save schedule'}
            </button>
          </div>
        </section>

        {/* Send now */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-1 text-gray-900">Test it now</h2>
          <p className="text-sm text-gray-600 mb-4">
            Run the digest right now with your current settings.
          </p>
          <button
            onClick={sendNow}
            disabled={sending || !gmailConnected || senders.length === 0}
            className="bg-amber-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {sending ? (sendStatus || 'Working…') : 'Send digest now'}
          </button>
          {(!gmailConnected || senders.length === 0) && (
            <p className="text-xs text-gray-500 mt-2">
              {!gmailConnected ? 'Connect Gmail first.' : 'Add at least one sender first.'}
            </p>
          )}
          {sending && (
            <p className="text-xs text-gray-500 mt-2">
              First runs take 20-40 seconds. Bigger inboxes take longer.
            </p>
          )}
        </section>

        {/* What did the AI read? */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <button
            onClick={async () => {
              const next = !showProcessed
              setShowProcessed(next)
              if (next && processedEmails.length === 0) await loadProcessed()
            }}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <h2 className="text-base font-semibold text-gray-900">What did the AI read?</h2>
              <p className="text-sm text-gray-600">
                Every email Briefly processed for your digests. Delete any you want forgotten.
              </p>
            </div>
            <span className="text-gray-400 text-lg">{showProcessed ? '–' : '+'}</span>
          </button>

          {showProcessed && (
            <div className="mt-5 space-y-2">
              {loadingProcessed && <p className="text-sm text-gray-500">Loading…</p>}
              {!loadingProcessed && processedEmails.length === 0 && (
                <p className="text-sm text-gray-500 italic">No emails processed yet. Send a digest first.</p>
              )}
              {processedEmails.map((e) => (
                <div key={e.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{e.subject || '(no subject)'}</div>
                    <div className="text-xs text-gray-500 truncate">{e.sender}</div>
                    {e.snippet && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{e.snippet}</div>}
                    <div className="text-xs text-gray-400 mt-1">
                      {e.received_at ? new Date(e.received_at).toLocaleString() : new Date(e.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteProcessed(e.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none px-2"
                    title="Forget this email"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

/* ---------- SenderRow component ---------- */

function SenderRow({
  sender, editing, onStartEdit, onCancelEdit, onSave, onDelete,
}: {
  sender: Sender
  editing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (patch: Partial<Pick<Sender, 'email' | 'label' | 'instructions'>>) => Promise<void>
  onDelete: () => void
}) {
  const [email, setEmail] = useState(sender.email)
  const [label, setLabel] = useState(sender.label ?? '')
  const [instructions, setInstructions] = useState(sender.instructions ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setEmail(sender.email)
      setLabel(sender.label ?? '')
      setInstructions(sender.instructions ?? '')
    }
  }, [editing, sender])

  if (!editing) {
    return (
      <div
        onClick={onStartEdit}
        className="flex items-start gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50 cursor-pointer hover:border-gray-300 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900">{sender.label || sender.email}</span>
            {sender.label && <span className="text-xs text-gray-500">{sender.email}</span>}
          </div>
          {sender.instructions && (
            <p className="text-xs text-gray-600 mt-0.5 truncate">{sender.instructions}</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none px-2"
          title="Remove sender"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div className="border border-gray-300 rounded-xl p-4 space-y-3 bg-white">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
      <input
        type="text"
        placeholder="Friendly name (optional)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
      <textarea
        placeholder="Instructions for the AI (optional)"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setSaving(true)
            await onSave({ email, label: label || null, instructions: instructions || null })
            setSaving(false)
          }}
          disabled={saving || !email}
          className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancelEdit}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
