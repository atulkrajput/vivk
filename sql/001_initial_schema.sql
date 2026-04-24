-- VIVK MVP Database Schema for MySQL
-- Compatible with MySQL 5.7+

CREATE DATABASE IF NOT EXISTS vivk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vivk;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(20) NOT NULL DEFAULT '',
  country_code VARCHAR(5) NOT NULL DEFAULT '+91',
  address TEXT NULL,
  email_verified TINYINT(1) DEFAULT 0,
  subscription_tier ENUM('free', 'pro', 'business') DEFAULT 'free',
  subscription_status ENUM('active', 'cancelled', 'expired', 'pending') DEFAULT 'active',
  subscription_id VARCHAR(255) NULL,
  subscription_expires_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_users_email (email),
  INDEX idx_users_subscription_tier (subscription_tier)
) ENGINE=InnoDB;

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) DEFAULT 'New Conversation',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_conversations_user_id (user_id),
  INDEX idx_conversations_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  tokens INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_messages_conversation_id (conversation_id),
  INDEX idx_messages_created_at (created_at),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Usage logs table
CREATE TABLE IF NOT EXISTS usage_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  message_count INT DEFAULT 0,
  tokens_used INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (user_id, date),
  INDEX idx_usage_logs_date (date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  razorpay_subscription_id VARCHAR(255) NULL,
  plan_id ENUM('free', 'pro', 'business') NOT NULL,
  status ENUM('active', 'cancelled', 'expired', 'pending') NOT NULL,
  current_period_start DATETIME NULL,
  current_period_end DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_razorpay_sub (razorpay_subscription_id),
  INDEX idx_subscriptions_user_id (user_id),
  INDEX idx_subscriptions_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  razorpay_payment_id VARCHAR(255) NULL,
  amount INT NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_razorpay_pay (razorpay_payment_id),
  INDEX idx_payments_user_id (user_id),
  INDEX idx_payments_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Plans table (single source of truth for plan configuration)
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(20) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price INT NOT NULL DEFAULT 0 COMMENT 'Price in paise',
  price_display VARCHAR(20) NOT NULL DEFAULT '₹0',
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  billing_interval ENUM('month', 'year') DEFAULT 'month',
  daily_message_limit INT NOT NULL DEFAULT 20 COMMENT '-1 for unlimited',
  ai_model VARCHAR(20) NOT NULL DEFAULT 'haiku',
  chat_history_days INT NOT NULL DEFAULT 7 COMMENT '-1 for unlimited',
  api_access TINYINT(1) NOT NULL DEFAULT 0,
  team_features TINYINT(1) NOT NULL DEFAULT 0,
  priority_support TINYINT(1) NOT NULL DEFAULT 0,
  features JSON NULL COMMENT 'Array of feature strings for display',
  is_popular TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  razorpay_plan_id VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed default plans
INSERT INTO plans (id, name, price, price_display, daily_message_limit, ai_model, chat_history_days, api_access, team_features, priority_support, features, is_popular, sort_order) VALUES
('free', 'Free', 0, '₹0', 20, 'haiku', 7, 0, 0, 0, '["20 messages per day", "Claude Haiku AI model", "7-day chat history", "Basic support"]', 0, 1),
('pro', 'Pro', 99900, '₹999', -1, 'sonnet', -1, 0, 0, 1, '["Unlimited messages", "Claude Sonnet AI model", "Unlimited chat history", "Priority support", "Export conversations"]', 1, 2),
('business', 'Business', 499900, '₹4,999', -1, 'sonnet', -1, 1, 1, 1, '["Everything in Pro", "API access", "Team collaboration", "Custom integrations", "Dedicated support", "Advanced analytics"]', 0, 3)
ON DUPLICATE KEY UPDATE name=VALUES(name);