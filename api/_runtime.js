import { randomBytes } from 'node:crypto';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export function sendJson(res, status, payload) {
  for (const [key, value] of Object.entries(jsonHeaders)) {
    res.setHeader(key, value);
  }
  res.status(status).json(payload);
}

export function handleOptions(req, res) {
  if (req.method !== 'OPTIONS') return false;
  for (const [key, value] of Object.entries(jsonHeaders)) {
    res.setHeader(key, value);
  }
  res.status(200).end();
  return true;
}

export function supabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
}

export function supabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export async function supabaseRest(method, path, payload) {
  const baseUrl = supabaseUrl();
  const serviceKey = supabaseServiceKey();

  if (!baseUrl || !serviceKey) {
    throw new Error('Supabase backend belum lengkap. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di environment Vercel.');
  }

  const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  if (method === 'POST' || method === 'PATCH') {
    headers.Prefer = path.includes('on_conflict=')
      ? 'return=representation,resolution=merge-duplicates'
      : 'return=representation';
  }

  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase REST error ${response.status}: ${text.trim()}`);
  }

  if (!text) return null;
  return JSON.parse(text);
}

export function normalizePaymentMethod(method = '') {
  const value = String(method).trim().toLowerCase();
  if (['wallet', 'ewallet', 'qris'].includes(value)) return 'ewallet';
  if (['card', 'credit_card'].includes(value)) return 'credit_card';
  return 'bank_transfer';
}

export function midtransProduction() {
  return String(process.env.MIDTRANS_IS_PRODUCTION || '').toLowerCase() === 'true';
}

export function midtransSnapUrl() {
  return midtransProduction()
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
}

export function midtransStatusUrl(orderId) {
  const encodedOrderId = encodeURIComponent(orderId);
  return midtransProduction()
    ? `https://api.midtrans.com/v2/${encodedOrderId}/status`
    : `https://api.sandbox.midtrans.com/v2/${encodedOrderId}/status`;
}

export function midtransSnapJsUrl() {
  return midtransProduction()
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';
}

export function midtransEnabledPayments(method) {
  switch (method) {
    case 'bank_transfer':
      return ['bca_va', 'bni_va', 'bri_va', 'permata_va', 'echannel'];
    case 'ewallet':
      return ['gopay', 'shopeepay', 'qris'];
    case 'credit_card':
      return ['credit_card'];
    default:
      return [];
  }
}

export function newPaymentRef() {
  const hex = randomBytes(12).toString('hex');
  return `PAY-${hex}`;
}

export function mapMidtransTransactionStatus(transaction = {}) {
  switch (transaction.transaction_status) {
    case 'capture':
      return !transaction.fraud_status || transaction.fraud_status === 'accept' ? 'paid' : 'pending';
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

export async function fetchMidtransTransactionStatus(orderId) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  if (!serverKey.trim()) {
    throw new Error('MIDTRANS_SERVER_KEY belum diatur di environment Vercel');
  }

  const response = await fetch(midtransStatusUrl(orderId), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`
    }
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Status Midtrans gagal dicek: ${body.trim()}`);
  }

  return JSON.parse(body);
}

export async function syncPaymentFromMidtransOrder(orderId, transaction) {
  const status = mapMidtransTransactionStatus(transaction);
  const paymentPatch = {
    status,
    method: normalizePaymentMethod(transaction.payment_type)
  };

  if (status === 'paid') {
    paymentPatch.paid_at = new Date().toISOString();
  }

  await supabaseRest('PATCH', `app_payments?external_reference=eq.${encodeURIComponent(orderId)}`, paymentPatch);

  const payments = await supabaseRest(
    'GET',
    `app_payments?external_reference=eq.${encodeURIComponent(orderId)}&select=id,consultation_id,status,total_amount,method,external_reference`
  ).catch(() => []);

  if (payments && payments.length > 0) {
    const consultationStatus = status === 'failed' ? 'cancelled' : status;
    await supabaseRest('PATCH', `app_consultations?id=eq.${encodeURIComponent(payments[0].consultation_id)}`, {
      status: consultationStatus
    });

    return {
      payment: {
        ...payments[0],
        status,
        method: paymentPatch.method
      },
      consultationStatus
    };
  }

  return { payment: null, consultationStatus: null };
}
