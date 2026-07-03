export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
  geminiMinRequestIntervalMs: Number(process.env.GEMINI_MIN_REQUEST_INTERVAL_MS ?? 15000),
  geminiMaxRetries: Number(process.env.GEMINI_MAX_RETRIES ?? 3)
};

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function isSupabaseAdminConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}
