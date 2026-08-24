import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { promises as fs } from 'fs'
import path from 'path'

const PLANS_FILE = path.join(process.cwd(), 'data', 'plans-config.json')

const DEFAULT_PLANS = [
  { id: 'free', name: 'Free', tier: 'free', price: 0, dailyLimit: 20, features: ['20 queries/day', 'Basic AI model', '7-day history'], aiModel: 'claude-3-haiku', enabled: true },
  { id: 'pro', name: 'Pro', tier: 'pro', price: 999, dailyLimit: -1, features: ['Unlimited queries', 'Advanced AI', 'Unlimited history', 'Priority support'], aiModel: 'claude-3-sonnet', enabled: true },
  { id: 'business', name: 'Business', tier: 'business', price: 4999, dailyLimit: -1, features: ['Everything in Pro', 'Team features', 'API access', 'Custom integrations'], aiModel: 'claude-3-sonnet', enabled: true },
]

async function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  try { await fs.access(dir) } catch { await fs.mkdir(dir, { recursive: true }) }
}

async function readPlans() {
  try {
    await ensureDataDir()
    const data = await fs.readFile(PLANS_FILE, 'utf-8')
    return JSON.parse(data).plans
  } catch {
    return DEFAULT_PLANS
  }
}

async function writePlans(plans: any[]) {
  await ensureDataDir()
  await fs.writeFile(PLANS_FILE, JSON.stringify({ plans, updatedAt: new Date().toISOString() }, null, 2))
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const plans = await readPlans()
    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Admin plans GET error:', error)
    return NextResponse.json({ plans: DEFAULT_PLANS })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { plans } = await request.json()
    await writePlans(plans)

    return NextResponse.json({ success: true, message: 'Plans updated' })
  } catch (error) {
    console.error('Admin plans POST error:', error)
    return NextResponse.json({ error: 'Failed to save plans' }, { status: 500 })
  }
}
