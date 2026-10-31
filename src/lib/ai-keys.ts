// Multiple API keys per AI provider with rotation and automatic failover.
//
// Keys added in the admin panel are stored encrypted (AES-256-GCM, AI_KEYS_SECRET) in the
// ai_api_keys table. The env key for each provider (GROQ_API_KEY, ANTHROPIC_API_KEY) is
// still used as one more key in the pool, so existing deployments keep working.
//
// Each request takes the next healthy key (lowest priority number first, round-robin within
// it). A rate-limited key cools down, a rejected key is disabled, and the request is retried
// on the next key.

import crypto from 'crypto'
import { rawQuery } from '@/lib/db'

export type RotatingProvider = 'groq' | 'anthropic'
export const ROTATING_PROVIDERS: RotatingProvider[] = ['groq', 'anthropic']

const ENV_KEY_VARS: Record<RotatingProvider, string> = {
  groq: 'GROQ_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
}

const KEY_PREFIXES: Record<RotatingProvider, string> = {
  groq: 'gsk_',
  anthropic: 'sk-ant-',
}

const POOL_CACHE_MS = 30_000
const RATE_LIMIT_COOLDOWN_MS = 60_000
const QUOTA_COOLDOWN_MS = 60 * 60_000
const SERVER_ERROR_COOLDOWN_MS = 15_000

export interface PoolKey {
  id: string // DB id, or 'env:<provider>'
  provider: RotatingProvider
  source: 'db' | 'env'
  apiKey: string
  priority: number
  dailyLimit: number | null
  requestsToday: number
}

export interface AiKeyRow {
  id: string
  provider: RotatingProvider
  label: string
  key_ciphertext: string
  key_last4: string
  is_enabled: number
  priority: number
  daily_limit: number | null
  requests_today: number
  errors_today: number
  usage_date: string | null
  total_requests: number
  last_used_at: string | null
  last_error: string | null
  last_error_at: string | null
  cooldown_until: string | null
  disabled_reason: string | null
  created_at: string
}

/** Thrown when every key for a provider is cooling down, disabled or over its limit */
export class KeysExhaustedError extends Error {
  constructor(public provider: RotatingProvider) {
    super(`No available API key for ${provider}`)
    this.name = 'KeysExhaustedError'
  }
}

/** Thrown when the provider itself rejects the request (e.g. retired model), not the key */
export class ProviderUnavailableError extends Error {
  constructor(public provider: RotatingProvider, public cause: unknown) {
    super(`${provider} is unavailable: ${cause instanceof Error ? cause.message : String(cause)}`)
    this.name = 'ProviderUnavailableError'
  }
}

// ---- Table ----

let tableReady: Promise<void> | null = null

export function ensureAiKeysTable(): Promise<void> {
  if (!tableReady) {
    tableReady = rawQuery(`
      CREATE TABLE IF NOT EXISTS ai_api_keys (
        id CHAR(36) NOT NULL PRIMARY KEY,
        provider VARCHAR(20) NOT NULL,
        label VARCHAR(100) NOT NULL,
        key_ciphertext TEXT NOT NULL,
        key_last4 VARCHAR(8) NOT NULL,
        is_enabled TINYINT(1) NOT NULL DEFAULT 1,
        priority INT NOT NULL DEFAULT 100 COMMENT 'Lower is used first',
        daily_limit INT NULL COMMENT 'Max requests per day, NULL for unlimited',
        requests_today INT NOT NULL DEFAULT 0,
        errors_today INT NOT NULL DEFAULT 0,
        usage_date DATE NULL,
        total_requests BIGINT NOT NULL DEFAULT 0,
        last_used_at DATETIME NULL,
        last_error VARCHAR(255) NULL,
        last_error_at DATETIME NULL,
        cooldown_until DATETIME NULL,
        disabled_reason VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ai_api_keys_provider (provider, is_enabled, priority)
      ) ENGINE=InnoDB
    `).then(() => undefined)
    tableReady.catch(() => { tableReady = null })
  }
  return tableReady
}

// ---- Encryption ----

function getEncryptionKey(): Buffer | null {
  const secret = process.env.AI_KEYS_SECRET?.trim()
  if (!secret || secret.length < 32) return null
  return crypto.createHash('sha256').update(secret).digest()
}

