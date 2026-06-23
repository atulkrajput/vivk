USE vivk;

-- Groq models table: stores all available Groq models with capabilities and routing rules
CREATE TABLE IF NOT EXISTS groq_models (
  id VARCHAR(100) NOT NULL PRIMARY KEY COMMENT 'Model ID used in API calls e.g. llama-3.3-70b-versatile',
  display_name VARCHAR(100) NOT NULL COMMENT 'Human-readable name',
  provider VARCHAR(50) NOT NULL DEFAULT 'groq' COMMENT 'Provider name',
  
  -- Capability categories (what the model is good at)
  category ENUM('general', 'coding', 'creative', 'reasoning', 'fast', 'vision') NOT NULL DEFAULT 'general',
  
  -- Performance characteristics
  context_window INT NOT NULL DEFAULT 8192 COMMENT 'Max context window in tokens',
  max_output_tokens INT NOT NULL DEFAULT 1024 COMMENT 'Max output tokens',
  speed_rating ENUM('ultra_fast', 'fast', 'moderate') NOT NULL DEFAULT 'fast' COMMENT 'Relative speed',
  quality_rating ENUM('high', 'medium', 'basic') NOT NULL DEFAULT 'medium' COMMENT 'Output quality tier',
  
  -- Cost optimization
  cost_per_million_input DECIMAL(10, 4) NOT NULL DEFAULT 0 COMMENT 'Cost per 1M input tokens in USD',
  cost_per_million_output DECIMAL(10, 4) NOT NULL DEFAULT 0 COMMENT 'Cost per 1M output tokens in USD',
  
  -- Task suitability scores (1-10, higher = better)
  score_general_chat INT NOT NULL DEFAULT 5,
  score_coding INT NOT NULL DEFAULT 5,
  score_creative_writing INT NOT NULL DEFAULT 5,
  score_reasoning INT NOT NULL DEFAULT 5,
  score_summarization INT NOT NULL DEFAULT 5,
  score_translation INT NOT NULL DEFAULT 5,
  
  -- Subscription tier access
  tier_free TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Available to free users',
  tier_pro TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Available to pro users',
  tier_business TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Available to business users',
  
  -- Status
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_default_free TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Default model for free tier',
  is_default_pro TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Default model for pro tier',
  priority_order INT NOT NULL DEFAULT 10 COMMENT 'Lower = preferred when scores are equal',
  
  -- Rate limits
  requests_per_minute INT NOT NULL DEFAULT 30 COMMENT 'RPM limit for this model',
  tokens_per_minute INT NOT NULL DEFAULT 6000 COMMENT 'TPM limit for this model',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_groq_models_category (category),
  INDEX idx_groq_models_active (is_active),
  INDEX idx_groq_models_tier_free (tier_free, is_active),
  INDEX idx_groq_models_default (is_default_free, is_default_pro)
) ENGINE=InnoDB;

-- Seed with available Groq models (pricing and specs as of 2024)
INSERT INTO groq_models (
  id, display_name, provider, category, context_window, max_output_tokens,
  speed_rating, quality_rating,
  cost_per_million_input, cost_per_million_output,
  score_general_chat, score_coding, score_creative_writing, score_reasoning, score_summarization, score_translation,
  tier_free, tier_pro, tier_business,
  is_active, is_default_free, is_default_pro, priority_order,
  requests_per_minute, tokens_per_minute
) VALUES

-- GPT-OSS 20B (OpenAI open-source via Groq - great balance of speed and quality)
('openai/gpt-oss-20b', 'GPT-OSS 20B', 'groq', 'general', 16384, 4096,
 'fast', 'medium',
 0.10, 0.30,
 7, 6, 7, 6, 7, 7,
 1, 1, 1,
 1, 1, 0, 1,
 30, 6000),

-- Llama 3.3 70B Versatile (best overall quality on Groq)
('llama-3.3-70b-versatile', 'Llama 3.3 70B', 'groq', 'reasoning', 131072, 32768,
 'fast', 'high',
 0.59, 0.79,
 9, 8, 8, 9, 9, 8,
 0, 1, 1,
 1, 0, 1, 2,
 30, 6000),

