-- Migration: Add screenshot_url to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
