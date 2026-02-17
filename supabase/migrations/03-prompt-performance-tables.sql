-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE PROMPT_PERFORMANCE — Tracking des performances par angle/secteur
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prompt_performance (
  id SERIAL PRIMARY KEY,
  semaine TEXT NOT NULL,
  secteur TEXT NOT NULL,
  angle TEXT NOT NULL,
  framework TEXT NOT NULL,
  ton TEXT,
  nb_envoyes INTEGER DEFAULT 0,
  nb_ouverts INTEGER DEFAULT 0,
  nb_repondus INTEGER DEFAULT 0,
  nb_convertis INTEGER DEFAULT 0,
  score_moyen_audit INTEGER,
  taux_ouverture NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN nb_envoyes > 0 THEN ROUND(100.0 * nb_ouverts / nb_envoyes, 2) ELSE 0 END
  ) STORED,
  taux_reponse NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN nb_envoyes > 0 THEN ROUND(100.0 * nb_repondus / nb_envoyes, 2) ELSE 0 END
  ) STORED,
  exemples_gagnants JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(semaine, secteur, angle, framework)
);

COMMENT ON TABLE prompt_performance IS 'Performances hebdomadaires par angle/secteur pour le feedback loop';

-- Index pour requêtes analytics
CREATE INDEX IF NOT EXISTS idx_prompt_perf_semaine ON prompt_performance(semaine);
CREATE INDEX IF NOT EXISTS idx_prompt_perf_secteur ON prompt_performance(secteur);
CREATE INDEX IF NOT EXISTS idx_prompt_perf_taux_reponse ON prompt_performance(taux_reponse DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE OPT_OUTS — Gestion des désabonnements
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS opt_outs (
  email TEXT PRIMARY KEY,
  reason TEXT,
  source TEXT, -- 'email_reply', 'manual', 'webhook'
  opted_out_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE opt_outs IS 'Liste des emails qui ont demandé à ne plus être contactés';

CREATE INDEX IF NOT EXISTS idx_opt_outs_email ON opt_outs(email);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE STATS_DASHBOARD — Stockage clé-valeur pour config dynamique
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stats_dashboard (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE stats_dashboard IS 'Stockage des rapports winners et configs dynamiques';

-- Colonnes additionnelles pour leads (si pas déjà ajoutées)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_value NUMERIC(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_objet TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_body TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS replied_content TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_audit INTEGER;
