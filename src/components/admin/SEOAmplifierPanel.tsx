// [AGENT-TEAM-9-20260307] M2 SEO 앰플리파이어 패널 - AI 기반 SEO 콘텐츠 생성
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FileText, RefreshCw, AlertTriangle, Clock, Tag } from 'lucide-react';

// ── 타입 (useSEOAmplifier 호환) ──
export interface SEOContent {
  title: string;
  meta_description: string;
  body_html: string;
  keywords: string[];
  estimated_read_time: string;
}

interface SEOAmplifierPanelProps {
  content: SEOContent | null;
  loading: boolean;
  error: string | null;
  onGenerate: (keyword: string, tone?: string) => void;
}

// ── 톤 옵션 ──
const TONE_OPTIONS = [
  { value: 'friendly', label: '친근한' },
  { value: 'professional', label: '전문적' },
  { value: 'casual', label: '캐주얼' },
] as const;

export function SEOAmplifierPanel({ content, loading, error, onGenerate }: SEOAmplifierPanelProps) {
  const [keyword, setKeyword] = useState('');
  const [tone, setTone] = useState<string>('friendly');

  const handleGenerate = () => {
    if (!keyword.trim()) return;
    onGenerate(keyword.trim(), tone);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && keyword.trim()) {
      handleGenerate();
    }
  };

  // ── 로딩 스켈레톤 ──
  if (loading && !content) {
    return (
      <section className="space-y-4">
        <div className="h-7 bg-muted rounded w-56 animate-pulse" />
        <div className="h-12 bg-muted rounded-xl animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* ═══ 섹션 헤더 ═══ */}
      <div>
        <h2 className="text-base sm:text-lg font-bold leading-relaxed flex items-center gap-2">
          <FileText className="h-5 w-5 text-teal-500" />
          SEO 콘텐츠 생성
        </h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          AI 기반으로 검색 최적화 콘텐츠를 자동 생성합니다.
        </p>
      </div>

      {/* ═══ 입력 영역 ═══ */}
      <Card className="p-4 sm:p-5 bg-gradient-to-br from-teal-500/10 to-cyan-600/5 border-teal-200/50 dark:border-teal-800/50">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="키워드를 입력하세요 (예: 결혼 준비 체크리스트)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="bg-background"
              />
            </div>
            <div className="w-full sm:w-40">
              <Select value={tone} onValueChange={setTone} disabled={loading}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="톤 선택" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading || !keyword.trim()}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            SEO 콘텐츠 생성
          </Button>
        </div>
      </Card>

      {/* ═══ 에러 표시 ═══ */}
      {error && (
        <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </Card>
      )}

      {/* ═══ 생성된 콘텐츠 미리보기 ═══ */}
      {content && (
        <div className="space-y-4">
          {/* 메타 정보 카드 */}
          <Card className="p-4 sm:p-5">
            <h3 className="text-sm sm:text-base font-semibold mb-3">메타 정보</h3>
            <div className="space-y-3">
              {/* 제목 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">제목 (Title)</p>
                <p className="text-sm font-semibold bg-muted/50 p-2 rounded border border-border/50">
                  {content.title}
                </p>
              </div>

              {/* 메타 설명 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">메타 설명 (Meta Description)</p>
                <p className="text-sm bg-muted/50 p-2 rounded border border-border/50 leading-relaxed">
                  {content.meta_description}
                </p>
              </div>

              {/* 키워드 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  키워드
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {content.keywords.map((kw, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border-teal-200 dark:border-teal-800"
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 예상 읽기 시간 */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                예상 읽기 시간: {content.estimated_read_time}
              </div>
            </div>
          </Card>

          {/* 본문 미리보기 */}
          <Card className="p-4 sm:p-5">
            <h3 className="text-sm sm:text-base font-semibold mb-3">본문 미리보기</h3>
            <div
              className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg bg-muted/30 border border-border/50 overflow-auto max-h-96"
              dangerouslySetInnerHTML={{ __html: content.body_html }}
            />
          </Card>
        </div>
      )}

      {/* ═══ 결과 없음 ═══ */}
      {!content && !error && (
        <Card className="p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            키워드를 입력하고 콘텐츠를 생성하세요.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            AI가 SEO에 최적화된 콘텐츠를 자동으로 작성합니다.
          </p>
        </Card>
      )}
    </section>
  );
}
