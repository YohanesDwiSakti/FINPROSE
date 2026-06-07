import { requireSupabase } from '../supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function analyzeCase(caseDescription: string): Promise<string> {
  const authHeaders: Record<string, string> = {};
  try {
    const { data } = await requireSupabase().auth.getSession();
    if (data.session?.access_token) {
      authHeaders.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch (err) {
    console.error('Failed to get auth session in case analyzer service:', err);
  }

  const response = await fetch(`${API_BASE}/rusdi/case-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({ caseDescription })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Gagal menganalisis kasus');
  }

  const data = await response.json();
  return data.analysis;
}
