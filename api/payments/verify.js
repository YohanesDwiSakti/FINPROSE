import { createClient } from '@supabase/supabase-js';
import {
  fetchAppPaymentById,
  handleOptions,
  insertNotification,
  insertVerificationLog,
  patchAppPayment,
  patchConsultationStatus,
  sendJson,
  supabaseRest,
  supabaseServiceKey,
  supabaseUrl
} from '../_runtime.js';

function bearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

async function requireActor(req) {
  const token = bearerToken(req);
  const url = supabaseUrl();
  const serviceKey = supabaseServiceKey();
  if (!token || !url || !serviceKey) throw new Error('Sesi tidak valid.');

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.id) throw new Error('Sesi tidak valid.');

  const profiles = await supabaseRest(
    'GET',
    `profiles?id=eq.${encodeURIComponent(data.user.id)}&select=id,full_name,role,status`
  );
  const profile = profiles?.[0];
  if (!profile || profile.status !== 'active') throw new Error('Akun tidak aktif.');
  if (!['lawyer', 'admin'].includes(profile.role)) {
    throw new Error('Hanya advokat atau admin yang dapat memverifikasi pembayaran.');
  }

  return { userId: data.user.id, profile };
}

async function getConsultationForPayment(payment) {
  const rows = await supabaseRest(
    'GET',
    `app_consultations?id=eq.${encodeURIComponent(payment.consultation_id)}&select=id,client_id,lawyer_id,consultation_type,lawyer_directory(name),profiles(full_name,email)`
  );
  return rows?.[0] || null;
}

async function listPaymentsForActor(profile, userId, status) {
  let path = 'app_payments?select=*,app_consultations(client_id,lawyer_id,consultation_type,status,lawyer_directory(name,specialty),profiles(full_name,email))&order=created_at.desc&limit=100';
  if (status) path += `&status=eq.${encodeURIComponent(status)}`;
  const rows = await supabaseRest('GET', path).catch(() => []);

  if (profile.role === 'admin') return rows || [];

  return (rows || []).filter((row) => row.app_consultations?.lawyer_id === userId);
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    const { userId, profile } = await requireActor(req);

    if (req.method === 'GET') {
      const status = req.query?.status ? String(req.query.status) : undefined;
      const rows = await listPaymentsForActor(profile, userId, status);
      sendJson(res, 200, rows);
      return;
    }

    if (req.method !== 'PATCH' && req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const paymentId = String(body.paymentId || '').trim();
    const decision = String(body.decision || body.action || '').trim().toLowerCase();
    const notes = String(body.notes || body.rejectionReason || '').trim();

    if (!paymentId || !['approve', 'reject', 'override_approve', 'override_reject'].includes(decision)) {
      sendJson(res, 400, { error: 'Payment ID dan decision (approve/reject) wajib tersedia.' });
      return;
    }

    const payment = await fetchAppPaymentById(paymentId);
    if (!payment) {
      sendJson(res, 404, { error: 'Invoice tidak ditemukan.' });
      return;
    }

    const consultation = await getConsultationForPayment(payment);
    const isLawyerOwner = consultation?.lawyer_id === userId;
    const isAdmin = profile.role === 'admin';
    const isOverride = decision.startsWith('override_');

    if (isOverride && !isAdmin) {
      sendJson(res, 403, { error: 'Override hanya dapat dilakukan admin.' });
      return;
    }
    if (!isOverride && !isLawyerOwner && !isAdmin) {
      sendJson(res, 403, { error: 'Anda bukan advokat untuk konsultasi ini.' });
      return;
    }

    const approved = decision === 'approve' || decision === 'override_approve';
    const now = new Date().toISOString();
    const actorRole = isAdmin && isOverride ? 'admin' : profile.role;

    if (approved) {
      await patchAppPayment(paymentId, {
        status: 'paid',
        paid_at: now,
        verified_by: userId,
        verified_at: now,
        rejection_reason: null
      });
      await patchConsultationStatus(payment.consultation_id, 'paid');
      await insertVerificationLog({
        transaction_id: paymentId,
        actor_id: userId,
        actor_role: actorRole,
        action: isOverride ? 'override_approved' : 'approved',
        notes: notes || 'Pembayaran disetujui.'
      });
      if (payment.client_id) {
        await insertNotification(
          payment.client_id,
          'Pembayaran Disetujui',
          `Invoice ${payment.invoice_number} telah diverifikasi. Sesi konsultasi Anda sudah aktif.`,
          'success'
        );
      }
    } else {
      await patchAppPayment(paymentId, {
        status: 'rejected',
        verified_by: userId,
        verified_at: now,
        rejection_reason: notes || 'Bukti pembayaran ditolak. Silakan unggah ulang.'
      });
      await patchConsultationStatus(payment.consultation_id, 'pending');
      await insertVerificationLog({
        transaction_id: paymentId,
        actor_id: userId,
        actor_role: actorRole,
        action: isOverride ? 'override_rejected' : 'rejected',
        notes: notes || 'Bukti pembayaran ditolak.'
      });
      if (payment.client_id) {
        await insertNotification(
          payment.client_id,
          'Pembayaran Ditolak',
          `Invoice ${payment.invoice_number} ditolak. ${notes || 'Silakan unggah bukti pembayaran yang valid.'}`,
          'alert'
        );
      }
    }

    const logs = await supabaseRest(
      'GET',
      `payment_verification_logs?transaction_id=eq.${encodeURIComponent(paymentId)}&select=*&order=created_at.desc`
    ).catch(() => []);

    sendJson(res, 200, {
      status: approved ? 'paid' : 'rejected',
      paymentId,
      consultationStatus: approved ? 'paid' : 'pending',
      verificationHistory: logs || []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verifikasi gagal.';
    sendJson(res, message.includes('valid') || message.includes('ditolak') || message.includes('Hanya') ? 403 : 502, { error: message });
  }
}
