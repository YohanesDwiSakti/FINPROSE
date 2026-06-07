const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 800;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaExceeded(status, bodyText = '') {
  const text = bodyText.toLowerCase();
  return status === 429 && (
    text.includes('quota')
    || text.includes('resource_exhausted')
    || text.includes('rate limit')
    || text.includes('rate-limit')
  );
}

function isRetryableGeminiError(status, bodyText = '') {
  if (isQuotaExceeded(status, bodyText)) return false;
  if (RETRYABLE_STATUS.has(status)) return true;
  const text = bodyText.toLowerCase();
  return text.includes('high demand')
    || text.includes('overloaded')
    || text.includes('unavailable')
    || text.includes('try again');
}

export function buildGeminiQuotaMessage(language = 'id') {
  if (language === 'en') {
    return 'Gemini API free quota for today is used up. Try again tomorrow or enable billing in Google AI Studio.';
  }
  return 'Kuota gratis Gemini API untuk hari ini sudah habis. Coba lagi besok, atau aktifkan billing di Google AI Studio.';
}

export function buildGeminiUnavailableMessage(language = 'id') {
  if (language === 'en') {
    return 'Rusdi AI is temporarily busy. Please wait a moment and try again.';
  }
  return 'Rusdi AI sedang sibuk sementara. Mohon tunggu sebentar dan coba lagi.';
}

export async function generateGeminiContent({
  apiKey,
  model = 'gemini-2.5-flash',
  payload,
  timeoutMs = 45000,
  language = 'id'
}) {
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di server');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const bodyText = await response.text();
      if (!response.ok) {
        if (isQuotaExceeded(response.status, bodyText)) {
          const wrapped = new Error(buildGeminiQuotaMessage(language));
          wrapped.code = 'GEMINI_QUOTA';
          throw wrapped;
        }
        if (attempt < MAX_ATTEMPTS && isRetryableGeminiError(response.status, bodyText)) {
          lastError = new Error(`Gemini API error ${response.status}`);
          await sleep(BASE_DELAY_MS * (2 ** (attempt - 1)));
          continue;
        }
        throw new Error(`Gemini API error ${response.status}: ${bodyText.slice(0, 240)}`);
      }

      const data = JSON.parse(bodyText);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) {
        throw new Error('Gagal mendapatkan jawaban dari AI');
      }
      return { text, attempt };
    } catch (error) {
      lastError = error;
      if (error?.code === 'GEMINI_QUOTA') {
        throw error;
      }
      const aborted = error instanceof Error && error.name === 'AbortError';
      if (attempt < MAX_ATTEMPTS && (aborted || isRetryableGeminiError(503, error instanceof Error ? error.message : ''))) {
        await sleep(BASE_DELAY_MS * (2 ** (attempt - 1)));
        continue;
      }
      if (attempt >= MAX_ATTEMPTS) {
        const message = buildGeminiUnavailableMessage(language);
        const wrapped = new Error(message);
        wrapped.code = 'GEMINI_UNAVAILABLE';
        wrapped.cause = lastError;
        throw wrapped;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error(buildGeminiUnavailableMessage(language));
}
