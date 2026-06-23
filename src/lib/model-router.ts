import type { SubscriptionTier } from './ai-providers'
import type { Message } from '@/types/database.types'

// Task types that influence model selection
export type TaskType = 'general_chat' | 'coding' | 'creative_writing' | 'reasoning' | 'summarization' | 'translation'

// Model record as stored in the database
export interface GroqModel {
  id: string
  display_name: string
  provider: string
  category: string
  context_window: number
  max_output_tokens: number
  speed_rating: 'ultra_fast' | 'fast' | 'moderate'
  quality_rating: 'high' | 'medium' | 'basic'
  cost_per_million_input: number
  cost_per_million_output: number
  score_general_chat: number
  score_coding: number
  score_creative_writing: number
  score_reasoning: number
  score_summarization: number
  score_translation: number
  tier_free: boolean
  tier_pro: boolean
  tier_business: boolean
  is_active: boolean
  is_default_free: boolean
  is_default_pro: boolean
  priority_order: number
  requests_per_minute: number
  tokens_per_minute: number
}

// In-memory cache for models (refreshed periodically)
let modelsCache: GroqModel[] | null = null
let modelsCacheTime = 0
const MODELS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Lazy import to avoid circular dependency
async function getDbPool() {
  const mysql = await import('mysql2/promise')
  const pool = mysql.default.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vivk',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  })
  return pool
}

// Fetch all active models from DB
async function fetchModelsFromDb(): Promise<GroqModel[]> {
  try {
    const pool = await getDbPool()
    const [rows] = await pool.execute('SELECT * FROM groq_models WHERE is_active = 1 ORDER BY priority_order ASC')
    await pool.end()

    return (rows as any[]).map(row => ({
      ...row,
      tier_free: row.tier_free === 1 || row.tier_free === true,
      tier_pro: row.tier_pro === 1 || row.tier_pro === true,
      tier_business: row.tier_business === 1 || row.tier_business === true,
      is_active: row.is_active === 1 || row.is_active === true,
      is_default_free: row.is_default_free === 1 || row.is_default_free === true,
      is_default_pro: row.is_default_pro === 1 || row.is_default_pro === true,
      cost_per_million_input: parseFloat(row.cost_per_million_input),
      cost_per_million_output: parseFloat(row.cost_per_million_output),
    }))
  } catch (error) {
    console.error('Failed to fetch groq_models from DB, using fallback:', error)
    return getFallbackModels()
  }
}

// Fallback models if DB is unavailable
function getFallbackModels(): GroqModel[] {
  return [
    {
      id: process.env.GROQ_MODEL_NAME || 'openai/gpt-oss-20b',
      display_name: 'GPT-OSS 20B',
      provider: 'groq',
      category: 'general',
      context_window: 16384,
      max_output_tokens: 4096,
      speed_rating: 'fast',
      quality_rating: 'medium',
      cost_per_million_input: 0.10,
      cost_per_million_output: 0.30,
      score_general_chat: 7,
      score_coding: 6,
      score_creative_writing: 7,
      score_reasoning: 6,
      score_summarization: 7,
      score_translation: 7,
      tier_free: true,
      tier_pro: true,
      tier_business: true,
      is_active: true,
      is_default_free: true,
      is_default_pro: false,
      priority_order: 1,
      requests_per_minute: 30,
      tokens_per_minute: 6000,
    },
    {
      id: 'llama-3.3-70b-versatile',
      display_name: 'Llama 3.3 70B',
      provider: 'groq',
      category: 'reasoning',
      context_window: 131072,
      max_output_tokens: 32768,
      speed_rating: 'fast',
      quality_rating: 'high',
      cost_per_million_input: 0.59,
      cost_per_million_output: 0.79,
      score_general_chat: 9,
      score_coding: 8,
      score_creative_writing: 8,
      score_reasoning: 9,
      score_summarization: 9,
      score_translation: 8,
      tier_free: false,
      tier_pro: true,
      tier_business: true,
      is_active: true,
      is_default_free: false,
      is_default_pro: true,
      priority_order: 2,
      requests_per_minute: 30,
      tokens_per_minute: 6000,
    }
  ]
}

// Get cached models
async function getModels(): Promise<GroqModel[]> {
  if (modelsCache && Date.now() - modelsCacheTime < MODELS_CACHE_TTL) {
    return modelsCache
  }
  modelsCache = await fetchModelsFromDb()
  modelsCacheTime = Date.now()
  return modelsCache
}

