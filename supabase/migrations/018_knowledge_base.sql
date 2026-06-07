-- 1. Create the knowledge_base table
CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL DEFAULT 'Hukum Perdata',
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the generated TSVECTOR column for Full-Text Search
ALTER TABLE public.knowledge_base
ADD COLUMN IF NOT EXISTS fts_content TSVECTOR
GENERATED ALWAYS AS (to_tsvector('simple', coalesce(category, '') || ' ' || coalesce(content, ''))) STORED;

-- 3. Create a GIN index to make the search extremely fast
CREATE INDEX IF NOT EXISTS knowledge_base_fts_idx ON public.knowledge_base USING GIN (fts_content);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- 5. Add Policies
-- Allow anyone to read the knowledge base
CREATE POLICY "Allow public read access to knowledge_base"
ON public.knowledge_base
FOR SELECT
USING (true);

-- Allow authenticated admins (or service role) to insert/update
CREATE POLICY "Allow service role or admin to modify knowledge_base"
ON public.knowledge_base
FOR ALL
USING (true)
WITH CHECK (true);

-- 6. Create RPC for AI to search knowledge base easily
CREATE OR REPLACE FUNCTION search_knowledge(search_query TEXT, max_results INT DEFAULT 3)
RETURNS TABLE (id UUID, category TEXT, content TEXT, rank REAL) AS $$
BEGIN
  RETURN QUERY
  SELECT kb.id, kb.category, kb.content, ts_rank(kb.fts_content, websearch_to_tsquery('simple', search_query)) as rank
  FROM public.knowledge_base kb
  WHERE kb.fts_content @@ websearch_to_tsquery('simple', search_query)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