export function isKeyEncryptionConfigured(): boolean {
  return getEncryptionKey() !== null
}

export function encryptApiKey(plain: string): string {
  const key = getEncryptionKey()
  if (!key) throw new Error('AI_KEYS_SECRET is missing or shorter than 32 characters')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join(':')
}

function decryptApiKey(stored: string): string | null {
  const key = getEncryptionKey()
  const [version, iv, tag, ciphertext] = stored.split(':')
  if (!key || version !== 'v1' || !iv || !tag || !ciphertext) return null
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

// ---- Validation ----

export function looksLikeProviderKey(provider: RotatingProvider, key: string | undefined): boolean {
  if (!key) return false
  const lower = key.toLowerCase()
  if (['your-', 'placeholder', 'change-me'].some(p => lower.includes(p))) return false
  return key.startsWith(KEY_PREFIXES[provider]) && key.length > 20
}

export function maskApiKey(provider: RotatingProvider, last4: string): string {
  return `${KEY_PREFIXES[provider]}••••${last4}`
}

export function getEnvKey(provider: RotatingProvider): string | null {
  const key = process.env[ENV_KEY_VARS[provider]]?.trim()
  return looksLikeProviderKey(provider, key) ? key! : null
}

// ---- Pool ----

// Per-instance state; cooldowns are also written to the DB so other instances pick them up
const poolCache = new Map<RotatingProvider, { keys: PoolKey[]; loadedAt: number }>()
const cooldowns = new Map<string, number>()
const disabledKeys = new Set<string>()
const roundRobin = new Map<RotatingProvider, number>()

// Called after admin changes; cooldowns still in force are reloaded from the DB
export function invalidateKeyPool() {
  poolCache.clear()
  disabledKeys.clear()
  cooldowns.clear()
}

async function loadPool(provider: RotatingProvider): Promise<PoolKey[]> {
  const cached = poolCache.get(provider)
  if (cached && Date.now() - cached.loadedAt < POOL_CACHE_MS) return cached.keys

  const keys: PoolKey[] = []
  try {
    await ensureAiKeysTable()
    const rows = await rawQuery<AiKeyRow>(
      `SELECT id, provider, key_ciphertext, priority, daily_limit, cooldown_until,
              IF(usage_date = CURDATE(), requests_today, 0) AS requests_today
       FROM ai_api_keys WHERE provider = ? AND is_enabled = 1`,
      [provider]
    )
    for (const row of rows) {
      const apiKey = decryptApiKey(row.key_ciphertext)
      if (!apiKey) {
        console.error(`AI key ${row.id} could not be decrypted (check AI_KEYS_SECRET)`)
        continue
      }
      if (row.cooldown_until) {
        const until = new Date(row.cooldown_until).getTime()
        if (until > Date.now()) cooldowns.set(row.id, Math.max(cooldowns.get(row.id) || 0, until))
      }
      keys.push({
        id: row.id,
        provider,
        source: 'db',
        apiKey,
        priority: row.priority,
        dailyLimit: row.daily_limit,
        requestsToday: Number(row.requests_today) || 0,
      })
    }
  } catch (error) {
    console.error(`Failed to load ${provider} keys from DB, using env key only:`, error)
  }

  const envKey = getEnvKey(provider)
  if (envKey && !keys.some(k => k.apiKey === envKey)) {
    // Env key goes last among equals so admin-added keys take the load first
    keys.push({ id: `env:${provider}`, provider, source: 'env', apiKey: envKey, priority: 1000, dailyLimit: null, requestsToday: 0 })
  }

  poolCache.set(provider, { keys, loadedAt: Date.now() })
  return keys
}

function isUsable(key: PoolKey, now: number): boolean {
  if (disabledKeys.has(key.id)) return false
  if ((cooldowns.get(key.id) || 0) > now) return false
  if (key.dailyLimit !== null && key.requestsToday >= key.dailyLimit) return false
  return true
}

/** Whether the provider has at least one key that can be tried right now */
export async function hasUsableKey(provider: RotatingProvider): Promise<boolean> {
  const now = Date.now()
  return (await loadPool(provider)).some(k => isUsable(k, now))
}

/** Whether the provider has any key at all (usable or not) */
export async function hasAnyKey(provider: RotatingProvider): Promise<boolean> {
  return (await loadPool(provider)).length > 0
}

async function acquireKey(provider: RotatingProvider, tried: Set<string>): Promise<PoolKey | null> {
  const now = Date.now()
  const candidates = (await loadPool(provider)).filter(k => !tried.has(k.id) && isUsable(k, now))
  if (candidates.length === 0) return null

  const topPriority = Math.min(...candidates.map(k => k.priority))
  const top = candidates.filter(k => k.priority === topPriority)
  const counter = roundRobin.get(provider) || 0
  roundRobin.set(provider, counter + 1)
  return top[counter % top.length]
}

// ---- Outcome reporting ----

type FailureKind = 'rate_limited' | 'quota' | 'invalid_key' | 'server' | 'provider' | 'request'

function getStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown })?.status
  return typeof status === 'number' ? status : undefined
}

