import {
  fetchMidtransTransactionStatus,
  handleOptions,
  sendJson,
  syncPaymentFromMidtransOrder
} from '../_runtime.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const orderId = String(body.orderId || body.externalReference || '').trim();
    if (!orderId) {
      sendJson(res, 400, { error: 'Order ID Midtrans wajib tersedia' });
      return;
    }

    const transaction = await fetchMidtransTransactionStatus(orderId);
    const synced = await syncPaymentFromMidtransOrder(orderId, transaction);

    sendJson(res, 200, {
      status: synced.payment?.status || 'pending',
      orderId,
      consultationStatus: synced.consultationStatus,
      payment: synced.payment
    });
  } catch (error) {
    sendJson(res, 502, {
      error: error instanceof Error ? error.message : 'Status pembayaran gagal dikonfirmasi'
    });
  }
}
