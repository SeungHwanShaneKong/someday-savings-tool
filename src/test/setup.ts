import "@testing-library/jest-dom";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
// [CL-MODAL-COORD-20260703-140000] 전역 모달 슬롯 조율기는 모듈 스코프 싱글턴 → singleFork 에서 파일 간
//   상태가 잔존해 오염된다. 매 테스트 전 슬롯 초기화 + 승계 지연 0(동기)으로 결정론·격리 보장.
import { __resetNoticeSlot, __setNoticeHandoffDelay } from "@/hooks/useNoticeSlot";

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

// [CL-MODAL-COORD-20260703-140000] 모든 테스트에서 슬롯 승계 지연 0(동기) — 타이머 잔존/플래키 방지
__setNoticeHandoffDelay(0);

// [CL-GAMIFY-QA50-20260418-224158] 테스트간 DOM 자동 정리 — getByRole 다중 매칭 방지
// [CL-MODAL-COORD-20260703-140000] 전역 모달 슬롯 초기화(파일 간 싱글턴 오염 차단) + body 잠금 잔재 정리
beforeEach(() => {
  __resetNoticeSlot();
});
afterEach(() => {
  cleanup();
  __resetNoticeSlot();
  if (typeof document !== "undefined") document.body.style.pointerEvents = "";
});

// [CL-ONBOARDING-20260619-222424] jsdom localStorage 가 불완전(opaque origin) → 인메모리 폴리필.
// 컴포넌트는 try/catch 로 견디지만 테스트가 직접 호출(removeItem/clear)하므로 완전한 Storage 보장.
class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
}
for (const target of [window, globalThis]) {
  Object.defineProperty(target, "localStorage", {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}

// [CL-ONBOARDING-20260619-222424] embla-carousel 은 ResizeObserver/IntersectionObserver 필요 — jsdom 미제공 → 스텁
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class {
    root = null;
    rootMargin = "";
    thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

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
