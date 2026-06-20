// [CL-DBSWITCH-20260620-140000] Edge Functions 통합.
// 과거: 메인 DB가 Lovable 관리(tnboeqtdimyxpjzsraro)라 Edge를 못 올려 별도 프로젝트(qllsuouxeojhwgonwpqb)에 배포했음.
// 현재: 메인 DB가 자가 소유(pnfjwsugsdyzyahrants)로 이전 완료 → Edge를 메인 프로젝트로 통합.
//   장점: Edge=메인 DB 동일 프로젝트 → 예약 SUPABASE_URL/SERVICE_ROLE_KEY가 자동으로 메인 DB를 가리킴(쓰기 정상),
//         교차프로젝트 검증용 MAIN_SUPABASE_* 시크릿 불요(로컬 getUser로 바로 검증됨).
// ⚠️ 전제: 함수가 새 프로젝트에 배포돼 있어야 함 →  npx supabase functions deploy --project-ref pnfjwsugsdyzyahrants
//   (앱 배포보다 먼저 함수 배포 + OPENAI_API_KEY 등 시크릿 설정. 안 그러면 AI 호출 404.)
// anon 키는 공개(publishable) — 클라 코드에 안전.

const EDGE_PROJECT_URL = 'https://pnfjwsugsdyzyahrants.supabase.co';
const EDGE_PROJECT_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuZmp3c3Vnc2R5enlhaHJhbnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MzA2NTAsImV4cCI6MjA5NzUwNjY1MH0.Lk6BGwhOEee251lyBYloa6FScU_Xu-pjkJFrU4CkItU';

export const EDGE_FUNCTION_URL =
  import.meta.env.VITE_EDGE_FUNCTION_URL || EDGE_PROJECT_URL;

export const EDGE_FUNCTION_KEY =
  import.meta.env.VITE_EDGE_FUNCTION_KEY || EDGE_PROJECT_KEY;
