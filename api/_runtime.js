import { randomBytes } from 'node:crypto';
import { INVOICE_DUE_DAYS } from './paymentConfig.js';

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
  if (['bank', 'bank_transfer', 'transfer'].includes(value)) return 'bank_transfer';
  if (['wallet', 'ewallet', 'e-wallet'].includes(value)) return 'ewallet';
  if (value === 'qris') return 'qris';
  return 'bank_transfer';
}

export function newPaymentRef() {
  const hex = randomBytes(12).toString('hex');
  return `PAY-${hex}`;
}

export function newInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hex = randomBytes(4).toString('hex').toUpperCase();
  return `INV-${y}${m}${d}-${hex}`;
}

export function invoiceDueDate(from = new Date()) {
  const due = new Date(from);
  due.setDate(due.getDate() + INVOICE_DUE_DAYS);
  return due.toISOString();
}

export async function patchConsultationStatus(consultationId, status) {
  const encodedId = encodeURIComponent(consultationId);
  const payload = { status, updated_at: new Date().toISOString() };
  try {
    await supabaseRest('PATCH', `app_consultations?id=eq.${encodedId}`, payload);
    return;
  } catch {
    await supabaseRest('PATCH', `consultations?id=eq.${encodedId}`, payload);
  }
}

function buildLegacyPaymentRow(row) {
  return {
    consultation_id: row.consultation_id,
    client_id: row.client_id,
    amount: row.amount,
    admin_fee: row.admin_fee,
    tax_amount: row.tax_amount,
    platform_fee: row.platform_fee,
    total_amount: row.total_amount,
    method: row.method || 'bank_transfer',
    provider: row.payment_sub_method || row.provider || 'Manual Verification',
    status: row.status || 'pending',
    paid_at: row.paid_at || null,
    external_reference: row.external_reference || row.payment_reference || row.invoice_number || row.payment_proof_url || null
  };
}

function buildExtendedPaymentRow(row) {
  return {
    ...buildLegacyPaymentRow(row),
    payment_sub_method: row.payment_sub_method || null,
    invoice_number: row.invoice_number || null,
    payment_reference: row.payment_reference || row.external_reference || null,
    payment_proof_url: row.payment_proof_url || null,
    proof_uploaded_at: row.proof_uploaded_at || null,
    due_date: row.due_date || null,
    verified_by: row.verified_by || null,
    verified_at: row.verified_at || null,
    rejection_reason: row.rejection_reason || null
  };
}

function buildLegacyPaymentPatch(patch) {
  const payload = { updated_at: new Date().toISOString() };
  if (patch.status) payload.status = patch.status;
  if (patch.method) payload.method = patch.method;
  if (patch.paid_at) payload.paid_at = patch.paid_at;
  if (patch.payment_sub_method) payload.provider = patch.payment_sub_method;
  if (patch.payment_reference) payload.external_reference = patch.payment_reference;
  else if (patch.invoice_number) payload.external_reference = patch.invoice_number;
  return payload;
}

export async function insertAppPayment(row) {
  const baseRow = buildLegacyPaymentRow(row);
  const extendedRow = buildExtendedPaymentRow(row);

  try {
    return await supabaseRest('POST', 'app_payments', baseRow);
  } catch (baseError) {
    try {
      return await supabaseRest('POST', 'app_payments', extendedRow);
    } catch {
      try {
        return await supabaseRest('POST', 'transactions', baseRow);
      } catch {
        try {
          return await supabaseRest('POST', 'transactions', extendedRow);
        } catch {
          throw baseError;
        }
      }
    }
  }
}

export async function patchAppPayment(paymentId, patch) {
  const encoded = encodeURIComponent(paymentId);
  const legacyPatch = buildLegacyPaymentPatch(patch);
  const extendedPatch = { ...patch, updated_at: legacyPatch.updated_at };

  try {
    return await supabaseRest('PATCH', `app_payments?id=eq.${encoded}`, legacyPatch);
  } catch (legacyError) {
    try {
      return await supabaseRest('PATCH', `app_payments?id=eq.${encoded}`, extendedPatch);
    } catch {
      try {
        return await supabaseRest('PATCH', `transactions?id=eq.${encoded}`, legacyPatch);
      } catch {
        try {
          return await supabaseRest('PATCH', `transactions?id=eq.${encoded}`, extendedPatch);
        } catch {
          throw legacyError;
        }
      }
    }
  }
}

export async function fetchAppPaymentById(paymentId) {
  const encoded = encodeURIComponent(paymentId);
  try {
    const rows = await supabaseRest(
      'GET',
      `app_payments?id=eq.${encoded}&select=*`
    );
    if (rows?.length) return rows[0];
  } catch {
    // fall through
  }
  const rows = await supabaseRest(
    'GET',
    `transactions?id=eq.${encoded}&select=*`
  ).catch(() => []);
  return rows?.[0] || null;
}

export async function fetchAppPaymentByConsultation(consultationId) {
  const encoded = encodeURIComponent(consultationId);
  try {
    const rows = await supabaseRest(
      'GET',
      `app_payments?consultation_id=eq.${encoded}&select=*&order=created_at.desc&limit=1`
    );
    if (rows?.length) return rows[0];
  } catch {
    // fall through
  }
  const rows = await supabaseRest(
    'GET',
    `transactions?consultation_id=eq.${encoded}&select=*&order=created_at.desc&limit=1`
  ).catch(() => []);
  return rows?.[0] || null;
}

export async function insertVerificationLog(row) {
  return supabaseRest('POST', 'payment_verification_logs', row);
}

export async function insertNotification(userId, title, message, type = 'info') {
  return supabaseRest('POST', 'notifications', {
    user_id: userId,
    title,
    message,
    type,
    is_read: false
  }).catch(() => null);
}
