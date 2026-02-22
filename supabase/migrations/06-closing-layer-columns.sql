-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION : CLOSING LAYER (V5)
-- Ajout des colonnes pour le potentiel business et les devis auto
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS business_potential_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_deal_value INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS closer_output JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS proposal_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS funnel_stage TEXT DEFAULT 'lead';

-- Indexation pour la War Room Commerciale
CREATE INDEX IF NOT EXISTS idx_leads_business_potential ON leads (business_potential_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_funnel_stage ON leads (funnel_stage);
