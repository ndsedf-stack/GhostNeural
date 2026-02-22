-- Migration pour Chasseur V2 — Sourcing Google Places & Urgency Scoring
-- Ajoute les colonnes nécessaires pour stocker les métadonnées Google Places et le score initial d'urgence

ALTER TABLE leads ADD COLUMN IF NOT EXISTS note_google DECIMAL(3,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nb_avis INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS urgency_seed_score INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS telephone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'google_places';

-- Index pour le tri par urgence
CREATE INDEX IF NOT EXISTS idx_leads_urgency_seed_score ON leads(urgency_seed_score);

COMMENT ON COLUMN leads.urgency_seed_score IS 'Score d''urgence calculé au sourcing (0-100) basé sur la présence digitale basique';
COMMENT ON COLUMN leads.note_google IS 'Note moyenne Google Maps';
COMMENT ON COLUMN leads.nb_avis IS 'Nombre total d''avis Google Maps';
