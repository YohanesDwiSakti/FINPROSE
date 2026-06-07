import { requireSupabase } from '../supabaseClient';
import { Lawyer } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export type LawyerRecommendation = {
  lawyer: Lawyer;
  reason: string;
};

export async function getLawyerRecommendations(problemDescription: string): Promise<LawyerRecommendation[]> {
  const authHeaders: Record<string, string> = {};
  try {
    const { data } = await requireSupabase().auth.getSession();
    if (data.session?.access_token) {
      authHeaders.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch (err) {
    console.error('Failed to get auth session in lawyer recommendation service:', err);
  }

  const response = await fetch(`${API_BASE}/rusdi/lawyer-recommendation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({ problemDescription })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Gagal mencari rekomendasi advokat');
  }

  return response.json() as Promise<LawyerRecommendation[]>;
}
