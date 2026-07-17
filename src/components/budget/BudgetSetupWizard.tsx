// [CL-TOP20-P3-WIZARD-20260703-030000]
// 첫 예산 생성 위저드 — Top 20 P3(#11).
// 신규 사용자(전 항목 0·custom 0)가 빈 표에 직행하는 마찰 제거:
// ①환영+하객수+스타일 → ②템플릿 → ③평균 프리필 리뷰(카테고리 토글) → ④적용 완료.
// 계산은 src/lib/budget-wizard.ts(순수·AVERAGE_COSTS 파생), 저장은 부모(BudgetFlow)의
// 기존 updateAmount(낙관적+ACK) 경로를 onApply 콜백으로 재사용 — 새 DB 경로 없음.
// 어떤 경로로 닫혀도(건너뛰기·X·ESC·적용) 완료 플래그를 설정해 재노출하지 않는다.

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Check } from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';
import { SOURCE_TEXT } from '@/lib/average-costs';
import {
  WIZARD_STYLE_OPTIONS,
  WIZARD_TEMPLATE_OPTIONS,
  WIZARD_GUESTS_MIN,
  WIZARD_GUESTS_MAX,
  WIZARD_GUESTS_STEP,
  WIZARD_DEFAULT_GUESTS,
  computeWizardPlan,
  flattenWizardPlan,
  sumWizardPlan,
  markWizardDone,
  type WizardPrefill,
  type WizardStyleId,
  type WizardTemplateId,
} from '@/lib/budget-wizard';
// [CL-TOP20-R50-TRACK-20260703-094000] 온보딩 퍼널 계측(wizard_enter/apply + signup_complete 근사)
import { trackFunnel, trackFunnelOnce } from '@/lib/analytics/funnel-events';
// [CL-SHARE-AUDIT-D1-20260717-190000] 공유 카드 K-factor 종점 귀속 — first-touch 소스를 가입 이벤트에 부착.
import { readFirstTouch } from '@/lib/analytics/acquisition';
import { cn } from '@/lib/utils';

type WizardStep = 1 | 2 | 3 | 4;
const TOTAL_STEPS = 4;

export interface BudgetSetupWizardProps {
  open: boolean;
  /** 닫힘 전파(부모가 open 을 소유). 열림(true)은 부모만 결정한다. */
  onOpenChange: (open: boolean) => void;
  /** 리뷰에서 켜 둔 제안을 일괄 적용 — 부모가 기존 항목 업데이트 경로를 순회 호출. */
  onApply: (prefills: WizardPrefill[]) => Promise<void> | void;
}

