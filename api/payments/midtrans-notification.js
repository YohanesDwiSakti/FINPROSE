import { createHash } from 'node:crypto';
import {
  handleOptions,
  mapMidtransTransactionStatus,
  sendJson,
  syncPaymentFromMidtransOrder
} from '../_runtime.js';

function verifyMidtransSignature(notification) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  if (!serverKey || !notification.signature_key) return false;

  const raw = `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`;
  return createHash('sha512').update(raw).digest('hex') === notification.signature_key;
}

function mapMidtransStatus(notification) {
  return mapMidtransTransactionStatus(notification);
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
    await syncPaymentFromMidtransOrder(notification.order_id, notification);

    sendJson(res, 200, {
      status: 'ok',
      payment: status,
      orderId: notification.order_id
    });
  } catch (error) {
    sendJson(res, 502, { error: error instanceof Error ? error.message : 'Notification gagal diproses' });
  }
}
