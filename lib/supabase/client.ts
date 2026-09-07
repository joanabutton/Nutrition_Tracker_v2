"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseClientEnv } from "@/lib/env";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseClientEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
