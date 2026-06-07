CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  message text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own chat history"
ON public.ai_chat_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own chat history"
ON public.ai_chat_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat history"
ON public.ai_chat_history FOR DELETE
USING (auth.uid() = user_id);
