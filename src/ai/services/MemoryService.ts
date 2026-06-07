import { requireSupabase } from '../../supabaseClient';

export type ConversationMemory = {
  conversationId: string;
  title: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; createdAt: string }>;
};

export async function loadConversationMemory(conversationId: string): Promise<ConversationMemory | null> {
  try {
    const supabase = requireSupabase();
    const { data: conversation } = await supabase
      .from('ai_conversations')
      .select('id, title, updated_at')
      .eq('id', conversationId)
      .maybeSingle();

    const { data: messages } = await supabase
      .from('ai_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (!conversation && (!messages || !messages.length)) {
      return loadLegacyMemory(conversationId);
    }

    return {
      conversationId,
      title: conversation?.title || 'Percakapan Rusdi',
      messages: (messages || []).map(row => ({
        role: row.role === 'assistant' ? 'assistant' : 'user',
        content: row.content,
        createdAt: row.created_at
      }))
    };
  } catch {
    return loadLegacyMemory(conversationId);
  }
}

async function loadLegacyMemory(sessionId: string): Promise<ConversationMemory | null> {
  try {
    const supabase = requireSupabase();
    const { data } = await supabase
      .from('ai_chat_history')
      .select('role, message, timestamp')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true })
      .limit(20);

    if (!data?.length) return null;
    return {
      conversationId: sessionId,
      title: data[0]?.message?.slice(0, 40) || 'Percakapan Rusdi',
      messages: data.map(row => ({
        role: row.role === 'assistant' ? 'assistant' : 'user',
        content: row.message,
        createdAt: row.timestamp
      }))
    };
  } catch {
    return null;
  }
}

export async function persistConversationTurn(payload: {
  userId: string;
  conversationId: string;
  userMessage: string;
  assistantMessage: string;
  title?: string;
}) {
  try {
    const supabase = requireSupabase();
    await supabase.from('ai_conversations').upsert({
      id: payload.conversationId,
      user_id: payload.userId,
      title: payload.title || payload.userMessage.slice(0, 60),
      updated_at: new Date().toISOString()
    });

    await supabase.from('ai_messages').insert([
      { conversation_id: payload.conversationId, role: 'user', content: payload.userMessage },
      { conversation_id: payload.conversationId, role: 'assistant', content: payload.assistantMessage }
    ]);

    await supabase.from('ai_analysis_history').insert({
      user_id: payload.userId,
      conversation_id: payload.conversationId,
      analysis_type: 'chat_turn',
      input_summary: payload.userMessage.slice(0, 240),
      output_summary: payload.assistantMessage.slice(0, 240),
      metadata: { source: 'rusdi_chat' }
    });
  } catch {
    await persistLegacyTurn(payload);
  }
}

async function persistLegacyTurn(payload: {
  userId: string;
  conversationId: string;
  userMessage: string;
  assistantMessage: string;
}) {
  const supabase = requireSupabase();
  await supabase.from('ai_chat_history').insert([
    {
      session_id: payload.conversationId,
      user_id: payload.userId,
      role: 'user',
      message: payload.userMessage
    },
    {
      session_id: payload.conversationId,
      user_id: payload.userId,
      role: 'assistant',
      message: payload.assistantMessage
    }
  ]);
}

export function buildMemoryPrompt(memory: ConversationMemory | null, limit = 8) {
  if (!memory?.messages.length) return '';
  return memory.messages
    .slice(-limit)
    .map(item => `${item.role === 'user' ? 'Pengguna' : 'Rusdi'}: ${item.content}`)
    .join('\n');
}
