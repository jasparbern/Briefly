'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BrandLogo } from '../brand-logo'

type Sender = {
  id: string
  email: string
  label: string | null
  instructions: string | null
  stream_id: string
}

type Stream = {
  id: string
  name: string
  cadence: 'daily' | 'weekly' | 'custom'
  day_of_week: number
  hour_utc: number
  custom_days: number[] | null
  lookback_days: number
  delivery_email: string | null
  paused: boolean
  filter_mode: 'senders' | 'topic' | 'both'
  topic_description: string | null
}

type Suggestion = {
  email: string
  label: string
  sample_subject: string
  reason: string
}

type TierInfo = {
  tier: 'free' | 'pro'
  limits: {
    maxStreams: number
    maxSendersPerStream: number
    allowedCadences: ('daily' | 'weekly' | 'custom')[]
    alternateDeliveryEmail: boolean
  }
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Names we auto-assign — safe to overwrite when the user gives us something better.
function isGenericStreamName(name: string): boolean {
  const n = name.trim().toLowerCase()
  return (
    n === '' || n === 'default' || n === 'untitled' ||
    n === 'my digest' || n === 'my first digest' || n === 'new stream' ||
    /^stream \d+$/.test(n)
  )
}

// Turn a topic description into a short, title-ish stream name.
function deriveStreamName(topic: string): string {
  const cleaned = topic
    .trim()
    .replace(/^(anything|everything|all)\s+(related to|about|regarding|concerning|on|with)\s+/i, '')
    .replace(/^(related to|about|regarding|concerning)\s+/i, '')
    .replace(/[."']/g, '')
    .trim()
  if (!cleaned) return 'New stream'
  const short = cleaned.length > 32 ? cleaned.slice(0, 32).replace(/\s+\S*$/, '') + '…' : cleaned
  return short.charAt(0).toUpperCase() + short.slice(1)
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
  const [streams, setStreams] = useState<Stream[]>([])
  const [expandedStreamId, setExpandedStreamId] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null)
  const [tier, setTier] = useState<TierInfo | null>(null)
  const autoCreatedRef = useRef(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/'); return }
      setUser({ email: user.email!, id: user.id })
    })
  }, [])

  useEffect(() => {
    if (params.get('gmail') === 'connected') setGmailConnected(true)
    if (params.get('upgrade') === 'success') {
      setFlash({ text: "Welcome to Pro. Your 14-day trial is on the house.", tone: 'good' })
    }
  }, [params])

  useEffect(() => {
    if (!user) return
    fetch('/api/gmail/status').then((r) => r.json()).then((d) => {
      if (d.connected) setGmailConnected(true)
    })
    fetch('/api/account/tier').then((r) => r.json()).then((d) => {
      if (d?.tier) setTier(d)
    })
    void loadStreams()
  }, [user])

  async function loadStreams() {
    const res = await fetch('/api/streams')
    const data: Stream[] = await res.json()
    setStreams(data)
    // If a user has no streams yet (brand new account), create one. The ref guard
    // stops a double-fired effect from inserting two identical "My digest" streams.
    if (data.length === 0) {
      if (autoCreatedRef.current) return
      autoCreatedRef.current = true
      const created = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My first digest' }),
      }).then((r) => r.json())
      setStreams([created])
      setExpandedStreamId(created.id)
    } else if (data.length === 1 && !expandedStreamId) {
      // Single stream → auto-expand for less clicking
      setExpandedStreamId(data[0].id)
    }
  }

  function showFlash(text: string, tone: 'good' | 'bad' = 'good') {
    setFlash({ text, tone })
    setTimeout(() => setFlash(null), 6000)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  async function exportData() {
    window.location.href = '/api/account/export'
  }

  async function openBillingPortal() {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (data.url) window.location.href = data.url
    else showFlash(data.error ?? 'Could not open billing portal', 'bad')
  }

  async function deleteAccount() {
    const ok = window.confirm(
      'Delete your account and erase every stream, sender, schedule, and digest? This cannot be undone.'
    )
    if (!ok) return
    const ok2 = window.confirm(
      'Last chance. This will sign you out and remove all your data within 24 hours. Continue?'
    )
    if (!ok2) return
    const res = await fetch('/api/account', { method: 'DELETE' })
    if (res.ok) {
      await supabase.auth.signOut()
      router.replace('/')
    } else {
      const data = await res.json().catch(() => ({}))
      showFlash(`Could not delete account: ${data.error ?? 'unknown error'}`, 'bad')
    }
  }

  async function createStream() {
    const res = await fetch('/api/streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Stream ${streams.length + 1}` }),
    })
    const created = await res.json()
    if (!res.ok || created?.error) {
      showFlash(created?.error ?? 'Could not create stream', 'bad')
      return
    }
    setStreams((prev) => [...prev, created])
    setExpandedStreamId(created.id)
    showFlash('New stream added below. Name it and pick what it should watch.')
  }

  async function patchStream(id: string, patch: Partial<Stream>) {
    const updated = await fetch(`/api/streams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then((r) => r.json())
    setStreams((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }

  async function deleteStream(id: string, name: string) {
    if (!window.confirm(`Delete "${name}" and all its senders + history? This cannot be undone.`)) return
    await fetch(`/api/streams/${id}`, { method: 'DELETE' })
    setStreams((prev) => prev.filter((s) => s.id !== id))
    if (expandedStreamId === id) setExpandedStreamId(null)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-soft)]">
      <nav className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-[var(--line-soft)]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <BrandLogo />
        <div className="flex items-center gap-4 text-sm text-[var(--ink-soft)]">
          <span className="hidden sm:inline tnum">{user?.email}</span>
          {tier?.tier === 'pro' ? (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--green-50)] text-[var(--green-700)] text-xs font-semibold uppercase tracking-wider">Pro</span>
          ) : (
            <a href="/pricing" className="text-[var(--green-700)] font-semibold hover:underline">Upgrade</a>
          )}
          <button onClick={signOut} className="hover:text-[var(--ink)] transition-colors">Sign out</button>
        </div>
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

        {/* Connect Gmail */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold mb-1 text-gray-900">Connect Gmail</h2>
              <p className="text-sm text-gray-600">
                Abridgly reads your Gmail (read-only) and never deletes or sends anything as you.
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

        {/* Streams */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Your streams{streams.length > 0 ? ` (${streams.length})` : ''}
              </h2>
              <p className="text-sm text-gray-600">
                Each one is a separate digest with its own senders, schedule, and inbox.
              </p>
            </div>
            {tier && streams.length >= tier.limits.maxStreams && tier.tier !== 'pro' ? (
              <a
                href="/pricing"
                className="text-sm bg-[var(--green-600)] text-white px-4 py-2 rounded-lg hover:bg-[var(--green-700)] transition-colors whitespace-nowrap"
                title={`Free plan is limited to ${tier.limits.maxStreams} stream${tier.limits.maxStreams === 1 ? '' : 's'}`}
              >
                Upgrade for more
              </a>
            ) : (
              <button
                onClick={createStream}
                className="text-sm bg-[var(--green-600)] text-white font-medium px-4 py-2 rounded-lg hover:bg-[var(--green-700)] transition-colors whitespace-nowrap"
              >
                + Add a stream
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Tap a stream to edit it. Want a separate digest? Use “Add a stream” instead of editing this one.
          </p>

          <div className="space-y-4">
            {streams.map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                expanded={expandedStreamId === stream.id}
                onToggle={() => setExpandedStreamId((curr) => (curr === stream.id ? null : stream.id))}
                tier={tier}
                onPatch={(patch) => patchStream(stream.id, patch)}
                onDelete={() => deleteStream(stream.id, stream.name)}
                gmailConnected={gmailConnected}
                userEmail={user?.email}
                onFlash={showFlash}
              />
            ))}
          </div>
        </section>

        {/* Account */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-1 text-gray-900">Account</h2>
          <p className="text-sm text-gray-600 mb-5">
            Download a copy of everything Abridgly has on you, or delete your account.
          </p>
          <div className="flex flex-wrap gap-3">
            {tier?.tier === 'pro' && (
              <button
                onClick={openBillingPortal}
                className="text-sm bg-[var(--green-600)] text-white px-4 py-2 rounded-lg hover:bg-[var(--green-700)] transition-colors"
              >
                Manage subscription
              </button>
            )}
            <button
              onClick={exportData}
              className="text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Export my data
            </button>
            <button
              onClick={deleteAccount}
              className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete my account
            </button>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-400 pt-6 space-x-4">
          <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-gray-600 transition-colors">Terms</a>
        </footer>

      </div>
    </div>
  )
}

/* ---------- StreamCard ---------- */

function StreamCard({
  stream, expanded, onToggle, onPatch, onDelete, gmailConnected, userEmail, onFlash, tier,
}: {
  stream: Stream
  expanded: boolean
  onToggle: () => void
  onPatch: (patch: Partial<Stream>) => Promise<void>
  onDelete: () => void
  gmailConnected: boolean
  userEmail?: string
  onFlash: (text: string, tone?: 'good' | 'bad') => void
  tier: TierInfo | null
}) {
  const allowedCadences = tier?.limits.allowedCadences ?? ['daily', 'weekly', 'custom']
  const canUseAltDelivery = tier?.limits.alternateDeliveryEmail ?? true
  const maxSenders = tier?.limits.maxSendersPerStream ?? 25
  const [senders, setSenders] = useState<Sender[]>([])
  const [loadingSenders, setLoadingSenders] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(stream.name)
  const [addMode, setAddMode] = useState<'closed' | 'exact' | 'suggest'>('closed')
  const [newEmail, setNewEmail] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newInstructions, setNewInstructions] = useState('')
  const [description, setDescription] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!expanded) return
    setLoadingSenders(true)
    fetch(`/api/senders?streamId=${stream.id}`)
      .then((r) => r.json())
      .then((data) => setSenders(Array.isArray(data) ? data : []))
      .finally(() => setLoadingSenders(false))
  }, [expanded, stream.id])

  const cadenceLabel =
    stream.cadence === 'daily' ? 'Daily' :
    stream.cadence === 'weekly' ? `Weekly · ${DAYS_LONG[stream.day_of_week]}` :
    stream.cadence === 'custom' ? `${stream.custom_days?.length ?? 0} days/week` :
    'Weekly'

  const watchLabel =
    stream.filter_mode === 'topic'
      ? (stream.topic_description?.trim() ? `Topic: ${stream.topic_description.trim()}` : 'Topic: not set yet')
      : stream.filter_mode === 'both'
        ? (stream.topic_description?.trim() ? `Senders + topic: ${stream.topic_description.trim()}` : 'Senders + topic')
        : 'Watches specific senders'

  /* sender ops */
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
        stream_id: stream.id,
      }),
    })
    const sender = await res.json()
    if (sender?.error) onFlash(sender.error, 'bad')
    else setSenders((prev) => [...prev.filter((s) => s.id !== sender.id), sender])
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
      if ((data.suggestions ?? []).length === 0) onFlash('No matches in your inbox.', 'bad')
    } catch (e) {
      onFlash(`AI error: ${e instanceof Error ? e.message : 'unknown'}`, 'bad')
    } finally {
      setSuggesting(false)
    }
  }

  function toggleCustomDay(d: number) {
    const days = new Set(stream.custom_days ?? [])
    if (days.has(d)) days.delete(d)
    else days.add(d)
    onPatch({ custom_days: Array.from(days).sort() })
  }

  async function sendNow() {
    setSending(true)
    setSendStatus('Reading your inbox…')
    const timers = [
      setTimeout(() => setSendStatus('Asking Claude to summarize…'), 4000),
      setTimeout(() => setSendStatus('Sending the digest…'), 12000),
    ]
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId: stream.id }),
      })
      const data = await res.json()
      const first = data.results?.[0]
      if (first?.status === 'fulfilled') {
        onFlash(`"${stream.name}" digest sent. Check your inbox.`)
      } else if (first?.error) {
        const raw = String(first.error)
        const friendly = raw.length > 240 ? raw.slice(0, 240) + '…' : raw
        onFlash(`Error: ${friendly}`, 'bad')
      } else {
        onFlash('Something went wrong.', 'bad')
      }
    } catch (e) {
      onFlash(`Network error: ${e instanceof Error ? e.message : 'unknown'}`, 'bad')
    } finally {
      timers.forEach(clearTimeout)
      setSending(false)
      setSendStatus('')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200">
      {/* Card header (always visible) */}
      <div className="flex items-center gap-3 p-5">
        <button onClick={onToggle} className="text-gray-400 hover:text-gray-700 text-lg w-5 text-left">
          {expanded ? '▾' : '▸'}
        </button>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={async () => {
                if (nameDraft.trim() && nameDraft !== stream.name) {
                  await onPatch({ name: nameDraft.trim() })
                }
                setEditingName(false)
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              className="font-medium text-base border-b border-gray-300 focus:outline-none focus:border-gray-900 px-1 py-0.5"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setNameDraft(stream.name); setEditingName(true) }}
              className="font-medium text-base text-gray-900 hover:underline text-left"
            >
              {stream.name}
            </button>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-[var(--green-50)] text-[var(--green-700)]">
              {stream.filter_mode === 'topic' ? 'Topic' : stream.filter_mode === 'both' ? 'Both' : 'Senders'}
            </span>
            <span className="text-xs text-gray-600 truncate">{watchLabel}</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {cadenceLabel} · lookback {stream.lookback_days}d
            {stream.delivery_email ? ` · to ${stream.delivery_email}` : ''}
            {stream.paused ? ' · paused' : ''}
          </div>
        </div>
        <button
          onClick={sendNow}
          disabled={sending || !gmailConnected}
          className="text-xs bg-[var(--green-600)] text-white font-medium px-3 py-1.5 rounded-lg hover:bg-[var(--green-700)] transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {sending ? (sendStatus || '…') : 'Send now'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-6">

          {/* What to watch */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">What to watch</h3>
            <p className="text-xs text-gray-500 mb-3">Pick how Abridgly decides which emails to include.</p>
            <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-xs mb-3">
              {([
                { v: 'senders', label: 'By sender' },
                { v: 'topic', label: 'By topic (AI)' },
                { v: 'both', label: 'Both' },
              ] as const).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => onPatch({ filter_mode: v })}
                  className={`px-3 py-1 transition-colors ${
                    stream.filter_mode === v
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {(stream.filter_mode === 'topic' || stream.filter_mode === 'both') && (
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Topic description</label>
                <textarea
                  defaultValue={stream.topic_description ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim() || null
                    if (v === stream.topic_description) return
                    // Auto-name the stream from its topic if it still has a default name.
                    const patch: Partial<Stream> = { topic_description: v }
                    if (v && isGenericStreamName(stream.name)) patch.name = deriveStreamName(v)
                    onPatch(patch)
                  }}
                  rows={2}
                  placeholder='e.g. "Anything about housing, deadlines, or financial aid"'
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Abridgly samples your inbox and picks emails that match. Topic-mode reads more of your inbox per run.
                </p>
              </div>
            )}
          </div>

          {/* Senders */}
          {stream.filter_mode !== 'topic' && (
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Senders</h3>
              <span className="text-xs text-gray-500 tnum">
                {senders.length} / {maxSenders}
                {senders.length >= maxSenders && tier?.tier !== 'pro' && (
                  <> · <a href="/pricing" className="text-[var(--green-700)] underline font-semibold">Upgrade</a></>
                )}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Emails Abridgly reads for this stream.</p>

            {loadingSenders && <p className="text-xs text-gray-500">Loading…</p>}

            <div className="space-y-2">
              {senders.map((s) => (
                <div key={s.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{s.label || s.email}</span>
                      {s.label && <span className="text-xs text-gray-500">{s.email}</span>}
                    </div>
                    {s.instructions && (
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{s.instructions}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteSender(s.id)}
                    className="text-gray-300 hover:text-red-500 text-lg leading-none px-1"
                    title="Remove sender"
                  >
                    ×
                  </button>
                </div>
              ))}

              {addMode === 'closed' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAddMode('exact')}
                    className="border-2 border-dashed border-gray-200 rounded-lg py-2 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
                  >
                    + Add by email
                  </button>
                  <button
                    onClick={() => setAddMode('suggest')}
                    disabled={!gmailConnected}
                    className="border-2 border-dashed border-gray-200 rounded-lg py-2 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✨ Help me find senders
                  </button>
                </div>
              )}

              {addMode === 'exact' && (
                <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                  <input
                    type="email"
                    placeholder="sender@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Friendly name (optional)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <textarea
                    placeholder="Instructions for the AI (optional)"
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => addSender()}
                      disabled={saving || !newEmail}
                      className="text-xs bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Add'}
                    </button>
                    <button onClick={() => setAddMode('closed')} className="text-xs text-gray-600 hover:text-gray-900">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {addMode === 'suggest' && (
                <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                  <p className="text-xs text-gray-600">
                    Describe what you want this stream to watch. e.g. <span className="italic">"school stuff"</span>, <span className="italic">"package tracking"</span>.
                  </p>
                  <input
                    type="text"
                    placeholder="What do you want to follow?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') suggestSenders() }}
                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={suggestSenders}
                      disabled={suggesting || !description.trim()}
                      className="text-xs bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {suggesting ? 'Scanning…' : 'Find them'}
                    </button>
                    <button
                      onClick={() => { setAddMode('closed'); setDescription(''); setSuggestions([]) }}
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>

                  {suggestions.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-medium text-gray-700">Pick the ones you want:</p>
                      {suggestions.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 p-2 bg-white border border-gray-200 rounded-md">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900">{s.label}</div>
                            <div className="text-xs text-gray-500 truncate">{s.email}</div>
                            <div className="text-xs text-gray-500 mt-0.5 italic">{s.reason}</div>
                          </div>
                          <button
                            onClick={() => addSender(s.email, s.label)}
                            className="text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
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
          </div>
          )}

          {/* Schedule */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Schedule</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
                <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-xs">
                  {(['daily', 'weekly', 'custom'] as const).map((c) => {
                    const locked = !allowedCadences.includes(c)
                    return (
                      <button
                        key={c}
                        onClick={() => {
                          if (locked) {
                            onFlash(`${c[0].toUpperCase() + c.slice(1)} delivery is a Pro feature. Upgrade to unlock.`, 'bad')
                            return
                          }
                          onPatch({ cadence: c })
                        }}
                        className={`px-3 py-1 transition-colors ${
                          stream.cadence === c
                            ? 'bg-gray-900 text-white'
                            : locked
                              ? 'bg-white text-gray-400 hover:bg-gray-50'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                        title={locked ? 'Pro feature — upgrade to unlock' : undefined}
                      >
                        {c[0].toUpperCase() + c.slice(1)}
                        {locked && <span className="ml-1 text-[10px] text-[var(--green-700)]">Pro</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {stream.cadence === 'weekly' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Day</label>
                  <select
                    value={stream.day_of_week}
                    onChange={(e) => onPatch({ day_of_week: Number(e.target.value) })}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {DAYS_LONG.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}

              {stream.cadence === 'custom' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pick days</label>
                  <div className="flex gap-1 flex-wrap">
                    {DAYS_SHORT.map((d, i) => {
                      const active = (stream.custom_days ?? []).includes(i)
                      return (
                        <button
                          key={i}
                          onClick={() => toggleCustomDay(i)}
                          className={`px-2 py-1 text-xs rounded-md border transition-colors ${
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

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Look back how far</label>
                <select
                  value={stream.lookback_days}
                  onChange={(e) => onPatch({ lookback_days: Number(e.target.value) })}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {[1, 3, 7, 14, 30].map((n) => (
                    <option key={n} value={n}>{n} day{n === 1 ? '' : 's'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Send this stream to
                  {!canUseAltDelivery && <span className="ml-2 text-[10px] text-[var(--green-700)] font-semibold uppercase tracking-wider">Pro</span>}
                </label>
                <input
                  type="email"
                  placeholder={canUseAltDelivery ? (userEmail ?? 'your-other@email.com') : 'Upgrade to send to a different inbox'}
                  value={stream.delivery_email ?? ''}
                  onChange={(e) => onPatch({ delivery_email: e.target.value || null })}
                  disabled={!canUseAltDelivery}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900 w-full max-w-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-0.5">
                  {canUseAltDelivery
                    ? 'Leave blank to use your Gmail.'
                    : <>Free plan delivers to your Gmail. <a href="/pricing" className="text-[var(--green-700)] underline">Upgrade</a> to pick a different inbox.</>}
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={stream.paused}
                  onChange={(e) => onPatch({ paused: e.target.checked })}
                />
                Pause this stream (skip cron delivery)
              </label>
            </div>
          </div>

          {/* Danger zone */}
          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <button
              onClick={onDelete}
              className="text-xs text-red-600 hover:text-red-800 transition-colors"
            >
              Delete this stream
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
