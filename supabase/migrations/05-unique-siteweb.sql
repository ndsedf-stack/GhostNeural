-- Ajout d'une contrainte unique sur site_web pour éviter les doublons
ALTER TABLE leads ADD CONSTRAINT leads_site_web_key UNIQUE (site_web);
