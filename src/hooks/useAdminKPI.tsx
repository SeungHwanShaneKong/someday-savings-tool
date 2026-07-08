import { useCallback } from 'react';
// [CL-ADMIN-RQ-MIGRATION-20260627-234656] 수동 useState/30초 setInterval → React Query 준실시간 스마트 폴링.
//   집계 로직(K01~K18·trend·topPages·summary·impact)은 100% 보존 — 데이터 페치/상태 레이어만 RQ 로 전환.
//   setter 대신 loadAdminKpi(start,end) 가 결과 객체를 '반환'하고, useQuery 가 폴링/캐시/포커스 갱신을 담당.
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, differenceInMinutes } from 'date-fns';
// [CL-ADMIN-KST-20260709-000939] 날짜 경계를 KST 달력일로 명시 고정(브라우저 로컬 TZ 종속 제거) + 순수 집계 위임
import { startOfKstDayUtc, endOfKstDayUtc, subKstDays, kstMonthDayLabel } from '@/lib/admin/kst-time';
import { uniqueUserCount, loyalUserCount, avgPositiveDuration } from '@/lib/admin/trend-compute';
import type { KPIValue, TrendDataPoint, TopPage } from '@/lib/kpi-definitions';
import { withCumulativeSignups, firstTrendBucketStart } from '@/lib/kpi-definitions'; // [CL-ADMIN-SIGNUP-TREND-20260622]
import { calculateImpact, type ImpactSummary, type BudgetForImpact } from '@/lib/impact-calculator';
import { ADMIN_HEAVY } from '@/hooks/admin/adminQueryConfig';
import { computeRetentionMeasure } from '@/lib/admin/retention'; // [CL-FACT-RETENTION-20260630] 관측가능 코호트 분모
import { computeUsageRates, measureToKpiValue } from '@/lib/admin/kpi-compute'; // [CL-FACT-COMPUTE-20260630] 위조분모 정직화
import { countSignupToBudget24h } from '@/lib/admin/conversion'; // [CL-AUDIT-R9-K09PERF-20260630] K09 인덱스화

// 관리자 user_id — 모든 KPI 계산에서 제외
const ADMIN_USER_ID = 'f628fbf6-5f2f-4ca1-86e0-21eb2395bc40';

export interface SummaryKPIs {
  totalPageViews: number;
  prevTotalPageViews: number;
  loyalUsers: number;
  prevLoyalUsers: number;
  totalUniqueUsers: number;
  avgSessionTime: number; // seconds
  prevAvgSessionTime: number;
  dailyPageViews: number;
  weeklyPageViews: number;
  monthlyPageViews: number;
}

// [CL-ACQ-ADMIN-20260622-233012] 유입경로(가입자 first_source)별 인원 (개선1)
export interface AcquisitionDatum {
  source: string;
  users: number;
}

// [CL-IMPROVE2-VISITHIST-20260625] 방문 횟수별 유저 수(정확히 N회, bucket='1회'..'10회+')
export interface VisitHistogramDatum {
  bucket: string;
  users: number;
}

// [CL-IMPROVE3-REFJOINS-20260625] 초대 수락(협업자 합류) 일자별 추이
export interface ReferralJoinDatum {
  day: string;
  joins: number;
}

// [CL-ANONVISIT-ADMIN-20260627-234656] 전체 방문(익명 포함) — anon_page_views 집계 RPC 결과
export interface AnonTrafficDatum {
  day: string;
  views: number;
  sessions: number;
}
export interface AnonTopPageDatum {
  path: string;
  views: number;
}

/** loadAdminKpi 가 반환하는 파생 데이터 묶음(과거 setState 대상 전체). */
export interface AdminKpiData {
  kpiValues: KPIValue[];
  trendData: TrendDataPoint[];
  topPages: TopPage[];
  summaryKPIs: SummaryKPIs;
  impactSummary: ImpactSummary;
  acquisitionData: AcquisitionDatum[];
  visitSourceData: AcquisitionDatum[];
  visitHistogram: VisitHistogramDatum[];
  referralJoins: ReferralJoinDatum[];
  referralJoinsTotal: number;
  // [CL-ANONVISIT-ADMIN-20260627-234656] 전체 방문(익명 포함)
  anonTrafficTrend: AnonTrafficDatum[];
  anonSourceData: AcquisitionDatum[];
  anonTopPages: AnonTopPageDatum[];
  // [CL-AUDIT2-R4-DEGRADE-20260628] 부분 실패한 코어 source 목록(없으면 null) — UI 경고 배너용
  partialError: string | null;
}

