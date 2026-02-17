-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION SQL — Feedback Loop GhostNeural
-- ─────────────────────────────────────────────────────────────────────────────
-- Ajoute les colonnes nécessaires pour tracker les performances email
-- et alimenter le feedback loop automatique
-- ─────────────────────────────────────────────────────────────────────────────

-- Métadonnées d'envoi email
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS resend_email_id TEXT;

-- Métadonnées de l'email envoyé (pour analytics)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_variante CHAR(1); -- A, B, ou C
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_framework TEXT;   -- PAS, AIDA, Pattern Interrupt
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_angle TEXT;       -- angle_approche du Stratège
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_ton TEXT;         -- ton_recommande
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_qualite_score INTEGER; -- score du Critique

-- Tracking des événements Resend (via webhook)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_opened_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_clicked_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_bounced_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_complained_at TIMESTAMPTZ;

-- Tracking manuel de la réponse (à remplir manuellement dans War Room)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reply_positive BOOLEAN; -- true = intéressé, false = refus

-- Index pour accélérer les requêtes analytics
CREATE INDEX IF NOT EXISTS idx_leads_sent_at ON leads(sent_at);
CREATE INDEX IF NOT EXISTS idx_leads_secteur_sent ON leads(secteur, sent_at);
CREATE INDEX IF NOT EXISTS idx_leads_resend_email_id ON leads(resend_email_id);

-- Vue analytics pour le feedback loop
CREATE OR REPLACE VIEW email_performance AS
SELECT
  secteur,
  email_variante,
  email_framework,
  email_angle,
  email_ton,
  COUNT(*) as total_sent,
  COUNT(email_opened_at) as total_opened,
  COUNT(email_clicked_at) as total_clicked,
  COUNT(replied_at) as total_replied,
  COUNT(CASE WHEN reply_positive = true THEN 1 END) as total_positive,
  ROUND(100.0 * COUNT(email_opened_at) / NULLIF(COUNT(*), 0), 2) as open_rate,
  ROUND(100.0 * COUNT(email_clicked_at) / NULLIF(COUNT(*), 0), 2) as click_rate,
  ROUND(100.0 * COUNT(replied_at) / NULLIF(COUNT(*), 0), 2) as reply_rate,
  ROUND(100.0 * COUNT(CASE WHEN reply_positive = true THEN 1 END) / NULLIF(COUNT(replied_at), 0), 2) as positive_rate
FROM leads
WHERE sent_at IS NOT NULL
  AND sent_at > NOW() - INTERVAL '30 days' -- Seulement les 30 derniers jours
GROUP BY secteur, email_variante, email_framework, email_angle, email_ton;

COMMENT ON VIEW email_performance IS 'Vue analytics pour identifier les winners du feedback loop';
