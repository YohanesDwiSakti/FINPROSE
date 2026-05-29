import { handleOptions, sendJson, supabaseRest } from './_runtime.js';

async function listSignals({ consultationId, since }) {
  if (!consultationId) throw new Error('Consultation ID wajib tersedia.');

  const filters = [
    `consultation_id=eq.${encodeURIComponent(consultationId)}`,
    'select=id,consultation_id,sender_id,sender_role,signal_type,payload,created_at',
    'order=created_at.asc'
  ];

  if (since) {
    filters.push(`created_at=gt.${encodeURIComponent(since)}`);
  }

  return await supabaseRest('GET', `call_signals?${filters.join('&')}`);
}

async function sendSignal(body) {
  const consultationId = String(body.consultationId || '').trim();
  const senderId = String(body.senderId || '').trim();
  const signalType = String(body.signalType || '').trim();

  if (!consultationId) throw new Error('Consultation ID wajib tersedia.');
  if (!senderId) throw new Error('User belum login.');
  if (!['offer', 'answer', 'candidate', 'leave'].includes(signalType)) {
    throw new Error('Tipe sinyal call tidak valid.');
  }

  const inserted = await supabaseRest('POST', 'call_signals', {
    consultation_id: consultationId,
    sender_id: senderId,
    sender_role: body.senderRole || 'client',
    signal_type: signalType,
    payload: body.payload || {}
  });

  return inserted?.[0];
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      sendJson(res, 200, await listSignals(req.query || {}));
      return;
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      sendJson(res, 201, await sendSignal(body));
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(res, 502, {
      error: error instanceof Error ? error.message : 'Call belum siap.'
    });
  }
}
