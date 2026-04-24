USE vivk;

INSERT INTO plans (id, name, price, price_display, daily_message_limit, ai_model, chat_history_days, api_access, team_features, priority_support, features, is_popular, sort_order) VALUES
('free', 'Free', 0, '₹0', 20, 'haiku', 7, 0, 0, 0, '["20 messages per day", "Claude Haiku AI model", "7-day chat history", "Basic support"]', 0, 1),
('pro', 'Pro', 99900, '₹999', -1, 'sonnet', -1, 0, 0, 1, '["Unlimited messages", "Claude Sonnet AI model", "Unlimited chat history", "Priority support", "Export conversations"]', 1, 2),
('business', 'Business', 499900, '₹4,999', -1, 'sonnet', -1, 1, 1, 1, '["Everything in Pro", "API access", "Team collaboration", "Custom integrations", "Dedicated support", "Advanced analytics"]', 0, 3)
ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), price_display=VALUES(price_display), daily_message_limit=VALUES(daily_message_limit), ai_model=VALUES(ai_model), chat_history_days=VALUES(chat_history_days), api_access=VALUES(api_access), team_features=VALUES(team_features), priority_support=VALUES(priority_support), features=VALUES(features), is_popular=VALUES(is_popular), sort_order=VALUES(sort_order);
