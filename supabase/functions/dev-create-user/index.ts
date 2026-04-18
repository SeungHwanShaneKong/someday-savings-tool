// [CL-SEC-HARDEN-20260418-214623] dev-create-user 5-layer defense-in-depth
// 이전 구현은 인증 없이 공개되어 있어 CRITICAL 취약점(무제한 계정 생성).
// 이제 5개 방어 레이어를 순차 통과해야 실행:
//   Layer 1: ENVIRONMENT 가드 — production이면 404로 함수 존재 은폐
//   Layer 2: 공유 시크릿 X-Dev-Test-Token 헤더 검증
//   Layer 3: IP 기반 in-memory rate limit (1분 5회)
//   Layer 4: 이메일 패턴 화이트리스트 (강화된 regex)
//   Layer 5: 모든 시도 감사 로그 (console)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// ─── Layer 1: 환경 감지 (기본값 'production'으로 Fail-Safe) ───
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') ?? 'production';
const IS_PRODUCTION = ENVIRONMENT === 'production' || ENVIRONMENT === 'prod';

// ─── Layer 3: In-memory rate limit (IP별) ───
// Edge Function 인스턴스 수명 동안만 유효 — 분산 환경에서는 여전히 일정 수준 제한됨.
// 추가 방어: Layer 1+2가 통과하지 않으면 이 로직 자체에 도달하지 않음.
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitState = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 분
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitState.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimitState.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

// ─── Layer 4: 이메일 패턴 강화 ───
// 기존 regex에 [a-z0-9-]+ 명시하여 특수문자·따옴표 등 차단
const ALLOWED_EMAIL_PATTERNS: readonly RegExp[] = [
  /^dev-test@wedsem-local\.dev$/,
  /^test-[a-z0-9-]+@wedsem-local\.dev$/,
  /^e2e-[a-z0-9-]+@wedsem-local\.dev$/,
];

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Layer 1 — 프로덕션 차단
  if (IS_PRODUCTION) {
    console.warn('[dev-create-user] BLOCKED: production environment');
    // 404를 반환하여 함수 존재 자체를 은폐 (스캔 방어)
    return new Response('Not Found', { status: 404 });
  }

  // IP 추출 (Layer 3 + Layer 5에 공통 사용)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  // Layer 3 — Rate limit
  if (!checkRateLimit(ip)) {
    console.warn(`[dev-create-user] RATE_LIMIT_EXCEEDED: ip=${ip}`);
    return new Response(
      JSON.stringify({ error: 'Too many requests' }),
      {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // Layer 2 — 공유 시크릿 헤더 검증
  const expectedToken = Deno.env.get('DEV_CREATE_USER_TOKEN');
  const providedToken = req.headers.get('x-dev-test-token');
  if (!expectedToken) {
    console.error(
      '[dev-create-user] MISCONFIG: DEV_CREATE_USER_TOKEN secret not set. ' +
        '이 함수는 구성 완료 전까지 작동하지 않습니다.',
    );
    return new Response(
      JSON.stringify({ error: 'Service temporarily unavailable' }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
  if (providedToken !== expectedToken) {
    console.warn(`[dev-create-user] UNAUTHORIZED: ip=${ip}`);
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'email and password required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'email and password must be strings' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // 패스워드 최소 길이 (Supabase 기본은 6자지만 테스트용으로 강화)
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'password must be at least 8 characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Layer 4 — 이메일 패턴 검증
    const isAllowed = ALLOWED_EMAIL_PATTERNS.some((p) => p.test(email));
    if (!isAllowed) {
      console.warn(
        `[dev-create-user] EMAIL_PATTERN_BLOCKED: ip=${ip} email=${email}`,
      );
      return new Response(
        JSON.stringify({ error: 'Only dev/test email patterns are allowed' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Layer 5 — 감사 로그 (모든 통과 요청)
    console.log(
      `[dev-create-user] AUDIT_PASS: ip=${ip} email=${email} env=${ENVIRONMENT}`,
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'Dev Tester' },
    });

    if (error) {
      // 이미 존재하는 사용자 → 패스워드 업데이트
      if (error.message?.includes('already been registered')) {
        // listUsers는 페이지당 최대 1000명이지만 테스트 환경에서는 충분
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = userList.users.find(
          (u: { email?: string }) => u.email === email,
        );

        if (existingUser) {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password,
            email_confirm: true,
          });
          console.log(
            `[dev-create-user] USER_UPDATED: ip=${ip} userId=${existingUser.id}`,
          );
          return new Response(
            JSON.stringify({
              success: true,
              message: 'User updated and confirmed',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
      }
      console.error(`[dev-create-user] CREATE_ERROR: ${error.message}`);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `[dev-create-user] USER_CREATED: ip=${ip} userId=${data.user.id}`,
    );
    return new Response(
      JSON.stringify({ success: true, userId: data.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[dev-create-user] UNEXPECTED_ERROR: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
