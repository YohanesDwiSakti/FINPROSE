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
