"use client";

import { useState, useEffect, useCallback } from "react";
import { JulesSource, JulesSession, listSources, listSessions } from "@/lib/jules-client";
import { Sidebar } from "@/components/sidebar";
import { SessionDetail } from "@/components/session-detail";
import { NewSessionDialog } from "@/components/new-session-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Key,
  LogOut,
  RefreshCw,
  Bot,
} from "lucide-react";

interface DashboardProps {
  apiKey: string;
  onDisconnect: () => void;
}

export function Dashboard({ apiKey, onDisconnect }: DashboardProps) {
  const [sources, setSources] = useState<JulesSource[]>([]);
  const [sessions, setSessions] = useState<JulesSession[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);

  const maskedKey = `••••••••${apiKey.slice(-4)}`;

  const fetchSources = useCallback(async () => {
    setIsLoadingSources(true);
    try {
      const data = await listSources(apiKey);
      setSources(data.sources || []);
    } catch {
      // Error handled silently; sidebar shows empty state
    } finally {
      setIsLoadingSources(false);
    }
  }, [apiKey]);

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const data = await listSessions(apiKey);
      setSessions(data.sessions || []);
    } catch {
      // Error handled silently; sidebar shows empty state
    } finally {
      setIsLoadingSessions(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchSources();
    fetchSessions();
  }, [fetchSources, fetchSessions]);

  const handleRefresh = () => {
    fetchSources();
    fetchSessions();
  };

  const handleSessionCreated = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    fetchSessions();
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Bar */}
      <header className="h-12 flex items-center justify-between px-4 border-b bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#4285F4] flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm">Jules API Client</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-600 font-medium">Connected</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Key className="h-3 w-3" />
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">{maskedKey}</code>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 gap-1 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDisconnect}
            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
          >
            <LogOut className="h-3 w-3" />
            Disconnect
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar
          sources={sources}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          isLoadingSources={isLoadingSources}
          isLoadingSessions={isLoadingSessions}
          onSelectSession={setSelectedSessionId}
          onNewSession={() => setIsNewSessionOpen(true)}
          onRefresh={handleRefresh}
        />

        {/* Main Area */}
        {selectedSessionId ? (
          <SessionDetail
            sessionId={selectedSessionId}
            apiKey={apiKey}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-slate-50">
            <div className="flex flex-col items-center gap-4 max-w-md text-center">
              <div className="h-16 w-16 rounded-2xl bg-[#4285F4]/10 flex items-center justify-center">
                <Bot className="h-8 w-8 text-[#4285F4]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Select a Session</h3>
                <p className="text-sm mt-1">
                  Choose a session from the sidebar to view its details and activities, or create a new session to get started.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {sessions.length} sessions
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {sources.length} sources
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Session Dialog */}
      <NewSessionDialog
        open={isNewSessionOpen}
        onOpenChange={setIsNewSessionOpen}
        sources={sources}
        apiKey={apiKey}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
}
