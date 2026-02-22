import { createClient } from '@supabase/supabase-js';

// Environment variables check with build-time fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

if ((!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️ Variables Supabase manquantes ou invalides dans l'environnement Vercel.");
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
