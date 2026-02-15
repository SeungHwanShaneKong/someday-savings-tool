import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay, format, differenceInMinutes } from 'date-fns';
import type { KPIValue, TrendDataPoint, TopPage } from '@/lib/kpi-definitions';

interface UseAdminKPIResult {
  kpiValues: KPIValue[];
  trendData: TrendDataPoint[];
  topPages: TopPage[];
  loading: boolean;
  error: string | null;
  fetchData: (startDate: Date, endDate: Date) => Promise<void>;
}

export function useAdminKPI(): UseAdminKPIResult {
  const [kpiValues, setKpiValues] = useState<KPIValue[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (startDate: Date, endDate: Date) => {
    setLoading(true);
    setError(null);

    try {
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const prevStart = subDays(startDate, periodDays);
      const prevEnd = subDays(endDate, periodDays);
      const now = new Date();
      const todayStart = startOfDay(now);
      const weekAgo = subDays(now, 7);
      const monthAgo = subDays(now, 30);

      // Parallel fetch all data
      const [
        profilesRes, prevProfilesRes,
        pageViewsRes, prevPageViewsRes,
        budgetsRes, prevBudgetsRes,
        budgetItemsRes,
        sharedBudgetsRes,
        snapshotsRes,
        todayPVRes,
        weekPVRes,
        monthPVRes,
      ] = await Promise.all([
        supabase.from('profiles').select('user_id, created_at').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()),
        supabase.from('profiles').select('user_id, created_at').gte('created_at', prevStart.toISOString()).lte('created_at', prevEnd.toISOString()),
        supabase.from('page_views').select('user_id, created_at, page_path, duration_seconds').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()),
        supabase.from('page_views').select('user_id, created_at').gte('created_at', prevStart.toISOString()).lte('created_at', prevEnd.toISOString()),
        supabase.from('budgets').select('id, user_id, created_at'),
        supabase.from('budgets').select('id, user_id, created_at').gte('created_at', prevStart.toISOString()).lte('created_at', prevEnd.toISOString()),
        supabase.from('budget_items').select('budget_id, amount, is_paid, created_at'),
        supabase.from('shared_budgets').select('id, budget_id, created_at'),
        supabase.from('budget_snapshots').select('id, user_id, created_at'),
        supabase.from('page_views').select('user_id').gte('created_at', todayStart.toISOString()),
        supabase.from('page_views').select('user_id').gte('created_at', weekAgo.toISOString()),
        supabase.from('page_views').select('user_id').gte('created_at', monthAgo.toISOString()),
      ]);

      const profiles = profilesRes.data || [];
      const prevProfiles = prevProfilesRes.data || [];
      const pageViews = pageViewsRes.data || [];
      const prevPageViews = prevPageViewsRes.data || [];
      const budgets = budgetsRes.data || [];
      const budgetItems = budgetItemsRes.data || [];
      const sharedBudgets = sharedBudgetsRes.data || [];
      const snapshots = snapshotsRes.data || [];
      const todayPV = todayPVRes.data || [];
      const weekPV = weekPVRes.data || [];
      const monthPV = monthPVRes.data || [];

      // Helper: unique user_ids
      const unique = (arr: { user_id: string | null }[]) => new Set(arr.filter(a => a.user_id).map(a => a.user_id!));

      // K01: 신규 가입자
      const k01 = profiles.length;
      const k01Prev = prevProfiles.length;

      // K02-K04: DAU/WAU/MAU
      const dau = unique(todayPV).size;
      const wau = unique(weekPV).size;
      const mau = unique(monthPV).size;

      // Previous DAU/WAU/MAU approximation from prev period page views
      const prevDAU = new Set(prevPageViews.filter(p => {
        const d = new Date(p.created_at);
        return d >= startOfDay(subDays(now, periodDays)) && d <= endOfDay(subDays(now, periodDays));
      }).filter(p => p.user_id).map(p => p.user_id!)).size;

      // K05: Stickiness
      const stickiness = mau > 0 ? (dau / mau) * 100 : 0;

      // K06-K08: Retention (simplified: check if users who signed up in period came back)
      const allProfiles = profiles;
      const computeRetention = (daysAfter: number) => {
        if (allProfiles.length === 0) return 0;
        let returned = 0;
        for (const p of allProfiles) {
          const signupDate = new Date(p.created_at);
          const targetDate = subDays(now, -daysAfter); // Not useful, let's check from signup
          const targetStart = startOfDay(new Date(signupDate.getTime() + daysAfter * 86400000));
          const targetEnd = endOfDay(targetStart);
          const hasVisit = pageViews.some(pv =>
            pv.user_id === p.user_id &&
            new Date(pv.created_at) >= targetStart &&
            new Date(pv.created_at) <= targetEnd
          );
          if (hasVisit) returned++;
        }
        return allProfiles.length > 0 ? (returned / allProfiles.length) * 100 : 0;
      };
      const d1Retention = computeRetention(1);
      const d7Retention = computeRetention(7);
      const d30Retention = computeRetention(30);

      // K09: 가입→예산 생성(24h)
      let k09Count = 0;
      for (const p of allProfiles) {
        const signupTime = new Date(p.created_at).getTime();
        const has = budgets.some(b => b.user_id === p.user_id && new Date(b.created_at).getTime() - signupTime <= 86400000 && new Date(b.created_at).getTime() >= signupTime);
        if (has) k09Count++;
      }
      const k09 = allProfiles.length > 0 ? (k09Count / allProfiles.length) * 100 : 0;

      // K10: 가입→첫 금액 입력(24h) & K11: TTFV
      // Build budget_id -> user_id map
      const budgetUserMap: Record<string, string> = {};
      budgets.forEach(b => { budgetUserMap[b.id] = b.user_id; });
      
      // Profile signup times
      const profileSignupMap: Record<string, number> = {};
      allProfiles.forEach(p => { profileSignupMap[p.user_id] = new Date(p.created_at).getTime(); });

      // Items with amount > 0
      const itemsWithAmount = budgetItems.filter(bi => bi.amount > 0);
      
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
      
      // TTFV median
      ttfvValues.sort((a, b) => a - b);
      const ttfvMedian = ttfvValues.length > 0 ? ttfvValues[Math.floor(ttfvValues.length / 2)] : 0;

      // K12: 다중 시나리오 사용률
      const userBudgetCount: Record<string, number> = {};
      budgets.forEach(b => { userBudgetCount[b.user_id] = (userBudgetCount[b.user_id] || 0) + 1; });
      const totalBudgetUsers = Object.keys(userBudgetCount).length;
      const multiBudgetUsers = Object.values(userBudgetCount).filter(c => c >= 2).length;
      const k12 = totalBudgetUsers > 0 ? (multiBudgetUsers / totalBudgetUsers) * 100 : 0;

      // K13: 공유 링크 생성률
      const activeUsers = mau || 1;
      const shareUsers = new Set(sharedBudgets.map(sb => {
        return budgetUserMap[sb.budget_id];
      }).filter(Boolean)).size;
      const k13 = (shareUsers / activeUsers) * 100;

      // K14: 스냅샷 사용률
      const snapshotUsers = new Set(snapshots.map(s => s.user_id)).size;
      const k14 = (snapshotUsers / activeUsers) * 100;

      // K15: 예산 집행률
      const totalAmount = budgetItems.reduce((s, i) => s + (i.amount || 0), 0);
      const paidAmount = budgetItems.filter(i => i.is_paid).reduce((s, i) => s + (i.amount || 0), 0);
      const k15 = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

      // Change calculation helper
      const calcChange = (current: number, prev: number) => {
        if (prev === 0) return current > 0 ? 100 : 0;
        return ((current - prev) / prev) * 100;
      };

      const values: KPIValue[] = [
        { id: 'K01', value: k01, change: calcChange(k01, k01Prev) },
        { id: 'K02', value: dau, change: calcChange(dau, prevDAU) },
        { id: 'K03', value: wau, change: 0 },
        { id: 'K04', value: mau, change: 0 },
        { id: 'K05', value: Math.round(stickiness * 10) / 10, change: 0 },
        { id: 'K06', value: Math.round(d1Retention * 10) / 10, change: 0 },
        { id: 'K07', value: Math.round(d7Retention * 10) / 10, change: 0 },
        { id: 'K08', value: Math.round(d30Retention * 10) / 10, change: 0 },
        { id: 'K09', value: Math.round(k09 * 10) / 10, change: 0 },
        { id: 'K10', value: Math.round(k10 * 10) / 10, change: 0 },
        { id: 'K11', value: ttfvMedian, change: 0 },
        { id: 'K12', value: Math.round(k12 * 10) / 10, change: 0 },
        { id: 'K13', value: Math.round(k13 * 10) / 10, change: 0 },
        { id: 'K14', value: Math.round(k14 * 10) / 10, change: 0 },
        { id: 'K15', value: Math.round(k15 * 10) / 10, change: 0 },
      ];
      setKpiValues(values);

      // Trend data: aggregate by day
      const dayCount = Math.min(periodDays, 90);
      const trend: TrendDataPoint[] = [];
      for (let i = 0; i < dayCount; i++) {
        const day = subDays(endDate, dayCount - 1 - i);
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const dateStr = format(day, 'M/d');

        const dayPVs = pageViews.filter(pv => {
          const d = new Date(pv.created_at);
          return d >= dayStart && d <= dayEnd;
        });
        const daySignups = profiles.filter(p => {
          const d = new Date(p.created_at);
          return d >= dayStart && d <= dayEnd;
        });

        trend.push({
          date: dateStr,
          dau: unique(dayPVs).size,
          wau: unique(pageViews.filter(pv => {
            const d = new Date(pv.created_at);
            return d >= subDays(dayEnd, 7) && d <= dayEnd;
          })).size,
          mau: unique(pageViews.filter(pv => {
            const d = new Date(pv.created_at);
            return d >= subDays(dayEnd, 30) && d <= dayEnd;
          })).size,
          signups: daySignups.length,
          budgetCreated: budgets.filter(b => {
            const d = new Date(b.created_at);
            return d >= dayStart && d <= dayEnd;
          }).length,
          amountEntered: 0, // simplified
          d1: Math.round(d1Retention),
          d7: Math.round(d7Retention),
          d30: Math.round(d30Retention),
          multiScenario: Math.round(k12),
          shareLink: Math.round(k13),
          snapshot: Math.round(k14),
          executionRate: Math.round(k15),
          ttfv: ttfvMedian,
        });
      }
      setTrendData(trend);

      // Top pages
      const pageCounts: Record<string, number> = {};
      pageViews.forEach(pv => {
        pageCounts[pv.page_path] = (pageCounts[pv.page_path] || 0) + 1;
      });
      const totalPV = pageViews.length || 1;
      const tp: TopPage[] = Object.entries(pageCounts)
        .map(([path, views]) => ({ path, views, percentage: Math.round((views / totalPV) * 1000) / 10 }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);
      setTopPages(tp);
    } catch (err) {
      console.error('KPI fetch error:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { kpiValues, trendData, topPages, loading, error, fetchData };
}
