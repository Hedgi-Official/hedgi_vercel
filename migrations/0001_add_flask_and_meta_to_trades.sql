-- 💾 UP: applied when you run `drizzle-kit migrate`
ALTER TABLE trades
  ADD COLUMN flask_trade_id INTEGER,
  ADD COLUMN metadata      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 🔙 DOWN: rollback
ALTER TABLE trades
  DROP COLUMN flask_trade_id,
  DROP COLUMN metadata,
  DROP COLUMN created_at,
  DROP COLUMN updated_at;
