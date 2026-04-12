"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Key, Loader2, ExternalLink } from "lucide-react";
import { listSources } from "@/lib/jules-client";

interface ApiKeySetupProps {
  onConnect: (apiKey: string) => void;
}

export function ApiKeySetup({ onConnect }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError("Please enter your API key");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await listSources(apiKey.trim());
      onConnect(apiKey.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid API key. Please check and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConnect();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4285F4]/10">
            <Key className="h-8 w-8 text-[#4285F4]" />
          </div>
          <CardTitle className="text-2xl font-bold">Google Jules API Client</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Connect to the Jules API to automate your development workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your Jules API key"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="font-mono"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            onClick={handleConnect}
            disabled={isLoading || !apiKey.trim()}
            className="w-full bg-[#4285F4] hover:bg-[#3367D6] text-white"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              "Connect"
            )}
          </Button>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">How to get your API key:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Visit Google Jules at <span className="font-medium">jules.google</span></li>
              <li>Go to Settings in your account</li>
              <li>Generate a new API key</li>
              <li>Copy and paste it above</li>
            </ol>
            <a
              href="https://jules.google"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#4285F4] hover:underline mt-1"
            >
              Open Jules <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
