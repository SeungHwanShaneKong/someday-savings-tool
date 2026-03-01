// Edge Functions are deployed to our dedicated Supabase project.
// This may differ from the main Supabase project URL (e.g., Lovable's managed Supabase).
// The anon key is a publishable/public key — safe to include in client-side code.

export const EDGE_FUNCTION_URL =
  import.meta.env.VITE_EDGE_FUNCTION_URL ||
  'https://qllsuouxeojhwgonwpqb.supabase.co';

export const EDGE_FUNCTION_KEY =
  import.meta.env.VITE_EDGE_FUNCTION_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbHN1b3V4ZW9qaHdnb253cHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTY3MTgsImV4cCI6MjA4NDg3MjcxOH0._Hfuji9ZNthYiNgU7zqZq_ooflUA3_Jtxbm9uvMEy94';
