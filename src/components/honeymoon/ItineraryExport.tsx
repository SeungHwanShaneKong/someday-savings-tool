// [HONEYMOON-UPGRADE-2026-03-07] 여행 일정 내보내기 & 공유
import { useState, useCallback } from 'react';
import { Copy, Download, CheckCircle2 } from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';
import type { Destination } from '@/lib/honeymoon-destinations';

interface ItineraryExportProps {
  destinations: Destination[];
  /** ref to the capture target element (ItineraryPanel + Map area) */
  captureRef?: React.RefObject<HTMLDivElement>;
}

export function ItineraryExport({ destinations, captureRef }: ItineraryExportProps) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Build shareable text
  const buildText = useCallback(() => {
    if (destinations.length === 0) return '';

    const totalNights = destinations.reduce((s, d) => s + d.nights, 0);
    const totalMin = destinations.reduce((s, d) => s + d.budgetRange.min, 0);
    const totalMax = destinations.reduce((s, d) => s + d.budgetRange.max, 0);

    let text = '✈️ 허니문 여행 일정 (웨딩셈)\n';
    text += '━━━━━━━━━━━━━━━━━━━━\n\n';

    destinations.forEach((d, i) => {
      text += `${i + 1}. ${d.markerEmoji} ${d.name} (${d.nameEn})\n`;
      text += `   📅 ${d.nights}박 | 💰 ${formatKoreanWon(d.budgetRange.min)}~${formatKoreanWon(d.budgetRange.max)}\n`;
      text += `   📍 ${d.highlights.join(', ')}\n`;
      if (i < destinations.length - 1) text += '   ↓\n';
    });

    text += '\n━━━━━━━━━━━━━━━━━━━━\n';
    text += `📊 총 일정: ${totalNights}박\n`;
    text += `💰 총 예산: ${formatKoreanWon(totalMin)} ~ ${formatKoreanWon(totalMax)}\n`;
    text += '\n🔗 wedsem.moderninsightspot.com/honeymoon';

    return text;
  }, [destinations]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    const text = buildText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [buildText]);

  // Export as image
  const handleExportImage = useCallback(async () => {
    if (!captureRef?.current) return;

    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `honeymoon-itinerary-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Image export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [captureRef]);

  if (destinations.length === 0) return null;

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopy}
        className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium bg-muted/50 hover:bg-muted text-foreground rounded-lg py-2 transition-colors"
      >
        {copied ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            복사 완료!
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            일정 복사
          </>
        )}
      </button>

      {captureRef && (
        <button
          onClick={handleExportImage}
          disabled={exporting}
          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded-lg py-2 transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? '저장 중...' : '이미지 저장'}
        </button>
      )}
    </div>
  );
}
