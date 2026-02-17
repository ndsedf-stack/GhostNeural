-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE FEEDBACK WINNERS — Stockage des patterns gagnants
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback_winners (
  secteur TEXT PRIMARY KEY,
  variante CHAR(1) NOT NULL,
  framework TEXT NOT NULL,
  angle TEXT NOT NULL,
  ton TEXT NOT NULL,
  open_rate NUMERIC(5,2),
  reply_rate NUMERIC(5,2),
  positive_rate NUMERIC(5,2),
  total_sent INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE feedback_winners IS 'Winners hebdomadaires du feedback loop par secteur';

-- Index pour accès rapide par secteur
CREATE INDEX IF NOT EXISTS idx_feedback_winners_secteur ON feedback_winners(secteur);
