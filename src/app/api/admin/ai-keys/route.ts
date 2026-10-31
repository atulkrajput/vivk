import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin'
import { rawQuery } from '@/lib/db'
import {
  ROTATING_PROVIDERS,
  ensureAiKeysTable,
  encryptApiKey,
  getEnvKey,
  getKeyRuntimeStatus,
  invalidateKeyPool,
  isKeyEncryptionConfigured,
  looksLikeProviderKey,
  maskApiKey,
  testApiKey,
  type AiKeyRow,
} from '@/lib/ai-keys'

const providerSchema = z.enum(['groq', 'anthropic'])

const createSchema = z.object({
  provider: providerSchema,
  label: z.string().trim().min(1).max(100),
  apiKey: z.string().trim().min(20).max(500),
  priority: z.number().int().min(0).max(999).default(100),
  dailyLimit: z.number().int().positive().nullable().default(null),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).max(999).optional(),
  dailyLimit: z.number().int().positive().nullable().optional(),
})

function unauthorized() {
  return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
}

function keyStatus(row: Pick<AiKeyRow, 'id' | 'is_enabled' | 'daily_limit' | 'cooldown_until'>, requestsToday: number) {
  if (!row.is_enabled) return 'disabled'
  const runtime = getKeyRuntimeStatus(row.id).coolingDownUntil
  const stored = row.cooldown_until ? new Date(row.cooldown_until).getTime() : 0
  if (Math.max(runtime || 0, stored) > Date.now()) return 'cooling_down'
  if (row.daily_limit !== null && requestsToday >= row.daily_limit) return 'limit_reached'
  return 'active'
}

// GET /api/admin/ai-keys - All keys, masked, with usage and status. Key values never leave the server.
export async function GET() {
  if (!(await getAdminSession())) return unauthorized()

  try {
    await ensureAiKeysTable()
    const rows = await rawQuery<AiKeyRow>(
      `SELECT id, provider, label, key_last4, is_enabled, priority, daily_limit,
              IF(usage_date = CURDATE(), requests_today, 0) AS requests_today,
              IF(usage_date = CURDATE(), errors_today, 0) AS errors_today,
              total_requests, last_used_at, last_error, last_error_at, cooldown_until, disabled_reason, created_at
       FROM ai_api_keys ORDER BY provider, priority, created_at`
    )

    const keys = rows.map(row => {
      const requestsToday = Number(row.requests_today) || 0
      return {
        id: row.id,
        source: 'db' as const,
        provider: row.provider,
        label: row.label,
        keyMasked: maskApiKey(row.provider, row.key_last4),
        enabled: !!row.is_enabled,
        priority: row.priority,
        dailyLimit: row.daily_limit,
        requestsToday,
        errorsToday: Number(row.errors_today) || 0,
        totalRequests: Number(row.total_requests) || 0,
        lastUsedAt: row.last_used_at,
        lastError: row.last_error,
        lastErrorAt: row.last_error_at,
        disabledReason: row.disabled_reason,
        status: keyStatus(row, requestsToday),
        createdAt: row.created_at,
      }
    })

    // Env keys are part of the pool too, but can only be changed in Vercel
    const envKeys = ROTATING_PROVIDERS.flatMap(provider => {
      const apiKey = getEnvKey(provider)
      if (!apiKey) return []
      const id = `env:${provider}`
      return [{
        id,
        source: 'env' as const,
        provider,
        label: `${provider === 'groq' ? 'GROQ' : 'ANTHROPIC'}_API_KEY (Vercel env)`,
        keyMasked: maskApiKey(provider, apiKey.slice(-4)),
        enabled: true,
        priority: 1000,
        dailyLimit: null,
        status: getKeyRuntimeStatus(id).coolingDownUntil ? 'cooling_down' : 'active',
      }]
    })

    return NextResponse.json({ keys, envKeys, encryptionConfigured: isKeyEncryptionConfigured() })
  } catch (error) {
    console.error('Admin AI keys GET error:', error)
    return NextResponse.json({ error: 'Failed to load AI keys' }, { status: 500 })
  }
}

// POST /api/admin/ai-keys - Add a key (tested against the provider before saving)
export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return unauthorized()

  try {
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Provider, label and a valid key are required' }, { status: 400 })
    }
    const { provider, label, apiKey, priority, dailyLimit } = parsed.data

    if (!isKeyEncryptionConfigured()) {
      return NextResponse.json({ error: 'Set AI_KEYS_SECRET (32+ characters) in Vercel before adding keys' }, { status: 400 })
    }
    if (!looksLikeProviderKey(provider, apiKey)) {
      return NextResponse.json({ error: `That does not look like a ${provider === 'groq' ? 'Groq (gsk_…)' : 'Anthropic (sk-ant-…)'} key` }, { status: 400 })
    }

    const test = await testApiKey(provider, apiKey)
    if (!test.ok) {
      return NextResponse.json({ error: `Key not saved: ${test.message}` }, { status: 400 })
    }

    await ensureAiKeysTable()
    const id = crypto.randomUUID()
    await rawQuery(
      `INSERT INTO ai_api_keys (id, provider, label, key_ciphertext, key_last4, priority, daily_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, provider, label, encryptApiKey(apiKey), apiKey.slice(-4), priority, dailyLimit]
    )
    invalidateKeyPool()
    console.log(`AI key ${id} (${provider}) added by ${session.email}`)

    return NextResponse.json({ success: true, id, message: test.message })
  } catch (error) {
    console.error('Admin AI keys POST error:', error)
    return NextResponse.json({ error: 'Failed to add key' }, { status: 500 })
  }
}

// PATCH /api/admin/ai-keys - Enable/disable, rename, change priority or daily limit
export async function PATCH(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return unauthorized()

  try {
    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid update' }, { status: 400 })
    }
    const { id, label, enabled, priority, dailyLimit } = parsed.data

    const sets: string[] = []
    const params: unknown[] = []
    if (label !== undefined) { sets.push('label = ?'); params.push(label) }
    if (priority !== undefined) { sets.push('priority = ?'); params.push(priority) }
    if (dailyLimit !== undefined) { sets.push('daily_limit = ?'); params.push(dailyLimit) }
    if (enabled !== undefined) {
      sets.push('is_enabled = ?'); params.push(enabled ? 1 : 0)
      // Re-enabling gives the key a fresh start
      if (enabled) sets.push('disabled_reason = NULL', 'cooldown_until = NULL')
      else { sets.push('disabled_reason = ?'); params.push(`Disabled by ${session.email}`) }
    }
    if (sets.length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    await ensureAiKeysTable()
    await rawQuery(`UPDATE ai_api_keys SET ${sets.join(', ')} WHERE id = ?`, [...params, id])
    invalidateKeyPool()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin AI keys PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update key' }, { status: 500 })
  }
}

// DELETE /api/admin/ai-keys?id=... - Remove a key
export async function DELETE(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return unauthorized()

  const id = request.nextUrl.searchParams.get('id')
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid key id' }, { status: 400 })
  }

  try {
    await ensureAiKeysTable()
    await rawQuery('DELETE FROM ai_api_keys WHERE id = ?', [id])
    invalidateKeyPool()
    console.log(`AI key ${id} deleted by ${session.email}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin AI keys DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 })
  }
}
