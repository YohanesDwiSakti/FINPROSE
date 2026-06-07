import { createClient } from '@supabase/supabase-js';
import { handleOptions, sendJson, supabaseServiceKey, supabaseUrl } from './_runtime.js';

function bearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

async function requireAuth(req) {
  const token = bearerToken(req);
  const url = supabaseUrl();
  const serviceKey = supabaseServiceKey();
  if (!token || !url || !serviceKey) {
    throw new Error('Sesi tidak valid.');
  }

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id) {
    throw new Error('Sesi tidak valid.');
  }
  return data.user.id;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    await requireAuth(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { caseDescription } = body;

    if (!caseDescription || !caseDescription.trim()) {
      sendJson(res, 400, { error: 'Deskripsi kasus wajib diisi' });
      return;
    }

    const systemPrompt = `Anda adalah Rusdi AI, spesialis analisis kasus hukum Indonesia (RAW AI).
Tugas Anda adalah menganalisis fakta kasus yang diberikan pengguna dan menyusunnya menjadi laporan terstruktur.
Anda BUKAN pengacara/advokat berlisensi. Jangan menjamin hasil perkara, jangan memberikan kepastian hukum, dan jangan mengarang dasar hukum atau pasal yang tidak ada.

Anda wajib menyusun respons dengan menggunakan format berikut secara persis:

Ringkasan Masalah:
[Jelaskan fakta utama dari kasus yang diceritakan oleh pengguna secara ringkas dan padat]

Bidang Hukum Terkait:
[Sebutkan klasifikasi bidang hukumnya, misalnya Hukum Perdata, Hukum Pidana, Hukum Ketenagakerjaan, Hukum Bisnis, dll.]

Kemungkinan Dasar Hukum:
[Sebutkan undang-undang atau aturan hukum umum yang relevan di Indonesia (misal: KUHPerdata Pasal 1365 tentang Perbuatan Melawan Hukum, UU Ketenagakerjaan, dll.). Jangan mengarang nomor pasal yang Anda tidak yakini secara pasti!]

Langkah yang Dapat Dipertimbangkan:
[Saran tindakan langkah awal yang realistis, misalnya mengirimkan somasi secara baik-baik, melakukan mediasi, atau mengumpulkan bukti tertulis]

Risiko yang Perlu Diperhatikan:
[Risiko finansial, risiko reputasi, risiko laporan balik, atau kedaluwarsa gugatan jika ada]

Rekomendasi:
[Saran tindak lanjut penutup, seperti mendesak pengguna untuk berkonsultasi langsung dengan advokat profesional berlisensi di platform YDA LAW OFFICE & Partners untuk analisis yang valid dan berkuasa hukum]`;

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY belum dikonfigurasi di server');
    }

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: caseDescription }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      })
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      throw new Error(`Gemini API error ${geminiRes.status}: ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!aiResponse) {
      throw new Error('Gagal mendapatkan analisis dari AI');
    }

    sendJson(res, 200, {
      analysis: aiResponse
    });

  } catch (error) {
    sendJson(res, 502, { error: error instanceof Error ? error.message : 'Gagal memproses analisis kasus' });
  }
}
