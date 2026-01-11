import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { conversationDb, messageDb } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get conversation and verify ownership
    const conversation = await conversationDb.getById(conversationId)
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (conversation.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get all messages for the conversation
    const messages = await messageDb.getByConversationId(conversationId)

    // Format export data
    const exportData = {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      },
      messages: messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at,
        tokensUsed: message.tokens || 0
      })),
      exportedAt: new Date().toISOString(),
      exportedBy: session.user.email,
      totalMessages: messages.length
    }

    return NextResponse.json(exportData)

  } catch (error) {
    console.error('Error exporting conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}