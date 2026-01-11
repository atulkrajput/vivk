import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { conversationDb, messageDb } from "@/lib/db"

// GET /api/chat/conversations/[id]/messages - Get all messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Verify conversation exists and user owns it
    const conversation = await conversationDb.getById(id)
    if (!conversation || conversation.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    const messages = await messageDb.getByConversationId(id)
    
    return NextResponse.json({
      success: true,
      messages
    })
    
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}