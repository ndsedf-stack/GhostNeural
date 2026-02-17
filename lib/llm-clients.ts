import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
// Clients initialization handles missing keys during build by providing dummy strings
// This prevents constructors from throwing and maintains type safety
export const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'BUILD_TIME_DUMMY');
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'BUILD_TIME_DUMMY' });
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'BUILD_TIME_DUMMY' });

/**
 * Robust JSON extraction from LLM output.
 * Handles markdown blocks, noise before/after JSON, and common malformations.
 */
export function extractJson<T>(raw: string): T | null {
  try {
    // 1. Direct parse attempt
    return JSON.parse(raw);
  } catch (e) {
    // 2. Extract from markdown blocks
    const markdownMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      try {
        return JSON.parse(markdownMatch[1]);
      } catch (e2) {}
    }

    // 3. Find first { and last }
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      const jsonStr = raw.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonStr);
      } catch (e3) {
        // 4. Try cleaning trailing commas
        try {
          const cleaned = jsonStr.replace(/,\s*([}\]])/g, '$1');
          return JSON.parse(cleaned);
        } catch (e4) {}
      }
    }
  }
  
  console.error("Failed to parse JSON from LLM output:", raw.substring(0, 200) + "...");
  return null;
}

/**
 * Generic caller with retry logic for LLM JSON responses.
 */
export async function callLLMWithRetry<T>(
  fn: () => Promise<string>,
  retries: number = 2
): Promise<T | null> {
  // Build-time guard to prevent crashes during Vercel static analysis
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[LLM Guard] Skipping real call during build phase.');
    return null;
  }

  let lastRaw = "";
  for (let i = 0; i < retries + 1; i++) {
    try {
      lastRaw = await fn();
      const parsed = extractJson<T>(lastRaw);
      if (parsed) return parsed;
    } catch (error) {
      console.error(`LLM call attempt ${i + 1} failed:`, error);
    }
    console.warn(`Retrying LLM call (${i + 1}/${retries})...`);
  }
  return null;
}
