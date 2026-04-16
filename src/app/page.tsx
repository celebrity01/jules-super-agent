"use client";

import { useState, useCallback, useEffect } from "react";
import { ApiKeySetup } from "@/components/api-key-setup";
import { SupabaseSetup } from "@/components/supabase-setup";
import { AuthDialog } from "@/components/auth-dialog";
import { GlassThreadsView } from "@/components/glass-threads-view";
import { GlassChatView } from "@/components/glass-chat-view";
import { GlassAgentsView } from "@/components/glass-agents-view";
import { GlassMCPView } from "@/components/glass-mcp-view";
import { GlassPingsView } from "@/components/glass-pings-view";
import { GlassNewMissionModal } from "@/components/glass-new-mission-modal";
import { GlassAddRepoModal } from "@/components/glass-add-repo-modal";
import { JulesSource, JulesSession, listSources, listSessions } from "@/lib/jules-client";
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
import {
  MessageSquare,
  Bot,
  Bell,
  Cpu,
  Zap,
} from "lucide-react";

const STORAGE_KEY = "jules-api-key";
const GITHUB_TOKEN_KEY = "github-token";
const RENDER_API_KEY = "render-api-key";

type AppStep = "supabase-setup" | "auth" | "api-key" | "dashboard";
type ViewType = "threads" | "chat" | "agents" | "mcp" | "pings";

