// RAG source citation formatting utility
// [ZERO-COST-PIPELINE-2026-03-07] 신선도(freshness) 필드 + 포맷터 추가

export interface Citation {
  source: string;
  category: string;
  region?: string;
  date?: string;
  url?: string;
  similarity: number;
  // [ZERO-COST-PIPELINE-2026-03-07] 신선도 정보
  crawled_at?: string;
  freshness_score?: number;
}

/** [ZERO-COST-PIPELINE-2026-03-07] RAG 응답의 신선도 메타 정보 */
export interface FreshnessInfo {
  latest_source_time: string | null;
  freshness_label: string;
  avg_freshness_score: number;
}

/** 신선도 레벨: 시간 기반 */
export type FreshnessLevel = 'realtime' | 'today' | 'recent' | 'stale';

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

// ──────────────────────────────────────────────────────────────
// [ZERO-COST-PIPELINE-2026-03-07] 신선도 관련 유틸리티
// ──────────────────────────────────────────────────────────────

/**
 * 신선도 레벨 계산 (crawled_at 기반)
 */
export function getFreshnessLevel(crawledAt?: string): FreshnessLevel {
  if (!crawledAt) return 'stale';

  try {
    const date = new Date(crawledAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours <= 1) return 'realtime';
    if (diffHours <= 24) return 'today';
    if (diffHours <= 168) return 'recent'; // 7일
    return 'stale';
  } catch {
    return 'stale';
  }
}

/**
 * 신선도 라벨 포맷 (한국어 상대 시간)
 */
export function formatFreshnessLabel(crawledAt?: string): string {
  if (!crawledAt) return '';

  try {
    const date = new Date(crawledAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    if (diffMinutes < 60) return `방금 전(${timeStr}) 업데이트된 정보`;
    if (diffHours < 24) return `오늘 ${timeStr} 업데이트된 정보`;
    if (diffDays === 1) return `어제 업데이트된 정보`;
    if (diffDays < 7) return `${diffDays}일 전 업데이트된 정보`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전 업데이트된 정보`;
    return `${Math.floor(diffDays / 30)}개월 전 업데이트된 정보`;
  } catch {
    return '';
  }
}

/**
 * FreshnessInfo에서 최적 라벨 추출
 */
export function getFreshnessInfoLabel(info?: FreshnessInfo | null): string {
  if (!info) return '';
  if (info.freshness_label) return info.freshness_label;
  if (info.latest_source_time) return formatFreshnessLabel(info.latest_source_time);
  return '';
}
