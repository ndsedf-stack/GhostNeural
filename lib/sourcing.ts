import { gemini, callLLMWithRetry } from './llm-clients';

/**
 * GhostAgency Sourcing Agent
 * Responsible for finding leads (Business Name, Website, Email)
 */

export const sourcing = {
  /**
   * Mock sourcing for high reliability in MVP.
   * In a real scenario, this would call a Search API or Scraper.
   */
  async getLeads(ville: string, secteur: string, count: number = 5) {
    console.log(`Sourcing ${count} leads for ${secteur} in ${ville}...`);
    
    // We can use the Search tool here if we were in a different context, 
    // but for the app's internal logic, we might use a dedicated API.
    // Let's implement a robust "simulation" that returns plausible leads for the sector.
    
    const prompt = `Génère une liste de ${count} entreprises réelles ou plausibles (nom, site_web, email) pour le secteur "${secteur}" à "${ville}".
    Rends cela au format JSON : [{ "nom": string, "site_web": string, "email": string | null }].`;

    const leads = await callLLMWithRetry<any[]>(async () => {
      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text;
    });

    return leads || [];
  }
};
