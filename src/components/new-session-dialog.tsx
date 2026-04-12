"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { JulesSource, createSession } from "@/lib/jules-client";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: JulesSource[];
  apiKey: string;
  onSessionCreated: (sessionId: string) => void;
}

export function NewSessionDialog({
  open,
  onOpenChange,
  sources,
  apiKey,
  onSessionCreated,
}: NewSessionDialogProps) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [startingBranch, setStartingBranch] = useState("main");
  const [automationMode, setAutomationMode] = useState<string>("none");
  const [requirePlanApproval, setRequirePlanApproval] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!prompt.trim()) {
      setError("Prompt is required");
      return;
    }
    if (!selectedSource) {
      setError("Please select a source");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const session = await createSession(apiKey, {
        prompt: prompt.trim(),
        title: title.trim() || undefined,
        sourceContext: {
          source: selectedSource,
          githubRepoContext: {
            startingBranch: startingBranch.trim() || "main",
          },
        },
        automationMode: automationMode === "none" ? undefined : automationMode,
        requirePlanApproval,
      });

      const sessionId = session.name.split("/").pop() || session.name;
      onSessionCreated(sessionId);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setPrompt("");
    setSelectedSource("");
    setStartingBranch("main");
    setAutomationMode("none");
    setRequirePlanApproval(true);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Start a new Jules session to automate a development task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="session-title">Title (optional)</Label>
            <Input
              id="session-title"
              placeholder="e.g., Fix authentication bug"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-prompt">Prompt *</Label>
            <Textarea
              id="session-prompt"
              placeholder="Describe what you want Jules to do..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Source Repository *</Label>
            <Select
              value={selectedSource}
              onValueChange={setSelectedSource}
              disabled={isLoading || sources.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    sources.length === 0
                      ? "No sources available"
                      : "Select a repository"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {sources.map((source) => {
                  const repoUri =
                    source.githubRepoContext?.repoUri || source.name;
                  const parts = repoUri
                    .replace("https://github.com/", "")
                    .split("/");
                  const displayName =
                    parts.length >= 2
                      ? `${parts[0]}/${parts[1]}`
                      : repoUri.split("/").pop() || source.name;

                  return (
                    <SelectItem key={source.name} value={source.name}>
                      {displayName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="starting-branch">Starting Branch</Label>
            <Input
              id="starting-branch"
              placeholder="main"
              value={startingBranch}
              onChange={(e) => setStartingBranch(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Automation Mode</Label>
            <Select
              value={automationMode}
              onValueChange={setAutomationMode}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Manual)</SelectItem>
                <SelectItem value="AUTO_CREATE_PR">Auto Create PR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="plan-approval" className="cursor-pointer">
              Require Plan Approval
            </Label>
            <Switch
              id="plan-approval"
              checked={requirePlanApproval}
              onCheckedChange={setRequirePlanApproval}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isLoading || !prompt.trim() || !selectedSource}
            className="bg-[#4285F4] hover:bg-[#3367D6] text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Session"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