function classifyError(error: unknown): FailureKind {
  const status = getStatus(error)
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  if (message.includes('quota') || message.includes('credit balance') || message.includes('billing') || status === 402) return 'quota'
  if (status === 429 || message.includes('rate limit')) return 'rate_limited'
  if (status === 401 || status === 403 || message.includes('invalid api key') || message.includes('invalid x-api-key')) return 'invalid_key'
  if (status === 404) return 'provider' // e.g. model retired; another key will not help
  if ((status !== undefined && status >= 500) || message.includes('overloaded')) return 'server'
  // SDK connection/timeout errors carry no status; errors from our own code carry none either
  const name = (error as { name?: string })?.name || ''
  if (status === undefined && (/connection|timeout/i.test(name) || /fetch failed|timed out|econnreset|enotfound|network/.test(message))) return 'server'
  return 'request' // 400 and similar: the request itself is bad, not the key
}

function retryAfterMs(error: unknown): number | null {
  const headers = (error as { headers?: Record<string, string> | Headers })?.headers
  const value = headers instanceof Headers ? headers.get('retry-after') : headers?.['retry-after']
  const seconds = value ? Number(value) : NaN
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 3600) * 1000 : null
}

function recordSuccess(key: PoolKey) {
  key.requestsToday++
  if (key.source !== 'db') return
  // usage_date is assigned last: MySQL applies SET assignments left to right
  rawQuery(
    `UPDATE ai_api_keys SET
       requests_today = IF(usage_date = CURDATE(), requests_today + 1, 1),
       errors_today = IF(usage_date = CURDATE(), errors_today, 0),
       usage_date = CURDATE(),
       total_requests = total_requests + 1,
       last_used_at = NOW()
     WHERE id = ?`,
    [key.id]
  ).catch(error => console.error('Failed to record AI key usage:', error))
}

function recordFailure(key: PoolKey, kind: FailureKind, error: unknown) {
  let cooldownMs = 0
  if (kind === 'rate_limited') cooldownMs = retryAfterMs(error) ?? RATE_LIMIT_COOLDOWN_MS
  else if (kind === 'quota') cooldownMs = QUOTA_COOLDOWN_MS
  else if (kind === 'server') cooldownMs = SERVER_ERROR_COOLDOWN_MS

  if (cooldownMs) cooldowns.set(key.id, Date.now() + cooldownMs)
  if (kind === 'invalid_key') disabledKeys.add(key.id)

  const message = `${kind}${getStatus(error) ? ` (${getStatus(error)})` : ''}: ${error instanceof Error ? error.message : String(error)}`.slice(0, 255)
  console.warn(`AI key ${key.id} failed:`, message)
  if (key.source !== 'db') return

  rawQuery(
    `UPDATE ai_api_keys SET
       errors_today = IF(usage_date = CURDATE(), errors_today + 1, 1),
       requests_today = IF(usage_date = CURDATE(), requests_today, 0),
       usage_date = CURDATE(),
       last_error = ?,
       last_error_at = NOW(),
       cooldown_until = IF(? > 0, DATE_ADD(NOW(), INTERVAL ? SECOND), cooldown_until),
       is_enabled = IF(? = 1, 0, is_enabled),
       disabled_reason = IF(? = 1, 'Rejected by provider (invalid or revoked key)', disabled_reason)
     WHERE id = ?`,
    [message, cooldownMs, Math.ceil(cooldownMs / 1000), kind === 'invalid_key' ? 1 : 0, kind === 'invalid_key' ? 1 : 0, key.id]
  ).catch(dbError => console.error('Failed to record AI key error:', dbError))
}

