import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Defensive check to avoid runtime crash if env vars are missing or placeholders
const isUrlValid = supabaseUrl.startsWith('http') && !supabaseUrl.includes('your-project-url')

export const supabase = isUrlValid 
  ? createClient(supabaseUrl, supabaseKey)
  : {
      from: () => ({
        select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        insert: () => Promise.resolve({ data: [{ id: 'mock' }], error: null }),
        update: () => Promise.resolve({ data: [], error: null }),
      }),
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) }
    } as any

if (!isUrlValid) {
  console.warn("⚠️ Supabase URL is missing or invalid. Check your .env.local file. UI will run in mock mode.")
}
