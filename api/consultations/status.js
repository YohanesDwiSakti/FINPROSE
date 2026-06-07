import { createClient } from '@supabase/supabase-js';
import { handleOptions, sendJson, supabaseRest, supabaseServiceKey, supabaseUrl } from '../_runtime.js';

const VALID_STATUSES = new Set(['pending', 'paid', 'ongoing', 'in_review', 'completed', 'cancelled', 'expired']);

function bearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

async function requireParticipant(req, consultationId) {
  const token = bearerToken(req);
  const url = supabaseUrl();
  const serviceKey = supabaseServiceKey();
  if (!token || !url || !serviceKey) throw new Error('Sesi tidak valid.');

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.id) throw new Error('Sesi tidak valid.');

  const profiles = await supabaseRest('GET', `profiles?id=eq.${encodeURIComponent(data.user.id)}&select=id,role,status`);
  const profile = profiles?.[0];
  if (!profile || profile.status !== 'active') throw new Error('Akun tidak aktif.');

  const consultations = await supabaseRest(
    'GET',
    `app_consultations?id=eq.${encodeURIComponent(consultationId)}&select=id,client_id,lawyer_id,status`
  );
  const consultation = consultations?.[0];
  if (!consultation) throw new Error('Konsultasi tidak ditemukan.');

  const isParticipant = consultation.client_id === data.user.id || consultation.lawyer_id === data.user.id;
  if (profile.role !== 'admin' && !isParticipant) throw new Error('Akses konsultasi ditolak.');

  return { userId: data.user.id, consultation };
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    if (req.method !== 'PATCH') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const consultationId = String(body.consultationId || '').trim();
    const status = String(body.status || '').trim();
    const note = String(body.note || '').trim();

    if (!consultationId) throw new Error('Consultation ID wajib tersedia.');
    if (!VALID_STATUSES.has(status)) throw new Error('Status konsultasi tidak valid.');

    const { userId, consultation } = await requireParticipant(req, consultationId);
    const updated = await supabaseRest('PATCH', `app_consultations?id=eq.${encodeURIComponent(consultationId)}`, {
      status,
      updated_at: new Date().toISOString()
    });

    await supabaseRest('POST', 'consultation_status_logs', {
      consultation_id: consultationId,
      actor_id: body.actorId || userId,
      old_status: consultation.status || null,
      new_status: status,
      note: note || null
    }).catch(() => null);

    sendJson(res, 200, updated?.[0] || { id: consultationId, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Status konsultasi gagal diperbarui.';
    sendJson(res, message.includes('ditolak') || message.includes('valid') || message.includes('aktif') ? 403 : 502, { error: message });
  }
}
