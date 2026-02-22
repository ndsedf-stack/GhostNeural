export function extractJsonSafe(raw: string): any {
  try {
    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON braces found");
    }

    let jsonString = cleaned.slice(firstBrace, lastBrace + 1);
    
    // Nettoyage des caractères de contrôle (00-1F) qui font planter JSON.parse
    // tout en préservant les retours à la ligne légaux (\n, \r, \t) si nécessaire
    // Mais dans un JSON strict, ils doivent être échappés.
    // Ici on les supprime s'ils ne sont pas échappés pour éviter le crash "bad control character"
    jsonString = jsonString.replace(/[\x00-\x1F]+/g, (match) => {
      if (match === "\n" || match === "\r" || match === "\t") return match;
      return "";
    });

    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error(`JSON parsing failed: ${(e as Error).message}`);
  }
}
