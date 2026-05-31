CREATE TABLE IF NOT EXISTS public.hotel_agent_threads (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'interrupted', 'done', 'error')),
  last_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hotel_agent_threads_user_idx ON public.hotel_agent_threads (user_id, updated_at DESC);

CREATE TRIGGER hotel_agent_threads_updated_at
BEFORE UPDATE ON public.hotel_agent_threads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.hotel_agent_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY hotel_agent_threads_select_own ON public.hotel_agent_threads
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY hotel_agent_threads_insert_own ON public.hotel_agent_threads
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY hotel_agent_threads_update_own ON public.hotel_agent_threads
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY hotel_agent_threads_delete_own ON public.hotel_agent_threads
FOR DELETE USING (auth.uid() = user_id);
