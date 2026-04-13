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
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: (user: SupabaseUser) => void;
}

type AuthMode = "login" | "signup" | "magic-link";

export function AuthDialog({ open, onOpenChange, onAuthSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setError(null);
    setSuccessMessage(null);
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase not configured");

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) throw authError;
      if (data.user) {
        onAuthSuccess(data.user);
        onOpenChange(false);
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase not configured");

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            display_name: displayName.trim() || undefined,
          },
        },
      });

      if (authError) throw authError;

      if (data.user && !data.session) {
        setSuccessMessage("Check your email for a confirmation link!");
      } else if (data.user && data.session) {
        onAuthSuccess(data.user);
        onOpenChange(false);
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase not configured");

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
      });

      if (authError) throw authError;
      setSuccessMessage("Magic link sent! Check your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === "login") handleLogin();
    else if (mode === "signup") handleSignup();
    else handleMagicLink();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-surface-heavy border-white/[0.08] text-[#E0F7FA] shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#00E676] flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-[#03080a]" />
            </div>
            <span className="bg-gradient-to-r from-[#00E5FF] to-[#00E676] bg-clip-text text-transparent">
              {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Magic Link Login"}
            </span>
          </div>
          <DialogDescription className="text-[#547B88]">
            {mode === "login"
              ? "Sign in to sync your data across devices"
              : mode === "signup"
              ? "Create an account to persist your settings"
              : "Get a sign-in link sent to your email"}
          </DialogDescription>
        </DialogHeader>

        {/* Success message */}
        {successMessage && (
          <div className="rounded-xl bg-[rgba(0,230,118,0.08)] border border-[rgba(0,230,118,0.15)] px-3 py-2.5 text-sm text-[#00E676] animate-fade-in flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Display Name (signup only) */}
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="auth-name" className="text-[10px] text-[#547B88] uppercase tracking-wider font-semibold">
                Display Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#547B88]" />
                <Input
                  id="auth-name"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); setError(null); }}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="pl-10 glass-input h-10 text-sm rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="auth-email" className="text-[10px] text-[#547B88] uppercase tracking-wider font-semibold">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#547B88]" />
              <Input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="pl-10 glass-input h-10 text-sm rounded-xl"
              />
            </div>
          </div>

          {/* Password (not for magic link) */}
          {mode !== "magic-link" && (
            <div className="space-y-2">
              <Label htmlFor="auth-password" className="text-[10px] text-[#547B88] uppercase tracking-wider font-semibold">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#547B88]" />
                <Input
                  id="auth-password"
                  type="password"
                  placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="pl-10 glass-input h-10 text-sm rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-[rgba(255,42,95,0.08)] border border-[rgba(255,42,95,0.15)] px-3 py-2 text-sm text-[#FF2A5F] animate-fade-in">
              {error}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="space-y-3">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !email.trim() || (mode !== "magic-link" && !password.trim())}
            className="w-full bg-gradient-to-r from-[#00E5FF] to-[#00E676] text-[#03080a] h-10 rounded-xl font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {mode === "login" ? "Signing in..." : mode === "signup" ? "Creating account..." : "Sending link..."}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {mode === "login" ? (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>Sign In</span>
                  </>
                ) : mode === "signup" ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Create Account</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    <span>Send Magic Link</span>
                  </>
                )}
              </div>
            )}
          </Button>

          {/* Mode switcher */}
          <div className="flex items-center justify-center gap-2 text-xs">
            {mode === "login" && (
              <>
                <button onClick={() => handleModeSwitch("signup")} className="text-[#547B88] hover:text-[#00E5FF] transition-colors">
                  Create account
                </button>
                <span className="text-[#547B88] opacity-30">|</span>
                <button onClick={() => handleModeSwitch("magic-link")} className="text-[#547B88] hover:text-[#00E5FF] transition-colors">
                  Use magic link
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                <button onClick={() => handleModeSwitch("login")} className="text-[#547B88] hover:text-[#00E5FF] transition-colors">
                  Already have an account?
                </button>
                <span className="text-[#547B88] opacity-30">|</span>
                <button onClick={() => handleModeSwitch("magic-link")} className="text-[#547B88] hover:text-[#00E5FF] transition-colors">
                  Use magic link
                </button>
              </>
            )}
            {mode === "magic-link" && (
              <>
                <button onClick={() => handleModeSwitch("login")} className="text-[#547B88] hover:text-[#00E5FF] transition-colors">
                  Sign in with password
                </button>
                <span className="text-[#547B88] opacity-30">|</span>
                <button onClick={() => handleModeSwitch("signup")} className="text-[#547B88] hover:text-[#00E5FF] transition-colors">
                  Create account
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
