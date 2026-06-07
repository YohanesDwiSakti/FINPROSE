export type KnowledgeChunk = {
  id: string;
  category: string;
  content: string;
  source: 'knowledge_base' | 'document_chunk' | 'lawyer_profile';
};

export type StoredEmbedding = {
  chunkId: string;
  embedding: number[];
  model: string;
};

const embeddingCache = new Map<string, StoredEmbedding>();

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function embedText(text: string): number[] {
  const tokens = tokenize(text);
  const vector = new Array(128).fill(0);
  tokens.forEach((token, index) => {
    const hash = token.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    vector[hash % 128] += 1 + (index % 3) * 0.1;
  });
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map(value => Number((value / magnitude).toFixed(6)));
}

export function storeEmbedding(chunkId: string, text: string, model = 'text-embedding-local') {
  const embedding = embedText(text);
  embeddingCache.set(chunkId, { chunkId, embedding, model });
  return embedding;
}

export function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function upsertChunks(chunks: KnowledgeChunk[]) {
  chunks.forEach(chunk => storeEmbedding(chunk.id, chunk.content));
}

export function searchSimilar(query: string, chunks: KnowledgeChunk[], limit = 5) {
  const queryEmbedding = embedText(query);
  return chunks
    .map(chunk => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, embeddingCache.get(chunk.id)?.embedding || embedText(chunk.content))
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.chunk);
}

export function clearVectorStore() {
  embeddingCache.clear();
}
