-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION : CLOSING PIPELINE V7
-- Ajout du module de qualification commerciale (BANT light)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS commercial_status JSONB DEFAULT '{"budget_validated": false, "authority_confirmed": false, "timing_confirmed": false}';

-- Commentaire pour documentation
COMMENT ON COLUMN leads.commercial_status IS 'Statut de qualification BANT : budget, autorité, timing';
