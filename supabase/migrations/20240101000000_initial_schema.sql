-- Initial Schema for GhostAgency.ai

-- 1. Table for Leads
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    secteur TEXT NOT NULL,
    ville TEXT NOT NULL,
    site_web TEXT,
    email TEXT,
    score_audit INTEGER,
    audit_data JSONB,
    proposition_data JSONB,
    email_objet TEXT,
    email_body TEXT,
    status TEXT DEFAULT 'sourced', -- sourced, enriched, audited, email_ready, sent, responded
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ
);

-- 2. Table for Opt-Outs
CREATE TABLE IF NOT EXISTS opt_outs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    reason TEXT,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table for Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id),
    email TEXT NOT NULL,
    subject TEXT,
    status TEXT, -- sent, opened, clicked, replied, bounced
    lemlist_campaign_id TEXT,
    lemlist_email_id TEXT,
    sent_at TIMESTAMPTZ DEFAULT now(),
    opened_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ
);

-- Index for searching
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_opt_outs_email ON opt_outs(email);
