-- 💾 UP: applied when you run `drizzle-kit migrate`
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS flask_trade_id INTEGER,
  ADD COLUMN IF NOT EXISTS metadata      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 🔙 DOWN: rollback
ALTER TABLE trades
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS flask_trade_id;
