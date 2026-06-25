import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// AES-256-GCM encryption for secrets at rest (Gmail OAuth tokens).
//
// Required by Google CASA: access/refresh tokens must not sit in the database as
// plaintext. We encrypt with a 256-bit key held only in the server environment
// (TOKEN_ENCRYPTION_KEY) and never sent to the client.
//
// Format of a stored value: "enc:v1:<iv>:<authTag>:<ciphertext>" (all base64).
// The "enc:v1:" prefix lets readers detect and pass through any legacy plaintext
// rows written before encryption existed — those get re-encrypted on next write.

const PREFIX = 'enc:v1:'

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY is not set')
  // Accept base64 (preferred) or hex; must decode to exactly 32 bytes.
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must decode to 32 bytes (256-bit)')
  }
  return key
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decrypt(value: string | null | undefined): string | null {
  if (!value) return null
  // Legacy plaintext (pre-encryption) — pass through so existing connections work.
  if (!value.startsWith(PREFIX)) return value
  const [, , ivB64, tagB64, dataB64] = value.split(':')
  if (!ivB64 || !tagB64 || !dataB64) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    const out = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
    return out.toString('utf8')
  } catch {
    return null
  }
}

export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith(PREFIX)
}
