-- Migration pour Orchestrator V2 — Colonnes de tracking
-- Ajoute les colonnes nécessaires pour tracker les rejets et les étapes du pipeline

ALTER TABLE leads ADD COLUMN IF NOT EXISTS rejection_stage TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS raison_rejet TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS red_flags TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS green_flags TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS eclaireur_data JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS strategy JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archi_data JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS copywriting_data JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS critique_data JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_variante CHAR(1);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_framework TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_angle TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_ton TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_qualite_score INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_destinataire TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_draft TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_subject TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_final JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS eclaireur JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_duration_seconds INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priorite TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_audit INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_opportunite INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_qualite_email INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_objet TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_body TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS brain_reasoning TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS brain_synthesis TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS brain_hook TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS brain_ca_perdu TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS brain_note TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS brain_next_action TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS retries_used JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_completed_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS proposition_data JSONB;

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_leads_rejection_stage ON leads(rejection_stage);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_email_variante ON leads(email_variante);

COMMENT ON COLUMN leads.rejection_stage IS 'Étape où le lead a été rejeté (eclaireur, qualification, audit, critique, email)';
COMMENT ON COLUMN leads.raison_rejet IS 'Raison détaillée du rejet';
COMMENT ON COLUMN leads.score IS 'Score global du lead (0-100)';
COMMENT ON COLUMN leads.archi_data IS 'Données de l''agent Architecte';
COMMENT ON COLUMN leads.strategy IS 'Données de l''agent Stratège';
COMMENT ON COLUMN leads.email_destinataire IS 'Email du destinataire final';
