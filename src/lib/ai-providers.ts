import Anthropic from '@anthropic-ai/sdk'
import Groq from 'groq-sdk'
import type { Message } from '@/types/database.types'
import {
  withKeyRotation,
  streamWithKeyRotation,
  hasAnyKey,
  KeysExhaustedError,
  ProviderUnavailableError,
  ROTATING_PROVIDERS,
  type RotatingProvider,
} from './ai-keys'

// AI Provider types
export type AIProvider = 'anthropic' | 'groq' | 'openai' | 'custom'
export type SubscriptionTier = 'free' | 'pro' | 'business'

// Provider configuration interface
export interface AIProviderConfig {
  name: string
  models: {
    free: string
    pro: string
    business: string
  }
  maxTokens: {
    free: number
    pro: number
    business: number
  }
  systemPrompt: string
}

// Provider configurations
export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  groq: {
    name: 'Groq',
    models: {
      free: process.env.GROQ_MODEL_NAME || 'openai/gpt-oss-20b',
      pro: process.env.GROQ_MODEL_NAME || 'openai/gpt-oss-20b',
      business: process.env.GROQ_MODEL_NAME || 'openai/gpt-oss-20b'
    },
    maxTokens: {
      free: 1024,
      pro: 4096,
      business: 8192
    },
    systemPrompt: "You are VIVK (Virtual Intelligent Versatile Knowledge), an AI assistant built specifically for the Indian market. You are helpful, knowledgeable, and understand Indian context, culture, and business practices. Provide clear, accurate, and culturally relevant responses."
  },
  anthropic: {
    name: 'Anthropic Claude',
    models: {
      free: process.env.ANTHROPIC_MODEL_FREE || 'claude-3-haiku-20240307',
      pro: process.env.ANTHROPIC_MODEL_PRO || 'claude-3-5-sonnet-20241022',
      business: process.env.ANTHROPIC_MODEL_BUSINESS || 'claude-3-5-sonnet-20241022'
    },
    maxTokens: {
      free: 1024,
      pro: 4096,
      business: 8192
    },
    systemPrompt: "You are VIVK (Virtual Intelligent Versatile Knowledge), an AI assistant built specifically for the Indian market. You are helpful, knowledgeable, and understand Indian context, culture, and business practices. Provide clear, accurate, and culturally relevant responses."
  },
  openai: {
    name: 'OpenAI GPT',
    models: {
      free: 'gpt-3.5-turbo',
      pro: 'gpt-4',
      business: 'gpt-4-turbo'
    },
    maxTokens: {
      free: 1024,
      pro: 4096,
      business: 8192
    },
    systemPrompt: "You are VIVK (Virtual Intelligent Versatile Knowledge), an AI assistant built specifically for the Indian market. You are helpful, knowledgeable, and understand Indian context, culture, and business practices. Provide clear, accurate, and culturally relevant responses."
  },
  custom: {
    name: 'Custom Provider',
    models: {
      free: 'custom-model-free',
      pro: 'custom-model-pro',
      business: 'custom-model-business'
    },
    maxTokens: {
      free: 1024,
      pro: 4096,
      business: 8192
    },
    systemPrompt: "You are VIVK (Virtual Intelligent Versatile Knowledge), an AI assistant built specifically for the Indian market. You are helpful, knowledgeable, and understand Indian context, culture, and business practices. Provide clear, accurate, and culturally relevant responses."
  }
}

// Get current provider from environment
export function getCurrentProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER as AIProvider
  if (provider && provider in AI_PROVIDERS) return provider
  // Default to groq if key is available, otherwise anthropic
  if (process.env.GROQ_API_KEY) return 'groq'
  return 'anthropic'
}

// Providers to try for a tier, in order. Free users -> Groq first, paid users -> Anthropic first;
// when every key of one provider is busy or failing, the next provider is used.
export function getProviderOrder(tier: SubscriptionTier): RotatingProvider[] {
  return tier === 'free' ? ['groq', 'anthropic'] : ['anthropic', 'groq']
}

// Get provider configuration
export function getProviderConfig(provider?: AIProvider): AIProviderConfig {
  const currentProvider = provider || getCurrentProvider()
  return AI_PROVIDERS[currentProvider]
}

// Get model for subscription tier
export function getModelForTier(tier: SubscriptionTier, provider?: AIProvider): string {
  const config = getProviderConfig(provider)
  return config.models[tier]
}

