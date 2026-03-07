// Anti-block utilities for web crawling (BRD §5.2)
// User-Agent rotation, request delays, proxy support, and robots.txt compliance
// [ZERO-COST-PIPELINE-2026-03-07] robots.txt 체크 + 광고 제거 강화 추가

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
];

/**
 * Get a random User-Agent string
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Sleep for random duration between min and max milliseconds
 * Used between requests to avoid rate limiting
 */
export function randomDelay(
  minMs: number = 2000,
  maxMs: number = 5000
): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Fetch with anti-block measures
 * - Random User-Agent
 * - Accept headers mimicking real browser
 * - Optional delay before request
 */
export async function safeFetch(
  url: string,
  options: {
    delayMs?: { min: number; max: number };
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<Response> {
  const {
    delayMs = { min: 2000, max: 5000 },
    headers = {},
    timeout = 30000,
  } = options;

  // Random delay before request
  await randomDelay(delayMs.min, delayMs.max);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        ...headers,
      },
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract text content from HTML (simple parser for Deno)
 * Strips tags, removes ad/noise elements, and normalizes whitespace
 * [ZERO-COST-PIPELINE-2026-03-07] 광고/노이즈 제거 패턴 강화
 */
export function extractTextFromHtml(html: string): string {
  return html
    // Remove script and style blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // [ZERO-COST-PIPELINE-2026-03-07] 광고/노이즈 요소 제거
    .replace(/<(div|section|aside|nav|footer|header)[^>]*(class|id)\s*=\s*["'][^"']*(ad[-_]?|ads[-_]?|banner|sidebar|popup|modal|cookie|gdpr|newsletter|promo|sponsor|social[-_]share|comment[-_]section)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chunk text into smaller pieces for embedding
 * Splits on paragraphs/sentences, targeting ~512 tokens (~2048 chars)
 */
export function chunkText(
  text: string,
  maxChars: number = 2048,
  overlap: number = 200
): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;

    if (end < text.length) {
      // Try to break at sentence boundary
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start + maxChars / 2) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter((c) => c.length > 50); // Skip very small chunks
}

/**
 * Generate MD5-like hash for content deduplication
 */
export async function contentHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ──────────────────────────────────────────────────────────────
// [ZERO-COST-PIPELINE-2026-03-07] robots.txt compliance
// ──────────────────────────────────────────────────────────────

/** robots.txt 캐시 (도메인 → { disallowPaths, fetchedAt }) */
const robotsTxtCache = new Map<
  string,
  { disallowPaths: string[]; fetchedAt: number }
>();
const ROBOTS_CACHE_TTL_MS = 5 * 60 * 1000; // 5분

/**
 * Extract base URL (scheme + host) from a full URL
 */
function getBaseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

/**
 * Parse robots.txt content and return Disallow paths for '*' or 'WeddingSemBot'
 */
function parseRobotsTxt(content: string): string[] {
  const lines = content.split('\n');
  const disallowPaths: string[] = [];
  let inRelevantBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const lower = line.toLowerCase();

    if (lower.startsWith('user-agent:')) {
      const agent = lower.replace('user-agent:', '').trim();
      inRelevantBlock = agent === '*' || agent.includes('weddingsem');
    } else if (lower.startsWith('disallow:') && inRelevantBlock) {
      const path = line.replace(/^disallow:\s*/i, '').trim();
      if (path) {
        disallowPaths.push(path);
      }
    }
  }

  return disallowPaths;
}

/**
 * Check robots.txt for a given URL and determine if crawling is allowed.
 * Caches results for 5 minutes per domain.
 *
 * @returns true if crawling is allowed, false if blocked by robots.txt
 */
export async function checkRobotsTxt(url: string): Promise<boolean> {
  const baseUrl = getBaseUrl(url);
  if (!baseUrl) return true; // Invalid URL → allow (will fail at fetch anyway)

  // Check cache
  const cached = robotsTxtCache.get(baseUrl);
  if (cached && Date.now() - cached.fetchedAt < ROBOTS_CACHE_TTL_MS) {
    return isPathAllowed(url, cached.disallowPaths);
  }

  // Fetch robots.txt
  try {
    const robotsUrl = `${baseUrl}/robots.txt`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'WeddingSemBot/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      // No robots.txt or error → allow crawling
      robotsTxtCache.set(baseUrl, { disallowPaths: [], fetchedAt: Date.now() });
      return true;
    }

    const text = await resp.text();
    const disallowPaths = parseRobotsTxt(text);
    robotsTxtCache.set(baseUrl, { disallowPaths, fetchedAt: Date.now() });

    return isPathAllowed(url, disallowPaths);
  } catch {
    // Network error → allow crawling (be permissive)
    robotsTxtCache.set(baseUrl, { disallowPaths: [], fetchedAt: Date.now() });
    return true;
  }
}

/**
 * Check if a specific URL path is allowed given Disallow rules
 */
function isPathAllowed(url: string, disallowPaths: string[]): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname;

    for (const disallow of disallowPaths) {
      if (disallow === '/') return false; // Entire site blocked
      if (path.startsWith(disallow)) return false;
    }

    return true;
  } catch {
    return true;
  }
}

/**
 * Generate a URL-based hash for deduplication
 * [ZERO-COST-PIPELINE-2026-03-07] URL 기반 중복제거용
 */
export async function urlHash(url: string): Promise<string> {
  // Normalize URL: remove trailing slash, fragment, and sort query params
  try {
    const u = new URL(url);
    u.hash = '';
    const normalized = u.toString().replace(/\/+$/, '');
    return contentHash(normalized);
  } catch {
    return contentHash(url);
  }
}