interface UseAdminKPIResult extends AdminKpiData {
  loading: boolean;
  /** 백그라운드 재조회(폴링/포커스 갱신) 진행 여부 — 새로고침 버튼 스핀용 */
  isFetching: boolean;
  error: string | null;
  /** 마지막 성공 갱신 시각(ms) — '마지막 업데이트' 표시용 */
  dataUpdatedAt: number;
  /** 수동 새로고침(React Query refetch) */
  refetch: () => void;
  /** [CL-AUDIT-CUMSUM-BOUNDARY-20260622] 회귀 가드 호환 shim — 임의 기간으로 원시 적재 1회 실행 */
  fetchData: (startDate: Date, endDate: Date) => Promise<void>;
}

const defaultSummary: SummaryKPIs = {
  totalPageViews: 0, prevTotalPageViews: 0,
  loyalUsers: 0, prevLoyalUsers: 0, totalUniqueUsers: 0,
  avgSessionTime: 0, prevAvgSessionTime: 0,
  dailyPageViews: 0, weeklyPageViews: 0, monthlyPageViews: 0,
};

const EMPTY_DATA: AdminKpiData = {
  kpiValues: [], trendData: [], topPages: [], summaryKPIs: defaultSummary,
  impactSummary: {
    totalBudgets: 0, activeBudgets: 0, avgSavingsRate: 0, avgSavingsAmount: 0,
    totalSavingsEstimate: 0, belowAvgPercent: 0, aboveAvgPercent: 0,
    avgHiddenCostsIdentified: 0, totalContingencyFund: 0, categoryBreakdown: [],
  },
  acquisitionData: [], visitSourceData: [], visitHistogram: [],
  referralJoins: [], referralJoinsTotal: 0,
  anonTrafficTrend: [], anonSourceData: [], anonTopPages: [],
  partialError: null,
};

const PAGE_SIZE = 1000;

/**
 * Paginated fetch: bypasses Supabase 1000-row default limit.
 * Builds query via callback, fetches PAGE_SIZE rows at a time.
 */
