"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Zap, Target, GitBranch, Rocket, GitPullRequest, Sliders } from "lucide-react";
import { JulesSource, createSession, getSourceDisplayName } from "@/lib/jules-client";

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
      setError("Objective is required");
      return;
    }
    if (!selectedSource) {
      setError("Please select a target repository");
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
      setError(err instanceof Error ? err.message : "Failed to create mission");
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
      <DialogContent className="sm:max-w-lg bg-[#0c0c14] border-[rgba(255,255,255,0.06)] text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-7 w-7 rounded-lg bg-gradient-agent flex items-center justify-center">
              <Target className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="gradient-text">New Mission</span>
          </DialogTitle>
          <DialogDescription className="text-[#64748b]">
            Launch a new AI-powered development mission
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mission Title */}
          <div className="space-y-2">
            <Label htmlFor="mission-title" className="text-xs text-[#94a3b8] font-medium">
              Mission Title
            </Label>
            <Input
              id="mission-title"
              placeholder="e.g., Fix authentication bug"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
              className="input-refined border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#3a3a4a] focus:border-[rgba(129,140,248,0.3)] input-glow h-10 rounded-lg text-sm transition-all duration-200"
            />
          </div>

          {/* Objective */}
          <div className="space-y-2">
            <Label htmlFor="mission-objective" className="text-xs text-[#94a3b8] font-medium">
              Objective *
            </Label>
            <Textarea
              id="mission-objective"
              placeholder="Describe what you want Jules to accomplish..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              rows={4}
              className="input-refined border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#3a3a4a] focus:border-[rgba(129,140,248,0.3)] input-glow rounded-lg text-sm transition-all duration-200 resize-none"
            />
          </div>

          {/* Target Repository */}
          <div className="space-y-2">
            <Label className="text-xs text-[#94a3b8] font-medium flex items-center gap-1.5">
              <GitBranch className="h-3 w-3" />
              Target Repository *
            </Label>
            <Select
              value={selectedSource}
              onValueChange={setSelectedSource}
              disabled={isLoading || sources.length === 0}
            >
              <SelectTrigger className="input-refined border-[rgba(255,255,255,0.06)] text-white h-10 rounded-lg focus:border-[rgba(129,140,248,0.3)] transition-all duration-200">
                <SelectValue
                  placeholder={
                    sources.length === 0
                      ? "No sources available"
                      : "Select a repository"
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-[#12121a] border-[rgba(255,255,255,0.06)]">
                {sources.map((source) => (
                  <SelectItem
                    key={source.name}
                    value={source.name}
                    className="text-white focus:bg-[rgba(129,140,248,0.08)] focus:text-white"
                  >
                    <span className="font-mono">{getSourceDisplayName(source)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch */}
          <div className="space-y-2">
            <Label htmlFor="branch" className="text-xs text-[#94a3b8] font-medium">
              Branch
            </Label>
            <Input
              id="branch"
              placeholder="main"
              value={startingBranch}
              onChange={(e) => setStartingBranch(e.target.value)}
              disabled={isLoading}
              className="input-refined border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#3a3a4a] focus:border-[rgba(129,140,248,0.3)] input-glow h-10 rounded-lg text-sm font-mono transition-all duration-200"
            />
          </div>

          {/* Mode Toggle Cards */}
          <div className="space-y-2">
            <Label className="text-xs text-[#94a3b8] font-medium flex items-center gap-1.5">
              <Sliders className="h-3 w-3" />
              Mode
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAutomationMode("none")}
                disabled={isLoading}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 interaction-scale ${
                  automationMode === "none"
                    ? "bg-[rgba(129,140,248,0.08)] border-[rgba(129,140,248,0.2)] text-[#818cf8]"
                    : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)] text-[#64748b] hover:border-[rgba(255,255,255,0.08)] hover:text-[#94a3b8]"
                }`}
              >
                <Sliders className="h-4 w-4" />
                <span className="text-[11px] font-medium">Manual</span>
              </button>
              <button
                type="button"
                onClick={() => setAutomationMode("AUTO_CREATE_PR")}
                disabled={isLoading}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 interaction-scale ${
                  automationMode === "AUTO_CREATE_PR"
                    ? "bg-[rgba(129,140,248,0.08)] border-[rgba(129,140,248,0.2)] text-[#818cf8]"
                    : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)] text-[#64748b] hover:border-[rgba(255,255,255,0.08)] hover:text-[#94a3b8]"
                }`}
              >
                <GitPullRequest className="h-4 w-4" />
                <span className="text-[11px] font-medium">Auto PR</span>
              </button>
            </div>
          </div>

          {/* Plan Approval Toggle */}
          <div className="flex items-center justify-between px-1">
            <Label htmlFor="plan-approval" className="text-xs text-[#94a3b8] font-medium cursor-pointer">
              Require Plan Approval
            </Label>
            <Switch
              id="plan-approval"
              checked={requirePlanApproval}
              onCheckedChange={setRequirePlanApproval}
              disabled={isLoading}
              className="data-[state=checked]:bg-[#818cf8]"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-3 py-2 text-sm text-[#f87171] animate-fade-in">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.04)]">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 text-[#64748b] hover:text-white hover:bg-[rgba(255,255,255,0.04)] h-10 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isLoading || !prompt.trim() || !selectedSource}
            className="flex-1 bg-gradient-premium text-white h-10 rounded-lg font-medium shadow-md transition-all duration-200 disabled:opacity-50 interaction-scale"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Launching...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                <span>Launch Mission</span>
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
