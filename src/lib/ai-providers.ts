import Anthropic from '@anthropic-ai/sdk'
import type { Message } from '@/types/database.types'

// AI Provider types
export type AIProvider = 'anthropic' | 'openai' | 'custom'
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
  anthropic: {
    name: 'Anthropic Claude',
    models: {
      free: 'claude-3-haiku-20240307',
      pro: 'claude-3-5-sonnet-20241022',
      business: 'claude-3-5-sonnet-20241022'
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
  return provider && provider in AI_PROVIDERS ? provider : 'anthropic'
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

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required')
    }
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
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

// OpenAI implementation (placeholder)
class OpenAIService implements AIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
  }

  async generateResponse(messages: Message[], tier: SubscriptionTier): Promise<string> {
    // TODO: Implement OpenAI integration
    throw new Error('OpenAI integration not yet implemented')
  }

  async* generateStreamingResponse(messages: Message[], tier: SubscriptionTier): AsyncIterable<string> {
    // TODO: Implement OpenAI streaming
    throw new Error('OpenAI streaming not yet implemented')
  }

  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4)
  }
}

// Custom provider implementation (placeholder)
class CustomService implements AIService {
  constructor() {
    if (!process.env.CUSTOM_AI_API_KEY) {
      throw new Error('CUSTOM_AI_API_KEY environment variable is required')
    }
  }

  async generateResponse(messages: Message[], tier: SubscriptionTier): Promise<string> {
    // TODO: Implement custom provider integration
    throw new Error('Custom provider integration not yet implemented')
  }

  async* generateStreamingResponse(messages: Message[], tier: SubscriptionTier): AsyncIterable<string> {
    // TODO: Implement custom provider streaming
    throw new Error('Custom provider streaming not yet implemented')
  }

  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4)
  }
}

// Service factory
export function createAIService(provider?: AIProvider): AIService {
  const currentProvider = provider || getCurrentProvider()
  
  switch (currentProvider) {
    case 'anthropic':
      return new AnthropicService()
    case 'openai':
      return new OpenAIService()
    case 'custom':
      return new CustomService()
    default:
      throw new Error(`Unsupported AI provider: ${currentProvider}`)
  }
}

// Default service instance
export const aiService = createAIService()