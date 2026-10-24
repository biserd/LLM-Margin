INSERT INTO users (id,email,created_at,plan) VALUES ('test-user-a','quote-a@example.invalid','2026-10-24T00:00:00.000Z','free') ON CONFLICT(id) DO NOTHING;
INSERT INTO users (id,email,created_at,plan) VALUES ('test-user-b','quote-b@example.invalid','2026-10-24T00:00:00.000Z','free') ON CONFLICT(id) DO NOTHING;
INSERT INTO users (id,email,created_at,plan,subscription_status) VALUES ('test-user-pro','quote-pro@example.invalid','2026-10-24T00:00:00.000Z','pro','active') ON CONFLICT(id) DO NOTHING;
