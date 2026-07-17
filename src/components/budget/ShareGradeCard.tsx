// [CL-SHARE-P1-20260717-170000] 공유 카드 히어로 — 수신자가 3초 안에 "친구가 이만큼 준비했구나"를 파악.
//   설계: docs/growth-share-card-design.md §2.1·§2.3.
//
// 계약:
//  - 순수 표시 컴포넌트(네트워크·라우팅 0) — 등급 산출은 share-grade.ts(순수 함수)가 소유.
//  - **절대 금액 미표시**(등급·%·비중만) — P2 서버측 마스킹 도입 전에도 카드 자체는 금액 비노출 규율 준수.
//  - 평균 초과 사용자 비난 금지: savingCopy 가 '프리미엄 준비 중 ✨' 톤으로 처리(§2.1 소외 금지).
//  - 출처 표기(SOURCE_TEXT) 노출 — AdSense E-E-A-T·데이터 투명성 정책과 일관.
import { Sparkles } from 'lucide-react';
import { SOURCE_TEXT } from '@/lib/average-costs';
import {
  computeCategoryHighlights,
  savingCopy,
  type ShareGrade,
  type ShareGradeItem,
} from '@/lib/share-grade';

interface ShareGradeCardProps {
  grade: ShareGrade;
  /** 하이라이트 산출용 항목(금액>0). hidden 레벨(P2)에서는 빈 배열을 넘겨 하이라이트를 생략한다. */
  items: ReadonlyArray<ShareGradeItem>;
}

export function ShareGradeCard({ grade, items }: ShareGradeCardProps) {
  const copy = savingCopy(grade.savingPercent);
  const { saved, invested } = computeCategoryHighlights(items);

  return (
    <section
      aria-label="예산 등급 카드"
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm"
    >
      {/* 등급 — 자랑 포인트는 '금액'이 아니라 '계획력·알뜰함' */}
      <div className="flex items-center gap-3">
        <span className="text-4xl leading-none" aria-hidden="true">{grade.emoji}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">이 커플의 예산 등급</p>
          <p className="text-lg font-bold text-foreground break-keep">
            {grade.label} <span className="text-sm font-semibold text-primary">Lv.{grade.grade}</span>
          </p>
        </div>
      </div>

      {/* 완성도 게이지 */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>예산 완성도</span>
          <span className="font-semibold text-foreground tabular-nums">{grade.completeness}%</span>
        </div>
        <div
          className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={grade.completeness}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="예산 완성도"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${Math.min(100, Math.max(0, grade.completeness))}%` }}
          />
        </div>
      </div>

      {/* 전국 평균 대비 — 비교 불가(금액 미입력)면 문구 자체를 생략(0% 로 단정 금지) */}
      {copy && (
        <p className="mt-3 flex items-start gap-1.5 text-sm font-medium text-foreground break-keep">
          <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
          <span>{copy}</span>
        </p>
      )}

      {/* 카테고리 하이라이트 — 절약 1·투자 1 */}
      {(saved || invested) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {saved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
              <span aria-hidden="true">{saved.icon}</span>
              {saved.name} {saved.savingPercent}% 절약
            </span>
          )}
          {invested && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
              <span aria-hidden="true">{invested.icon}</span>
              {invested.name}에 진심
            </span>
          )}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/70">{SOURCE_TEXT}</p>
    </section>
  );
}
