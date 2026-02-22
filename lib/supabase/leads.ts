import { supabaseAdmin } from './admin';

/**
 * Service: Gestion des Leads (GhostAgency v2)
 * Rôle: Déduplication, Blacklistage et gestion des statuts de séquence.
 */

export async function checkLeadExists(website: string): Promise<boolean> {
  const cleanUrl = website.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id')
    .filter('site_web', 'ilike', `%${cleanUrl}%`)
    .limit(1);

  if (error) return false;
  return data && data.length > 0;
}

export async function isBlacklisted(email: string): Promise<boolean> {
  if (!email) return false;
  
  const { data, error } = await supabaseAdmin
    .from('blacklist')
    .select('id')
    .eq('email', email)
    .single();

  return !!data;
}

export async function addToBlacklist(email: string, raison: string = 'Opt-out manual') {
  const { error } = await supabaseAdmin
    .from('blacklist')
    .insert([{ email, raison, added_at: new Date().toISOString() }]);

  if (error) console.error('[DB] Blacklist error:', error);
}

export async function updateLeadSequence(leadId: string, step: number) {
  const { error } = await supabaseAdmin
    .from('leads')
    .update({ 
      sequence_step: step, 
      last_engagement_at: new Date().toISOString() 
    })
    .eq('id', leadId);

  if (error) console.error('[DB] Update sequence error:', error);
}
