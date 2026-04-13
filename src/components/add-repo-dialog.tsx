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
  Loader2,
  Github,
  Plus,
  Globe,
  Lock,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { createGitHubRepo, GitHubRepo } from "@/lib/jules-client";

interface AddRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  githubToken: string;
  onRepoCreated: () => void;
}

type ActiveTab = "create" | "connect";

export function AddRepoDialog({
  open,
  onOpenChange,
  githubToken,
  onRepoCreated,
}: AddRepoDialogProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("create");
  const [repoName, setRepoName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRepo, setCreatedRepo] = useState<GitHubRepo | null>(null);

  const handleCreate = async () => {
    if (!repoName.trim()) {
      setError("Repository name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const repo = await createGitHubRepo(githubToken, {
        name: repoName.trim(),
        description: description.trim() || undefined,
        private: isPrivate,
        auto_init: autoInit,
      });
      setCreatedRepo(repo);
      onRepoCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create repository");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setRepoName("");
    setDescription("");
    setIsPrivate(false);
    setAutoInit(true);
    setError(null);
    setCreatedRepo(null);
    setActiveTab("create");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-[var(--wa-dialog-bg)] border-[var(--wa-border)] text-[var(--wa-text)] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-7 w-7 rounded-lg bg-gradient-agent flex items-center justify-center">
              <Github className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="gradient-text">Add Repository</span>
          </DialogTitle>
          <DialogDescription className="text-[var(--wa-text-muted)]">
            Create a new repository or connect an existing one
          </DialogDescription>
        </DialogHeader>

        {/* Success State */}
        {createdRepo ? (
          <div className="py-4 space-y-4 animate-fade-in-up">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-[rgba(16,185,129,0.1)] flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-[#10b981]" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-[var(--wa-text)] mb-1">Repository Created!</h4>
                <p className="text-sm text-[var(--wa-text-muted)]">
                  Your new repository has been created on GitHub
                </p>
              </div>
            </div>

            <div className="wa-card rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-[#00a884]" />
                <span className="text-sm font-mono text-[var(--wa-text)]">{createdRepo.full_name}</span>
              </div>
              {createdRepo.description && (
                <p className="text-xs text-[var(--wa-text-muted)] pl-6">{createdRepo.description}</p>
              )}
              <div className="flex items-center gap-2 pl-6">
                <a
                  href={createdRepo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#00a884] hover:text-[#008069] transition-colors"
                >
                  View on GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-[10px] text-[var(--wa-text-muted)] opacity-50">•</span>
                <span className="text-[10px] text-[var(--wa-text-muted)]">
                  {createdRepo.private ? "Private" : "Public"}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.12)] px-3 py-2.5">
              <p className="text-xs text-[#f59e0b] leading-relaxed">
                To use this repo with Jules, install the{" "}
                <a
                  href="https://jules.google"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f59e0b] underline underline-offset-2 hover:text-[#fbbf24] transition-colors"
                >
                  Jules GitHub App
                </a>{" "}
                on it.
              </p>
            </div>

            <Button
              onClick={handleClose}
              className="w-full bg-gradient-agent hover:brightness-115 text-white h-10 rounded-lg font-medium transition-all duration-200"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="flex gap-1 p-1 rounded-lg bg-[var(--wa-search-bg)] border border-[var(--wa-border)]">
              <button
                type="button"
                onClick={() => { setActiveTab("create"); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                  activeTab === "create"
                    ? "bg-[rgba(0,168,132,0.1)] text-[#00a884] border border-[rgba(0,168,132,0.15)]"
                    : "text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] border border-transparent"
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                Create New
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("connect"); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                  activeTab === "connect"
                    ? "bg-[rgba(0,168,132,0.1)] text-[#00a884] border border-[rgba(0,168,132,0.15)]"
                    : "text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] border border-transparent"
                }`}
              >
                <Github className="h-3.5 w-3.5" />
                Connect Existing
              </button>
            </div>

            {activeTab === "create" ? (
              <div className="space-y-4 py-2">
                {/* Repo Name */}
                <div className="space-y-2">
                  <Label htmlFor="repo-name" className="text-xs text-[var(--wa-text-muted)] font-medium">
                    Repository Name *
                  </Label>
                  <Input
                    id="repo-name"
                    placeholder="e.g., my-awesome-project"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    disabled={isLoading}
                    className="wa-setup-input h-10 text-sm font-mono transition-all duration-200"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="repo-description" className="text-xs text-[var(--wa-text-muted)] font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="repo-description"
                    placeholder="A short description of your repository..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                    className="wa-setup-input rounded-lg text-sm transition-all duration-200 resize-none"
                  />
                </div>

                {/* Visibility Toggle */}
                <div className="space-y-2">
                  <Label className="text-xs text-[var(--wa-text-muted)] font-medium">Visibility</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPrivate(false)}
                      disabled={isLoading}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                        !isPrivate
                          ? "bg-[rgba(0,168,132,0.08)] border-[rgba(0,168,132,0.2)] text-[#00a884]"
                          : "bg-[var(--wa-search-bg)] border-[var(--wa-border)] text-[var(--wa-text-muted)] hover:border-[var(--wa-input-border)] hover:text-[var(--wa-text)]"
                      }`}
                    >
                      <Globe className="h-4 w-4" />
                      <span className="text-[11px] font-medium">Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrivate(true)}
                      disabled={isLoading}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                        isPrivate
                          ? "bg-[rgba(0,168,132,0.08)] border-[rgba(0,168,132,0.2)] text-[#00a884]"
                          : "bg-[var(--wa-search-bg)] border-[var(--wa-border)] text-[var(--wa-text-muted)] hover:border-[var(--wa-input-border)] hover:text-[var(--wa-text)]"
                      }`}
                    >
                      <Lock className="h-4 w-4" />
                      <span className="text-[11px] font-medium">Private</span>
                    </button>
                  </div>
                </div>

                {/* Initialize with README */}
                <div className="flex items-center justify-between px-1">
                  <Label htmlFor="auto-init" className="text-xs text-[var(--wa-text-muted)] font-medium cursor-pointer flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3" />
                    Initialize with README
                  </Label>
                  <Switch
                    id="auto-init"
                    checked={autoInit}
                    onCheckedChange={setAutoInit}
                    disabled={isLoading}
                    className="data-[state=checked]:bg-[#00a884]"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-3 py-2 text-sm text-[#f87171] animate-fade-in">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 space-y-4">
                <div className="rounded-lg bg-[var(--wa-search-bg)] border border-[var(--wa-border)] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Github className="h-5 w-5 text-[#00a884]" />
                    <span className="text-sm font-medium text-[var(--wa-text)]">Connect via Jules GitHub App</span>
                  </div>
                  <p className="text-xs text-[var(--wa-text-muted)] leading-relaxed">
                    To use an existing repository with Jules, you need to install the Jules GitHub App
                    on your repository. This gives Jules the permissions it needs to read and modify
                    your code.
                  </p>
                  <a
                    href="https://jules.google"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--wa-search-bg)] border border-[var(--wa-border)] text-sm text-[#00a884] hover:bg-[var(--wa-hover-bg)] hover:border-[rgba(0,168,132,0.15)] transition-all duration-200"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Install Jules GitHub App
                  </a>
                </div>

                <div className="flex items-center gap-3 px-1">
                  <p className="text-xs text-[var(--wa-text-muted)]">
                    After installing the app, refresh your sources to see the new repository.
                  </p>
                </div>

                <Button
                  onClick={onRepoCreated}
                  variant="ghost"
                  className="w-full text-[#00a884] hover:text-[#008069] hover:bg-[rgba(0,168,132,0.08)] h-10 rounded-lg gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Sources
                </Button>
              </div>
            )}

            {/* Footer — only show for Create tab */}
            {activeTab === "create" && (
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--wa-border)]">
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] h-10 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isLoading || !repoName.trim()}
                  className="flex-1 bg-gradient-agent hover:brightness-115 text-white h-10 rounded-lg font-medium shadow-md transition-all duration-200 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Create Repository</span>
                    </div>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