export function BudgetSetupWizard({ open, onOpenChange, onApply }: BudgetSetupWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [guests, setGuests] = useState(WIZARD_DEFAULT_GUESTS);
  const [styleId, setStyleId] = useState<WizardStyleId>('standard');
  const [templateId, setTemplateId] = useState<WizardTemplateId>('honsu');
  const [disabledCategoryIds, setDisabledCategoryIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [applying, setApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  // [CL-TOP20-R50-TRACK-20260703-094000] 노출 계측 — open 이 처음 true 가 되는 전이 시점 1회.
  // 부모(BudgetFlow)는 이 위저드를 항상 마운트하고 open 으로만 제어하므로, 마운트가 아니라
  // open 전이에서 발화해야 '미노출 사용자 오발화'가 없다(세션 중복은 trackFunnelOnce 가 차단).
  // signup_complete 근사 근거: 노출 게이트(본인 소유·개인 모드·전 항목 0·custom 0·완료 플래그
  // 없음)가 "가입 직후 첫 예산 진입"과 사실상 일치 — funnel-events.ts taxonomy 주석 참조.
  // [CL-SHARE-AUDIT-D1-20260717-190000] signup_complete 에 first-touch 귀속 파라미터 부착(설계 §4.1·§5 P1).
  //  배경: share_convert 는 전용 이벤트를 두지 않고 **signup_complete 의 acq_source='share_card'** 로
  //  정의된다(닫힌 유니언 오염 최소화). 이 파라미터가 없으면 c = share_convert/share_create 가 항상 0 이라
  //  K-factor 가 GA4 에서 산출 불능 — P1 의 1차 성공 조건(DoD #5 '측정 가능화') 자체가 미달한다.
  //  전송값은 분류된 소스/미디엄 키(share_card·viral 등)뿐 — referrer·토큰·금액·PII 미전송(§4.1 금지 계약).
  useEffect(() => {
    if (!open) return;
    trackFunnelOnce('wizard_enter');
    const ft = readFirstTouch();
    trackFunnelOnce('signup_complete', {
      acq_source: ft?.source ?? 'unknown',
      acq_medium: ft?.medium ?? 'none',
    });
  }, [open]);

  const plan = useMemo(
    () => computeWizardPlan({ guests, styleId, templateId }),
    [guests, styleId, templateId],
  );
  const enabledCategoryIds = useMemo(
    () => new Set(plan.map((g) => g.categoryId).filter((id) => !disabledCategoryIds.has(id))),
    [plan, disabledCategoryIds],
  );
  const totalAmount = useMemo(
    () => sumWizardPlan(plan, enabledCategoryIds),
    [plan, enabledCategoryIds],
  );
  const enabledItemCount = useMemo(
    () => flattenWizardPlan(plan, enabledCategoryIds).length,
    [plan, enabledCategoryIds],
  );

  const styleLabel =
    WIZARD_STYLE_OPTIONS.find((o) => o.id === styleId)?.label ?? '표준형';
  const templateLabel =
    WIZARD_TEMPLATE_OPTIONS.find((o) => o.id === templateId)?.label ?? '';

  const toggleCategory = (categoryId: string) => {
    setDisabledCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  /** 어떤 경로로 닫혀도 완료 플래그 설정(재노출 금지) 후 부모에 닫힘 전파. */
  const finishAndClose = () => {
    markWizardDone();
    onOpenChange(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return; // 열림은 부모가 소유
    if (applying) return; // 적용 진행 중엔 닫기 무시(중복 적용·유실 방지)
    finishAndClose();
  };

  const handleApply = async () => {
    if (applying || enabledItemCount === 0) return;
    const prefills = flattenWizardPlan(plan, enabledCategoryIds);
    setApplying(true);
    markWizardDone(); // 적용 시작 시점에 즉시 완료 플래그(중간 이탈해도 재노출 금지)
    // [CL-TOP20-R50-TRACK-20260703-094000] 적용 계측 — 선택 조합(PII 0: id·숫자만) 기록
    trackFunnel('wizard_apply', { template: templateId, guests, style: styleId });
    try {
      // 실패는 부모의 기존 훅(updateItem)이 토스트·낙관적 롤백으로 처리 — 여기선 흐름만 유지.
      await onApply(prefills);
    } finally {
      setAppliedCount(prefills.length);
      setApplying(false);
      setStep(4);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        {/* 진행 표시 — 시각(dots) + 스크린리더(라이브) 분리 */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {([1, 2, 3, 4] as const).map((s) => (
            <span
              key={s}
              className={cn(
                'h-1.5 rounded-full transition-all motion-reduce:transition-none',
                s === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted',
              )}
            />
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {TOTAL_STEPS}단계 중 {step}단계
        </p>

        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>결혼 예산, 1분 만에 밑그림 그리기</DialogTitle>
              <DialogDescription>
                웨딩셈에 오신 걸 환영해요! 하객 수와 예식 스타일만 고르면 2025년 전국 평균
                데이터로 예산을 미리 채워 드려요.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-1">
              {/* 하객 수 슬라이더 */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-foreground">예상 하객 수</span>
                  <span className="text-sm font-semibold tabular-nums text-primary">
                    {guests.toLocaleString()}명
                  </span>
                </div>
                <Slider
                  value={[guests]}
                  min={WIZARD_GUESTS_MIN}
                  max={WIZARD_GUESTS_MAX}
                  step={WIZARD_GUESTS_STEP}
                  onValueChange={(value) => setGuests(value[0] ?? WIZARD_DEFAULT_GUESTS)}
                  aria-label="예상 하객 수"
                />
                <div className="flex justify-between text-xs text-muted-foreground" aria-hidden="true">
                  <span>{WIZARD_GUESTS_MIN}</span>
                  <span>{WIZARD_GUESTS_MAX}</span>
                </div>
              </div>

              {/* 예식 스타일 3택 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">예식 스타일</p>
                <div role="group" aria-label="예식 스타일" className="grid grid-cols-3 gap-2">
                  {WIZARD_STYLE_OPTIONS.map((option) => {
                    const selected = option.id === styleId;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setStyleId(option.id)}
                        className={cn(
                          'rounded-lg border px-2 py-2.5 text-center transition-colors motion-reduce:transition-none',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                        )}
                      >
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className="mt-0.5 block text-[11px]">{option.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={finishAndClose}>
                나중에 할게요
              </Button>
              <Button onClick={() => setStep(2)}>다음</Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>어디까지 관리할까요?</DialogTitle>
              <DialogDescription>
                템플릿에 따라 채워 드리는 항목이 달라져요. 나중에 표에서 언제든 바꿀 수 있어요.
              </DialogDescription>
            </DialogHeader>

            <div role="group" aria-label="예산 템플릿" className="space-y-2 py-1">
              {WIZARD_TEMPLATE_OPTIONS.map((option) => {
                const selected = option.id === templateId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setTemplateId(option.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors motion-reduce:transition-none',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/40',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                        selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                      )}
                      aria-hidden="true"
                    >
                      {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block text-sm font-semibold',
                          selected ? 'text-primary' : 'text-foreground',
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                이전
              </Button>
              <Button onClick={() => setStep(3)}>다음</Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>제안 금액을 확인해 주세요</DialogTitle>
              <DialogDescription>
                하객 {guests.toLocaleString()}명 · {styleLabel} · {templateLabel} 기준이에요.
                카테고리를 끄면 그 항목들은 비워 둔 채로 시작해요.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-1">
              {plan.map((group) => {
                const enabled = enabledCategoryIds.has(group.categoryId);
                return (
                  <div
                    key={group.categoryId}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors motion-reduce:transition-none',
                      enabled ? 'border-border bg-card' : 'border-border/60 bg-muted/40',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="text-lg" aria-hidden="true">
                        {group.icon}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'truncate text-sm font-medium',
                            enabled ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {group.categoryName}
                        </p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {group.suggestions.length}개 항목 · {formatKoreanWon(group.subtotal)}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => toggleCategory(group.categoryId)}
                      aria-label={`${group.categoryName} 채우기`}
                    />
                  </div>
                );
              })}

              <div className="flex items-baseline justify-between rounded-xl bg-secondary/50 px-4 py-3">
                <span className="text-sm font-medium text-muted-foreground">채울 예산 총액</span>
                <span className="text-xl font-bold tabular-nums text-primary">
                  {formatKoreanWon(totalAmount)}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {SOURCE_TEXT} · 실제 견적에 맞춰 표에서 언제든 수정하면 돼요.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={applying}>
                이전
              </Button>
              <Button onClick={handleApply} disabled={applying || enabledItemCount === 0}>
                {applying ? '채우는 중...' : `이대로 채우기 (${enabledItemCount}개 항목)`}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 4 && (
          <>
            <DialogHeader>
              <DialogTitle>예산 밑그림 완성!</DialogTitle>
              <DialogDescription>
                {appliedCount}개 항목에 평균 예산을 채웠어요.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300">
                <Check className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <p className="text-sm text-muted-foreground">
                이제 표에서 실제 견적으로 다듬기만 하면 돼요. 금액을 누르면 바로 수정할 수 있어요.
              </p>
            </div>

            <DialogFooter>
              <Button className="w-full" onClick={finishAndClose}>
                예산표 보러 가기
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
