import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// [CL-QA100-BTN-20260531] Supabase 클라이언트 전역 모킹.
// 거의 모든 페이지가 Footer→FeatureRequestButton 등으로 supabase 클라이언트를 import하며,
// 클라이언트는 생성 즉시 비동기 auth 세션 초기화(네트워크)를 시도해 테스트에서 unhandled rejection 유발.
// → 체이너블 쿼리빌더 + auth no-op 스텁으로 대체 (네트워크 0, 결정론적).
vi.mock("@/integrations/supabase/client", () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {};
    const methods = [
      "select", "insert", "update", "delete", "upsert", "eq", "neq", "gt", "gte",
      "lt", "lte", "like", "ilike", "is", "in", "contains", "order", "limit",
      "range", "single", "maybeSingle", "match", "filter", "or", "not", "textSearch", "returns",
    ];
    for (const m of methods) q[m] = vi.fn(() => q);
    // thenable → await 시 빈 결과 반환
    (q as Record<string, unknown>).then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    return q;
  };
  const subscription = { unsubscribe: vi.fn() };
  const supabase = {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription } })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signUp: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(() => makeQuery()),
    rpc: vi.fn(async () => ({ data: [], error: null })),
    channel: vi.fn(() => {
      const ch: Record<string, unknown> = {};
      ch.on = vi.fn(() => ch);
      ch.subscribe = vi.fn(() => ch);
      ch.unsubscribe = vi.fn();
      return ch;
    }),
    removeChannel: vi.fn(),
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: null, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
      })),
    },
  };
  return { supabase };
});

// [CL-GAMIFY-QA50-20260418-224158] 테스트간 DOM 자동 정리 — getByRole 다중 매칭 방지
afterEach(() => {
  cleanup();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
