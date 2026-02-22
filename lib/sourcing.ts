import { supabaseAdmin } from './supabase/admin';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// VILLES 06
// ─────────────────────────────────────────────────────────────────────────────
const VILLES_06 = [
  'Nice', 'Cannes', 'Antibes', 'Grasse', 'Menton',
  'Cagnes-sur-Mer', 'Sophia Antipolis', 'Valbonne',
  'Mougins', 'Mandelieu', 'Villeneuve-Loubet'
];

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMIT — Exponential backoff
// ─────────────────────────────────────────────────────────────────────────────
async function fetchWithRetry(url: string, retries = 3, delay = 500): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status === 'OVER_QUERY_LIMIT') {
        console.warn(`[Chasseur] ⚠️ Rate limit Google — attente ${delay * 2}ms`);
        await new Promise(r => setTimeout(r, delay * 2));
        delay *= 2;
        continue;
      }

      return data;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE PLACES — Text Search
// ─────────────────────────────────────────────────────────────────────────────
async function searchGooglePlaces(query: string, location: string): Promise<any[]> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' ' + location)}&language=fr&region=fr&key=${GOOGLE_PLACES_API_KEY}`;
  const data = await fetchWithRetry(url);

  if (!data || data.status !== 'OK') {
    console.error('[Chasseur] Places error:', data?.status, data?.error_message);
    return [];
  }

  return data.results || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE PLACES — Details
// ─────────────────────────────────────────────────────────────────────────────
async function getPlaceDetails(placeId: string): Promise<any> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,website,formatted_phone_number,formatted_address,rating,user_ratings_total&language=fr&key=${GOOGLE_PLACES_API_KEY}`;
  const data = await fetchWithRetry(url);
  return data?.result || {};
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL EXTRACTION — Multi-page
// ─────────────────────────────────────────────────────────────────────────────
const EMAIL_BLACKLIST = ['noreply', 'no-reply', 'wordpress', 'example', 'test', 'privacy', 'sentry', 'wix', 'squarespace'];
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GhostNeural/1.0)' }
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

function extractEmailFromHtml(html: string): string | null {
  const matches = html.match(EMAIL_REGEX);
  if (!matches) return null;
  return matches.find(e => !EMAIL_BLACKLIST.some(b => e.toLowerCase().includes(b))) || null;
}

async function extractEmailFromWebsite(website: string): Promise<string | null> {
  const base = website.startsWith('http') ? website : `https://${website}`;
  const pagesToTry = [
    base,
    `${base}/contact`,
    `${base}/contactez-nous`,
    `${base}/mentions-legales`,
    `${base}/nous-contacter`,
  ];

  for (const url of pagesToTry) {
    const html = await fetchPageText(url);
    if (!html) continue;
    const email = extractEmailFromHtml(html);
    if (email) {
      console.log(`[Chasseur] 📧 Email trouvé sur ${url}: ${email}`);
      return email;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING URGENCE — Priorisation business
// ─────────────────────────────────────────────────────────────────────────────
function computeUrgencyScore(details: any): number {
  let score = 0;

  // Site présent = potentiel améliorable
  if (details.website) score += 10;

  // Note faible = site probablement mauvais
  if (details.rating && details.rating < 4.0) score += 20;
  else if (details.rating && details.rating < 4.3) score += 10;

  // Peu d'avis = faible autorité digitale
  if (details.user_ratings_total && details.user_ratings_total < 30) score += 20;
  else if (details.user_ratings_total && details.user_ratings_total < 100) score += 10;

  // Email trouvé = contactable directement
  if (details.email) score += 15;

  return Math.min(score, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// DÉDUPLICATION — Check DB
// ─────────────────────────────────────────────────────────────────────────────
async function isAlreadyInDB(siteWeb: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('site_web', siteWeb)
      .limit(1);
    return (data?.length || 0) > 0;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHASSEUR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export const sourcing = {
  async getLeads(ville: string, secteur: string, count: number = 10) {
    console.log(`\n[Chasseur] 🔍 START — ${secteur} | ${ville} | ${count} leads`);

    const villes = (ville === '06' || ville.toLowerCase().includes('alpes-maritimes'))
      ? VILLES_06
      : [ville];

    const allLeads: any[] = [];

    for (const v of villes) {
      if (allLeads.length >= count) break;

      console.log(`[Chasseur] 📍 Scan ${v}...`);
      const results = await searchGooglePlaces(secteur, v);

      // Filtre : uniquement les résultats avec un site web
      const filtered = results.filter(r => r.website || true); // on vérifie dans details

      for (const place of filtered.slice(0, 8)) {
        if (allLeads.length >= count) break;

        try {
          const details = await getPlaceDetails(place.place_id);

          // Skip sans site web
          if (!details.website) {
            console.log(`[Chasseur] ⏭ Skip ${place.name} — pas de site`);
            continue;
          }

          // Skip si déjà en DB
          const exists = await isAlreadyInDB(details.website);
          if (exists) {
            console.log(`[Chasseur] ⏭ Skip ${place.name} — déjà en DB`);
            continue;
          }

          // Extraction email multi-page
          const email = await extractEmailFromWebsite(details.website);

          // Score urgence
          const urgency_seed_score = computeUrgencyScore({ ...details, email });

          const lead = {
            nom:               details.name || place.name,
            site_web:          details.website,
            email:             email,
            ville:             v,
            secteur:           secteur,
            telephone:         details.formatted_phone_number || null,
            adresse:           details.formatted_address || null,
            note_google:       details.rating || null,
            nb_avis:           details.user_ratings_total || null,
            urgency_seed_score,
            source:            'google_places',
          };

          console.log(`[Chasseur] ✅ ${lead.nom} | score urgence: ${urgency_seed_score} | email: ${email || 'non trouvé'}`);
          
          // 💾 Auto-insertion in Supabase
          try {
            await supabaseAdmin
              .from('leads')
              .upsert({
                nom: lead.nom,
                site_web: lead.site_web,
                email: lead.email,
                secteur: lead.secteur,
                ville: lead.ville,
                telephone: lead.telephone,
                adresse: lead.adresse,
                note_google: lead.note_google,
                nb_avis: lead.nb_avis,
                urgency_seed_score: lead.urgency_seed_score,
                source: lead.source,
                status: 'new'
              }, { onConflict: 'site_web' });
            console.log(`[Chasseur] 💾 Lead sauvegardé: ${lead.nom}`);
          } catch (e) {
            console.error(`[Chasseur] ❌ Erreur insertion ${lead.nom}:`, e);
          }

          allLeads.push(lead);

          // Pause polie entre chaque lead
          await new Promise(r => setTimeout(r, 500));

        } catch (e) {
          console.error(`[Chasseur] ⚠️ Erreur ${place.name}:`, e);
        }
      }

      // Pause entre villes
      await new Promise(r => setTimeout(r, 800));
    }

    // Trier par score urgence décroissant
    allLeads.sort((a, b) => b.urgency_seed_score - a.urgency_seed_score);

    console.log(`[Chasseur] 🎯 DONE — ${allLeads.length} leads | Top score: ${allLeads[0]?.urgency_seed_score || 0}`);
    return allLeads;
  }
};