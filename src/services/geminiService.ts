import { requireSupabase } from '../supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 800;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaError(status: number, message: string, code?: unknown) {
  if (code === 'GEMINI_QUOTA' || status === 429) return true;
  const text = message.toLowerCase();
  return text.includes('kuota gratis gemini') || text.includes('quota for today');
}

function isRetryableError(status: number, message: string) {
  if (isQuotaError(status, message)) return false;
  if (RETRYABLE_STATUS.has(status)) return true;
  const text = message.toLowerCase();
  return text.includes('high demand')
    || text.includes('overloaded')
    || text.includes('unavailable')
    || text.includes('try again')
    || text.includes('gemini_unavailable');
}

function friendlyUnavailableMessage(language: string) {
  if (language === 'en') {
    return 'Rusdi AI is temporarily busy. Please wait a moment and try again.';
  }
  return 'Rusdi AI sedang sibuk sementara. Mohon tunggu sebentar dan coba lagi.';
}

export async function askGemini(
  message: string,
  sessionId: string,
  attachment?: { base64: string; mimeType: string; name: string },
  language = 'id'
): Promise<string> {
  const authHeaders: Record<string, string> = {};
  try {
    const { data } = await requireSupabase().auth.getSession();
    if (data.session?.access_token) {
      authHeaders.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch (err) {
    console.error('Failed to get auth session in Gemini service:', err);
  }

  const payload: Record<string, unknown> = {
    message,
    sessionId,
    conversationId: sessionId,
    language
  };
  if (attachment) {
    payload.inlineData = {
      data: attachment.base64,
      mimeType: attachment.mimeType,
      name: attachment.name
    };
  }

  let lastError = 'Gagal terhubung dengan asisten hukum AI';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}/rusdi/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(payload)
      });

      const errorData = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) {
        const errorMessage = String(errorData.error || errorData.message || 'Gagal terhubung dengan asisten hukum AI');
        lastError = errorMessage;
        if (isQuotaError(response.status, errorMessage, errorData.code)) {
          throw new Error(errorMessage);
        }
        if (attempt < MAX_ATTEMPTS && (errorData.retryable === true || isRetryableError(response.status, errorMessage))) {
          await sleep(BASE_DELAY_MS * (2 ** (attempt - 1)));
          continue;
        }
        if (isRetryableError(response.status, errorMessage)) {
          throw new Error(friendlyUnavailableMessage(language));
        }
        throw new Error(errorMessage);
      }

      const data = errorData as { response?: string };
      if (!data.response) {
        throw new Error('Gagal mendapatkan jawaban dari AI');
      }
      return data.response;
    } catch (error) {
      if (error instanceof TypeError && attempt < MAX_ATTEMPTS) {
        lastError = 'Tidak dapat terhubung ke server API';
        await sleep(BASE_DELAY_MS * (2 ** (attempt - 1)));
        continue;
      }
      if (error instanceof Error) {
        if (attempt < MAX_ATTEMPTS && isRetryableError(503, error.message)) {
          lastError = error.message;
          await sleep(BASE_DELAY_MS * (2 ** (attempt - 1)));
          continue;
        }
        throw error;
      }
    }
  }

  throw new Error(friendlyUnavailableMessage(language) || lastError);
}
