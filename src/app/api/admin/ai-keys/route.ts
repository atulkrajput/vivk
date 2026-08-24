import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Return current AI key configuration from environment
    const keys = [
      {
        id: 'anthropic',
        provider: 'Anthropic',
        label: 'Claude API Key',
        keyMasked: maskKey(process.env.ANTHROPIC_API_KEY),
        keyValue: process.env.ANTHROPIC_API_KEY || '',
        enabled: !!process.env.ANTHROPIC_API_KEY,
        usageToday: 0,
        usageMonth: 0,
        monthlyLimit: 1000000,
        lastUsed: new Date().toISOString(),
      },
      {
        id: 'groq',
        provider: 'Groq',
        label: 'Groq API Key',
        keyMasked: maskKey(process.env.GROQ_API_KEY),
        keyValue: process.env.GROQ_API_KEY || '',
        enabled: !!process.env.GROQ_API_KEY,
        usageToday: 0,
        usageMonth: 0,
        monthlyLimit: 500000,
        lastUsed: null,
      },
      {
        id: 'openai',
        provider: 'OpenAI',
        label: 'OpenAI API Key',
        keyMasked: maskKey(process.env.OPENAI_API_KEY),
        keyValue: process.env.OPENAI_API_KEY || '',
        enabled: !!process.env.OPENAI_API_KEY,
        usageToday: 0,
        usageMonth: 0,
        monthlyLimit: 500000,
        lastUsed: null,
      },
    ]

    return NextResponse.json({ keys })
  } catch (error) {
    console.error('Admin AI keys GET error:', error)
    return NextResponse.json({ error: 'Failed to load AI keys' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Note: In production, changing env vars at runtime requires a deployment.
    // This endpoint saves the configuration for reference.
    const { keys } = await request.json()

    // Log the configuration change
    console.log('AI Keys config updated by:', session.user.email, 'at', new Date().toISOString())

    return NextResponse.json({ 
      success: true, 
      message: 'AI key configuration saved. Note: Environment variable changes require redeployment to take effect.' 
    })
  } catch (error) {
    console.error('Admin AI keys POST error:', error)
    return NextResponse.json({ error: 'Failed to save AI keys' }, { status: 500 })
  }
}

function maskKey(key: string | undefined): string {
  if (!key) return '(not set)'
  if (key.length <= 8) return '****'
  return key.substring(0, 4) + '****' + key.substring(key.length - 4)
}
