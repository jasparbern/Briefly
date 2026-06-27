import { BrandLogo } from '../brand-logo'

export const metadata = {
  title: 'Privacy Policy — Abridgly',
  description: 'How Abridgly handles your data.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-[var(--line-soft)]">
        <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <BrandLogo />
        </nav>
      </header>

      <article className="max-w-2xl mx-auto px-6 py-12 prose prose-sm prose-gray">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: June 22, 2026</p>

        <p>
          Abridgly reads emails from senders you choose and sends you a recap. This page explains
          what we collect, what we do with it, who sees it, and how you remove it. Plain language only.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-3">What we collect</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Your Google account email and basic profile (name, profile picture) so we can sign you in.</li>
          <li>A Gmail access token so we can read messages on your behalf. We encrypt it with AES-256-GCM before storing it, and it never leaves our server.</li>
          <li>The senders you ask us to watch, plus any instructions you write for each.</li>
          <li>Your schedule choices (cadence, day, lookback window, delivery email).</li>
          <li>We do not store the emails we read. We process them in memory to build your digest and discard them the moment the digest is sent. We never save the sender, subject, body, or a preview of your source emails.</li>
          <li>The digests we generated and sent you (the recap itself). You can erase these by deleting your account.</li>
          <li>If you subscribe to Pro: your Stripe customer ID, subscription status, and trial/renewal dates. Abridgly never sees your card number — Stripe handles all payment data.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-3">What we do with it</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Pull emails matching your watched senders from Gmail.</li>
          <li>Send the contents to our AI provider (Anthropic) to generate the digest.</li>
          <li>Send the digest to your delivery email through our email provider (Resend).</li>
          <li>Discard the source emails from memory as soon as the digest is sent. We keep only your settings and the digests themselves.</li>
        </ul>
        <p className="mt-4">
          We do not sell your data. We do not use your data to train AI models. We do not show ads based on your email.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-3">Who else sees your data</h2>
        <p>
          Abridgly is built on top of services that process your data on our behalf. Each one is a subprocessor:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li><strong>Google</strong> — we use Google OAuth to sign you in and the Gmail API to read your mail. Google&apos;s privacy policy applies to that data while it is on their systems.</li>
          <li><strong>Supabase</strong> — our database. Stores your senders, schedule, digests, and Gmail tokens.</li>
          <li><strong>Anthropic</strong> — generates the digest from your emails. They do not store the inputs after returning a response, and do not train on them.</li>
          <li><strong>Resend</strong> — delivers the digest to your inbox.</li>
          <li><strong>Vercel</strong> — hosts the web app and runs the scheduled job that creates digests.</li>
          <li><strong>Stripe</strong> — processes Pro subscriptions. Holds your billing details directly. Abridgly only stores Stripe customer/subscription IDs and status.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-3">Gmail access scope</h2>
        <p>
          Abridgly only requests the <code>gmail.readonly</code> scope. We can read mail metadata and content; we cannot send mail, modify mail, or delete mail. Abridgly never acts as you in Gmail.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-3">Your controls</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Nothing to clean up</strong> — we don&apos;t keep your source emails, so there&apos;s no stored mail to manage. Only your settings and past digests are saved.</li>
          <li><strong>Export everything</strong> — download a JSON file with all your data from the account section of the dashboard.</li>
          <li><strong>Delete your account</strong> — wipes your senders, schedules, digests, and Gmail tokens within 24 hours. Email backups roll off within 30 days.</li>
          <li><strong>Revoke Gmail access</strong> — visit <a href="https://myaccount.google.com/permissions" className="text-blue-600 hover:underline">myaccount.google.com/permissions</a> and remove Abridgly. Your saved Gmail token becomes useless.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-3">Data retention</h2>
        <p>
          We keep your data as long as your account is active. When you delete your account we erase everything within 24 hours and remove it from backups within 30 days.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-3">Children</h2>
        <p>
          Abridgly is not for users under 13. We do not knowingly collect data from children under 13.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-3">Changes to this policy</h2>
        <p>
          If we change anything material we will email you before the change takes effect.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-3">Contact</h2>
        <p>
          Questions or requests: <a href="mailto:jasparbbernstein@gmail.com" className="text-blue-600 hover:underline">jasparbbernstein@gmail.com</a>
        </p>
      </article>
    </main>
  )
}