export default function Home() {
  const [step, setStep] = useState<AppStep>("supabase-setup");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [supabasePAT, setSupabasePAT] = useState<string | null>(null);
  const [renderApiKey, setRenderApiKey] = useState<string | null>(null);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSupabaseConfig, setHasSupabaseConfig] = useState(false);

  // Dashboard state
  const [sources, setSources] = useState<JulesSource[]>([]);
  const [sessions, setSessions] = useState<JulesSession[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>("threads");
  const [isNewMissionOpen, setIsNewMissionOpen] = useState(false);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);

  // Init
  useEffect(() => {
    const init = async () => {
      const existingPAT = getSupabaseAccessToken();
      if (existingPAT) setSupabasePAT(existingPAT);

      const supabaseConfig = getSupabaseConfig();
      setHasSupabaseConfig(!!supabaseConfig);
      if (supabaseConfig) {
        try {
          const user = await getCurrentUser();
          if (user) {
            setSupabaseUser(user);
            try {
              const keys = await loadApiKeys(user.id);
              if (keys) {
                setApiKey(keys.jules_api_key);
                if (keys.github_token) setGithubToken(keys.github_token);
                setStep("dashboard");
                setIsLoading(false);
                return;
              }
            } catch { /* tables may not exist */ }
          }
        } catch { /* connection issue */ }
      }

      const storedKey = localStorage.getItem(STORAGE_KEY);
      if (storedKey) {
        setApiKey(storedKey);
        const storedGithubToken = localStorage.getItem(GITHUB_TOKEN_KEY);
        if (storedGithubToken) setGithubToken(storedGithubToken);
        const storedRenderKey = localStorage.getItem(RENDER_API_KEY);
        if (storedRenderKey) setRenderApiKey(storedRenderKey);
        setStep("dashboard");
        setIsLoading(false);
        return;
      }

      if (supabaseConfig) { setStep("api-key"); }
      else { setStep("supabase-setup"); }
      setIsLoading(false);
    };
    init();
  }, []);

  // Auth state listener
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) setSupabaseUser(session.user);
      else if (event === "SIGNED_OUT") setSupabaseUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch data when dashboard
  const fetchSources = useCallback(async () => {
    if (!apiKey) return;
    setIsLoadingSources(true);
    try {
      const data = await listSources(apiKey);
      setSources(data.sources || []);
    } catch { /* silent */ }
    finally { setIsLoadingSources(false); }
  }, [apiKey]);

  const fetchSessions = useCallback(async () => {
    if (!apiKey) return;
    setIsLoadingSessions(true);
    try {
      const data = await listSessions(apiKey);
      setSessions(data.sessions || []);
    } catch { /* silent */ }
    finally { setIsLoadingSessions(false); }
  }, [apiKey]);

  useEffect(() => {
    if (step === "dashboard") {
      fetchSources();
      fetchSessions();
    }
  }, [step, fetchSources, fetchSessions]);

  // Handlers
  const handleSupabaseConfigured = useCallback(() => {
    setIsAuthDialogOpen(true);
    setStep("api-key");
  }, []);

  const handleSupabaseSkip = useCallback(() => {
    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey) { setApiKey(storedKey); setStep("dashboard"); }
    else { setStep("api-key"); }
  }, []);

  const handleAuthSuccess = useCallback(async (user: User) => {
    setSupabaseUser(user);
    try {
      const keys = await loadApiKeys(user.id);
      if (keys) {
        setApiKey(keys.jules_api_key);
        if (keys.github_token) setGithubToken(keys.github_token);
        setStep("dashboard");
        return;
      }
    } catch { /* silent */ }

    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
      const storedGithubToken = localStorage.getItem(GITHUB_TOKEN_KEY);
      if (storedGithubToken) setGithubToken(storedGithubToken);
      try { await saveApiKeys(user.id, storedKey, storedGithubToken); } catch { /* silent */ }
      setStep("dashboard");
    } else {
      setStep("api-key");
    }
  }, []);

  const handleConnect = useCallback(async (key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    if (supabaseUser) {
      try { await saveApiKeys(supabaseUser.id, key, githubToken); } catch { /* silent */ }
    }
    setStep("dashboard");
  }, [supabaseUser, githubToken]);

  const handleDisconnect = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    localStorage.removeItem(RENDER_API_KEY);
    setApiKey(null);
    setGithubToken(null);
    setRenderApiKey(null);
    if (supabaseUser) {
      try { await deleteApiKeys(supabaseUser.id); } catch { /* silent */ }
    }
    setStep("api-key");
  }, [supabaseUser]);

  const handleGithubTokenChange = useCallback(async (token: string | null) => {
    if (token) {
      localStorage.setItem(GITHUB_TOKEN_KEY, token);
      setGithubToken(token);
      if (supabaseUser && apiKey) {
        try { await saveApiKeys(supabaseUser.id, apiKey, token); } catch { /* silent */ }
      }
    } else {
      localStorage.removeItem(GITHUB_TOKEN_KEY);
      setGithubToken(null);
      if (supabaseUser && apiKey) {
        try { await saveApiKeys(supabaseUser.id, apiKey, null); } catch { /* silent */ }
      }
    }
  }, [supabaseUser, apiKey]);

  const handleSignOut = useCallback(async () => {
    await supabaseSignOut();
    setSupabaseUser(null);
  }, []);

  const handleSupabasePATChange = useCallback((pat: string | null) => {
    if (pat) setSupabasePAT(pat);
    else { clearSupabaseAccessToken(); setSupabasePAT(null); }
  }, []);

  const handleResetSupabase = useCallback(() => {
    clearSupabaseConfig();
    clearSupabaseAccessToken();
    setSupabaseUser(null);
    setSupabasePAT(null);
    setStep("supabase-setup");
  }, []);

  const handleRenderApiKeyChange = useCallback((key: string | null) => {
    if (key) { localStorage.setItem(RENDER_API_KEY, key); setRenderApiKey(key); }
    else { localStorage.removeItem(RENDER_API_KEY); setRenderApiKey(null); }
  }, []);

  const handleSessionCreated = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setView("chat");
    fetchSessions();
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setView("chat");
  };

  const handleRefresh = () => {
    fetchSources();
    fetchSessions();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#03080a]">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="h-14 w-14 rounded-2xl bg-[#00E5FF] flex items-center justify-center shadow-[0_10px_40px_rgba(0,229,255,0.4)]">
            <Zap className="h-7 w-7 text-[#071115]" />
          </div>
          <p className="text-sm text-[#547B88] font-mono">Initializing...</p>
        </div>
      </div>
    );
  }

  // Pre-dashboard steps
  if (step === "supabase-setup") {
    return (
      <>
        <SupabaseSetup onConfigured={handleSupabaseConfigured} onSkip={handleSupabaseSkip} />
        <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} onAuthSuccess={handleAuthSuccess} />
      </>
    );
  }

  if (step === "api-key") {
    return (
      <>
        <ApiKeySetup onConnect={handleConnect} />
        {hasSupabaseConfig && (
          <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} onAuthSuccess={handleAuthSuccess} />
        )}
      </>
    );
  }

  // Dashboard
  const showBottomNav = view !== "chat";

  return (
    <div className="flex flex-col h-screen w-screen relative overflow-hidden bg-[#03080a] md:max-w-3xl md:mx-auto md:border-x md:border-white/5">
      {/* Liquid Blobs */}
      <div className="liquid-blob blob-1" />
      <div className="liquid-blob blob-2" />
      <div className="liquid-blob blob-3" />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        {view === "threads" && (
          <GlassThreadsView
            sessions={sessions}
            sources={sources}
            isLoadingSessions={isLoadingSessions}
            isLoadingSources={isLoadingSources}
            onSelectSession={handleSelectSession}
            onNewMission={() => setIsNewMissionOpen(true)}
            onAddRepo={() => setIsAddRepoOpen(true)}
            onRefresh={handleRefresh}
          />
        )}
        {view === "chat" && selectedSessionId && apiKey && (
          <GlassChatView
            sessionId={selectedSessionId}
            apiKey={apiKey}
            onBack={() => { setView("threads"); setSelectedSessionId(null); }}
            onAddRepo={() => setIsAddRepoOpen(true)}
          />
        )}
        {view === "agents" && (
          <GlassAgentsView
            onRefresh={handleRefresh}
            onDisconnect={handleDisconnect}
            githubToken={githubToken}
            onGitHubTokenChange={handleGithubTokenChange}
            supabaseUser={supabaseUser}
            supabasePAT={supabasePAT}
            onSupabasePATChange={handleSupabasePATChange}
            onSignIn={() => setIsAuthDialogOpen(true)}
            onSignOut={handleSignOut}
            onResetSupabase={handleResetSupabase}
            renderApiKey={renderApiKey}
            onRenderApiKeyChange={handleRenderApiKeyChange}
            onAddRepo={() => setIsAddRepoOpen(true)}
          />
        )}
        {view === "mcp" && (
          <GlassMCPView
            sources={sources}
            isLoadingSources={isLoadingSources}
            hasSupabasePAT={!!supabasePAT}
            hasRenderKey={!!renderApiKey}
            onAddRepo={() => setIsAddRepoOpen(true)}
            onRefresh={handleRefresh}
          />
        )}
        {view === "pings" && (
          <GlassPingsView
            sessions={sessions}
            onAddRepo={() => setIsAddRepoOpen(true)}
          />
        )}
      </main>

      {/* Bottom Nav */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-20 glass-surface flex items-center justify-around z-50 px-2 pb-safe glass-border-t">
          {[
            { id: "threads" as ViewType, icon: MessageSquare, label: "Threads" },
            { id: "agents" as ViewType, icon: Bot, label: "Agents" },
            { id: "mcp" as ViewType, icon: Cpu, label: "MCP" },
            { id: "pings" as ViewType, icon: Bell, label: "Pings" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-full transition-all duration-300 relative ${
                view === item.id ? "text-[#00E5FF]" : "text-[#547B88] hover:text-[#E0F7FA]"
              }`}
            >
              {view === item.id && (
                <div className="absolute top-0 w-12 h-1 bg-[#00E5FF] rounded-b-full shadow-[0_0_15px_#00E5FF] animate-pulse" />
              )}
              <item.icon size={24} strokeWidth={view === item.id ? 2.5 : 2} />
              <span className={`text-[9px] font-mono font-bold uppercase tracking-[0.1em] ${view === item.id ? "opacity-100" : "opacity-40"}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      )}

      {/* Modals */}
      {isNewMissionOpen && (
        <GlassNewMissionModal
          open={isNewMissionOpen}
          onClose={() => setIsNewMissionOpen(false)}
          sources={sources}
          apiKey={apiKey!}
          githubToken={githubToken || undefined}
          onSessionCreated={handleSessionCreated}
          onAddRepo={() => setIsAddRepoOpen(true)}
        />
      )}
      {isAddRepoOpen && (
        <GlassAddRepoModal
          open={isAddRepoOpen}
          onClose={() => setIsAddRepoOpen(false)}
          githubToken={githubToken || ""}
          onRepoCreated={() => { fetchSources(); setIsAddRepoOpen(false); }}
        />
      )}

      {/* Auth Dialog */}
      {hasSupabaseConfig && (
        <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} onAuthSuccess={handleAuthSuccess} />
      )}

      {/* Copy Toast (global) */}
    </div>
  );
}
