// Edge Functions are deployed to our dedicated Supabase project.
// This may differ from the main Supabase project URL (e.g., Lovable's managed Supabase).
// The anon key is a publishable/public key — safe to include in client-side code.

export const EDGE_FUNCTION_URL =
  import.meta.env.VITE_EDGE_FUNCTION_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  'https://tnboeqtdimyxpjzsraro.supabase.co';

export const EDGE_FUNCTION_KEY =
  import.meta.env.VITE_EDGE_FUNCTION_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYm9lcXRkaW15eHBqenNyYXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMzE4MDcsImV4cCI6MjA4NDgwNzgwN30.vW3bVRKZ91key-JpysigzC96qa96DqqFE47CLs6Nhj0';
