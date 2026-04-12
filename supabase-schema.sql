-- ============================================
-- Jules Super Agent - Supabase Database Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles table (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. API Keys table (encrypted Jules + GitHub tokens)
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  jules_api_key TEXT NOT NULL,
  github_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON public.api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Saved Sessions table (bookmarks, notes, session metadata)
CREATE TABLE IF NOT EXISTS public.saved_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  session_title TEXT,
  session_state TEXT,
  source_name TEXT,
  prompt TEXT,
  notes TEXT,
  bookmarked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

ALTER TABLE public.saved_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved sessions" ON public.saved_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved sessions" ON public.saved_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved sessions" ON public.saved_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved sessions" ON public.saved_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Activity Log table (persistent activity history)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  activity_type TEXT,
  description TEXT,
  bash_output TEXT,
  code_change JSONB,
  jules_activity_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity log" ON public.activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log" ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity log" ON public.activity_log
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Agent Config table (user preferences and settings)
CREATE TABLE IF NOT EXISTS public.agent_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  default_automation_mode TEXT DEFAULT 'none',
  default_require_plan_approval BOOLEAN DEFAULT TRUE,
  default_branch TEXT DEFAULT 'main',
  theme TEXT DEFAULT 'dark',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.agent_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own config" ON public.agent_config
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config" ON public.agent_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config" ON public.agent_config
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Enable Realtime for activity_log and saved_sessions
-- ============================================
-- Run these in the Supabase Dashboard > Database > Replication
-- Or use the following SQL:

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_sessions;

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_sessions_user_id ON public.saved_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_sessions_bookmarked ON public.saved_sessions(user_id, bookmarked);
CREATE INDEX IF NOT EXISTS idx_activity_log_session_id ON public.activity_log(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
