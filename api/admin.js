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
  await supabaseRest('PATCH', `users?id=eq.${encodeURIComponent(lawyerUserId)}`, { status: 'active' });
  await supabaseRest('PATCH', `lawyers?id=eq.${encodeURIComponent(lawyerUserId)}`, { verification_status: 'verified' });
}

async function updatePaymentStatus(paymentId, status, adminId, notes = '') {
  const patch = { status };
  if (status === 'paid') {
    patch.paid_at = new Date().toISOString();
    patch.verified_by = adminId;
    patch.verified_at = new Date().toISOString();
  }
  if (status === 'rejected') {
    patch.rejection_reason = notes || 'Ditolak oleh admin.';
    patch.verified_by = adminId;
    patch.verified_at = new Date().toISOString();
  }
  const payments = await supabaseRest('PATCH', `app_payments?id=eq.${encodeURIComponent(paymentId)}`, patch);
  const payment = payments?.[0];
  if (!payment?.consultation_id) return;

  const consultationStatus = status === 'paid'
    ? 'paid'
    : status === 'rejected' || status === 'failed' || status === 'expired'
      ? 'pending'
      : undefined;
  if (consultationStatus) {
    await supabaseRest('PATCH', `app_consultations?id=eq.${encodeURIComponent(payment.consultation_id)}`, { status: consultationStatus });
  }

  await supabaseRest('POST', 'payment_verification_logs', {
    transaction_id: paymentId,
    actor_id: adminId,
    actor_role: 'admin',
    action: status === 'paid' ? 'override_approved' : 'override_rejected',
    notes: notes || `Admin set status to ${status}`
  }).catch(() => null);
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    const adminId = await requireAdmin(req);

    if (req.method === 'GET') {
      const resource = req.query.resource;
      const paths = {
        'pending-lawyers': 'admin_pending_lawyers?verification_status=in.(pending,rejected,suspended)&order=verification_status.asc&limit=100',
        transactions: 'app_payments?select=id,consultation_id,client_id,amount,admin_fee,tax_amount,platform_fee,total_amount,method,payment_sub_method,provider,status,invoice_number,payment_reference,payment_proof_url,proof_uploaded_at,due_date,external_reference,created_at,paid_at,verified_at,rejection_reason,profiles(full_name,email),app_consultations(lawyer_id,consultation_type,status,lawyer_directory(name,specialty))&order=created_at.desc&limit=200',
        'payment-methods': 'payment_method_configs?order=sort_order.asc',
        'verification-logs': 'payment_verification_logs?select=*,transactions(invoice_number,consultation_id,total_amount,status)&order=created_at.desc&limit=200',
        clients: 'admin_clients?role=eq.client&order=created_at.desc&limit=200',
        'support-tickets': 'support_tickets?select=id,user_id,subject,message,status,priority,created_at,updated_at,profiles(full_name,email,role)&order=created_at.desc&limit=100',
        consultations: 'app_consultations?select=id,client_id,lawyer_id,consultation_type,scheduled_day,scheduled_time,status,price,notes,created_at,profiles(full_name,email),lawyer_directory(name,specialty),app_payments(id,status,total_amount,method,created_at)&order=created_at.desc&limit=200',
        reviews: 'reviews?select=id,consultation_id,client_id,lawyer_id,rating,comment,created_at,profiles(full_name)&order=created_at.desc&limit=200'
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
        await supabaseRest('PATCH', `users?id=eq.${encodeURIComponent(body.lawyerUserId)}`, { status: 'suspended' });
        await supabaseRest('PATCH', `lawyers?id=eq.${encodeURIComponent(body.lawyerUserId)}`, { verification_status: 'rejected' });
      } else if (body.action === 'update-client-status') {
        await supabaseRest('PATCH', `users?id=eq.${encodeURIComponent(body.clientId)}&role=eq.client`, { status: body.status, updated_at: new Date().toISOString() });
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
        await updatePaymentStatus(body.paymentId, body.status, adminId, body.notes || '');
      } else if (body.action === 'update-payment-method') {
        await supabaseRest('PATCH', `payment_method_configs?id=eq.${encodeURIComponent(body.configId)}`, {
          display_name: body.displayName,
          account_name: body.accountName,
          account_number: body.accountNumber,
          phone_number: body.phoneNumber,
          is_active: body.isActive,
          updated_at: new Date().toISOString()
        });
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
