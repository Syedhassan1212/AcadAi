// ============================================================
// Gemini Client — Singleton wrapper for Google Generative AI
// ============================================================

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

let _client: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment variables');
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

export function getTextModel(modelName = 'gemini-flash-latest'): GenerativeModel {
  return getGeminiClient().getGenerativeModel({ model: modelName });
}

export function getVisionModel(modelName = 'gemini-flash-latest'): GenerativeModel {
  return getGeminiClient().getGenerativeModel({ model: modelName });
}

/**
 * Parse JSON from Gemini response safely.
 * Strips markdown code fences if present.
 */
export function parseGeminiJson<T>(text: string): T {
  // Remove ```json ... ``` or ``` ... ``` wrapping
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    // Try to extract JSON from within the text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    throw new Error(`Failed to parse Gemini JSON response: ${cleaned.slice(0, 200)}`);
  }
}
