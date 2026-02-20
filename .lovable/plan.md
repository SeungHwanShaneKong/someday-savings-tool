
# 관리자 대시보드 개선 + 모바일 팝업 추가

## 개선 요청사항 1: 관리자 활동 제외

### 문제
현재 `useAdminKPI.tsx`에서 `page_views`, `profiles`, `budgets`, `budget_items` 등 모든 데이터를 필터링 없이 집계하고 있어, 관리자(`seunghwan.kong@gmail.com`, user_id: `f628fbf6-5f2f-4ca1-86e0-21eb2395bc40`)의 활동이 모든 KPI에 포함됩니다.

### 해결 방안

**파일: `src/hooks/useAdminKPI.tsx`**

1. 상단에 관리자 user_id 상수 정의:
```
const ADMIN_USER_ID = 'f628fbf6-5f2f-4ca1-86e0-21eb2395bc40';
```

2. 모든 데이터를 fetch한 직후, 관리자 데이터를 클라이언트 측에서 필터링:
   - `page_views`: `user_id !== ADMIN_USER_ID`인 것만 사용
   - `profiles`: `user_id !== ADMIN_USER_ID`인 것만 사용
   - `budgets`: `user_id !== ADMIN_USER_ID`인 것만 사용
   - `budget_items`: 관리자 소유 budget_id를 제외
   - `budget_snapshots`: `user_id !== ADMIN_USER_ID`인 것만 사용
   - `todayPV/weekPV/monthPV`: 관리자 제외 필터

3. Supabase 쿼리에 `.neq('user_id', ADMIN_USER_ID)`를 직접 추가하는 방식도 가능하지만, `budget_items`는 `user_id` 컬럼이 없어 조인이 필요하므로, 클라이언트 측 필터링이 더 간단합니다. 단, `page_views` 등 user_id가 있는 테이블은 쿼리 레벨에서 `.neq()`로 제외하면 전송량도 줄어들어 효율적입니다.

**적용 전략 (하이브리드):**
- `page_views`, `profiles`, `snapshots`: 쿼리에 `.neq('user_id', ADMIN_USER_ID)` 추가
- `budgets`: 쿼리에 `.neq('user_id', ADMIN_USER_ID)` 추가
- `budget_items`: 관리자 소유 budget_id를 먼저 식별 후 클라이언트에서 필터링
- `shared_budgets`: 관리자 소유 budget_id 제외

---

## 개선 요청사항 2: 모바일/태블릿 안내 팝업

### 요구사항
- 모바일 또는 태블릿에서 로그인 후 "데스크톱 환경에서 가장 편리하게 보실 수 있어요^^" 팝업 표시
- 사용자별 하루 1번만 표시
- 반복 표시 방지

### 해결 방안

**새 파일: `src/components/MobileDesktopNotice.tsx`**

1. `useIsMobile()` 훅 + `window.innerWidth < 1024` (태블릿 포함) 체크
2. `useAuth()`로 로그인 상태 확인
3. `localStorage`에 `desktop_notice_shown_{userId}_{YYYY-MM-DD}` 키로 표시 여부 저장
4. 조건 충족 시 `Dialog` 또는 `sonner` toast로 팝업 표시
5. 닫기 시 localStorage에 오늘 날짜 기록

**파일: `src/App.tsx`**
- `<MobileDesktopNotice />` 컴포넌트를 `AppRoutes` 내부에 추가

---

## 변경 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/hooks/useAdminKPI.tsx` | 관리자 user_id 상수 추가, 모든 쿼리/계산에서 관리자 제외 |
| `src/components/MobileDesktopNotice.tsx` | 새 파일 - 모바일/태블릿 안내 팝업 |
| `src/App.tsx` | MobileDesktopNotice 컴포넌트 추가 |

---

## 7가지 검증 시나리오

1. **PV에서 관리자 제외 확인**: SQL로 관리자 제외 PV 수 조회 후 대시보드 값과 비교
2. **DAU/WAU/MAU에서 관리자 제외 확인**: 관리자 user_id가 활성 사용자 수에 포함되지 않는지 확인
3. **K01(신규 가입자)에서 관리자 제외 확인**: profiles 카운트에서 관리자 제외되는지 확인
4. **충성 고객에서 관리자 제외 확인**: 관리자가 충성 고객 수에 포함되지 않는지 확인
5. **모바일 팝업 표시 확인**: 모바일 뷰포트 + 로그인 상태에서 팝업이 뜨는지 확인
6. **팝업 하루 1회 제한 확인**: 팝업 닫은 후 새로고침 시 다시 뜨지 않는지 확인
7. **데스크톱에서 팝업 미표시 확인**: 데스크톱 뷰포트에서 팝업이 뜨지 않는지 확인
