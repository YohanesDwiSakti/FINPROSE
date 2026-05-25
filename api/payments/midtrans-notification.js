import { createHash } from 'node:crypto';
import { handleOptions, normalizePaymentMethod, sendJson, supabaseRest } from '../_runtime.js';

function verifyMidtransSignature(notification) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  if (!serverKey || !notification.signature_key) return false;

  const raw = `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`;
  return createHash('sha512').update(raw).digest('hex') === notification.signature_key;
}

function mapMidtransStatus(notification) {
  switch (notification.transaction_status) {
    case 'capture':
      return !notification.fraud_status || notification.fraud_status === 'accept' ? 'paid' : 'pending';
    case 'settlement':
      return 'paid';
    case 'pending':
      return 'pending';
    case 'deny':
    case 'cancel':
    case 'failure':
      return 'failed';
    case 'expire':
      return 'expired';
    default:
      return 'pending';
  }
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const notification = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (!verifyMidtransSignature(notification)) {
      sendJson(res, 401, { error: 'Invalid Midtrans signature' });
      return;
    }

    const status = mapMidtransStatus(notification);
    const paymentPatch = {
      status,
      method: normalizePaymentMethod(notification.payment_type)
    };
    if (status === 'paid') {
      paymentPatch.paid_at = new Date().toISOString();
    }

    await supabaseRest('PATCH', `app_payments?external_reference=eq.${encodeURIComponent(notification.order_id)}`, paymentPatch);

    const payments = await supabaseRest(
      'GET',
      `app_payments?external_reference=eq.${encodeURIComponent(notification.order_id)}&select=id,consultation_id`
    ).catch(() => []);
    if (payments && payments.length > 0) {
      const consultationStatus = status === 'failed' ? 'cancelled' : status;
      await supabaseRest('PATCH', `app_consultations?id=eq.${encodeURIComponent(payments[0].consultation_id)}`, {
        status: consultationStatus
      });
    }

    sendJson(res, 200, {
      status: 'ok',
      payment: status,
      orderId: notification.order_id
    });
  } catch (error) {
    sendJson(res, 502, { error: error instanceof Error ? error.message : 'Notification gagal diproses' });
  }
}
