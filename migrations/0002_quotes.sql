CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  input_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX quotes_user_updated ON quotes(user_id, updated_at DESC);
CREATE TABLE quote_purchases (
  quote_id TEXT PRIMARY KEY REFERENCES quotes(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  checkout_session_id TEXT NOT NULL UNIQUE,
  payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  paid_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX quote_purchases_payment ON quote_purchases(payment_intent_id);
CREATE TABLE quote_payment_reversals (
  payment_intent_id TEXT PRIMARY KEY,
  reversed_at TEXT NOT NULL
);
CREATE TABLE quote_checkout_attempts (
  quote_id TEXT PRIMARY KEY REFERENCES quotes(id),
  attempt_id TEXT NOT NULL,
  checkout_session_id TEXT,
  expires_at INTEGER NOT NULL
);
