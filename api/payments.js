import {
  handleOptions,
  midtransEnabledPayments,
  midtransProduction,
  midtransSnapJsUrl,
  midtransSnapUrl,
  newPaymentRef,
  normalizePaymentMethod,
  sendJson,
  supabaseRest
} from './_runtime.js';

async function createMidtransSnapToken(orderId, amount, method, customer, origin) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  if (!serverKey.trim()) {
    throw new Error('MIDTRANS_SERVER_KEY belum diatur di environment Vercel');
  }

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount
    },
    customer_details: customer,
    item_details: [
      {
        id: orderId,
        price: amount,
        quantity: 1,
        name: 'Konsultasi hukum FINPROSE'
      }
    ],
    credit_card: {
      secure: true
    },
    callbacks: {
      finish: origin || process.env.APP_URL || '/'
    }
  };

  const enabled = midtransEnabledPayments(method);
  if (enabled.length > 0) {
    payload.enabled_payments = enabled;
  }

  const response = await fetch(midtransSnapUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`
    },
    body: JSON.stringify(payload)
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Midtrans menolak transaksi: ${body.trim()}`);
  }

  const snap = JSON.parse(body);
  if (!snap.token) {
    throw new Error('Midtrans tidak mengembalikan Snap token');
  }
  return snap;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const requestBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { consultationId, clientId, method, amount: requestedAmount } = requestBody;
    if (!consultationId || !clientId) {
      sendJson(res, 400, { error: 'Consultation ID dan Client ID wajib tersedia' });
      return;
    }

    const consultations = await supabaseRest(
      'GET',
      `app_consultations?id=eq.${encodeURIComponent(consultationId)}&select=id,client_id,lawyer_id,price,status`
    );
    if (!consultations || consultations.length === 0) {
      sendJson(res, 404, { error: 'Konsultasi tidak ditemukan' });
      return;
    }

    const consultation = consultations[0];
    if (consultation.client_id && consultation.client_id !== clientId) {
      sendJson(res, 403, { error: 'Konsultasi bukan milik user ini' });
      return;
    }

    const baseAmount = Number(requestedAmount || consultation.price || 0);
    const adminFee = 5000;
    const taxAmount = Math.floor(baseAmount * 0.11);
    const platformFee = Math.floor(baseAmount * 0.10);
    const totalAmount = baseAmount + adminFee + taxAmount;
    const paymentMethod = normalizePaymentMethod(method);
    const paymentRef = newPaymentRef();

    let customerName = 'Klien FINPROSE';
    let customerEmail = 'client@finprose.local';
    let customerPhone = '';
    const profiles = await supabaseRest(
      'GET',
      `profiles?id=eq.${encodeURIComponent(clientId)}&select=id,full_name,email,phone`
    ).catch(() => []);
    if (profiles && profiles.length > 0) {
      customerName = profiles[0].full_name || customerName;
      customerEmail = profiles[0].email || customerEmail;
      customerPhone = profiles[0].phone || '';
    }

    const customer = {
      first_name: customerName,
      email: customerEmail
    };
    if (customerPhone.trim()) {
      customer.phone = customerPhone;
    }

    const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : process.env.APP_URL);
    const snap = await createMidtransSnapToken(paymentRef, totalAmount, paymentMethod, customer, origin);

    const insertedPayments = await supabaseRest('POST', 'app_payments', {
      consultation_id: consultationId,
      client_id: clientId,
      amount: baseAmount,
      admin_fee: adminFee,
      tax_amount: taxAmount,
      platform_fee: platformFee,
      total_amount: totalAmount,
      method: paymentMethod,
      provider: 'Midtrans Snap',
      status: 'pending',
      external_reference: paymentRef
    });

    await supabaseRest('PATCH', `app_consultations?id=eq.${encodeURIComponent(consultationId)}`, {
      status: 'pending'
    }).catch(() => null);

    const paymentId = insertedPayments?.[0]?.id || paymentRef;
    sendJson(res, 201, {
      id: paymentId,
      paymentId,
      consultationId,
      status: 'pending',
      amount: baseAmount,
      adminFee,
      taxAmount,
      platformFee,
      totalAmount,
      provider: 'midtrans',
      snapToken: snap.token,
      redirectUrl: snap.redirect_url,
      clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
      snapJsUrl: midtransSnapJsUrl(),
      isProduction: midtransProduction(),
      lawyerId: consultation.lawyer_id
    });
  } catch (error) {
    sendJson(res, 502, { error: error instanceof Error ? error.message : 'Payment gagal dibuat' });
  }
}
