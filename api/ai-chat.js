import { createClient } from '@supabase/supabase-js';
import { handleOptions, sendJson, supabaseRest, supabaseServiceKey, supabaseUrl } from './_runtime.js';

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
    const userId = await requireAuth(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { message, sessionId } = body;

    if (!message || !message.trim()) {
      sendJson(res, 400, { error: 'Pesan wajib diisi' });
      return;
    }

    if (!sessionId) {
      sendJson(res, 400, { error: 'Session ID wajib disediakan' });
      return;
    }

    // 1. Fetch chat history for context (up to 15 last messages to keep context short and relevant)
    const history = await supabaseRest(
      'GET',
      `ai_chat_history?session_id=eq.${encodeURIComponent(sessionId)}&select=role,message&order=timestamp.asc&limit=15`
    ).catch(() => []);

    // 2. Fetch verified lawyers for context
    const lawyers = await supabaseRest(
      'GET',
      'lawyer_directory?verification_status=eq.verified&select=id,name,specialty,experience_years,consultation_price,description,is_online'
    ).catch(() => []);

    // 3. Prepare system prompt
    const lawyerContext = lawyers && lawyers.length > 0
      ? lawyers.map(l => `- ID: ${l.id}\n  Nama: ${l.name}\n  Spesialisasi: ${l.specialty}\n  Pengalaman: ${l.experience_years} tahun\n  Harga Konsultasi: Rp ${l.consultation_price.toLocaleString('id-ID')}\n  Deskripsi: ${l.description || 'Tidak ada deskripsi'}\n  Status: ${l.is_online ? 'Online' : 'Offline'}`).join('\n\n')
      : 'Tidak ada lawyer terdaftar saat ini.';

    const systemPrompt = `Anda adalah Rusdi AI, asisten hukum digital Indonesia (RAW AI).
Tugas Anda:
- Menjelaskan masalah hukum secara umum
- Membantu brainstorming kasus
- Memberikan edukasi hukum
- Membantu menemukan lawyer yang sesuai

Batasan Penting:
- Anda BUKAN pengacara/advokat berlisensi.
- Jangan pernah mengaku sebagai pengacara atau memiliki lisensi advokat.
- Jangan menjamin hasil perkara atau memberikan kepastian hukum.
- Jangan mengarang pasal, undang-undang, putusan pengadilan, atau nama lawyer.
- Jika informasi tidak cukup, katakan secara ramah bahwa informasi belum cukup untuk memberikan jawaban yang akurat.
- Jika pengguna menjelaskan suatu kasus, wajib gunakan format respons berikut secara persis:
  
  Ringkasan Masalah:
  [Fakta utama kasus]
  
  Bidang Hukum Terkait:
  [Perdata, Pidana, Bisnis, dll.]
  
  Kemungkinan Dasar Hukum:
  [Dasar hukum umum, hindari mengada-ada]
  
  Langkah yang Dapat Dipertimbangkan:
  [Rekomendasi langkah awal non-formal]
  
  Risiko yang Perlu Diperhatikan:
  [Risiko-risiko potensial]
  
  Rekomendasi:
  [Saran tindak lanjut, termasuk menyarankan konsultasi dengan advokat resmi]

- Jika pengguna meminta lawyer:
  Analisis masalah terlebih dahulu, tentukan bidang hukum relevan, lalu rekomendasikan maksimal 3 lawyer yang paling sesuai dari daftar di bawah ini. Sebutkan ID mereka dan jelaskan alasan rekomendasi dengan jelas.
  
  DAFTAR LAWYER YANG TERSEDIA:
  ${lawyerContext}`;

    // 4. Format messages for Gemini API
    const geminiMessages = [];
    
    // Add existing history
    if (history && history.length > 0) {
      history.forEach(h => {
        geminiMessages.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.message }]
        });
      });
    }

    // Add current user message
    geminiMessages.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY belum dikonfigurasi di server');
    }

    // 5. Call Gemini API
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: geminiMessages,
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
      throw new Error('Gagal mendapatkan jawaban dari AI');
    }

    // 6. Save current user message and AI response to Supabase
    await supabaseRest('POST', 'ai_chat_history', {
      session_id: sessionId,
      user_id: userId,
      role: 'user',
      message: message
    });

    await supabaseRest('POST', 'ai_chat_history', {
      session_id: sessionId,
      user_id: userId,
      role: 'assistant',
      message: aiResponse
    });

    sendJson(res, 200, {
      response: aiResponse,
      sessionId
    });

  } catch (error) {
    sendJson(res, 502, { error: error instanceof Error ? error.message : 'Gagal memproses request AI' });
  }
}
