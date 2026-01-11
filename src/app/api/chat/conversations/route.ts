import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { conversationDb } from "@/lib/db"
import { ConversationCacheService } from "@/lib/redis"
import { withRateLimit, getUserIdentifier } from "@/lib/rate-limiting"

// GET /api/chat/conversations - Get all conversations for the current user
async function getConversations(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Try to get from cache first (only for non-search queries with default pagination)
    let conversations
    const cacheKey = `${session.user.id}:${limit}:${offset}`
    
    if (!search && limit === 50 && offset === 0) {
      conversations = await ConversationCacheService.getConversationList(session.user.id)
    }

    if (!conversations) {
      conversations = await conversationDb.getByUserId(session.user.id, {
        search: search || undefined,
        limit,
        offset
      })
      
      // Cache the result if it's a default query
      if (!search && limit === 50 && offset === 0) {
        await ConversationCacheService.cacheConversationList(session.user.id, conversations)
      }
    }
    
    return NextResponse.json({
      success: true,
      conversations,
      pagination: {
        limit,
        offset,
        hasMore: conversations.length === limit
      }
    })
    
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(
  'USER_API',
  async (request: NextRequest) => {
    const session = await auth()
    return session?.user?.id ? getUserIdentifier(session.user.id) : 'anonymous'
  }
)(getConversations)

// POST /api/chat/conversations - Create a new conversation
async function createConversation(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { title, firstMessage } = body

    // Generate intelligent title if first message is provided
    let conversationTitle = title || "New Conversation"
    if (firstMessage && !title) {
      conversationTitle = generateConversationTitle(firstMessage)
    }

    const conversation = await conversationDb.create({
      user_id: session.user.id,
      title: conversationTitle
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      )
    }

    // Invalidate conversation list cache
    await ConversationCacheService.invalidateUserConversations(session.user.id)

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        message_count: 0,
        last_message: null,
        last_activity: conversation.created_at
      }
    })
    
  } catch (error) {
    console.error("Error creating conversation:", error)
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(
  'USER_API',
  async (request: NextRequest) => {
    const session = await auth()
    return session?.user?.id ? getUserIdentifier(session.user.id) : 'anonymous'
  }
)(createConversation)

// Helper function to generate conversation title from first message
function generateConversationTitle(message: string): string {
  // Clean and truncate the message
  const cleaned = message.trim().replace(/\s+/g, ' ')
  
  // If message is short enough, use it as title
  if (cleaned.length <= 50) {
    return cleaned
  }
  
  // Try to find a natural break point
  const sentences = cleaned.split(/[.!?]+/)
  if (sentences[0] && sentences[0].length <= 50) {
    return sentences[0].trim()
  }
  
  // Truncate at word boundary
  const words = cleaned.split(' ')
  let title = ''
  for (const word of words) {
    if ((title + ' ' + word).length > 47) break
    title += (title ? ' ' : '') + word
  }
  
  return title + '...'
}