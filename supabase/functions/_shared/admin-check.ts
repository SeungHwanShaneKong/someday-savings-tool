// [EF-ADMIN-FIX-20260308-110000] Cross-project admin verification
//
// Problem: Edge Functions run on project qllsuouxeojhwgonwpqb, but admin
// roles (user_roles table + has_role RPC) live on the MAIN project
// (tnboeqtdimyxpjzsraro). Calling supabase.rpc('has_role') on the Edge
// project always returns null → 403 for every user.
//
// Solution: Create a Supabase client pointing to the MAIN project and
// query user_roles directly (same pattern as client-side useAdmin.tsx).
// Requires MAIN_SUPABASE_URL and MAIN_SUPABASE_ANON_KEY secrets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/**
 * Check if a user has admin role on the MAIN Supabase project.
 *
 * Uses the user's own auth token + main project anon key to query
 * user_roles table through RLS (auth.uid() = user_id).
 *
 * @param userId  - The user's UUID (from JWT sub claim)
 * @param userToken - The user's raw Bearer token (from main project auth)
 * @returns true if user has admin role, false otherwise
 */
export async function checkAdminOnMainProject(
  userId: string,
  userToken: string,
): Promise<boolean> {
  // 1. Bootstrap admin: ADMIN_USER_IDS env var (comma-separated UUIDs)
  //    Use this for initial admin setup when user_roles table cannot be
  //    populated directly (e.g., Lovable-managed main project).
  //    Set via: npx supabase secrets set ADMIN_USER_IDS=uuid1,uuid2
  const bootstrapIds = Deno.env.get('ADMIN_USER_IDS');
  if (bootstrapIds) {
    const ids = bootstrapIds.split(',').map((id) => id.trim());
    if (ids.includes(userId)) {
      return true;
    }
  }

  // 2. Query user_roles on the MAIN project
  const mainUrl = Deno.env.get('MAIN_SUPABASE_URL');
  const mainKey = Deno.env.get('MAIN_SUPABASE_ANON_KEY');

  if (!mainUrl || !mainKey) {
    console.warn(
      '[admin-check] MAIN_SUPABASE_URL or MAIN_SUPABASE_ANON_KEY not set. ' +
      'Admin verification will fail. Set these secrets on the Edge project.'
    );
    return false;
  }

  try {
    const mainSupabase = createClient(mainUrl, mainKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    });

    const { data, error } = await mainSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error('[admin-check] Error querying main project:', error.message);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('[admin-check] Failed to check admin on main project:', err);
    return false;
  }
}
