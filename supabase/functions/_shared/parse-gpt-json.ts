// [EF-ADMIN-FIX-20260308-140000] Robust JSON extraction from GPT responses
// Handles: direct JSON, markdown code fences, text before/after JSON

/**
 * Attempts to parse a GPT response as JSON using multiple strategies:
 * 1. Direct JSON.parse
 * 2. Strip markdown code fences then parse
 * 3. Extract first JSON object { ... } from text
 *
 * @returns parsed object or null if all strategies fail
 */
export function parseGptJson<T = Record<string, unknown>>(raw: string): T | null {
  const trimmed = raw.trim();

  // Strategy 1: Direct parse
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // continue
  }

  // Strategy 2: Strip markdown code fences
  try {
    const cleaned = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    // continue
  }

  // Strategy 3: Extract first JSON object { ... }
  try {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as T;
    }
  } catch {
    // continue
  }

  return null;
}
