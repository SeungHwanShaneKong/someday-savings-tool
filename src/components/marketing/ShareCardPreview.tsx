// [AGENT-TEAM-9-20260307] 공유 카드 미리보기 컴포넌트
// ShareCardPreview — 생성된 공유 카드 HTML을 미리보기 및 복사/다운로드

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Image, Copy, Download, Check } from 'lucide-react';
import type { ShareCardResult } from '@/hooks/useShareImageGen';

interface ShareCardPreviewProps {
  result: ShareCardResult | null;
  loading: boolean;
  error: string | null;
}

export default function ShareCardPreview({ result, loading, error }: ShareCardPreviewProps) {
  const [copied, setCopied] = useState(false);

  // ── HTML 클립보드 복사 ──
  const handleCopyHtml = async () => {
    if (!result?.card_html) return;
    try {
      await navigator.clipboard.writeText(result.card_html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.warn('[ShareCardPreview] 클립보드 복사 실패');
    }
  };

  // ── 다운로드 (HTML 파일로 저장) ──
  const handleDownload = () => {
    if (!result?.card_html) return;
    const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta property="og:title" content="${result.og_title}" />
  <meta property="og:description" content="${result.og_description}" />
  <meta property="og:type" content="website" />
  <title>${result.og_title}</title>
  <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;}</style>
</head>
<body>
  ${result.card_html}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedding-budget-card.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── 로딩 상태 ──
  if (loading) {
    return (
      <Card className="p-6 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
        <div className="flex items-center gap-2 mb-4">
          <Image className="w-5 h-5 text-rose-500" />
          <h3 className="text-lg font-semibold text-rose-900">공유 카드 미리보기</h3>
        </div>
        <Skeleton className="w-full bg-rose-100" style={{ aspectRatio: '1200/630' }} />
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-9 w-28 bg-rose-100" />
          <Skeleton className="h-9 w-28 bg-rose-100" />
        </div>
      </Card>
    );
  }

  // ── 에러 상태 ──
  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center gap-2 mb-2">
          <Image className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-red-900">공유 카드 미리보기</h3>
        </div>
        <p className="text-sm text-red-700">{error}</p>
      </Card>
    );
  }

  // ── 결과 없음 ──
  if (!result) {
    return (
      <Card className="p-6 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
        <div className="flex items-center gap-2 mb-2">
          <Image className="w-5 h-5 text-rose-400" />
          <h3 className="text-lg font-semibold text-rose-900">공유 카드 미리보기</h3>
        </div>
        <p className="text-sm text-rose-600">
          예산 데이터를 입력하고 카드를 생성해 보세요.
        </p>
      </Card>
    );
  }

  // ── 결과 렌더링 ──
  return (
    <Card className="p-6 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Image className="w-5 h-5 text-rose-500" />
          <h3 className="text-lg font-semibold text-rose-900">공유 카드 미리보기</h3>
        </div>
        <Badge variant="secondary" className="bg-rose-100 text-rose-700 border-rose-200">
          {result.summary.categories_count}개 항목
        </Badge>
      </div>

      {/* 미리보기 컨테이너 (축소 표시) */}
      <div
        className="w-full max-w-[400px] mx-auto rounded-lg overflow-hidden shadow-lg border border-rose-200"
        style={{ aspectRatio: '1200/630' }}
      >
        <div
          className="w-[1200px] h-[630px] origin-top-left"
          style={{
            transform: 'scale(calc(400 / 1200))',
            transformOrigin: 'top left',
          }}
          dangerouslySetInnerHTML={{ __html: result.card_html }}
        />
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyHtml}
          className="border-rose-300 text-rose-700 hover:bg-rose-100"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              복사 완료
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              HTML 복사
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="border-rose-300 text-rose-700 hover:bg-rose-100"
        >
          <Download className="w-4 h-4 mr-1" />
          다운로드
        </Button>
      </div>

      {/* OG 메타 정보 */}
      <div className="mt-4 p-3 rounded-md bg-white/60 border border-rose-100">
        <p className="text-xs font-medium text-rose-500 mb-1">OG 메타 정보</p>
        <p className="text-sm font-semibold text-rose-900">{result.og_title}</p>
        <p className="text-xs text-rose-600 mt-1">{result.og_description}</p>
      </div>
    </Card>
  );
}
