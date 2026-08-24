import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { promises as fs } from 'fs'
import path from 'path'

// Store tracking codes in a JSON file (for MVP - could use DB in production)
const TRACKING_FILE = path.join(process.cwd(), 'data', 'tracking-codes.json')

async function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

async function readTrackingCodes() {
  try {
    await ensureDataDir()
    const data = await fs.readFile(TRACKING_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { codes: [] }
  }
}

async function writeTrackingCodes(codes: any[]) {
  await ensureDataDir()
  await fs.writeFile(TRACKING_FILE, JSON.stringify({ codes, updatedAt: new Date().toISOString() }, null, 2))
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const data = await readTrackingCodes()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Admin tracking GET error:', error)
    return NextResponse.json({ codes: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { codes } = await request.json()
    await writeTrackingCodes(codes)

    return NextResponse.json({ success: true, message: 'Tracking codes saved' })
  } catch (error) {
    console.error('Admin tracking POST error:', error)
    return NextResponse.json({ error: 'Failed to save tracking codes' }, { status: 500 })
  }
}