// Detect task type from the user's message
export function detectTaskType(messages: Message[]): TaskType {
  if (messages.length === 0) return 'general_chat'

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
  if (!lastUserMessage) return 'general_chat'

  const content = lastUserMessage.content.toLowerCase()

  // Coding detection
  const codingKeywords = [
    'code', 'function', 'bug', 'error', 'debug', 'program', 'script',
    'api', 'database', 'sql', 'html', 'css', 'javascript', 'python',
    'typescript', 'react', 'node', 'algorithm', 'class', 'method',
    'variable', 'array', 'object', 'import', 'export', 'npm',
    'compile', 'runtime', 'syntax', 'fix this', 'write a function',
    'implement', 'refactor', 'optimize'
  ]
  if (codingKeywords.some(kw => content.includes(kw))) {
    return 'coding'
  }

  // Creative writing detection
  const creativeKeywords = [
    'write a story', 'poem', 'creative', 'blog post', 'article',
    'essay', 'content', 'write about', 'draft', 'compose',
    'marketing copy', 'social media post', 'caption', 'tagline',
    'email template', 'newsletter'
  ]
  if (creativeKeywords.some(kw => content.includes(kw))) {
    return 'creative_writing'
  }

  // Reasoning/math detection
  const reasoningKeywords = [
    'explain why', 'analyze', 'compare', 'evaluate', 'calculate',
    'math', 'logic', 'prove', 'solve', 'equation', 'formula',
    'probability', 'statistics', 'reason', 'think step by step',
    'what if', 'pros and cons', 'decision'
  ]
  if (reasoningKeywords.some(kw => content.includes(kw))) {
    return 'reasoning'
  }

  // Summarization detection
  const summarizeKeywords = [
    'summarize', 'summary', 'tldr', 'key points', 'brief',
    'condense', 'shorten', 'main ideas', 'overview', 'recap'
  ]
  if (summarizeKeywords.some(kw => content.includes(kw))) {
    return 'summarization'
  }

  // Translation detection
  const translationKeywords = [
    'translate', 'translation', 'hindi', 'tamil', 'telugu',
    'bengali', 'marathi', 'gujarati', 'kannada', 'malayalam',
    'punjabi', 'urdu', 'in english', 'to english', 'language'
  ]
  if (translationKeywords.some(kw => content.includes(kw))) {
    return 'translation'
  }

  return 'general_chat'
}

// Get the score field name for a task type
function getScoreField(taskType: TaskType): keyof GroqModel {
  const scoreMap: Record<TaskType, keyof GroqModel> = {
    general_chat: 'score_general_chat',
    coding: 'score_coding',
    creative_writing: 'score_creative_writing',
    reasoning: 'score_reasoning',
    summarization: 'score_summarization',
    translation: 'score_translation',
  }
  return scoreMap[taskType]
}

// Select the best model for a given task and subscription tier
export async function selectModel(
  messages: Message[],
  tier: SubscriptionTier
): Promise<{ modelId: string; model: GroqModel; taskType: TaskType }> {
  const models = await getModels()
  const taskType = detectTaskType(messages)
  const scoreField = getScoreField(taskType)

  // Filter by tier access
  const tierField = `tier_${tier}` as keyof GroqModel
  const availableModels = models.filter(m => m[tierField] === true && m.is_active)

  if (availableModels.length === 0) {
    // Fallback to any active model
    const fallback = models.find(m => m.is_active) || getFallbackModels()[0]
    return { modelId: fallback.id, model: fallback, taskType }
  }

  // Sort by: score for task (desc), then cost (asc for free, less important for paid), then priority_order (asc)
  const sorted = [...availableModels].sort((a, b) => {
    const scoreA = a[scoreField] as number
    const scoreB = b[scoreField] as number

    // Primary: best score for the task
    if (scoreB !== scoreA) return scoreB - scoreA

    // Secondary: for free tier, prefer cheaper models; for paid, prefer quality
    if (tier === 'free') {
      const costA = a.cost_per_million_input + a.cost_per_million_output
      const costB = b.cost_per_million_input + b.cost_per_million_output
      if (costA !== costB) return costA - costB
    } else {
      // For paid users, prefer higher quality rating
      const qualityOrder = { high: 3, medium: 2, basic: 1 }
      const qA = qualityOrder[a.quality_rating]
      const qB = qualityOrder[b.quality_rating]
      if (qB !== qA) return qB - qA
    }

    // Tertiary: priority order
    return a.priority_order - b.priority_order
  })

  const selected = sorted[0]
  return { modelId: selected.id, model: selected, taskType }
}

// Get the default model for a tier (when no task detection needed)
export async function getDefaultModel(tier: SubscriptionTier): Promise<GroqModel> {
  const models = await getModels()

  if (tier === 'free') {
    const defaultFree = models.find(m => m.is_default_free && m.is_active)
    if (defaultFree) return defaultFree
  } else {
    const defaultPro = models.find(m => m.is_default_pro && m.is_active)
    if (defaultPro) return defaultPro
  }

  // Fallback
  const tierField = `tier_${tier}` as keyof GroqModel
  const available = models.filter(m => m[tierField] === true && m.is_active)
  return available[0] || getFallbackModels()[0]
}

// Get max tokens for the selected model
export async function getModelMaxTokens(
  messages: Message[],
  tier: SubscriptionTier
): Promise<number> {
  const { model } = await selectModel(messages, tier)
  return model.max_output_tokens
}

// Clear the models cache (useful after admin updates)
export function clearModelsCache(): void {
  modelsCache = null
  modelsCacheTime = 0
}

// Get all available models for display (e.g., in settings UI)
export async function getAvailableModels(tier: SubscriptionTier): Promise<GroqModel[]> {
  const models = await getModels()
  const tierField = `tier_${tier}` as keyof GroqModel
  return models.filter(m => m[tierField] === true && m.is_active)
}
