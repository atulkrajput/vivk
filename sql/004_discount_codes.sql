-- Discount codes (admin-created coupons) and their redemptions
-- The app also creates these tables on first use (src/lib/discounts.ts), so running this is optional.
USE vivk;

CREATE TABLE IF NOT EXISTS discount_codes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  description VARCHAR(255) NULL,
  discount_type ENUM('percent', 'flat') NOT NULL,
  discount_value INT NOT NULL COMMENT 'Percent (1-100) or paise',
  applicable_tier ENUM('all', 'pro', 'business') NOT NULL DEFAULT 'all',
  max_uses INT NULL COMMENT 'NULL for unlimited',
  max_uses_per_user INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  valid_from DATETIME NULL,
  valid_until DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_discount_codes_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  discount_code_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  order_id VARCHAR(255) NULL,
  status ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending',
  expires_at DATETIME NULL COMMENT 'When a pending reservation stops holding a use',
  subscription_tier VARCHAR(20) NOT NULL,
  original_amount INT NOT NULL,
  discount_amount INT NOT NULL,
  final_amount INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_discount_redemptions_order (order_id),
  INDEX idx_discount_redemptions_code_user (discount_code_id, user_id),
  FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE CASCADE
) ENGINE=InnoDB;
