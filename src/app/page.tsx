"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { ApiKeySetup } from "@/components/api-key-setup";
import { Dashboard } from "@/components/dashboard";

const STORAGE_KEY = "jules-api-key";

function subscribe() {
  // No-op: we don't subscribe to storage events for simplicity
  return () => {};
}

function getSnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot(): null {
  return null;
}

export default function Home() {
  const storedKey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const effectiveKey = apiKey ?? storedKey;

  const handleConnect = useCallback((key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
  }, []);

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
  }, []);

  if (!effectiveKey) {
    return <ApiKeySetup onConnect={handleConnect} />;
  }

  return <Dashboard apiKey={effectiveKey} onDisconnect={handleDisconnect} />;
}
