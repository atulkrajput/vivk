import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { conversationDb, messageDb } from "@/lib/db"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// DELETE /api/chat/conversations/[id]/actions - Delete conversation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: conversationId } = await params

    // Verify conversation belongs to user
    const conversation = await conversationDb.getById(conversationId)
    if (!conversation || conversation.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    // Delete the conversation (messages will be deleted by cascade)
    const success = await conversationDb.delete(conversationId)
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete conversation" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully"
    })
    
  } catch (error) {
    console.error("Error deleting conversation:", error)
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    )
  }
}

// POST /api/chat/conversations/[id]/actions - Perform actions on conversation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: conversationId } = await params
    const body = await request.json()
    const { action, data } = body

    // Verify conversation belongs to user
    const conversation = await conversationDb.getById(conversationId)
    if (!conversation || conversation.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    switch (action) {
      case 'export':
        return await handleExportConversation(conversationId)
      
      case 'rename':
        return await handleRenameConversation(conversationId, data.title)
      
      case 'archive':
        return await handleArchiveConversation(conversationId, data.archived)
      
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error("Error performing conversation action:", error)
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    )
  }
}

// Helper function to export conversation
async function handleExportConversation(conversationId: string) {
  try {
    const conversation = await conversationDb.getById(conversationId)
    const messages = await messageDb.getByConversationId(conversationId)

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    const exportData = {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at
      },
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at
      })),
      exported_at: new Date().toISOString(),
      format_version: "1.0"
    }

    return NextResponse.json({
      success: true,
      data: exportData,
      filename: `vivk-conversation-${conversation.title.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.json`
    })
    
  } catch (error) {
    console.error("Error exporting conversation:", error)
    return NextResponse.json(
      { error: "Failed to export conversation" },
      { status: 500 }
    )
  }
}

// Helper function to rename conversation
async function handleRenameConversation(conversationId: string, newTitle: string) {
  try {
    if (!newTitle || newTitle.trim().length === 0) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      )
    }

    const updatedConversation = await conversationDb.update(conversationId, {
      title: newTitle.trim()
    })

    if (!updatedConversation) {
      return NextResponse.json(
        { error: "Failed to update conversation" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      conversation: updatedConversation
    })
    
  } catch (error) {
    console.error("Error renaming conversation:", error)
    return NextResponse.json(
      { error: "Failed to rename conversation" },
      { status: 500 }
    )
  }
}

// Helper function to archive/unarchive conversation
async function handleArchiveConversation(conversationId: string, archived: boolean) {
  try {
    // For now, we'll use a simple approach - in the future, add an 'archived' field to the database
    // For MVP, we'll just update the title to indicate archived status
    const conversation = await conversationDb.getById(conversationId)
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    let newTitle = conversation.title
    if (archived && !newTitle.startsWith('[Archived] ')) {
      newTitle = '[Archived] ' + newTitle
    } else if (!archived && newTitle.startsWith('[Archived] ')) {
      newTitle = newTitle.replace('[Archived] ', '')
    }

    const updatedConversation = await conversationDb.update(conversationId, {
      title: newTitle
    })

    return NextResponse.json({
      success: true,
      conversation: updatedConversation
    })
    
  } catch (error) {
    console.error("Error archiving conversation:", error)
    return NextResponse.json(
      { error: "Failed to archive conversation" },
      { status: 500 }
    )
  }
}