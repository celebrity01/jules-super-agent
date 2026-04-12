// Supabase data access layer
// Handles API key storage, session persistence, and user profile operations

import { getSupabaseClient, requireSupabase } from "./supabase-client";
import type { User } from "@supabase/supabase-js";

// ===== Types =====

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoredApiKeys {
  id: string;
  user_id: string;
  jules_api_key: string;
  github_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedSession {
  id: string;
  user_id: string;
  session_id: string;
  session_title: string | null;
  session_state: string | null;
  source_name: string | null;
  prompt: string | null;
  notes: string | null;
  bookmarked: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentConfig {
  id: string;
  user_id: string;
  default_automation_mode: string;
  default_require_plan_approval: boolean;
  default_branch: string;
  theme: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ===== Auth Operations =====

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getSession() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  await supabase.auth.signOut();
}

// ===== API Keys =====

export async function loadApiKeys(userId: string): Promise<StoredApiKeys | null> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function saveApiKeys(
  userId: string,
  julesApiKey: string,
  githubToken?: string | null
): Promise<StoredApiKeys> {
  const supabase = requireSupabase();

  // Try to update first, insert if not exists
  const existing = await loadApiKeys(userId);

  if (existing) {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (julesApiKey) updateData.jules_api_key = julesApiKey;
    if (githubToken !== undefined) updateData.github_token = githubToken;

    const { data, error } = await supabase
      .from("api_keys")
      .update(updateData)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  } else {
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: userId,
        jules_api_key: julesApiKey,
        github_token: githubToken || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}

export async function deleteApiKeys(userId: string): Promise<void> {
  const supabase = requireSupabase();

  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

// ===== Profile =====

export async function loadProfile(userId: string): Promise<UserProfile | null> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "display_name" | "avatar_url">>
): Promise<UserProfile> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ===== Saved Sessions =====

export async function loadSavedSessions(userId: string): Promise<SavedSession[]> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from("saved_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function saveSession(
  userId: string,
  sessionId: string,
  meta: {
    sessionTitle?: string;
    sessionState?: string;
    sourceName?: string;
    prompt?: string;
    notes?: string;
    bookmarked?: boolean;
  }
): Promise<SavedSession> {
  const supabase = requireSupabase();

  // Try to update first, insert if not exists
  const { data: existing } = await supabase
    .from("saved_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from("saved_sessions")
      .update({
        ...meta,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  } else {
    const { data, error } = await supabase
      .from("saved_sessions")
      .insert({
        user_id: userId,
        session_id: sessionId,
        ...meta,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}

export async function deleteSavedSession(userId: string, sessionId: string): Promise<void> {
  const supabase = requireSupabase();

  const { error } = await supabase
    .from("saved_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("session_id", sessionId);

  if (error) throw new Error(error.message);
}

// ===== Agent Config =====

export async function loadAgentConfig(userId: string): Promise<AgentConfig | null> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from("agent_config")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function saveAgentConfig(
  userId: string,
  config: Partial<Omit<AgentConfig, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<AgentConfig> {
  const supabase = requireSupabase();

  const existing = await loadAgentConfig(userId);

  if (existing) {
    const { data, error } = await supabase
      .from("agent_config")
      .update({ ...config, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  } else {
    const { data, error } = await supabase
      .from("agent_config")
      .insert({ user_id: userId, ...config })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}

// ===== Realtime Subscriptions =====

export function subscribeToSessionUpdates(
  userId: string,
  onUpdate: (session: SavedSession) => void,
  onDelete: (sessionId: string) => void
) {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel("saved-sessions-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "saved_sessions",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          onDelete((payload.old as Record<string, unknown>).session_id as string);
        } else {
          onUpdate(payload.new as SavedSession);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
