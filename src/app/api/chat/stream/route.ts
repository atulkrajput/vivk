import { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { conversationDb, messageDb, usageDb, dbUtils } from "@/lib/db"
import { generateStreamingResponseWithCircuitBreaker, estimateTokens } from "@/lib/ai"
import type { SubscriptionTier } from "@/lib/ai"

// Validation schema for streaming messages
const streamMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  content: z.string().min(1, "Message content is required").max(2000, "Message too long")
})

// POST /api/chat/stream - Send a message with streaming response
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const body = await request.json()
    const { conversationId, content } = streamMessageSchema.parse(body)

    // Verify conversation exists and user owns it
    const conversation = await conversationDb.getById(conversationId)
    if (!conversation || conversation.user_id !== session.user.id) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Check usage limits for free tier users
    if (session.user.subscriptionTier === 'free') {
      const hasReachedLimit = await dbUtils.hasReachedDailyLimit(session.user.id)
      if (hasReachedLimit) {
        return new Response(
          JSON.stringify({ 
            error: "Daily message limit reached. Upgrade to Pro for unlimited messages.",
            code: "DAILY_LIMIT_REACHED"
          }),
          { 
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Create user message
    const userMessage = await messageDb.create({
      conversation_id: conversationId,
      role: 'user',
      content: content.trim(),
      tokens: estimateTokens(content.trim())
    })

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "Failed to save message" }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Get conversation history for context
    const conversationMessages = await messageDb.getByConversationId(conversationId)
    
    // Set up Server-Sent Events stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send user message first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'user_message',
              message: userMessage
            })}\n\n`)
          )

          // Generate AI response with streaming
          const subscriptionTier = session.user.subscriptionTier as SubscriptionTier
          let aiResponseContent = ''
          
          try {
            for await (const chunk of generateStreamingResponseWithCircuitBreaker(
              conversationMessages,
              subscriptionTier
            )) {
              aiResponseContent += chunk
              
              // Send chunk to client
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'ai_chunk',
                  chunk
                })}\n\n`)
              )
            }

            // Save complete AI message to database
            const aiMessage = await messageDb.create({
              conversation_id: conversationId,
              role: 'assistant',
              content: aiResponseContent,
              tokens: estimateTokens(aiResponseContent)
            })

            if (aiMessage) {
              // Update usage tracking for free tier users
              if (session.user.subscriptionTier === 'free') {
                await usageDb.incrementDailyUsage(
                  session.user.id, 
                  (userMessage.tokens || 0) + (aiMessage.tokens || 0)
                )
              }

              // Update conversation title if this is the first message
              let updatedConversation = conversation
              if (content.trim() && conversation.title === 'New Conversation') {
                const newTitle = content.trim().substring(0, 50) + (content.length > 50 ? '...' : '')
                updatedConversation = await conversationDb.update(conversationId, {
                  title: newTitle
                }) || conversation
              }

              // Send completion message
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'ai_complete',
                  message: aiMessage,
                  conversation: updatedConversation
                })}\n\n`)
              )
            }

          } catch (aiError) {
            console.error('AI streaming failed:', aiError)
            
            // Send error to client
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                error: aiError instanceof Error ? aiError.message : "Failed to generate AI response"
              })}\n\n`)
            )
          }

          // Close the stream
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: 'Streaming failed'
            })}\n\n`)
          )
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
    
  } catch (error) {
    console.error("Error in streaming endpoint:", error)
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: error.errors[0].message }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    return new Response(
      JSON.stringify({ error: "Failed to process streaming request" }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}