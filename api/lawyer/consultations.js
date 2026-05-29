import { createClient } from '@supabase/supabase-js';
import { handleOptions, sendJson, supabaseRest, supabaseServiceKey, supabaseUrl } from '../_runtime.js';

function bearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

async function resolveLawyerId(req, requestedLawyerId) {
  const token = bearerToken(req);
  const url = supabaseUrl();
  const serviceKey = supabaseServiceKey();
  if (!token || !url || !serviceKey) {
    throw new Error('Sesi advokat tidak valid.');
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.id) {
    throw new Error('Sesi advokat tidak valid.');
  }

  const profiles = await supabaseRest(
    'GET',
    `profiles?id=eq.${encodeURIComponent(data.user.id)}&select=id,role,status`
  );
  const profile = profiles?.[0];
  if (!profile || !['lawyer', 'admin'].includes(profile.role) || profile.status !== 'active') {
    throw new Error('Akses advokat ditolak.');
  }

  if (profile.role === 'admin') return requestedLawyerId || data.user.id;
  return data.user.id;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    const requestedLawyerId = String(req.query?.lawyerId || '').trim();
    const lawyerId = await resolveLawyerId(req, requestedLawyerId);

    const rows = await supabaseRest(
      'GET',
      `app_consultations?lawyer_id=eq.${encodeURIComponent(lawyerId)}&select=id,client_id,lawyer_id,consultation_type,scheduled_day,scheduled_time,status,price,notes,created_at,lawyer_directory(name,specialty,image),profiles(full_name,email),app_payments(id,status,total_amount,method,paid_at,created_at)&order=created_at.desc`
    );

    sendJson(res, 200, rows || []);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Konsultasi advokat gagal dimuat.';
    sendJson(res, message.includes('ditolak') || message.includes('valid') ? 403 : 502, { error: message });
  }
}
