/**
 * @jest-environment node
 */

const mockRawQuery = jest.fn<Promise<unknown[]>, [string, unknown[]?]>()
jest.mock('@/lib/db', () => ({ rawQuery: (sql: string, params?: unknown[]) => mockRawQuery(sql, params) }))

process.env.AI_KEYS_SECRET = 'test-ai-keys-secret-0123456789abcdef'
delete process.env.GROQ_API_KEY
delete process.env.ANTHROPIC_API_KEY

import {
  encryptApiKey,
  invalidateKeyPool,
  withKeyRotation,
  streamWithKeyRotation,
  KeysExhaustedError,
  ProviderUnavailableError,
} from '../ai-keys'

const KEY_A = 'gsk_aaaaaaaaaaaaaaaaaaaaaaaa'
const KEY_B = 'gsk_bbbbbbbbbbbbbbbbbbbbbbbb'
const KEY_C = 'gsk_cccccccccccccccccccccccc'

function row(id: string, apiKey: string, priority = 100, extra: Record<string, unknown> = {}) {
  return { id, provider: 'groq', key_ciphertext: encryptApiKey(apiKey), priority, daily_limit: null, cooldown_until: null, requests_today: 0, ...extra }
}

function apiError(status: number, message = `HTTP ${status}`) {
  return Object.assign(new Error(message), { status })
}

function setRows(rows: unknown[]) {
  mockRawQuery.mockImplementation(async (sql: string) => (sql.trim().startsWith('SELECT') ? rows : []))
}

describe('AI key rotation', () => {
  beforeEach(() => {
    mockRawQuery.mockReset()
    invalidateKeyPool()
  })

  it('round-robins across keys with the same priority', async () => {
    setRows([row('a', KEY_A), row('b', KEY_B)])
    const used: string[] = []
    for (let i = 0; i < 4; i++) await withKeyRotation('groq', async key => { used.push(key); return 'ok' })
    expect(new Set(used)).toEqual(new Set([KEY_A, KEY_B]))
    expect(used[0]).not.toBe(used[1])
  })

  it('uses the lower priority number first', async () => {
    setRows([row('a', KEY_A, 200), row('b', KEY_B, 10)])
    const used: string[] = []
    for (let i = 0; i < 3; i++) await withKeyRotation('groq', async key => { used.push(key); return 'ok' })
    expect(used).toEqual([KEY_B, KEY_B, KEY_B])
  })

  it('moves to the next key on 429 and keeps the limited key cooling down', async () => {
    setRows([row('a', KEY_A, 1), row('b', KEY_B, 2)])
    const result = await withKeyRotation('groq', async key => {
      if (key === KEY_A) throw apiError(429, 'Rate limit reached')
      return key
    })
    expect(result).toBe(KEY_B)
    // Key A is cooling down, so the next request goes straight to B
    const next = await withKeyRotation('groq', async key => key)
    expect(next).toBe(KEY_B)
    const cooldownWrite = mockRawQuery.mock.calls.find(([sql]) => sql.includes('cooldown_until = IF'))
    expect(cooldownWrite?.[1]).toEqual(expect.arrayContaining(['a']))
  })

  it('disables a rejected key', async () => {
    setRows([row('a', KEY_A, 1), row('b', KEY_B, 2)])
    await withKeyRotation('groq', async key => { if (key === KEY_A) throw apiError(401, 'Invalid API Key'); return key })
    const write = mockRawQuery.mock.calls.find(([sql]) => sql.includes('is_enabled = IF'))
    // params: message, cooldownMs, seconds, disable flag, disable flag, id
    expect(write?.[1]?.[3]).toBe(1)
    expect(await withKeyRotation('groq', async key => key)).toBe(KEY_B)
  })

  it('throws KeysExhaustedError when every key fails', async () => {
    setRows([row('a', KEY_A), row('b', KEY_B)])
    await expect(withKeyRotation('groq', async () => { throw apiError(429) })).rejects.toBeInstanceOf(KeysExhaustedError)
  })

  it('does not retry or penalise keys for a bad request', async () => {
    setRows([row('a', KEY_A), row('b', KEY_B)])
    const run = jest.fn(async () => { throw apiError(400, 'Bad request') })
    await expect(withKeyRotation('groq', run)).rejects.toThrow('Bad request')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('does not treat our own errors as key failures', async () => {
    setRows([row('a', KEY_A), row('b', KEY_B)])
    const run = jest.fn(async () => { throw new Error('Last message must be from user') })
    await expect(withKeyRotation('groq', run)).rejects.toThrow('Last message must be from user')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('reports a retired model as provider unavailable so another provider can take over', async () => {
    setRows([row('a', KEY_A), row('b', KEY_B)])
    await expect(withKeyRotation('groq', async () => { throw apiError(404, 'model not found') })).rejects.toBeInstanceOf(ProviderUnavailableError)
  })

  it('skips keys over their daily limit', async () => {
    setRows([row('a', KEY_A, 1, { daily_limit: 5, requests_today: 5 }), row('b', KEY_B, 2)])
    expect(await withKeyRotation('groq', async key => key)).toBe(KEY_B)
  })

  it('falls back to the env key when the DB is unavailable', async () => {
    process.env.GROQ_API_KEY = KEY_C
    mockRawQuery.mockRejectedValue(new Error('connect ECONNREFUSED'))
    try {
      expect(await withKeyRotation('groq', async key => key)).toBe(KEY_C)
    } finally {
      delete process.env.GROQ_API_KEY
    }
  })

  it('swaps keys during streaming only before the first chunk', async () => {
    setRows([row('a', KEY_A, 1), row('b', KEY_B, 2)])
    const chunks: string[] = []
    for await (const chunk of streamWithKeyRotation('groq', key => (async function* () {
      if (key === KEY_A) throw apiError(429)
      yield 'hello '
      yield 'world'
    })())) chunks.push(chunk)
    expect(chunks.join('')).toBe('hello world')

    invalidateKeyPool()
    setRows([row('c', KEY_C)])
    const midStream = async () => {
      for await (const _ of streamWithKeyRotation('groq', () => (async function* () {
        yield 'partial'
        throw apiError(500)
      })())) { /* consume */ }
    }
    await expect(midStream()).rejects.toThrow('HTTP 500')
  })
})
