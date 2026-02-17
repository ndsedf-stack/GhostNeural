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

    const jsonString = cleaned.slice(firstBrace, lastBrace + 1);
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error(`JSON parsing failed: ${(e as Error).message}`);
  }
}