// Get max tokens for subscription tier
export function getMaxTokensForTier(tier: SubscriptionTier, provider?: AIProvider): number {
  const config = getProviderConfig(provider)
  return config.maxTokens[tier]
}

// Abstract AI service interface
export interface AIService {
  generateResponse(messages: Message[], tier: SubscriptionTier): Promise<string>
  generateStreamingResponse(messages: Message[], tier: SubscriptionTier): AsyncIterable<string>
  estimateTokens(content: string): number
}

// Anthropic implementation
class AnthropicService implements AIService {
  private client: Anthropic

  constructor(apiKey: string) {
    // Retries are handled by key rotation, so fail fast and move to the next key
    this.client = new Anthropic({ apiKey, maxRetries: 0 })
  }

  private formatMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages.map(message => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content
    }))
  }

  async generateResponse(messages: Message[], tier: SubscriptionTier): Promise<string> {
    const config = getProviderConfig('anthropic')
    const model = config.models[tier]
    const maxTokens = config.maxTokens[tier]
    const claudeMessages = this.formatMessages(messages)

    if (claudeMessages.length === 0) {
      throw new Error('No messages provided')
    }

    const lastMessage = claudeMessages[claudeMessages.length - 1]
    if (lastMessage.role !== 'user') {
      throw new Error('Last message must be from user')
    }

    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: claudeMessages,
      system: config.systemPrompt
    })

    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')

    if (!textContent) {
      throw new Error('No text content in AI response')
    }

    return textContent
  }

  async* generateStreamingResponse(messages: Message[], tier: SubscriptionTier): AsyncIterable<string> {
    const config = getProviderConfig('anthropic')
    const model = config.models[tier]
    const maxTokens = config.maxTokens[tier]
    const claudeMessages = this.formatMessages(messages)

    if (claudeMessages.length === 0) {
      throw new Error('No messages provided')
    }

    const lastMessage = claudeMessages[claudeMessages.length - 1]
    if (lastMessage.role !== 'user') {
      throw new Error('Last message must be from user')
    }

    const stream = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: claudeMessages,
      system: config.systemPrompt,
      stream: true
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text
      }
    }
  }

  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4)
  }
}

// Groq implementation
class GroqService implements AIService {
  private client: Groq

  constructor(apiKey: string) {
    // Retries are handled by key rotation, so fail fast and move to the next key
    this.client = new Groq({ apiKey, maxRetries: 0 })
  }

  private formatMessages(messages: Message[]): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
    return messages.map(message => ({
      role: (message.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: message.content
    }))
  }

  async generateResponse(messages: Message[], tier: SubscriptionTier): Promise<string> {
    const config = getProviderConfig('groq')
    const formattedMessages = this.formatMessages(messages)

    if (formattedMessages.length === 0) {
      throw new Error('No messages provided')
    }

    const lastMessage = formattedMessages[formattedMessages.length - 1]
    if (lastMessage.role !== 'user') {
      throw new Error('Last message must be from user')
    }

    // Dynamic model selection based on task type
    let model: string
    let maxTokens: number
    try {
      const { selectModel } = await import('./model-router')
      const selection = await selectModel(messages, tier)
      model = selection.modelId
      maxTokens = selection.model.max_output_tokens
    } catch {
      // Fallback if model router fails
      model = process.env.GROQ_MODEL_NAME || config.models[tier]
      maxTokens = config.maxTokens[tier]
    }

    const response = await this.client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: config.systemPrompt },
        ...formattedMessages
      ]
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No text content in AI response')
    }

    return content
  }

  async* generateStreamingResponse(messages: Message[], tier: SubscriptionTier): AsyncIterable<string> {
    const config = getProviderConfig('groq')
    const formattedMessages = this.formatMessages(messages)

    if (formattedMessages.length === 0) {
      throw new Error('No messages provided')
    }

    const lastMessage = formattedMessages[formattedMessages.length - 1]
    if (lastMessage.role !== 'user') {
      throw new Error('Last message must be from user')
    }

    // Dynamic model selection based on task type
    let model: string
    let maxTokens: number
    try {
      const { selectModel } = await import('./model-router')
      const selection = await selectModel(messages, tier)
      model = selection.modelId
      maxTokens = selection.model.max_output_tokens
    } catch {
      // Fallback if model router fails
      model = process.env.GROQ_MODEL_NAME || config.models[tier]
      maxTokens = config.maxTokens[tier]
    }

    const stream = await this.client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: config.systemPrompt },
        ...formattedMessages
      ],
      stream: true
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  }

  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4)
  }
}

