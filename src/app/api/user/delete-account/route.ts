import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { userDb } from '@/lib/db'
import mysql from 'mysql2/promise'

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // MySQL cascading deletes handle related records via foreign keys
    // Just delete the user and everything cascades
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const conn = await mysql.createConnection(dbUrl)
    try {
      await conn.execute('DELETE FROM users WHERE id = ?', [userId])
    } finally {
      await conn.end()
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}