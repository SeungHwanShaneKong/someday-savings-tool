// RAG source citation formatting utility

export interface Citation {
  source: string;
  category: string;
  region?: string;
  date?: string;
  url?: string;
  similarity: number;
}

/**
 * Format citations into a readable Korean string
 */
export function formatCitations(citations: Citation[]): string {
  if (!citations || citations.length === 0) return '';

  const unique = deduplicateCitations(citations);

  return unique
    .map((c, i) => {
      const parts = [`${c.source}`];
      if (c.region) parts.push(c.region);
      if (c.date) parts.push(formatDate(c.date));
      return `[출처 ${i + 1}] ${parts.join(' · ')}`;
    })
    .join('\n');
}

/**
 * Format a single citation for inline display
 */
export function formatInlineCitation(citation: Citation): string {
  const parts = [citation.source];
  if (citation.region) parts.push(citation.region);
  if (citation.date) parts.push(formatDate(citation.date));
  return parts.join(' · ');
}

/**
 * Get confidence level based on citation similarity scores
 */
export function getConfidenceLevel(
  citations: Citation[]
): 'high' | 'medium' | 'low' | 'none' {
  if (!citations || citations.length === 0) return 'none';

  const avgSimilarity =
    citations.reduce((sum, c) => sum + c.similarity, 0) / citations.length;

  if (avgSimilarity >= 0.85) return 'high';
  if (avgSimilarity >= 0.75) return 'medium';
  return 'low';
}

/**
 * Get confidence label in Korean
 */
export function getConfidenceLabel(
  level: 'high' | 'medium' | 'low' | 'none'
): string {
  const labels = {
    high: '✅ 높은 신뢰도',
    medium: '🟡 보통 신뢰도',
    low: '🟠 낮은 신뢰도',
    none: '⚪ 일반 지식 기반',
  };
  return labels[level];
}

/**
 * Remove duplicate citations by source name
 */
function deduplicateCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const key = `${c.source}-${c.category}-${c.region || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    return `${year}년 ${quarter}분기`;
  } catch {
    return dateStr;
  }
}
