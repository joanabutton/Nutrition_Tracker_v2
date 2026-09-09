const supabaseEnvKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export function getMissingSupabaseClientEnv() {
  return supabaseEnvKeys.filter((key) => !process.env[key]);
}

export function isSupabaseConfigured() {
  return getMissingSupabaseClientEnv().length === 0;
}

export function getSupabaseClientEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = getMissingSupabaseClientEnv();
    throw new Error(`Missing Supabase environment variables: ${missing.join(", ")}`);
  }

  return {
    supabaseUrl,
    supabaseAnonKey
  };
}
