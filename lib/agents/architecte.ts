import { gemini, callLLMWithRetry } from '../llm-clients';
import { extractJsonSafe } from '../utils/json';
import { ARCHI_SYSTEM_PROMPT, ARCHI_USER_PROMPT_TEMPLATE } from '../prompts/architecte';
import { getWinningPattern } from '../knowledge/templates';

// ─────────────────────────────────────────────────────────────────────────────
// L'ARCHITECTE V4 — Phase 4 du Pipeline GhostNeural (Anti-Template)
// ─────────────────────────────────────────────────────────────────────────────

const SECTOR_TEMPLATES: Record<string, any> = {
  restaurant: {
    pages: ["Accueil", "Menu", "Réservation", "Histoire", "Contact"],
    cta_principal: "Réserver une table",
    hero_format: "Photo plat signature HD + Réservation",
    sections_obligatoires: ["Note Google", "Galerie HD", "Horaires"],
    style_recommande: "Chaleureux et premium",
    conversion_mechanic: "Visuel appétissant → Réservation immédiate"
  },
  // Deep fallback if LLM misses something
  default: {
    pages: ["Accueil", "Services", "Preuves", "Contact"],
    cta_principal: "Demander un devis",
    hero_format: "Proposition de valeur + CTA",
    sections_obligatoires: ["Confiance", "Services", "Contact"],
    style_recommande: "Professionnel et propre",
    conversion_mechanic: "Problème → Solution → Contact"
  }
};

function getSectorTemplate(sector: string) {
  const key = Object.keys(SECTOR_TEMPLATES).find(k =>
    sector.toLowerCase().includes(k)
  ) || 'default';
  return { key, ...SECTOR_TEMPLATES[key] };
}

export async function runArchitecteAgent(auditData: any, sector: string, city: string) {
  const template = getSectorTemplate(sector);
  const projectMode = auditData.score_global < 50 ? 'refonte_totale' : 'optimisation_ciblee';

  try {
    const winningPattern = getWinningPattern(sector);
    const userPrompt = ARCHI_USER_PROMPT_TEMPLATE(sector, city, auditData, winningPattern);

    let result = await callLLMWithRetry<any>(async () => {
      const model = gemini.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
          responseMimeType: "application/json",
        } as any
      });

      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: ARCHI_SYSTEM_PROMPT }] },
          { role: "model", parts: [{ text: "Compris. Je suis l'Architecte GhostNeural V4. Je transformerai l'audit en décisions structurelles 'Anti-Template' centrées sur la conversion business. Je réponds uniquement en JSON." }] }
        ]
      });

      const msg = await chat.sendMessage(userPrompt);
      const response = await msg.response;
      return response.text();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 🛡️ EMERGENCY FALLBACK — En cas de 429 Gemini (Quota épuisé)
    // ─────────────────────────────────────────────────────────────────────────
    if (!result) {
      console.warn("[Architecte V4] ⚠️ Gemini a échoué (quota ?). Tentative de secours via Anthropic...");
      const { anthropic } = await import('../llm-clients');
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001", // Unified Ghost Fallback
        max_tokens: 4000,
        system: ARCHI_SYSTEM_PROMPT + "\nRéponds UNIQUEMENT en JSON brut.",
        messages: [{ role: "user", content: userPrompt }]
      });

      result = response.content[0].type === 'text' ? response.content[0].text : '';
    }

    if (!result) throw new Error("Échec Architecte — réponse vide (Gemini & Anthropic)");

    const json = extractJsonSafe(result);
    if (!json) throw new Error("Échec Parsing JSON Architecte");

    // Mapping intelligent pour assurer la compatibilité UI + Nouveaux champs V4
    const finalOutput = {
      // ✅ Nouveaux champs V4 (Dashboard Pro)
      mode_projet:            json.mode_projet || projectMode,
      decision_majeure:       json.decision_majeure || "Refonte stratégique complète",
      priorites_techniques:   json.priorites_techniques || [],
      decisions_structurelles: json.decisions_structurelles || [],
      structure_cible:        json.structure_cible || json.arborescence || template.pages,
      wireframe_conceptuel:   json.wireframe_conceptuel || { hero: json.wireframe?.hero || template.hero_format },
      quick_wins:             json.quick_wins || [],
      impact_business_attendu: json.impact_business_attendu || "Gain de conversion immédiat",
      
      // 🔄 Legacy mapping (pour ne pas crash l'UI actuelle)
      arborescence:           json.structure_cible || json.arborescence || template.pages,
      wireframe: {
        hero:      json.wireframe_conceptuel?.hero || template.hero_format,
        section_2: json.wireframe_conceptuel?.section_preuve || "Réassurance clients",
        section_3: json.wireframe_conceptuel?.conversion_funnel || "CTA Final"
      },
      sections_cles:          json.decisions_structurelles || template.sections_obligatoires,
      proposition_valeur:     json.decision_majeure || `${sector} premium à ${city}`,
      cta:                    json.cta_final || template.cta_principal,
      style_visuel:           json.style_visuel || template.style_recommande,
      conversion_funnel:      json.wireframe_conceptuel?.conversion_funnel || template.conversion_mechanic,
      
      ameliorations_recommandees: {
        ux_ui:      json.decisions_structurelles || [],
        conversion: json.priorites_techniques || [],
        seo:        ["Optimisation sémantique locale", "Préchargement LCP"],
        contenu:    ["Storytelling métier", "Preuves sociales HD"],
        quick_wins: json.quick_wins || []
      },
      sector_template: template.key,
      processed_at: new Date().toISOString()
    };

    console.log(`[Architecte V4] Final Output for ${city}:`, JSON.stringify(finalOutput, null, 2));
    return finalOutput;

  } catch (error: any) {
    console.error("⚠️ Erreur Architecte V4:", error);
    return {
      mode_projet: projectMode,
      arborescence: template.pages,
      wireframe: { hero: template.hero_format },
      sections_cles: template.sections_obligatoires,
      proposition_valeur: `${sector} de qualité à ${city}`,
      cta: template.cta_principal,
      style_visuel: template.style_recommande,
      conversion_funnel: template.conversion_mechanic,
      sector_template: 'default',
      error: error.message
    };
  }
}