import { handleOptions, sendJson, supabaseRest } from './_runtime.js';

async function getOrCreateSession({ consultationId, clientId, lawyerId }) {
  if (!consultationId || !lawyerId) {
    throw new Error('Consultation ID dan lawyer ID wajib tersedia');
  }

  const existing = await supabaseRest(
    'GET',
    `app_chat_sessions?consultation_id=eq.${encodeURIComponent(consultationId)}&select=id,consultation_id,client_id,lawyer_id,status&limit=1`
  ).catch(() => []);

  if (existing && existing.length > 0) return existing[0];

  const inserted = await supabaseRest('POST', 'app_chat_sessions', {
    consultation_id: consultationId,
    client_id: clientId || null,
    lawyer_id: lawyerId,
    status: 'active'
  });

  return inserted?.[0];
}

async function listMessages(chatSessionId) {
  if (!chatSessionId) throw new Error('Chat session ID wajib tersedia');
  return await supabaseRest(
    'GET',
    `app_messages?chat_session_id=eq.${encodeURIComponent(chatSessionId)}&select=id,chat_session_id,sender_id,sender_role,content,attachment_url,attachment_name,attachment_size,message_type,created_at&order=created_at.asc`
  );
}

async function sendMessage({ chatSessionId, senderId, senderRole, content, messageType }) {
  if (!chatSessionId || !content?.trim()) {
    throw new Error('Chat session dan isi pesan wajib tersedia');
  }

  const inserted = await supabaseRest('POST', 'app_messages', {
    chat_session_id: chatSessionId,
    sender_id: senderId || null,
    sender_role: senderRole || 'client',
    content,
    message_type: messageType || 'text'
  });

  return inserted?.[0];
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

      if (body.action === 'send-message') {
        const message = await sendMessage(body);
        sendJson(res, 201, message);
        return;
      }

      const session = await getOrCreateSession(body);
      sendJson(res, 200, session);
      return;
    }

    if (req.method === 'GET') {
      const sessionId = req.query?.sessionId;
      const messages = await listMessages(sessionId);
      sendJson(res, 200, messages || []);
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(res, 502, {
      error: error instanceof Error ? error.message : 'Chat database belum siap'
    });
  }
}