-- Llama 3.1 8B Instant (ultra fast, good for simple tasks)
('llama-3.1-8b-instant', 'Llama 3.1 8B', 'groq', 'fast', 131072, 8192,
 'ultra_fast', 'basic',
 0.05, 0.08,
 5, 4, 5, 4, 6, 5,
 1, 1, 1,
 1, 0, 0, 5,
 30, 6000),

-- Llama 4 Maverick (latest, strong reasoning)
('meta-llama/llama-4-maverick-17b-128e-instruct', 'Llama 4 Maverick', 'groq', 'reasoning', 131072, 8192,
 'fast', 'high',
 0.20, 0.60,
 8, 7, 7, 9, 8, 7,
 0, 1, 1,
 1, 0, 0, 3,
 30, 6000),

-- Llama 4 Scout (compact but capable)
('meta-llama/llama-4-scout-17b-16e-instruct', 'Llama 4 Scout', 'groq', 'general', 131072, 8192,
 'fast', 'medium',
 0.11, 0.34,
 7, 6, 6, 7, 7, 6,
 1, 1, 1,
 1, 0, 0, 4,
 30, 6000),

-- Qwen QWQ 32B (excellent for math and reasoning)
('qwen-qwq-32b', 'Qwen QWQ 32B', 'groq', 'reasoning', 131072, 16384,
 'fast', 'high',
 0.29, 0.39,
 7, 8, 6, 10, 7, 6,
 0, 1, 1,
 1, 0, 0, 6,
 30, 6000),

-- DeepSeek R1 Distill Llama 70B (strong coding and reasoning)
('deepseek-r1-distill-llama-70b', 'DeepSeek R1 70B', 'groq', 'coding', 131072, 16384,
 'moderate', 'high',
 0.75, 0.99,
 7, 9, 6, 9, 7, 5,
 0, 1, 1,
 1, 0, 0, 7,
 30, 6000),

-- Gemma 2 9B (good for general tasks, efficient)
('gemma2-9b-it', 'Gemma 2 9B', 'groq', 'general', 8192, 4096,
 'ultra_fast', 'medium',
 0.20, 0.20,
 6, 5, 6, 5, 6, 6,
 1, 1, 1,
 1, 0, 0, 8,
 30, 15000),

-- Mistral Saba 24B (multilingual, good for Indian languages)
('mistral-saba-24b', 'Mistral Saba 24B', 'groq', 'general', 32768, 8192,
 'fast', 'medium',
 0.20, 0.60,
 7, 5, 7, 6, 7, 9,
 1, 1, 1,
 1, 0, 0, 9,
 30, 6000)

ON DUPLICATE KEY UPDATE 
  display_name=VALUES(display_name),
  category=VALUES(category),
  context_window=VALUES(context_window),
  max_output_tokens=VALUES(max_output_tokens),
  speed_rating=VALUES(speed_rating),
  quality_rating=VALUES(quality_rating),
  cost_per_million_input=VALUES(cost_per_million_input),
  cost_per_million_output=VALUES(cost_per_million_output),
  score_general_chat=VALUES(score_general_chat),
  score_coding=VALUES(score_coding),
  score_creative_writing=VALUES(score_creative_writing),
  score_reasoning=VALUES(score_reasoning),
  score_summarization=VALUES(score_summarization),
  score_translation=VALUES(score_translation),
  tier_free=VALUES(tier_free),
  tier_pro=VALUES(tier_pro),
  tier_business=VALUES(tier_business),
  is_active=VALUES(is_active),
  is_default_free=VALUES(is_default_free),
  is_default_pro=VALUES(is_default_pro),
  priority_order=VALUES(priority_order),
  requests_per_minute=VALUES(requests_per_minute),
  tokens_per_minute=VALUES(tokens_per_minute);

-- Update the free plan to reference groq
UPDATE plans SET ai_model = 'groq', features = '["20 messages per day", "Groq AI (Fast)", "7-day chat history", "Basic support"]' WHERE id = 'free';
