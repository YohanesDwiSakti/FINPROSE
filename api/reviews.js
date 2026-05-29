import { handleOptions, sendJson, supabaseRest } from './_runtime.js';

function normalizeRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating wajib bernilai 1 sampai 5.');
  }
  return Math.round(rating);
}

async function submitReview(body) {
  const clientId = String(body.clientId || '').trim();
  const lawyerId = String(body.lawyerId || '').trim();
  const consultationId = String(body.consultationId || '').trim();

  if (!clientId) throw new Error('Customer belum login.');
  if (!lawyerId) throw new Error('Advokat belum dipilih.');

  const reviewPayload = {
    consultation_id: consultationId || null,
    client_id: clientId,
    lawyer_id: lawyerId,
    rating: normalizeRating(body.rating),
    comment: String(body.comment || '').trim() || null,
    tags: Array.isArray(body.tags) ? body.tags : []
  };

  const reviewPath = consultationId
    ? 'reviews?on_conflict=consultation_id,client_id'
    : 'reviews';
  const review = await supabaseRest('POST', reviewPath, reviewPayload);

  const reviews = await supabaseRest(
    'GET',
    `reviews?lawyer_id=eq.${encodeURIComponent(lawyerId)}&select=rating`
  );
  const reviewCount = reviews?.length || 0;
  const averageRating = reviewCount
    ? reviews.reduce((total, item) => total + Number(item.rating || 0), 0) / reviewCount
    : reviewPayload.rating;

  await supabaseRest('PATCH', `lawyer_directory?id=eq.${encodeURIComponent(lawyerId)}`, {
    rating: Number(averageRating.toFixed(2)),
    review_count: reviewCount
  });

  if (consultationId) {
    const consultations = await supabaseRest(
      'GET',
      `app_consultations?id=eq.${encodeURIComponent(consultationId)}&select=status`
    ).catch(() => []);
    const oldStatus = consultations?.[0]?.status || null;

    await supabaseRest('PATCH', `app_consultations?id=eq.${encodeURIComponent(consultationId)}`, {
      status: 'completed',
      updated_at: new Date().toISOString()
    });

    await supabaseRest('POST', 'consultation_status_logs', {
      consultation_id: consultationId,
      actor_id: clientId,
      old_status: oldStatus,
      new_status: 'completed',
      note: 'Review submitted by client'
    }).catch(() => null);
  }

  return review?.[0] || reviewPayload;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const review = await submitReview(body);
    sendJson(res, 201, review);
  } catch (error) {
    sendJson(res, 502, {
      error: error instanceof Error ? error.message : 'Ulasan gagal disimpan.'
    });
  }
}
