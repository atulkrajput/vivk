import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { conversationDb, messageDb, usageDb, dbUtils } from "@/lib/db"
import { generateResponseWithCircuitBreaker, estimateTokens } from "@/lib/ai"
import { validateAndSanitizeUserInput, logSecureError, securitySchemas } from "@/lib/security"
import { 
  createErrorResponse, 
  VivkError, 
  ErrorCode, 
  ErrorSeverity, 
  withRetry, 
  circuitBreakers,
  handleDatabaseError,
  handleAIError,
  handleSessionExpiration
} from "@/lib/error-handling"
import type { SubscriptionTier } from "@/lib/ai"

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

// Enhanced validation schema for sending messages
const sendMessageSchema = z.object({
  conversationId: securitySchemas.uuid,
  content: z.string().min(1, "Message content is required")
})

// POST /api/chat/messages - Send a new message
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return handleSessionExpiration()
    }

    const body = await request.json()
    
    // Basic validation
    const validatedBody = sendMessageSchema.parse(body)
    const { conversationId } = validatedBody
    let { content } = validatedBody

    // Validate and sanitize message content
    try {
      content = validateAndSanitizeUserInput(content)
    } catch (error) {
      throw new VivkError(
        ErrorCode.INVALID_INPUT,
        'Invalid message content',
        'Please check your message and try again.',
        ErrorSeverity.LOW
      )
    }

    // Verify conversation exists and user owns it with retry
    const conversation = await withRetry(async () => {
      const conv = await conversationDb.getById(conversationId)
      if (!conv) {
        throw new VivkError(
          ErrorCode.RESOURCE_NOT_FOUND,
          'Conversation not found',
          'The conversation you\'re trying to access doesn\'t exist.',
          ErrorSeverity.MEDIUM
        )
      }
      if (conv.user_id !== session.user.id) {
        throw new VivkError(
          ErrorCode.UNAUTHORIZED,
          'Unauthorized conversation access',
          'You don\'t have permission to access this conversation.',
          ErrorSeverity.HIGH
        )
      }
      return conv
    }, 2)

    // Check usage limits for free tier users
    if (session.user.subscriptionTier === 'free') {
      const hasReachedLimit = await withRetry(
        () => dbUtils.hasReachedDailyLimit(session.user.id),
        2
      )
      
      if (hasReachedLimit) {
        throw new VivkError(
          ErrorCode.DAILY_LIMIT_REACHED,
          'Daily message limit reached',
          'You\'ve reached your daily message limit. Upgrade to Pro for unlimited messages.',
          ErrorSeverity.MEDIUM,
          false
        )
      }
    }

    // Create user message with database circuit breaker
    const userMessage = await circuitBreakers.database.execute(async () => {
      const message = await messageDb.create({
        conversation_id: conversationId,
        role: 'user',
        content: content,
        tokens: estimateTokens(content)
      })
      
      if (!message) {
        throw handleDatabaseError(new Error('Failed to save user message'), 'create_user_message')
      }
      
      return message
    })

    // Get conversation history for context with retry
    const conversationMessages = await withRetry(
      () => messageDb.getByConversationId(conversationId),
      2
    )

    // Generate AI response using Claude API with circuit breaker
    const subscriptionTier = session.user.subscriptionTier as SubscriptionTier
    let aiResponseContent: string
    
    try {
      aiResponseContent = await circuitBreakers.ai.execute(async () => {
        return await generateResponseWithCircuitBreaker(
          conversationMessages,
          subscriptionTier
        )
      })
    } catch (aiError) {
      const vivkError = handleAIError(aiError as Error, {
        userId: session.user.id,
        conversationId,
        subscriptionTier
      })
      
      // Return user message even if AI fails
      return NextResponse.json({
        success: false,
        error: vivkError.userMessage,
        code: vivkError.code,
        retryable: vivkError.retryable,
        userMessage // Return the saved user message
      }, { status: 500 })
    }

    // Create AI message with circuit breaker
    const aiMessage = await circuitBreakers.database.execute(async () => {
      const message = await messageDb.create({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponseContent,
        tokens: estimateTokens(aiResponseContent)
      })
      
      if (!message) {
        throw handleDatabaseError(new Error('Failed to save AI message'), 'create_ai_message')
      }
      
      return message
    })

    // Update usage tracking for free tier users
    if (session.user.subscriptionTier === 'free') {
      await withRetry(async () => {
        await usageDb.incrementDailyUsage(
          session.user.id, 
          (userMessage.tokens || 0) + (aiMessage.tokens || 0)
        )
      }, 2)
    }

    // Update conversation title if this is the first message
    let updatedConversation = conversation
    if (content && conversation.title === 'New Conversation') {
      const newTitle = generateConversationTitle(content)
      updatedConversation = await withRetry(async () => {
        return await conversationDb.update(conversationId, {
          title: newTitle
        }) || conversation
      }, 2)
    }

    return NextResponse.json({
      success: true,
      userMessage,
      aiMessage,
      conversation: updatedConversation
    })
    
  } catch (error) {
    return createErrorResponse(error as Error, { 
      endpoint: 'chat-messages',
      userId: (await auth())?.user?.id 
    })
  }
}