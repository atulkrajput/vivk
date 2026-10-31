import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin'
import { getApiKeyById, testApiKey } from '@/lib/ai-keys'

// POST /api/admin/ai-keys/test - Check a saved key (or an env key) against the provider
export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
  }

  try {
    const { id } = await request.json()
    const key = typeof id === 'string' ? await getApiKeyById(id) : null
    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }
    return NextResponse.json(await testApiKey(key.provider, key.apiKey))
  } catch (error) {
    console.error('Admin AI key test error:', error)
    return NextResponse.json({ error: 'Failed to test key' }, { status: 500 })
  }
}
