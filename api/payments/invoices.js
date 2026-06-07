import {
  fetchAppPaymentByConsultation,
  fetchAppPaymentById,
  handleOptions,
  sendJson,
  supabaseRest
} from '../_runtime.js';

async function enrichInvoiceList(rows = []) {
  return Promise.all(rows.map(async (payment) => {
    const consultations = await supabaseRest(
      'GET',
      `app_consultations?id=eq.${encodeURIComponent(payment.consultation_id)}&select=id,client_id,lawyer_id,consultation_type,status,lawyer_directory(name,specialty),profiles(full_name,email)`
    ).catch(() => []);
    const consultation = consultations?.[0];
    return {
      id: payment.id,
      consultationId: payment.consultation_id,
      invoiceNumber: payment.invoice_number,
      paymentReference: payment.payment_reference,
      clientName: consultation?.profiles?.full_name || 'Klien',
      lawyerName: consultation?.lawyer_directory?.name || 'Advokat',
      consultationName: consultation?.lawyer_directory?.specialty || consultation?.consultation_type || 'Konsultasi Hukum',
      consultationFee: payment.amount,
      totalAmount: payment.total_amount,
      method: payment.method,
      subMethod: payment.payment_sub_method,
      status: payment.status,
      paymentProofUrl: payment.payment_proof_url,
      proofUploadedAt: payment.proof_uploaded_at,
      dueDate: payment.due_date,
      createdAt: payment.created_at,
      paidAt: payment.paid_at
    };
  }));
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      const consultationId = String(req.query?.consultationId || '').trim();
      const paymentId = String(req.query?.paymentId || '').trim();

      if (paymentId) {
        const payment = await fetchAppPaymentById(paymentId);
        if (!payment) {
          sendJson(res, 404, { error: 'Invoice tidak ditemukan.' });
          return;
        }
        const [invoice] = await enrichInvoiceList([payment]);
        sendJson(res, 200, invoice);
        return;
      }

      if (consultationId) {
        const payment = await fetchAppPaymentByConsultation(consultationId);
        if (!payment) {
          sendJson(res, 404, { error: 'Invoice belum dibuat untuk konsultasi ini.' });
          return;
        }
        const [invoice] = await enrichInvoiceList([payment]);
        sendJson(res, 200, invoice);
        return;
      }

      sendJson(res, 400, { error: 'consultationId atau paymentId wajib tersedia.' });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(res, 502, { error: error instanceof Error ? error.message : 'Invoice gagal dimuat.' });
  }
}
