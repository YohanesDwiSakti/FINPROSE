import { createClient } from '@supabase/supabase-js';
import {
  fetchAppPaymentByConsultation,
  fetchAppPaymentById,
  handleOptions,
  insertAppPayment,
  insertNotification,
  insertVerificationLog,
  invoiceDueDate,
  newInvoiceNumber,
  newPaymentRef,
  normalizePaymentMethod,
  patchAppPayment,
  patchConsultationStatus,
  sendJson,
  supabaseRest,
  supabaseServiceKey,
  supabaseUrl
} from './_runtime.js';
import { ALLOWED_PROOF_TYPES, DEFAULT_PAYMENT_METHOD_CONFIGS, normalizeSubMethod, resolvePaymentStatus } from './paymentConfig.js';

function bearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

async function requireUser(req) {
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
    `profiles?id=eq.${encodeURIComponent(data.user.id)}&select=id,full_name,email,role,status`
  );
  const profile = profiles?.[0];
  if (!profile || profile.status !== 'active') throw new Error('Akun tidak aktif.');

  return { userId: data.user.id, profile };
}

async function getConsultation(consultationId) {
  const rows = await supabaseRest(
    'GET',
    `app_consultations?id=eq.${encodeURIComponent(consultationId)}&select=id,client_id,lawyer_id,consultation_type,price,status,scheduled_day,scheduled_time,lawyer_directory(name,specialty),profiles(full_name,email)`
  );
  return rows?.[0] || null;
}

async function getPaymentMethodConfig(method, subMethod) {
  try {
    const rows = await supabaseRest(
      'GET',
      `payment_method_configs?method_type=eq.${encodeURIComponent(method)}&provider_code=eq.${encodeURIComponent(subMethod)}&is_active=eq.true&limit=1`
    );
    if (rows?.[0]) return rows[0];
  } catch {
    // fallback below
  }
  return DEFAULT_PAYMENT_METHOD_CONFIGS.find(
    (item) => item.method_type === method && item.provider_code === subMethod
  ) || null;
}

function buildPaymentInstructions(config, payment) {
  if (!config) return null;
  const method = payment.method;
  if (method === 'bank_transfer') {
    return {
      type: 'bank_transfer',
      bankName: config.display_name,
      accountHolderName: config.account_name,
      accountNumber: config.account_number,
      amount: payment.total_amount,
      paymentReference: payment.payment_reference,
      invoiceNumber: payment.invoice_number
    };
  }
  if (method === 'ewallet') {
    return {
      type: 'ewallet',
      walletName: config.display_name,
      accountName: config.account_name,
      phoneNumber: config.phone_number || config.account_number,
      amount: payment.total_amount,
      paymentReference: payment.payment_reference,
      invoiceNumber: payment.invoice_number
    };
  }
  return {
    type: 'qris',
    walletName: 'QRIS Demo',
    amount: payment.total_amount,
    invoiceNumber: payment.invoice_number,
    paymentReference: payment.payment_reference,
    qrisImageUrl: '/qris-demo.svg'
  };
}