// ---- Rotation ----

/**
 * Run a request with the provider's keys, moving to the next key when one is rate limited,
 * out of quota, rejected, or the provider errors. Errors caused by the request itself are rethrown.
 */
export async function withKeyRotation<T>(provider: RotatingProvider, run: (apiKey: string) => Promise<T>): Promise<T> {
  const tried = new Set<string>()
  for (;;) {
    const key = await acquireKey(provider, tried)
    if (!key) throw new KeysExhaustedError(provider)
    tried.add(key.id)
    try {
      const result = await run(key.apiKey)
      recordSuccess(key)
      return result
    } catch (error) {
      const kind = classifyError(error)
      if (kind === 'request') throw error
      if (kind === 'provider') throw new ProviderUnavailableError(provider, error)
      recordFailure(key, kind, error)
    }
  }
}

/**
 * Streaming version: a key can be swapped only until the first chunk is sent,
 * after that an error is passed on to the caller.
 */
export async function* streamWithKeyRotation(
  provider: RotatingProvider,
  run: (apiKey: string) => AsyncIterable<string>
): AsyncIterable<string> {
  const tried = new Set<string>()
  for (;;) {
    const key = await acquireKey(provider, tried)
    if (!key) throw new KeysExhaustedError(provider)
    tried.add(key.id)

    let started = false
    try {
      for await (const chunk of run(key.apiKey)) {
        started = true
        yield chunk
      }
      recordSuccess(key)
      return
    } catch (error) {
      if (started) {
        recordFailure(key, classifyError(error), error)
        throw error
      }
      const kind = classifyError(error)
      if (kind === 'request') throw error
      if (kind === 'provider') throw new ProviderUnavailableError(provider, error)
      recordFailure(key, kind, error)
    }
  }
}

/** Live status of a key for the admin panel */
export function getKeyRuntimeStatus(id: string): { coolingDownUntil: number | null } {
  const until = cooldowns.get(id) || 0
  return { coolingDownUntil: until > Date.now() ? until : null }
}

/** Check a key against the provider's model list endpoint (costs no tokens) */
export async function testApiKey(provider: RotatingProvider, apiKey: string): Promise<{ ok: boolean; message: string }> {
  const request: { url: string; headers: Record<string, string> } = provider === 'groq'
    ? { url: 'https://api.groq.com/openai/v1/models', headers: { Authorization: `Bearer ${apiKey}` } }
    : { url: 'https://api.anthropic.com/v1/models', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } }

  try {
    const res = await fetch(request.url, { headers: request.headers, signal: AbortSignal.timeout(10_000) })
    if (res.ok) return { ok: true, message: 'Key works' }
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'Key was rejected (invalid or revoked)' }
    if (res.status === 429) return { ok: true, message: 'Key is valid but currently rate limited' }
    return { ok: false, message: `Provider returned HTTP ${res.status}` }
  } catch (error) {
    return { ok: false, message: `Could not reach provider: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/** Decrypted key for a stored row or the env key, for testing from the admin panel */
export async function getApiKeyById(id: string): Promise<{ provider: RotatingProvider; apiKey: string } | null> {
  if (id.startsWith('env:')) {
    const provider = id.slice(4) as RotatingProvider
    if (!ROTATING_PROVIDERS.includes(provider)) return null
    const apiKey = getEnvKey(provider)
    return apiKey ? { provider, apiKey } : null
  }
  await ensureAiKeysTable()
  const [row] = await rawQuery<AiKeyRow>('SELECT provider, key_ciphertext FROM ai_api_keys WHERE id = ?', [id])
  const apiKey = row ? decryptApiKey(row.key_ciphertext) : null
  return row && apiKey ? { provider: row.provider, apiKey } : null
}
