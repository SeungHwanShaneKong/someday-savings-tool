// ⚠️ DO NOT MODIFY — Edge Functions are deployed ONLY to qllsuouxeojhwgonwpqb.
// The main Supabase DB (VITE_SUPABASE_URL) is a DIFFERENT project managed by Lovable Cloud.
// Do NOT fall back to VITE_SUPABASE_URL here — that project has no Edge Functions.
// The anon key below is a publishable/public key — safe for client-side code.

const EDGE_PROJECT_URL = 'https://qllsuouxeojhwgonwpqb.supabase.co';
const EDGE_PROJECT_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbHN1b3V4ZW9qaHdnb253cHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTY3MTgsImV4cCI6MjA4NDg3MjcxOH0._Hfuji9ZNthYiNgU7zqZq_ooflUA3_Jtxbm9uvMEy94';

export const EDGE_FUNCTION_URL =
  import.meta.env.VITE_EDGE_FUNCTION_URL || EDGE_PROJECT_URL;

export const EDGE_FUNCTION_KEY =
  import.meta.env.VITE_EDGE_FUNCTION_KEY || EDGE_PROJECT_KEY;