async function enrichInvoice(payment) {
  const consultation = await getConsultation(payment.consultation_id);
  const config = payment.method && (payment.payment_sub_method || payment.provider)
    ? await getPaymentMethodConfig(payment.method, payment.payment_sub_method || payment.provider)
    : null;

  return {
    id: payment.id,
    consultationId: payment.consultation_id,
    invoiceNumber: payment.invoice_number,
    paymentReference: payment.payment_reference,
    clientId: payment.client_id,
    clientName: consultation?.profiles?.full_name || 'Klien',
    lawyerId: consultation?.lawyer_id,
    lawyerName: consultation?.lawyer_directory?.name || 'Advokat',
    consultationName: consultation?.lawyer_directory?.specialty || consultation?.consultation_type || 'Konsultasi Hukum',
    consultationType: consultation?.consultation_type,
    consultationFee: payment.amount,
    adminFee: payment.admin_fee,
    taxAmount: payment.tax_amount,
    totalAmount: payment.total_amount,
    method: payment.method,
    subMethod: payment.payment_sub_method || payment.provider,
    status: payment.status,
    paymentProofUrl: payment.payment_proof_url,
    proofUploadedAt: payment.proof_uploaded_at,
    dueDate: payment.due_date,
    createdAt: payment.created_at,
    paidAt: payment.paid_at,
    verifiedAt: payment.verified_at,
    rejectionReason: payment.rejection_reason,
    instructions: buildPaymentInstructions(config, payment)
  };
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      const methodType = req.query?.methodType || req.query?.method;
      try {
        let path = 'payment_method_configs?is_active=eq.true&order=sort_order.asc';
        if (methodType) {
          path += `&method_type=eq.${encodeURIComponent(normalizePaymentMethod(methodType))}`;
        }
        const methods = await supabaseRest('GET', path);
        sendJson(res, 200, methods?.length ? methods : DEFAULT_PAYMENT_METHOD_CONFIGS);
      } catch {
        const filtered = methodType
          ? DEFAULT_PAYMENT_METHOD_CONFIGS.filter((item) => item.method_type === normalizePaymentMethod(methodType))
          : DEFAULT_PAYMENT_METHOD_CONFIGS;
        sendJson(res, 200, filtered);
      }
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { userId, profile } = await requireUser(req);
    const action = body.action || 'create-invoice';

    if (action === 'create-invoice' || action === 'select-method') {
      const consultationId = String(body.consultationId || '').trim();
      if (!consultationId) {
        sendJson(res, 400, { error: 'Consultation ID wajib tersedia.' });
        return;
      }

      const consultation = await getConsultation(consultationId);
      if (!consultation) {
        sendJson(res, 404, { error: 'Konsultasi tidak ditemukan.' });
        return;
      }
      if (consultation.client_id && consultation.client_id !== userId && profile.role !== 'admin') {
        sendJson(res, 403, { error: 'Konsultasi bukan milik user ini.' });
        return;
      }

      let payment = await fetchAppPaymentByConsultation(consultationId);
      const baseAmount = Number(body.amount || consultation.price || 0);
      const adminFee = 5000;
      const taxAmount = Math.floor(baseAmount * 0.11);
      const platformFee = Math.floor(baseAmount * 0.10);
      const totalAmount = baseAmount + adminFee + taxAmount;

      if (!payment) {
        const invoiceNumber = newInvoiceNumber();
        const paymentReference = newPaymentRef();
        const inserted = await insertAppPayment({
          consultation_id: consultationId,
          client_id: consultation.client_id || userId,
          amount: baseAmount,
          admin_fee: adminFee,
          tax_amount: taxAmount,
          platform_fee: platformFee,
          total_amount: totalAmount,
          method: body.method ? normalizePaymentMethod(body.method) : null,
          payment_sub_method: body.subMethod ? normalizeSubMethod(body.method, body.subMethod) : null,
          provider: 'Manual Verification',
          status: resolvePaymentStatus('pending'),
          invoice_number: invoiceNumber,
          payment_reference: paymentReference,
          external_reference: paymentReference,
          due_date: invoiceDueDate()
        });
        payment = inserted?.[0] || await fetchAppPaymentByConsultation(consultationId);
        await patchConsultationStatus(consultationId, 'pending').catch(() => null);

        if (consultation.lawyer_id) {
          await insertNotification(
            consultation.lawyer_id,
            'Invoice Baru',
            `Invoice ${invoiceNumber} dibuat untuk konsultasi ${consultation.lawyer_directory?.specialty || 'hukum'}.`,
            'info'
          );
        }
      } else if (action === 'select-method' && body.method) {
        const method = normalizePaymentMethod(body.method);
        const subMethod = normalizeSubMethod(body.method, body.subMethod);
        await patchAppPayment(payment.id, {
          method,
          payment_sub_method: subMethod,
          status: resolvePaymentStatus(payment.status === 'failed' ? 'pending' : payment.status)
        });
        payment = await fetchAppPaymentById(payment.id);
      }

      sendJson(res, 201, await enrichInvoice(payment));
      return;
    }

    if (action === 'get-invoice') {
      const paymentId = String(body.paymentId || body.invoiceId || '').trim();
      const consultationId = String(body.consultationId || '').trim();
      const payment = paymentId
        ? await fetchAppPaymentById(paymentId)
        : consultationId
          ? await fetchAppPaymentByConsultation(consultationId)
          : null;

      if (!payment) {
        sendJson(res, 404, { error: 'Invoice tidak ditemukan.' });
        return;
      }
      if (payment.client_id !== userId && profile.role !== 'admin') {
        const consultation = await getConsultation(payment.consultation_id);
        if (consultation?.lawyer_id !== userId) {
          sendJson(res, 403, { error: 'Akses invoice ditolak.' });
          return;
        }
      }

      sendJson(res, 200, await enrichInvoice(payment));
      return;
    }

    if (action === 'upload-proof') {
      const paymentId = String(body.paymentId || '').trim();
      const fileName = String(body.fileName || 'payment-proof.png').trim();
      const mimeType = String(body.mimeType || 'image/png').trim();
      const fileBase64 = String(body.fileBase64 || '').trim();

      if (!paymentId || !fileBase64) {
        sendJson(res, 400, { error: 'Payment ID dan bukti pembayaran wajib diisi.' });
        return;
      }
      if (!ALLOWED_PROOF_TYPES.includes(mimeType)) {
        sendJson(res, 400, { error: 'Format bukti harus PNG, JPG, JPEG, atau PDF.' });
        return;
      }

      const payment = await fetchAppPaymentById(paymentId);
      if (!payment) {
        sendJson(res, 404, { error: 'Invoice tidak ditemukan.' });
        return;
      }
      if (payment.client_id !== userId) {
        sendJson(res, 403, { error: 'Hanya klien pemilik invoice yang dapat upload bukti.' });
        return;
      }
      if (payment.status === 'paid') {
        sendJson(res, 409, { error: 'Pembayaran sudah diverifikasi.' });
        return;
      }

      const url = supabaseUrl();
      const serviceKey = supabaseServiceKey();
      const admin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${userId}/${paymentId}/${Date.now()}-${safeName}`;
      const buffer = Buffer.from(fileBase64, 'base64');

      const { error: uploadError } = await admin.storage
        .from('payment-proofs')
        .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

      let proofUrl = '';
      if (uploadError) {
        proofUrl = `data:${mimeType};base64,${fileBase64.slice(0, 120)}...`;
      } else {
        const { data: urlData } = admin.storage.from('payment-proofs').getPublicUrl(storagePath);
        proofUrl = urlData.publicUrl;
      }

      const now = new Date().toISOString();

      await patchAppPayment(paymentId, {
        payment_proof_url: proofUrl,
        proof_uploaded_at: now,
        status: 'paid',
        paid_at: now,
        verified_at: now,
        verified_by: userId,
        payment_reference: payment.payment_reference || payment.external_reference || newPaymentRef()
      });

      await patchConsultationStatus(payment.consultation_id, 'paid');

      await insertVerificationLog({
        transaction_id: paymentId,
        actor_id: userId,
        actor_role: 'system',
        action: 'auto_verified',
        notes: `Bukti pembayaran diunggah dan diverifikasi otomatis: ${safeName}`
      }).catch(() => null);

      const consultation = await getConsultation(payment.consultation_id);
      if (consultation?.lawyer_id) {
        await insertNotification(
          consultation.lawyer_id,
          'Pembayaran Berhasil',
          `Invoice ${payment.invoice_number || payment.external_reference} telah dibayar dan sesi konsultasi aktif.`,
          'success'
        );
      }

      const updated = await fetchAppPaymentById(paymentId);
      let invoicePayload;
      try {
        invoicePayload = await enrichInvoice(updated);
      } catch {
        invoicePayload = {
          id: updated?.id || paymentId,
          consultationId: payment.consultation_id,
          status: 'paid',
          totalAmount: payment.total_amount,
          method: payment.method,
          subMethod: payment.payment_sub_method || payment.provider,
          paidAt: now
        };
      }

      sendJson(res, 200, {
        ...invoicePayload,
        message: 'Payment Successful',
        consultationStatus: 'paid',
        autoVerified: true
      });
      return;
    }

    sendJson(res, 400, { error: 'Aksi payment tidak valid.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment gagal diproses.';
    sendJson(res, message.includes('valid') || message.includes('ditolak') ? 403 : 502, { error: message });
  }
}
