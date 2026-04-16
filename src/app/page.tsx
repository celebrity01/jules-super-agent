"use client";

import { useState, useCallback, useEffect } from "react";
import { ApiKeySetup } from "@/components/api-key-setup";
import { GlassThreadsView } from "@/components/glass-threads-view";
import { GlassChatView } from "@/components/glass-chat-view";
import { GlassAgentsView } from "@/components/glass-agents-view";
import { GlassMCPView } from "@/components/glass-mcp-view";
import { GlassPingsView } from "@/components/glass-pings-view";
import { GlassNewMissionModal } from "@/components/glass-new-mission-modal";
import { GlassAddRepoModal } from "@/components/glass-add-repo-modal";
import { GlassDeployModal } from "@/components/glass-deploy-modal";
import { JulesSource, JulesSession, listSources, listSessions } from "@/lib/jules-client";
import {
  MessageSquare,
  Bot,
  Bell,
  Cpu,
  Zap,
} from "lucide-react";

const STORAGE_KEY = "jules-api-key";
const GITHUB_TOKEN_KEY = "github-token";

type AppStep = "api-key" | "dashboard";
type ViewType = "threads" | "chat" | "agents" | "mcp" | "pings";

export default function Home() {
  const [step, setStep] = useState<AppStep>("api-key");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dashboard state
  const [sources, setSources] = useState<JulesSource[]>([]);
  const [sessions, setSessions] = useState<JulesSession[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>("threads");
  const [isNewMissionOpen, setIsNewMissionOpen] = useState(false);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [isDeployOpen, setIsDeployOpen] = useState(false);

  // Init — load from localStorage
  useEffect(() => {
    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
      const storedGithubToken = localStorage.getItem(GITHUB_TOKEN_KEY);
      if (storedGithubToken) setGithubToken(storedGithubToken);
      setStep("dashboard");
    }
    setIsLoading(false);
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
  const handleConnect = useCallback((key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    setStep("dashboard");
  }, []);

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    setApiKey(null);
    setGithubToken(null);
    setStep("api-key");
  }, []);

  const handleGithubTokenChange = useCallback((token: string | null) => {
    if (token) {
      localStorage.setItem(GITHUB_TOKEN_KEY, token);
      setGithubToken(token);
    } else {
      localStorage.removeItem(GITHUB_TOKEN_KEY);
      setGithubToken(null);
    }
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

  // API key step
  if (step === "api-key") {
    return <ApiKeySetup onConnect={handleConnect} />;
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
            onDeploy={() => setIsDeployOpen(true)}
            githubToken={githubToken || undefined}
          />
        )}
        {view === "agents" && (
          <GlassAgentsView
            onRefresh={handleRefresh}
            onDisconnect={handleDisconnect}
            githubToken={githubToken}
            onGitHubTokenChange={handleGithubTokenChange}
            onAddRepo={() => setIsAddRepoOpen(true)}
          />
        )}
        {view === "mcp" && (
          <GlassMCPView
            sources={sources}
            isLoadingSources={isLoadingSources}
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
      {isDeployOpen && (
        <GlassDeployModal
          open={isDeployOpen}
          onClose={() => setIsDeployOpen(false)}
          githubToken={githubToken || undefined}
        />
      )}
    </div>
  );
}