// Dev/mock AI service for local development without API keys
class DevMockService implements AIService {
  private responses: string[] = [
    "Namaste! I'm VIVK, your AI assistant built for India. I'm currently running in development mode without a live AI backend.\n\nTo enable real AI responses, add a valid ANTHROPIC_API_KEY to your .env.local file.\n\nIn the meantime, I can confirm your chat interface is working correctly!",
    "Great question! I'm running in dev mode right now, so I can't give you a real AI-powered answer. But your message was received and processed successfully.\n\nTo get real responses:\n1. Get an API key from console.anthropic.com\n2. Add it to .env.local as ANTHROPIC_API_KEY\n3. Restart the dev server",
    "I see your message! The chat pipeline is working end-to-end — your message was saved to the database, and this response is being generated and stored too.\n\nThis is a mock response because no valid AI API key is configured. Once you add your Anthropic API key, you'll get real Claude responses here.",
    "Thanks for testing! Everything looks good on the backend:\n✅ Authentication working\n✅ Database read/write working\n✅ Message pipeline working\n✅ Conversation management working\n\nJust need a valid ANTHROPIC_API_KEY in .env.local for real AI responses.",
    "Hello! VIVK dev mode here. Your chat system is fully functional — messages are being saved, conversations are tracked, and the UI is rendering properly.\n\nThis mock response confirms the entire flow works. Add your Anthropic API key to unlock real AI capabilities!"
  ]

  async generateResponse(messages: Message[], tier: SubscriptionTier): Promise<string> {
    // Simulate a small delay like a real API
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500))
    const index = messages.length % this.responses.length
    return this.responses[index]
  }

  async* generateStreamingResponse(messages: Message[], tier: SubscriptionTier): AsyncIterable<string> {
    const index = messages.length % this.responses.length
    const fullResponse = this.responses[index]
    const words = fullResponse.split(' ')
    
    for (const word of words) {
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 40))
      yield word + ' '
    }
  }

  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4)
  }
}

// One service instance per key, so SDK clients are reused across requests
const _services = new Map<string, AIService>()

function getService(provider: RotatingProvider, apiKey: string): AIService {
  const cacheKey = `${provider}:${apiKey}`
  let service = _services.get(cacheKey)
  if (!service) {
    service = provider === 'groq' ? new GroqService(apiKey) : new AnthropicService(apiKey)
    _services.set(cacheKey, service)
  }
  return service
}

function canFallBack(error: unknown): boolean {
  return error instanceof KeysExhaustedError || error instanceof ProviderUnavailableError
}

// Mock responses only in local development with no keys configured anywhere
async function shouldUseDevMock(): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') return false
  for (const provider of ROTATING_PROVIDERS) {
    if (await hasAnyKey(provider)) return false
  }
  console.warn('⚠️  No AI API keys configured. Using mock AI responses for development.')
  return true
}

const devMock = new DevMockService()

export const aiService: AIService = {
  async generateResponse(messages: Message[], tier: SubscriptionTier): Promise<string> {
    if (await shouldUseDevMock()) return devMock.generateResponse(messages, tier)

    let lastError: unknown = null
    for (const provider of getProviderOrder(tier)) {
      try {
        return await withKeyRotation(provider, apiKey => getService(provider, apiKey).generateResponse(messages, tier))
      } catch (error) {
        if (!canFallBack(error)) throw error
        console.warn(`AI provider ${provider} unavailable, trying next:`, (error as Error).message)
        lastError = error
      }
    }
    throw lastError
  },

  async* generateStreamingResponse(messages: Message[], tier: SubscriptionTier): AsyncIterable<string> {
    if (await shouldUseDevMock()) {
      yield* devMock.generateStreamingResponse(messages, tier)
      return
    }

    let lastError: unknown = null
    for (const provider of getProviderOrder(tier)) {
      try {
        // Rotation only throws a fallback error before any chunk has been sent
        yield* streamWithKeyRotation(provider, apiKey => getService(provider, apiKey).generateStreamingResponse(messages, tier))
        return
      } catch (error) {
        if (!canFallBack(error)) throw error
        console.warn(`AI provider ${provider} unavailable, trying next:`, (error as Error).message)
        lastError = error
      }
    }
    throw lastError
  },

  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4)
  }
}
