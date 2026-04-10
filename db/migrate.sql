-- ============================================================
-- PRECIFICA FÁCIL — Migration: tabela de assinaturas
-- Execute este script no painel Vercel Postgres (Data → Query)
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id          TEXT PRIMARY KEY,
  plan             TEXT NOT NULL CHECK (plan IN ('monthly', 'annual')),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  valid_until      TIMESTAMPTZ NOT NULL,
  stripe_session_id TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para buscas rápidas por status ativo
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions (status, valid_until);