async function fetchAllRows<T>(
  buildQuery: () => ReturnType<ReturnType<typeof supabase.from>['select']>,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  // [CL-AUDIT-R9-PAGECAP-20260630] 방어심화: 병리적 페이지네이션(범위 미전진 등)으로 인한 무한루프/OOM 차단.
  //   정상 경로(data.length<PAGE_SIZE → break)는 불변. 1000페이지(=100만 행) 초과 시 안전 중단 + 경고.
  const MAX_PAGES = 1000;
  let pages = 0;
  while (true) {
    if (++pages > MAX_PAGES) {
      console.warn(`[useAdminKPI] fetchAllRows: MAX_PAGES(${MAX_PAGES}) 초과 — 안전 중단(부분 데이터 반환)`);
      break;
    }
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

/**
 * [CL-ADMIN-RQ-MIGRATION-20260627-234656] 모든 원시 페치 + 파생 계산을 수행하고 결과 객체를 반환(순수 반환, setter 없음).
 * React Query queryFn 과 fetchData shim(회귀 가드)이 공유한다. 집계 로직은 기존 fetchData 와 100% 동일.
 */
async function loadAdminKpi(startDate: Date, endDate: Date): Promise<AdminKpiData> {
  // [CL-ANONVISIT-ADMIN-20260627-234656] 신규 anon RPC 3종은 generated types.ts 미반영 → 격리 캐스트
  //   (types 재생성 전까지). 기존 RPC 호출은 타입 안전을 그대로 유지.
  const rpcUntyped = supabase.rpc.bind(supabase) as unknown as (
    name: string, args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;

  // [CL-ACQ-ADMIN-20260622-233012] 유입경로 집계(개선1) — 메인 쿼리와 병렬(기존 튜플 불변).
  //  RPC 미배포/비관리자 → 빈 배열 degrade. 결과는 본문 끝에서 반영.
  const acquisitionPromise: Promise<AcquisitionDatum[]> = (async () => {
    try {
      const r = await supabase.rpc('admin_acquisition_breakdown');
      return !r.error && Array.isArray(r.data) ? (r.data as AcquisitionDatum[]) : [];
    } catch {
      return [];
    }
  })();
  // [CL-ADMIN-KST-20260709-000939] admin/스태프 전원 제외 집합 — user_roles(role='admin') ∪ 하드코딩 폴백(degrade-safe).
  //   기존 단일 하드코딩 uid 만 제외하던 것을 role 기반 전원 제외로 정밀화(복수 admin·스태프 활동 혼입 방지).
  const adminUserIds = new Set<string>([ADMIN_USER_ID]);
  try {
    const rr = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    for (const row of ((rr.data || []) as Array<{ user_id: string | null }>)) if (row.user_id) adminUserIds.add(row.user_id);
  } catch { /* 실패 시 하드코딩 폴백만 유지 */ }
  const adminInList = `(${[...adminUserIds].join(',')})`;

  // [CL-AUDIT-R4-WATERFALL-20260623] (#14) admin 소유 예산 id 조회를 메인 배치와 병렬 시작 → 직렬 워터폴 1단계(1 RTT) 제거.
  const adminBudgetIdsPromise: Promise<string[]> = (async () => {
    const r = await supabase.from('budgets').select('id').in('user_id', [...adminUserIds]);
    return (r.data || []).map((b) => b.id);
  })();
  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const prevStart = subDays(startDate, periodDays);
  const prevEnd = subDays(endDate, periodDays);
  // [CL-FACT-WINBOUNDS-20260630] DAU/WAU/MAU 를 'now'가 아니라 선택 기간 종료(endDate)에 앵커 + 상한(lte) 적용.
  //   과거: now 앵커·상한 없음 → 폴링마다 값 드리프트, 선택 기간 무시(미래/기간외 행 포함). 결정론·기간정렬 회복.
  const winEnd = endDate;
  const winEndISO = winEnd.toISOString();
  // [CL-ADMIN-KST-20260709-000939] '오늘'=KST 달력일 시작(브라우저 로컬 startOfDay 아님). 주/월은 롤링(절대 7·30일).
  const todayStart = startOfKstDayUtc(winEnd);
  const weekAgo = subKstDays(winEnd, 7);
  const monthAgo = subKstDays(winEnd, 30);

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  // [CL-AUDIT-CUMSUM-BOUNDARY-20260622] 누적 baseline 컷오프를 첫 일별 버킷 시작과 정렬(경계 갭 제거)
  const cumulativeBaselineISO = firstTrendBucketStart(endDate, periodDays).toISOString();

  // [CL-ACQ-VISIT-20260623-230113] 방문 기준 유입(기간 내) — 메인 배치와 병렬 시작, RPC 미배포 시 [] degrade. {visits}→{users} 매핑(렌더 재사용).
  const visitSourcePromise: Promise<AcquisitionDatum[]> = (async () => {
    try {
      const r = await supabase.rpc('admin_visit_source_breakdown', { p_start: startISO, p_end: endISO });
      return !r.error && Array.isArray(r.data)
        ? (r.data as Array<{ source: string; visits: number }>).map((d) => ({ source: d.source, users: d.visits }))
        : [];
    } catch {
      return [];
    }
  })();
  // [CL-IMPROVE2-VISITHIST-20260625] 방문 빈도 분포(1..10+) — RPC 미배포 시 빈배열 degrade. 빈 버킷 0으로 채워 1~10 항상 표시.
  const visitHistogramPromise: Promise<VisitHistogramDatum[]> = (async () => {
    try {
      const r = await supabase.rpc('admin_visit_histogram', { p_start: startISO, p_end: endISO });
      if (r.error || !Array.isArray(r.data)) return [];
      const byBucket = new Map<number, number>();
      for (const d of r.data as Array<{ visits: number; user_count: number }>) byBucket.set(d.visits, d.user_count);
      const out: VisitHistogramDatum[] = [];
      for (let v = 1; v <= 10; v++) out.push({ bucket: v === 10 ? '10회+' : `${v}회`, users: byBucket.get(v) ?? 0 });
      return out;
    } catch {
      return [];
    }
  })();
  // [CL-IMPROVE3-REFJOINS-20260625] 초대 수락 합류 추이(일자별) — RPC 미배포 시 빈배열 degrade.
  const referralJoinsPromise: Promise<ReferralJoinDatum[]> = (async () => {
    try {
      const r = await supabase.rpc('admin_referral_joins', { p_start: startISO, p_end: endISO });
      return !r.error && Array.isArray(r.data) ? (r.data as ReferralJoinDatum[]) : [];
    } catch {
      return [];
    }
  })();
  // [CL-ANONVISIT-ADMIN-20260627-234656] 전체 방문(익명 포함) 3종 — RPC 미배포 시 [] degrade.
  const anonTrendPromise: Promise<AnonTrafficDatum[]> = (async () => {
    try {
      const r = await rpcUntyped('admin_anon_traffic_trend', { p_start: startISO, p_end: endISO });
      return !r.error && Array.isArray(r.data)
        ? (r.data as Array<{ day: string; views: number; sessions: number }>).map((d) => {
            // [CL-ADMIN-KST-20260709-000939] RPC day 는 이미 Asia/Seoul(KST) 달력일 문자열 → 로컬 Date 파싱 없이 직접 'M/d'.
            const [, mm, dd] = String(d.day).split('-');
            return { day: `${Number(mm)}/${Number(dd)}`, views: d.views, sessions: d.sessions };
          })
        : [];
    } catch {
      return [];
    }
  })();
  const anonSourcePromise: Promise<AcquisitionDatum[]> = (async () => {
    try {
      const r = await rpcUntyped('admin_anon_source_breakdown', { p_start: startISO, p_end: endISO });
      return !r.error && Array.isArray(r.data)
        ? (r.data as Array<{ source: string; visits: number }>).map((d) => ({ source: d.source, users: d.visits }))
        : [];
    } catch {
      return [];
    }
  })();
  const anonTopPagesPromise: Promise<AnonTopPageDatum[]> = (async () => {
    try {
      const r = await rpcUntyped('admin_anon_top_pages', { p_start: startISO, p_end: endISO });
      return !r.error && Array.isArray(r.data)
        ? (r.data as Array<{ page_path: string; views: number }>).map((d) => ({ path: d.page_path, views: d.views }))
        : [];
    } catch {
      return [];
    }
  })();

  const prevStartISO = prevStart.toISOString();
  const prevEndISO = prevEnd.toISOString();

  // [CL-AUDIT2-R4-DEGRADE-20260628] 코어 페치도 source 별 부분 degrade(F7) — fetchAllRows 는 에러 시 throw 하므로
  //   Promise.all fail-fast 가 '한 테이블 실패 = 전체 대시보드 백지화'를 유발했다. safe()로 감싸 실패 시 []로 강등하고
  //   failed 에 기록 → partialError 로 노출(무음 금지). 작은 .then(r=>r.data||[]) 계열은 이미 빈배열 degrade(불변).
  const failed: string[] = [];
  const safe = async <T,>(name: string, p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch (e) {
      console.warn(`[useAdminKPI] core source '${name}' degraded:`, e);
      failed.push(name);
      return fallback;
    }
  };

  // Parallel fetch — paginated for large tables (page_views, budget_items)
  const [
    profiles, prevProfiles,
    pageViews, prevPageViews,
    budgets, prevBudgets,
    budgetItems, periodBudgetItems,
    sharedBudgets,
    snapshots,
    todayPVRes, weekPVRes, monthPVRes,
    preWindowSignups,
  ] = await Promise.all([
    // profiles — small table, no pagination needed
    supabase.from('profiles').select('user_id, created_at').not('user_id', 'in', adminInList).gte('created_at', startISO).lte('created_at', endISO).then(r => r.data || []),
    supabase.from('profiles').select('user_id, created_at').not('user_id', 'in', adminInList).gte('created_at', prevStartISO).lte('created_at', prevEndISO).then(r => r.data || []),
    // page_views — PAGINATED, admin excluded
    safe('page_views', fetchAllRows<{ user_id: string | null; created_at: string; page_path: string; duration_seconds: number | null }>(
      () => supabase.from('page_views').select('user_id, created_at, page_path, duration_seconds').not('user_id', 'in', adminInList).gte('created_at', startISO).lte('created_at', endISO).order('created_at', { ascending: true })
    ), []),
    safe('page_views_prev', fetchAllRows<{ user_id: string | null; created_at: string; duration_seconds: number | null }>(
      () => supabase.from('page_views').select('user_id, created_at, duration_seconds').not('user_id', 'in', adminInList).gte('created_at', prevStartISO).lte('created_at', prevEndISO).order('created_at', { ascending: true })
    ), []),
    // budgets — all (for user mapping), admin excluded
    supabase.from('budgets').select('id, user_id, created_at').not('user_id', 'in', adminInList).then(r => r.data || []),
    supabase.from('budgets').select('id, user_id, created_at').not('user_id', 'in', adminInList).gte('created_at', prevStartISO).lte('created_at', prevEndISO).then(r => r.data || []),
    // budget_items — PAGINATED, all (admin budget_ids filtered client-side) — includes category/sub_category for impact calc
    safe('budget_items', fetchAllRows<{ budget_id: string; amount: number; is_paid: boolean; created_at: string; category: string; sub_category: string }>(
      () => supabase.from('budget_items').select('budget_id, amount, is_paid, created_at, category, sub_category').order('created_at', { ascending: true })
    ), []),
    // budget_items filtered to period
    safe('budget_items_period', fetchAllRows<{ budget_id: string; amount: number; is_paid: boolean; created_at: string }>(
      () => supabase.from('budget_items').select('budget_id, amount, is_paid, created_at').gte('created_at', startISO).lte('created_at', endISO).order('created_at', { ascending: true })
    ), []),
    supabase.from('shared_budgets').select('id, budget_id, created_at').then(r => r.data || []),
    supabase.from('budget_snapshots').select('id, user_id, created_at').not('user_id', 'in', adminInList).then(r => r.data || []),
    // DAU/WAU/MAU counts — paginated, admin excluded
    // [CL-FACT-WINBOUNDS-20260630] endDate 상한(lte) 추가 → 선택 기간 밖/미래 행 제외, 폴링 결정론.
    safe('page_views_today', fetchAllRows<{ user_id: string | null }>(
      () => supabase.from('page_views').select('user_id').not('user_id', 'in', adminInList).gte('created_at', todayStart.toISOString()).lte('created_at', winEndISO).order('created_at', { ascending: true })
    ), []),
    safe('page_views_week', fetchAllRows<{ user_id: string | null }>(
      () => supabase.from('page_views').select('user_id').not('user_id', 'in', adminInList).gte('created_at', weekAgo.toISOString()).lte('created_at', winEndISO).order('created_at', { ascending: true })
    ), []),
    safe('page_views_month', fetchAllRows<{ user_id: string | null }>(
      () => supabase.from('page_views').select('user_id').not('user_id', 'in', adminInList).gte('created_at', monthAgo.toISOString()).lte('created_at', winEndISO).order('created_at', { ascending: true })
    ), []),
    // [CL-ADMIN-SIGNUP-TREND-20260622] 윈도우 이전 누적 가입자 수 = 진짜 누적의 baseline(소형 profiles 테이블, head count)
    // [CL-AUDIT-CUMSUM-BOUNDARY-20260622] 컷오프=첫 일별 버킷 시작(startISO 아님) → 경계 갭(첫 부분일 가입 누락) 제거
    supabase.from('profiles').select('user_id', { count: 'exact', head: true }).not('user_id', 'in', adminInList).lt('created_at', cumulativeBaselineISO).then(r => r.count ?? 0),
  ]);

  const todayPV = todayPVRes;
  const weekPV = weekPVRes;
  const monthPV = monthPVRes;

  // Filter budget_items to exclude admin-owned budgets (client-side)
  // [CL-AUDIT-R4-WATERFALL-20260623] 병렬로 시작한 admin 예산 id 결과 수거(직렬 추가 RTT 제거)
  const adminBudgetIds = new Set(await adminBudgetIdsPromise);
  const filteredBudgetItems = budgetItems.filter(bi => !adminBudgetIds.has(bi.budget_id));
  const filteredPeriodBudgetItems = periodBudgetItems.filter(bi => !adminBudgetIds.has(bi.budget_id));
  const filteredSharedBudgets = sharedBudgets.filter(sb => !adminBudgetIds.has(sb.budget_id));

  // K01: 신규 가입자
  const k01 = profiles.length;
  const k01Prev = prevProfiles.length;

  // K02-K04: DAU/WAU/MAU — 고유 사용자(순수함수·TZ 무관)
  const dau = uniqueUserCount(todayPV);
  const wau = uniqueUserCount(weekPV);
  const mau = uniqueUserCount(monthPV);

  // [CL-ADMIN-KST-20260709-000939] 전기 동일 위치 KST 일자의 DAU(변화율 비교용)
  const prevDauDay = subKstDays(winEnd, periodDays);
  const prevDauStartMs = startOfKstDayUtc(prevDauDay).getTime();
  const prevDauEndMs = endOfKstDayUtc(prevDauDay).getTime();
  const prevDAU = uniqueUserCount(prevPageViews.filter(p => { const t = Date.parse(p.created_at); return t >= prevDauStartMs && t <= prevDauEndMs; }));

  // K05/K13/K14/K18 위조분모(mau||1, max(totalAmount,1)) 제거 → 임팩트 산출 직후 computeUsageRates 로 정직 산출.

  // K06-K08: Retention
  const allProfiles = profiles;
  // [CL-AUDIT2-R5-PERF-20260628] O(P+V) 순수 모듈. [CL-FACT-RETENTION-20260630] 관측가능 코호트 분모(Measure 반환).
  //   비교마다 new Date() 생성하던 비용 제거(파싱 1회 인덱스). d1/d7/d30 결과는 기존과 비트 동일.
  // [CL-FACT-RETENTION-20260630] 관측 가능한 코호트(기념일 도래분)만 분모로 → deflate 제거. observableEnd=endDate.
  const d1Retention = computeRetentionMeasure(allProfiles, pageViews, 1, endDate);
  const d7Retention = computeRetentionMeasure(allProfiles, pageViews, 7, endDate);
  const d30Retention = computeRetentionMeasure(allProfiles, pageViews, 30, endDate);

  // K09: 가입→예산 생성(24h) — [CL-AUDIT-R9-K09PERF-20260630] O(P×B) 중첩 스캔 → 인덱스 O(P+B)(동치·골든 고정).
  const k09Count = countSignupToBudget24h(allProfiles, budgets);
  const k09 = allProfiles.length > 0 ? (k09Count / allProfiles.length) * 100 : 0;

  // K10: 가입→첫 금액 입력(24h) & K11: TTFV
  const budgetUserMap: Record<string, string> = {};
  budgets.forEach(b => { budgetUserMap[b.id] = b.user_id; });

  const profileSignupMap: Record<string, number> = {};
  allProfiles.forEach(p => { profileSignupMap[p.user_id] = new Date(p.created_at).getTime(); });

  const itemsWithAmount = filteredBudgetItems.filter(bi => bi.amount > 0);

  let k10Count = 0;
  const ttfvValues: number[] = [];
  const processedUsers = new Set<string>();

  for (const item of itemsWithAmount) {
    const userId = budgetUserMap[item.budget_id];
    if (!userId || processedUsers.has(userId)) continue;
    const signupTime = profileSignupMap[userId];
    if (!signupTime) continue;

    const itemTime = new Date(item.created_at).getTime();
    const diff = itemTime - signupTime;
    if (diff >= 0 && diff <= 86400000) {
      k10Count++;
    }
    if (diff >= 0) {
      ttfvValues.push(differenceInMinutes(new Date(item.created_at), new Date(signupTime)));
      processedUsers.add(userId);
    }
  }
  const k10 = allProfiles.length > 0 ? (k10Count / allProfiles.length) * 100 : 0;

  ttfvValues.sort((a, b) => a - b);
  const ttfvMedian = ttfvValues.length > 0 ? ttfvValues[Math.floor(ttfvValues.length / 2)] : 0;

  // K12: 다중 시나리오 사용률
  const userBudgetCount: Record<string, number> = {};
  budgets.forEach(b => { userBudgetCount[b.user_id] = (userBudgetCount[b.user_id] || 0) + 1; });
  const totalBudgetUsers = Object.keys(userBudgetCount).length;
  const multiBudgetUsers = Object.values(userBudgetCount).filter(c => c >= 2).length;
  const k12 = totalBudgetUsers > 0 ? (multiBudgetUsers / totalBudgetUsers) * 100 : 0;

  // K13/K14 모수(공유·스냅샷 사용자) — 분모(MAU)는 computeUsageRates 가 정직 처리(위조 'mau || 1' 제거).
  const shareUsers = new Set(filteredSharedBudgets.map(sb => budgetUserMap[sb.budget_id]).filter(Boolean)).size;
  const snapshotUsers = new Set(snapshots.map(s => s.user_id)).size;

  // K15: 예산 집행률 — uses period-filtered budget_items
  const totalAmount = filteredPeriodBudgetItems.reduce((s, i) => s + (i.amount || 0), 0);
  const paidAmount = filteredPeriodBudgetItems.filter(i => i.is_paid).reduce((s, i) => s + (i.amount || 0), 0);
  const k15 = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  // ─── Phase 4-A: 경제적 파급 효과 + 위조분모 정직화(개선1) ───
  // [CL-FACT-COMPUTE-20260630] 임팩트를 values 배열 이전에 산출 → K18(예비비 준비율) 분모를
  //   분자(예비비 총액)와 동일 스코프(전체 filteredBudgetItems 합)로 맞추고 정직 Measure 로 방출.
  const monthlyActiveDegraded = failed.includes('page_views_month');
  const budgetItemsDegraded = failed.includes('budget_items');
  const totalBudgetAmount = filteredBudgetItems.reduce((s, i) => s + (i.amount || 0), 0);

  let impactSummary: ImpactSummary = EMPTY_DATA.impactSummary;
  try {
    // Group budget_items by budget_id to build BudgetForImpact[]
    const budgetItemsMap: Record<string, BudgetForImpact['items']> = {};
    for (const bi of filteredBudgetItems) {
      if (!budgetItemsMap[bi.budget_id]) budgetItemsMap[bi.budget_id] = [];
      budgetItemsMap[bi.budget_id].push({
        category: (bi as { category?: string }).category || '',
        sub_category: (bi as { sub_category?: string }).sub_category || '',
        amount: bi.amount,
      });
    }
    const budgetsForImpact: BudgetForImpact[] = Object.entries(budgetItemsMap).map(([id, items]) => ({ id, items }));
    impactSummary = calculateImpact(budgetsForImpact);
  } catch (impactErr) {
    console.warn('Impact calculation error (non-critical):', impactErr);
  }

  // [CL-FACT-COMPUTE-20260630] K05/K13/K14/K18 정직 산출(위조 분모 제거 단일 진실원).
  const usage = computeUsageRates({
    dau, mau, shareUsers, snapshotUsers,
    contingencyFund: impactSummary.totalContingencyFund,
    totalBudgetAmount,
    monthlyActiveDegraded, budgetItemsDegraded,
  });

  const calcChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
  };

  const values: KPIValue[] = [
    { id: 'K01', value: k01, change: calcChange(k01, k01Prev) },
    { id: 'K02', value: dau, change: calcChange(dau, prevDAU) },
    { id: 'K03', value: wau, change: 0 },
    { id: 'K04', value: mau, change: 0 },
    measureToKpiValue('K05', usage.stickiness),
    measureToKpiValue('K06', d1Retention),
    measureToKpiValue('K07', d7Retention),
    measureToKpiValue('K08', d30Retention),
    { id: 'K09', value: Math.round(k09 * 10) / 10, change: 0 },
    { id: 'K10', value: Math.round(k10 * 10) / 10, change: 0 },
    { id: 'K11', value: ttfvMedian, change: 0 },
    { id: 'K12', value: Math.round(k12 * 10) / 10, change: 0 },
    measureToKpiValue('K13', usage.shareRate),
    measureToKpiValue('K14', usage.snapshotRate),
    { id: 'K15', value: Math.round(k15 * 10) / 10, change: 0 },
    // K16/K17 = 임팩트 평균(분모 위조 없음) · K18 = 정직 비율(분자·분모 동일 스코프)
    { id: 'K16', value: Math.round(impactSummary.avgSavingsRate * 10) / 10, change: 0 },
    { id: 'K17', value: Math.round(impactSummary.avgHiddenCostsIdentified * 10) / 10, change: 0 },
    measureToKpiValue('K18', usage.contingencyRatio),
  ];

  // Trend data: aggregate by day
  const dayCount = Math.min(periodDays, 90);
  const trend: TrendDataPoint[] = [];
  for (let i = 0; i < dayCount; i++) {
    // [CL-ADMIN-KST-20260709-000939] KST 달력일 경계(절대 ms 비교) + 고유/충성/체류는 순수함수 위임(TZ 무관·골든 검증)
    const day = subKstDays(endDate, dayCount - 1 - i);
    const dayStartMs = startOfKstDayUtc(day).getTime();
    const dayEndMs = endOfKstDayUtc(day).getTime();
    const dateStr = kstMonthDayLabel(day);
    const inDay = (iso: string) => { const t = Date.parse(iso); return t >= dayStartMs && t <= dayEndMs; };

    const dayPVs = pageViews.filter(pv => inDay(pv.created_at));
    const daySignups = profiles.filter(p => inDay(p.created_at));
    const dayPVCount = dayPVs.length;

    // 충성: 당일 종료 기준 롤링 7일 내 서로 다른 KST일 2회+
    const trailing7StartMs = dayEndMs - 7 * 86_400_000;
    const trailing7PVs = pageViews.filter(pv => { const t = Date.parse(pv.created_at); return t >= trailing7StartMs && t <= dayEndMs; });
    const dayLoyalCount = loyalUserCount(trailing7PVs);

    const dayAvgDuration = avgPositiveDuration(dayPVs);

    const dayAmountEntered = filteredPeriodBudgetItems.filter(bi => inDay(bi.created_at) && bi.amount > 0).length;

    trend.push({
      date: dateStr,
      dau: uniqueUserCount(dayPVs),
      wau: uniqueUserCount(pageViews.filter(pv => { const t = Date.parse(pv.created_at); return t >= dayEndMs - 7 * 86_400_000 && t <= dayEndMs; })),
      mau: uniqueUserCount(pageViews.filter(pv => { const t = Date.parse(pv.created_at); return t >= dayEndMs - 30 * 86_400_000 && t <= dayEndMs; })),
      signups: daySignups.length,
      budgetCreated: budgets.filter(b => inDay(b.created_at)).length,
      amountEntered: dayAmountEntered,
      pv: dayPVCount,
      loyalCount: dayLoyalCount,
      avgDuration: dayAvgDuration,
    });
  }
  // [CL-ADMIN-SIGNUP-TREND-20260622] 일별 신규 → 누적 가입자 주입(윈도우 이전 baseline 포함 = 진짜 누적)
  const trendData = withCumulativeSignups(trend, preWindowSignups);

  // Top pages
  const pageCounts: Record<string, number> = {};
  pageViews.forEach(pv => {
    pageCounts[pv.page_path] = (pageCounts[pv.page_path] || 0) + 1;
  });
  const totalPV = pageViews.length || 1;
  const topPages: TopPage[] = Object.entries(pageCounts)
    .map(([path, views]) => ({ path, views, percentage: Math.round((views / totalPV) * 1000) / 10 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // ===== Summary KPIs =====
  const totalPVCount = pageViews.length;
  const prevPVCount = prevPageViews.length;

  // [CL-ADMIN-KST-20260709-000939] 충성/고유/체류 순수함수 위임(KST 달력일 dedup·TZ 무관·골든 검증)
  const loyal = loyalUserCount(pageViews);
  const totalUnique = uniqueUserCount(pageViews);
  const prevLoyal = loyalUserCount(prevPageViews);
  const avgDur = avgPositiveDuration(pageViews);
  const prevAvgDur = avgPositiveDuration(prevPageViews);

  const summaryKPIs: SummaryKPIs = {
    totalPageViews: totalPVCount,
    prevTotalPageViews: prevPVCount,
    loyalUsers: loyal,
    prevLoyalUsers: prevLoyal,
    totalUniqueUsers: totalUnique,
    avgSessionTime: Math.round(avgDur),
    prevAvgSessionTime: prevAvgDur,
    dailyPageViews: todayPV.length,
    weeklyPageViews: weekPV.length,
    monthlyPageViews: monthPV.length,
  };

  // [CL-ACQ-ADMIN-20260622-233012] 유입경로 집계 반영(개선1)
  const acquisitionData = await acquisitionPromise;
  // [CL-ACQ-VISIT-20260623-230113] 방문 기준 유입경로 반영
  const visitSourceData = await visitSourcePromise;
  // [CL-IMPROVE2-VISITHIST-20260625] 방문 빈도 분포 반영
  const visitHistogram = await visitHistogramPromise;
  // [CL-IMPROVE3-REFJOINS-20260625] 초대 수락 합류 추이 + 총계 반영
  const referralJoins = await referralJoinsPromise;
  const referralJoinsTotal = referralJoins.reduce((s, d) => s + (d.joins || 0), 0);
  // [CL-ANONVISIT-ADMIN-20260627-234656] 전체 방문(익명 포함) 반영
  const anonTrafficTrend = await anonTrendPromise;
  const anonSourceData = await anonSourcePromise;
  const anonTopPages = await anonTopPagesPromise;

  // [CL-FACT-COMPUTE-20260630] 임팩트 계산·K16~K18 방출은 values 배열 이전으로 이동(K18 분모 스코프 정합).

  return {
    kpiValues: values,
    trendData,
    topPages,
    summaryKPIs,
    impactSummary,
    acquisitionData,
    visitSourceData,
    visitHistogram,
    referralJoins,
    referralJoinsTotal,
    anonTrafficTrend,
    anonSourceData,
    anonTopPages,
    // [CL-AUDIT2-R4-DEGRADE-20260628] 부분 degrade 된 코어 source 노출(없으면 null)
    partialError: failed.length ? failed.join(', ') : null,
  };
}

/**
 * [CL-ADMIN-RQ-MIGRATION-20260627-234656] React Query 준실시간 Admin KPI 훅.
 * @param startDate/endDate 집계 기간(둘 다 있어야 쿼리 활성). 없으면 비활성(fetchData shim 만 사용 가능).
 * @param options.enabled 관리자 확인 등 외부 게이트(기본 true).
 */
export function useAdminKPI(
  startDate?: Date,
  endDate?: Date,
  options?: { enabled?: boolean },
): UseAdminKPIResult {
  const startISO = startDate?.toISOString();
  const endISO = endDate?.toISOString();
  const enabled = !!startDate && !!endDate && (options?.enabled ?? true);

  const query = useQuery({
    queryKey: ['admin', 'kpi', 'core', startISO, endISO],
    queryFn: () => loadAdminKpi(startDate!, endDate!),
    enabled,
    placeholderData: keepPreviousData, // 기간 변경/폴링 시 직전 데이터 유지(깜빡임 방지)
    ...ADMIN_HEAVY,
  });

  const data = query.data ?? EMPTY_DATA;

  // [CL-AUDIT-CUMSUM-BOUNDARY-20260622] 회귀 가드 호환 shim — 원시 적재 로직을 임의 기간으로 1회 실행.
  const fetchData = useCallback(async (s: Date, e: Date) => {
    await loadAdminKpi(s, e);
  }, []);

  return {
    ...data,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? '데이터를 불러오는 중 오류가 발생했습니다.' : null,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
    fetchData,
  };
}
