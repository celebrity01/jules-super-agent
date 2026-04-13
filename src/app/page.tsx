"use client";

import { useState, useCallback, useEffect } from "react";
import { ApiKeySetup } from "@/components/api-key-setup";
import { Dashboard } from "@/components/dashboard";
import { SupabaseSetup } from "@/components/supabase-setup";
import { AuthDialog } from "@/components/auth-dialog";
import {
  getSupabaseConfig,
  getSupabaseClient,
  clearSupabaseConfig,
  getSupabaseAccessToken,
  clearSupabaseAccessToken,
} from "@/lib/supabase-client";
import {
  getCurrentUser,
  loadApiKeys,
  saveApiKeys,
  signOut as supabaseSignOut,
  deleteApiKeys,
} from "@/lib/supabase-data";
import type { User } from "@supabase/supabase-js";

const STORAGE_KEY = "jules-api-key";
const GITHUB_TOKEN_KEY = "github-token";
const RENDER_API_KEY = "render-api-key";

type AppStep = "supabase-setup" | "auth" | "api-key" | "dashboard";

export default function Home() {
  const [step, setStep] = useState<AppStep>("supabase-setup");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [supabasePAT, setSupabasePAT] = useState<string | null>(null);
  const [renderApiKey, setRenderApiKey] = useState<string | null>(null);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine the starting step on mount
  useEffect(() => {
    const init = async () => {
      // Check for existing Supabase PAT
      const existingPAT = getSupabaseAccessToken();
      if (existingPAT) {
        setSupabasePAT(existingPAT);
      }

      // Check if Supabase is configured
      const supabaseConfig = getSupabaseConfig();

      if (supabaseConfig) {
        // Check for existing Supabase session
        try {
          const user = await getCurrentUser();
          if (user) {
            setSupabaseUser(user);

            // Try to load API keys from Supabase
            try {
              const keys = await loadApiKeys(user.id);
              if (keys) {
                setApiKey(keys.jules_api_key);
                if (keys.github_token) {
                  setGithubToken(keys.github_token);
                }
                setStep("dashboard");
                setIsLoading(false);
                return;
              }
            } catch {
              // Supabase keys table might not exist yet — fall through
            }
          }
        } catch {
          // Supabase connection issue — continue without
        }
      }

      // Check localStorage for Jules API key
      const storedKey = localStorage.getItem(STORAGE_KEY);
      if (storedKey) {
        setApiKey(storedKey);
        const storedGithubToken = localStorage.getItem(GITHUB_TOKEN_KEY);
        if (storedGithubToken) {
          setGithubToken(storedGithubToken);
        }
        const storedRenderKey = localStorage.getItem(RENDER_API_KEY);
        if (storedRenderKey) {
          setRenderApiKey(storedRenderKey);
        }
        setStep("dashboard");
        setIsLoading(false);
        return;
      }

      // No existing session — show appropriate setup
      if (supabaseConfig) {
        setStep("api-key");
      } else {
        setStep("supabase-setup");
      }
      setIsLoading(false);
    };

    init();
  }, []);

  // Listen for Supabase auth state changes
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setSupabaseUser(session.user);
        } else if (event === "SIGNED_OUT") {
          setSupabaseUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSupabaseConfigured = useCallback(() => {
    setIsAuthDialogOpen(true);
    setStep("api-key");
  }, []);

  const handleSupabaseSkip = useCallback(() => {
    // User skips Supabase — use localStorage only
    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
      setStep("dashboard");
    } else {
      setStep("api-key");
    }
  }, []);

  const handleAuthSuccess = useCallback(async (user: User) => {
    setSupabaseUser(user);

    // Try to load stored API keys from Supabase
    try {
      const keys = await loadApiKeys(user.id);
      if (keys) {
        setApiKey(keys.jules_api_key);
        if (keys.github_token) {
          setGithubToken(keys.github_token);
        }
        setStep("dashboard");
        return;
      }
    } catch {
      // Keys table might not exist yet
    }

    // No stored keys — check if we already have them in localStorage
    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
      const storedGithubToken = localStorage.getItem(GITHUB_TOKEN_KEY);
      if (storedGithubToken) {
        setGithubToken(storedGithubToken);
      }

      // Migrate localStorage keys to Supabase
      try {
        await saveApiKeys(user.id, storedKey, storedGithubToken);
      } catch {
        // Migration failed silently
      }

      setStep("dashboard");
    } else {
      setStep("api-key");
    }
  }, []);

  const handleConnect = useCallback(async (key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);

    // Save to Supabase if user is logged in
    if (supabaseUser) {
      try {
        await saveApiKeys(supabaseUser.id, key, githubToken);
      } catch {
        // Supabase save failed — localStorage is the fallback
      }
    }

    setStep("dashboard");
  }, [supabaseUser, githubToken]);

  const handleDisconnect = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    setApiKey(null);
    setGithubToken(null);

    // Delete from Supabase if logged in
    if (supabaseUser) {
      try {
        await deleteApiKeys(supabaseUser.id);
      } catch {
        // Silently fail
      }
    }

    setStep("api-key");
  }, [supabaseUser]);

  const handleGithubTokenChange = useCallback(async (token: string | null) => {
    if (token) {
      localStorage.setItem(GITHUB_TOKEN_KEY, token);
      setGithubToken(token);

      // Save to Supabase if logged in
      if (supabaseUser && apiKey) {
        try {
          await saveApiKeys(supabaseUser.id, apiKey, token);
        } catch {
          // Silently fail
        }
      }
    } else {
      localStorage.removeItem(GITHUB_TOKEN_KEY);
      setGithubToken(null);

      // Update Supabase if logged in
      if (supabaseUser && apiKey) {
        try {
          await saveApiKeys(supabaseUser.id, apiKey, null);
        } catch {
          // Silently fail
        }
      }
    }
  }, [supabaseUser, apiKey]);

  const handleSignOut = useCallback(async () => {
    await supabaseSignOut();
    setSupabaseUser(null);
  }, []);

  const handleSupabasePATChange = useCallback((pat: string | null) => {
    if (pat) {
      setSupabasePAT(pat);
    } else {
      clearSupabaseAccessToken();
      setSupabasePAT(null);
    }
  }, []);

  const handleResetSupabase = useCallback(() => {
    clearSupabaseConfig();
    clearSupabaseAccessToken();
    setSupabaseUser(null);
    setSupabasePAT(null);
    setStep("supabase-setup");
  }, []);

  const handleRenderApiKeyChange = useCallback((key: string | null) => {
    if (key) {
      localStorage.setItem(RENDER_API_KEY, key);
      setRenderApiKey(key);
    } else {
      localStorage.removeItem(RENDER_API_KEY);
      setRenderApiKey(null);
    }
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="h-12 w-12 rounded-2xl bg-gradient-agent flex items-center justify-center shadow-lg animate-pulse">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm text-[#64748b]">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Step-based rendering
  switch (step) {
    case "supabase-setup":
      return (
        <>
          <SupabaseSetup
            onConfigured={handleSupabaseConfigured}
            onSkip={handleSupabaseSkip}
          />
          <AuthDialog
            open={isAuthDialogOpen}
            onOpenChange={(open) => {
              setIsAuthDialogOpen(open);
              if (!open && !supabaseUser) {
                // User closed auth dialog without logging in — continue without auth
              }
            }}
            onAuthSuccess={handleAuthSuccess}
          />
        </>
      );

    case "api-key":
      return (
        <>
          <ApiKeySetup onConnect={handleConnect} />
          {getSupabaseConfig() && (
            <AuthDialog
              open={isAuthDialogOpen}
              onOpenChange={setIsAuthDialogOpen}
              onAuthSuccess={handleAuthSuccess}
            />
          )}
        </>
      );

    case "dashboard":
      return (
        <>
          <Dashboard
            apiKey={apiKey!}
            onDisconnect={handleDisconnect}
            githubToken={githubToken}
            onGithubTokenChange={handleGithubTokenChange}
            supabaseUser={supabaseUser}
            supabasePAT={supabasePAT}
            onSupabasePATChange={handleSupabasePATChange}
            onSignIn={() => setIsAuthDialogOpen(true)}
            onSignOut={handleSignOut}
            onResetSupabase={handleResetSupabase}
            renderApiKey={renderApiKey}
            onRenderApiKeyChange={handleRenderApiKeyChange}
          />
          {getSupabaseConfig() && (
            <AuthDialog
              open={isAuthDialogOpen}
              onOpenChange={setIsAuthDialogOpen}
              onAuthSuccess={handleAuthSuccess}
            />
          )}
        </>
      );

    default:
      return null;
  }
}

// Import Zap icon for loading state
import { Zap } from "lucide-react";
