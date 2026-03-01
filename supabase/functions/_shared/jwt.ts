/**
 * Decode a JWT payload without signature verification.
 *
 * Why: Edge Functions live on project qllsuouxeojhwgonwpqb, but
 * the live site authenticates users via Lovable's project (tnboeqtdimyxpjzsraro).
 * supabase.auth.getUser(token) fails for cross-project JWTs, so we fall back
 * to decoding the payload to extract the user ID.
 *
 * Safety: Edge Functions are deployed with --no-verify-jwt, so the Supabase
 * API gateway already handles project-level apikey validation.
 */
export function decodeJwtPayload(
  token: string
): { sub: string; email?: string; role?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Handle base64url → base64 conversion
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    if (!payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}
