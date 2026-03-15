// [SEC-FIX-20260315] Secure cross-project JWT verification
//
// REMOVED: decodeJwtPayload() — decoded JWT without signature verification,
// allowing attackers to forge any user identity.
//
// REPLACED WITH: verifyUserToken() — verifies the JWT by calling getUser()
// on the MAIN Supabase project (tnboeqtdimyxpjzsraro), which properly
// validates the token signature server-side.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/**
 * Securely verify a user token and extract the user ID.
 *
 * Strategy:
 * 1. Try getUser() on the local (edge) project — works if token was issued here
 * 2. Try getUser() on the MAIN project — works for cross-project tokens
 * 3. Return null if both fail (token is invalid/forged)
 *
 * @param localSupabase - Supabase client for the edge functions project
 * @param token - Raw JWT token (without "Bearer " prefix)
 * @returns userId string if valid, null if invalid
 */
// [SEC-FIX-20260315-104500] Use 'any' to avoid SupabaseClient generic mismatch
// deno-lint-ignore no-explicit-any
export async function verifyUserToken(
  localSupabase: any,
  token: string,
): Promise<string | null> {
  // 1. Try local project verification
  const { data: { user }, error } = await localSupabase.auth.getUser(token);
  if (!error && user) {
    return user.id;
  }

  // 2. Try main project verification (cross-project token)
  const mainUrl = Deno.env.get('MAIN_SUPABASE_URL');
  const mainKey = Deno.env.get('MAIN_SUPABASE_ANON_KEY');

  if (!mainUrl || !mainKey) {
    console.warn(
      '[jwt] MAIN_SUPABASE_URL or MAIN_SUPABASE_ANON_KEY not set. ' +
      'Cross-project token verification will fail.'
    );
    return null;
  }

  try {
    const mainSupabase = createClient(mainUrl, mainKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user: mainUser }, error: mainError } = await mainSupabase.auth.getUser(token);
    if (!mainError && mainUser) {
      return mainUser.id;
    }
  } catch (err) {
    console.error('[jwt] Main project token verification failed:', err);
  }

  return null;
}
