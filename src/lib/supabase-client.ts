// Browser-side Supabase client
// Users configure their own Supabase project URL + anon key in the app

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

const SUPABASE_URL_KEY = "supabase-url";
const SUPABASE_ANON_KEY_KEY = "supabase-anon-key";

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  if (typeof window === "undefined") return null;
  const url = localStorage.getItem(SUPABASE_URL_KEY);
  const anonKey = localStorage.getItem(SUPABASE_ANON_KEY_KEY);
  if (url && anonKey) return { url, anonKey };
  return null;
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(SUPABASE_URL_KEY, url);
  localStorage.setItem(SUPABASE_ANON_KEY_KEY, anonKey);
  // Recreate the client with new config
  supabaseInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(SUPABASE_URL_KEY);
  localStorage.removeItem(SUPABASE_ANON_KEY_KEY);
  supabaseInstance = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  const config = getSupabaseConfig();
  if (!config) return null;
  supabaseInstance = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return supabaseInstance;
}

// Helper to ensure client exists
export function requireSupabase(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase not configured");
  return client;
}
