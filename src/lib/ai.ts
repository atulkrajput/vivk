import { aiService, getCurrentProvider, getProviderConfig } from './ai-providers'
import type { Message } from '@/types/database.types'
import type { SubscriptionTier } from './ai-providers'

// Re-export types for backward compatibility
export type { SubscriptionTier, AIProvider } from './ai-providers'

// Estimate tokens (rough approximation: 1 token ≈ 4 characters)
export function estimateTokens(content: string): number {
  return aiService.estimateTokens(content)
}

// Generate AI response (non-streaming)
export async function generateResponse(
  messages: Message[],
  subscriptionTier: SubscriptionTier = 'free'
): Promise<string> {
  try {
    return await aiService.generateResponse(messages, subscriptionTier)
  } catch (error) {
    console.error('AI generation error:', error)
    
    // Handle common errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error('AI service is currently busy. Please try again in a moment.')
      } else if (error.message.includes('400') || error.message.includes('Invalid')) {
        throw new Error('Invalid request to AI service. Please try rephrasing your message.')
      } else if (error.message.includes('401') || error.message.includes('authentication')) {
        throw new Error('AI service authentication failed. Please contact support.')
      } else if (error.message.includes('500') || error.message.includes('unavailable')) {
        throw new Error('AI service is temporarily unavailable. Please try again later.')
      }
    }
    
    // Generic error fallback
    throw new Error('Failed to generate AI response. Please try again.')
  }
}

// Generate AI response with streaming
export async function* generateStreamingResponse(
  messages: Message[],
  subscriptionTier: SubscriptionTier = 'free'
): AsyncIterable<string> {
  try {
    yield* aiService.generateStreamingResponse(messages, subscriptionTier)
  } catch (error) {
    console.error('AI streaming error:', error)
    
    // Handle common errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error('AI service is currently busy. Please try again in a moment.')
      } else if (error.message.includes('400') || error.message.includes('Invalid')) {
        throw new Error('Invalid request to AI service. Please try rephrasing your message.')
      } else if (error.message.includes('401') || error.message.includes('authentication')) {
        throw new Error('AI service authentication failed. Please contact support.')
      } else if (error.message.includes('500') || error.message.includes('unavailable')) {
        throw new Error('AI service is temporarily unavailable. Please try again later.')
      }
    }
    
    // Generic error fallback
    throw new Error('Failed to generate AI response. Please try again.')
  }
}

// Circuit breaker for AI service reliability
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private readonly threshold = 5
  private readonly timeout = 60000 // 1 minute

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('AI service is temporarily unavailable due to repeated failures. Please try again later.')
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private isOpen(): boolean {
    return this.failures >= this.threshold && 
           (Date.now() - this.lastFailureTime) < this.timeout
  }

  private onSuccess(): void {
    this.failures = 0
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
  }
}

export const aiCircuitBreaker = new CircuitBreaker()

// Wrapper functions with circuit breaker
export async function generateResponseWithCircuitBreaker(
  messages: Message[],
  subscriptionTier: SubscriptionTier = 'free'
): Promise<string> {
  return aiCircuitBreaker.execute(() => generateResponse(messages, subscriptionTier))
}

export async function* generateStreamingResponseWithCircuitBreaker(
  messages: Message[],
  subscriptionTier: SubscriptionTier = 'free'
): AsyncIterable<string> {
  const generator = await aiCircuitBreaker.execute(async () => {
    return generateStreamingResponse(messages, subscriptionTier)
  })
  
  for await (const chunk of generator) {
    yield chunk
  }
}

// Get current AI provider info
export function getAIProviderInfo() {
  const provider = getCurrentProvider()
  const config = getProviderConfig(provider)
  return {
    provider,
    name: config.name,
    models: config.models
  }
}