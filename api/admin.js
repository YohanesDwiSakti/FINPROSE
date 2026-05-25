import { createClient } from '@supabase/supabase-js';
import { handleOptions, sendJson, supabaseRest, supabaseServiceKey, supabaseUrl } from './_runtime.js';

function bearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

async function requireAdmin(req) {
  const token = bearerToken(req);
  const url = supabaseUrl();
  const serviceKey = supabaseServiceKey();
  if (!token || !url || !serviceKey) {
    throw new Error('Sesi admin tidak valid.');
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.id) {
    throw new Error('Sesi admin tidak valid.');
  }

  const profiles = await supabaseRest('GET', `profiles?id=eq.${encodeURIComponent(data.user.id)}&select=id,role,status`);
  if (!profiles?.[0] || profiles[0].role !== 'admin' || profiles[0].status !== 'active') {
    throw new Error('Akses admin ditolak.');
  }
  return data.user.id;
}

async function verifyLawyer(lawyerUserId) {
  const profiles = await supabaseRest('GET', `profiles?id=eq.${encodeURIComponent(lawyerUserId)}&select=id,full_name,email,avatar_url`);
  const profile = profiles?.[0];
  if (!profile) throw new Error('Profil advokat tidak ditemukan.');

  const lawyerProfiles = await supabaseRest('GET', `lawyer_profiles?user_id=eq.${encodeURIComponent(lawyerUserId)}&select=specialty,description,experience_years,consultation_price`);
  const lawyerProfile = lawyerProfiles?.[0] || {};

  await supabaseRest('PATCH', `profiles?id=eq.${encodeURIComponent(lawyerUserId)}`, { status: 'active' });
  await supabaseRest('PATCH', `lawyer_profiles?user_id=eq.${encodeURIComponent(lawyerUserId)}`, { verification_status: 'verified' });
  await supabaseRest('POST', 'lawyer_directory?on_conflict=id', {
    id: lawyerUserId,
    name: profile.full_name,
    specialty: lawyerProfile.specialty || 'Belum diisi',
    description: lawyerProfile.description || 'Advokat FINPROSE terverifikasi.',
    experience_years: lawyerProfile.experience_years || 0,
    consultation_price: lawyerProfile.consultation_price || 150000,
    image: profile.avatar_url || '/lawyer1.png',
    verification_status: 'verified',
    languages: ['Bahasa Indonesia'],
    education: [],
    certifications: ['Dokumen verifikasi disetujui admin'],
    availability: [
      { day: 'Senin', times: ['09:00', '11:00', '14:00'] },
      { day: 'Rabu', times: ['10:00', '13:00', '15:00'] }
    ]
  });
}

async function updatePaymentStatus(paymentId, status) {
  const patch = { status };
  if (status === 'paid') patch.paid_at = new Date().toISOString();
  const payments = await supabaseRest('PATCH', `app_payments?id=eq.${encodeURIComponent(paymentId)}`, patch);
  const payment = payments?.[0];
  if (!payment?.consultation_id) return;

  const consultationStatus = status === 'paid' ? 'paid' : status === 'failed' || status === 'expired' ? 'cancelled' : undefined;
  if (consultationStatus) {
    await supabaseRest('PATCH', `app_consultations?id=eq.${encodeURIComponent(payment.consultation_id)}`, { status: consultationStatus });
  }
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    const adminId = await requireAdmin(req);

    if (req.method === 'GET') {
      const resource = req.query.resource;
      const paths = {
        'pending-lawyers': 'lawyer_profiles?verification_status=in.(pending,rejected,suspended)&select=user_id,specialty,description,experience_years,consultation_price,verification_status,profiles(full_name,email,status,avatar_url)&order=verification_status.asc',
        transactions: 'app_payments?select=id,consultation_id,client_id,amount,admin_fee,tax_amount,platform_fee,total_amount,method,provider,status,external_reference,created_at,paid_at,profiles(full_name,email),app_consultations(lawyer_id,consultation_type,status,lawyer_directory(name,specialty))&order=created_at.desc&limit=50',
        clients: 'profiles?role=eq.client&select=id,full_name,email,phone,role,status,created_at&order=created_at.desc&limit=100',
        'support-tickets': 'support_tickets?select=id,user_id,subject,message,status,priority,created_at,updated_at,profiles(full_name,email,role)&order=created_at.desc&limit=50',
        consultations: 'app_consultations?select=id,client_id,lawyer_id,consultation_type,scheduled_day,scheduled_time,status,price,notes,created_at,profiles(full_name,email),lawyer_directory(name,specialty),app_payments(id,status,total_amount,method,created_at)&order=created_at.desc&limit=50'
      };
      if (!paths[resource]) {
        sendJson(res, 400, { error: 'Resource admin tidak valid.' });
        return;
      }
      sendJson(res, 200, await supabaseRest('GET', paths[resource]));
      return;
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      if (body.action === 'verify-lawyer') {
        await verifyLawyer(body.lawyerUserId);
      } else if (body.action === 'reject-lawyer') {
        await supabaseRest('PATCH', `profiles?id=eq.${encodeURIComponent(body.lawyerUserId)}`, { status: 'suspended' });
        await supabaseRest('PATCH', `lawyer_profiles?user_id=eq.${encodeURIComponent(body.lawyerUserId)}`, { verification_status: 'rejected' });
      } else if (body.action === 'update-client-status') {
        await supabaseRest('PATCH', `profiles?id=eq.${encodeURIComponent(body.clientId)}&role=eq.client`, { status: body.status, updated_at: new Date().toISOString() });
      } else if (body.action === 'update-support-ticket') {
        await supabaseRest('PATCH', `support_tickets?id=eq.${encodeURIComponent(body.ticketId)}`, { status: body.status, updated_at: new Date().toISOString() });
      } else if (body.action === 'reply-support-ticket') {
        const note = `\n\n---\nBalasan admin (${new Date().toLocaleString('id-ID')}):\n${String(body.response || '').trim()}`;
        const tickets = await supabaseRest('GET', `support_tickets?id=eq.${encodeURIComponent(body.ticketId)}&select=message`);
        await supabaseRest('PATCH', `support_tickets?id=eq.${encodeURIComponent(body.ticketId)}`, {
          message: `${tickets?.[0]?.message || ''}${note}`,
          status: 'resolved',
          updated_at: new Date().toISOString()
        });
      } else if (body.action === 'update-payment-status') {
        await updatePaymentStatus(body.paymentId, body.status);
      } else {
        sendJson(res, 400, { error: 'Aksi admin tidak valid.' });
        return;
      }

      sendJson(res, 200, { status: 'success', adminId });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Akses admin gagal.';
    sendJson(res, message.includes('ditolak') || message.includes('valid') ? 403 : 502, { error: message });
  }
}
