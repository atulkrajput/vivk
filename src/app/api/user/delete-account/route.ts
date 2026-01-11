import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/db'

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

    // Start a transaction to delete all user data
    // Note: Supabase handles cascading deletes through foreign key constraints
    
    // Delete in order to respect foreign key constraints:
    // 1. Messages (references conversations)
    // 2. Conversations (references users)
    // 3. Usage logs (references users)
    // 4. Payments (references users)
    // 5. Subscriptions (references users)
    // 6. User (final deletion)

    // First get all conversation IDs for the user
    const { data: userConversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId)

    const conversationIds = userConversations?.map(c => c.id) || []

    // Delete messages for user's conversations
    if (conversationIds.length > 0) {
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds)

      if (messagesError) {
        console.error('Error deleting messages:', messagesError)
        return NextResponse.json(
          { error: 'Failed to delete user messages' },
          { status: 500 }
        )
      }
    }

    // Delete conversations
    const { error: conversationsError } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', userId)

    if (conversationsError) {
      console.error('Error deleting conversations:', conversationsError)
      return NextResponse.json(
        { error: 'Failed to delete user conversations' },
        { status: 500 }
      )
    }

    // Delete usage logs
    const { error: usageError } = await supabase
      .from('usage_logs')
      .delete()
      .eq('user_id', userId)

    if (usageError) {
      console.error('Error deleting usage logs:', usageError)
      return NextResponse.json(
        { error: 'Failed to delete usage logs' },
        { status: 500 }
      )
    }

    // Delete payments
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('user_id', userId)

    if (paymentsError) {
      console.error('Error deleting payments:', paymentsError)
      return NextResponse.json(
        { error: 'Failed to delete payment history' },
        { status: 500 }
      )
    }

    // Delete subscriptions
    const { error: subscriptionsError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId)

    if (subscriptionsError) {
      console.error('Error deleting subscriptions:', subscriptionsError)
      return NextResponse.json(
        { error: 'Failed to delete subscription data' },
        { status: 500 }
      )
    }

    // Finally, delete the user
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (userError) {
      console.error('Error deleting user:', userError)
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      )
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