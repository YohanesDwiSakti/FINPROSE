import { requireSupabase } from '../supabaseClient';

const LOCAL_SESSIONS_KEY = 'finprose_ai_sessions';
const LOCAL_MESSAGES_KEY = 'finprose_ai_messages';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export type AIMessage = {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
};

export type AISession = {
  sessionId: string;
  title: string;
  timestamp: string;
  isArchived: boolean;
};

type ConversationRow = {
  id: string;
  user_id: string;
  title: string | null;
  updated_at: string;
  created_at: string;
  is_archived?: boolean;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

function mapMessage(row: MessageRow, userId: string): AIMessage {
  return {
    id: row.id,
    session_id: row.conversation_id,
    user_id: userId,
    role: row.role,
    message: row.content,
    timestamp: row.created_at
  };
}

function mapSession(row: ConversationRow): AISession {
  return {
    sessionId: row.id,
    title: row.title || 'Percakapan Rusdi',
    timestamp: row.updated_at || row.created_at,
    isArchived: Boolean(row.is_archived)
  };
}

async function fetchConversationsFromTable(userId: string, includeArchived = false): Promise<AISession[]> {
  const supabase = requireSupabase();
  let query = supabase
    .from('ai_conversations')
    .select('id, user_id, title, updated_at, created_at, is_archived')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (!includeArchived) {
    query = query.eq('is_archived', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as ConversationRow[] || []).map(mapSession);
}

async function fetchSessionsFromLegacyView(userId: string): Promise<AISession[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('ai_chat_history')
    .select('session_id, message, timestamp, role')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true });

  if (error) throw error;
  if (!data?.length) return [];

  const sessionsMap = new Map<string, AISession>();
  data.forEach((msg: { session_id: string; message: string; timestamp: string; role: string }) => {
    const existing = sessionsMap.get(msg.session_id);
    if (!existing) {
      sessionsMap.set(msg.session_id, {
        sessionId: msg.session_id,
        title: msg.role === 'user'
          ? msg.message.slice(0, 40) + (msg.message.length > 40 ? '...' : '')
          : 'Percakapan Rusdi',
        timestamp: msg.timestamp,
        isArchived: false
      });
      return;
    }
    if (new Date(msg.timestamp) > new Date(existing.timestamp)) {
      existing.timestamp = msg.timestamp;
    }
    if (msg.role === 'user' && (existing.title === 'Percakapan Rusdi' || !existing.title)) {
      existing.title = msg.message.slice(0, 40) + (msg.message.length > 40 ? '...' : '');
    }
  });

  return Array.from(sessionsMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function fetchAISessions(userId: string, options?: { includeArchived?: boolean }): Promise<AISession[]> {
  try {
    const sessions = await fetchConversationsFromTable(userId, options?.includeArchived);
    if (sessions.length) return sessions;
  } catch (error) {
    console.warn('ai_conversations unavailable, falling back', error);
  }

  try {
    const legacy = await fetchSessionsFromLegacyView(userId);
    if (legacy.length) return legacy;
  } catch {
    // local fallback below
  }

  const local = readLocal<Record<string, AISession[]>>(LOCAL_SESSIONS_KEY, {});
  const rows = local[userId] || [];
  return options?.includeArchived ? rows : rows.filter((item) => !item.isArchived);
}

export async function searchAISessions(userId: string, query: string, includeArchived = false): Promise<AISession[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return fetchAISessions(userId, { includeArchived });

  const sessions = await fetchAISessions(userId, { includeArchived });
  return sessions.filter((session) => session.title.toLowerCase().includes(normalized));
}

export async function fetchAIMessages(sessionId: string): Promise<AIMessage[]> {
  const supabase = requireSupabase();

  try {
    const { data: conversation } = await supabase
      .from('ai_conversations')
      .select('user_id')
      .eq('id', sessionId)
      .maybeSingle();

    const { data, error } = await supabase
      .from('ai_messages')
      .select('id, conversation_id, role, content, created_at')
      .eq('conversation_id', sessionId)
      .order('created_at', { ascending: true });

    if (!error && data?.length) {
      const userId = (conversation as { user_id?: string } | null)?.user_id || '';
      return (data as MessageRow[]).map((row) => mapMessage(row, userId));
    }
  } catch {
    // fallback below
  }

  const { data, error } = await supabase
    .from('ai_chat_history')
    .select('id, session_id, user_id, role, message, timestamp')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  if (!error && data?.length) return data as AIMessage[];

  const local = readLocal<Record<string, AIMessage[]>>(LOCAL_MESSAGES_KEY, {});
  return local[sessionId] || [];
}

export async function createAISession(userId: string, title = 'Percakapan Baru'): Promise<AISession> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: userId,
      title,
      is_archived: false
    })
    .select('id, user_id, title, updated_at, created_at, is_archived')
    .single();

  if (error) {
    const sessionId = crypto.randomUUID();
    const session = {
      sessionId,
      title,
      timestamp: new Date().toISOString(),
      isArchived: false
    };
    const local = readLocal<Record<string, AISession[]>>(LOCAL_SESSIONS_KEY, {});
    local[userId] = [session, ...(local[userId] || [])];
    writeLocal(LOCAL_SESSIONS_KEY, local);
    return session;
  }
  return mapSession(data as ConversationRow);
}

export async function renameAISession(sessionId: string, userId: string, title: string): Promise<void> {
  try {
    const supabase = requireSupabase();
    const { error } = await supabase
      .from('ai_conversations')
      .update({ title: title.trim() || 'Percakapan Rusdi', updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId);
    if (!error) return;
  } catch {
    // local fallback
  }

  const local = readLocal<Record<string, AISession[]>>(LOCAL_SESSIONS_KEY, {});
  local[userId] = (local[userId] || []).map((item) => item.sessionId === sessionId ? { ...item, title } : item);
  writeLocal(LOCAL_SESSIONS_KEY, local);
}

export async function archiveAISession(sessionId: string, userId: string, archived = true): Promise<void> {
  try {
    const supabase = requireSupabase();
    const { error } = await supabase
      .from('ai_conversations')
      .update({ is_archived: archived, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId);
    if (!error) return;
  } catch {
    // local fallback
  }

  const local = readLocal<Record<string, AISession[]>>(LOCAL_SESSIONS_KEY, {});
  local[userId] = (local[userId] || []).map((item) => item.sessionId === sessionId ? { ...item, isArchived: archived } : item);
  writeLocal(LOCAL_SESSIONS_KEY, local);
}

export async function deleteAISession(sessionId: string, userId: string): Promise<void> {
  const supabase = requireSupabase();

  const removeLocal = () => {
    const sessions = readLocal<Record<string, AISession[]>>(LOCAL_SESSIONS_KEY, {});
    sessions[userId] = (sessions[userId] || []).filter((item) => item.sessionId !== sessionId);
    writeLocal(LOCAL_SESSIONS_KEY, sessions);
    const messages = readLocal<Record<string, AIMessage[]>>(LOCAL_MESSAGES_KEY, {});
    delete messages[sessionId];
    writeLocal(LOCAL_MESSAGES_KEY, messages);
  };

  try {
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);
    if (!error) {
      removeLocal();
      return;
    }
  } catch {
    // fallback below
  }

  try {
    const { error } = await supabase
      .from('ai_chat_history')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);
    if (!error) {
      removeLocal();
      return;
    }
  } catch {
    // local fallback below
  }

  removeLocal();
}
