import { createClient } from '@supabase/supabase-js';
import { handleOptions, sendJson, supabaseRest, supabaseServiceKey, supabaseUrl } from '../_runtime.js';

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
    const { problemDescription } = body;

    if (!problemDescription || !problemDescription.trim()) {
      sendJson(res, 400, { error: 'Deskripsi masalah wajib diisi' });
      return;
    }

    // 1. Fetch verified lawyers from database
    const lawyers = await supabaseRest(
      'GET',
      'lawyer_directory?verification_status=eq.verified&select=id,name,specialty,experience_years,consultation_price,description,rating,review_count,image'
    ).catch(() => []);

    if (!lawyers || lawyers.length === 0) {
      sendJson(res, 200, {
        recommendations: [],
        message: 'Tidak ada lawyer terdaftar saat ini di platform.'
      });
      return;
    }

    // 2. Prepare lawyers data context for Gemini
    const lawyerContext = lawyers.map(l => ({
      id: l.id,
      name: l.name,
      specialty: l.specialty,
      experience: `${l.experience_years} tahun`,
      price: `Rp ${l.consultation_price.toLocaleString('id-ID')}`,
      description: l.description || '',
      rating: l.rating,
      reviews: l.review_count
    }));

    const systemPrompt = `Anda adalah Rusdi, sistem pemurni rekomendasi lawyer Indonesia.
Tugas Anda adalah menganalisis permasalahan hukum pengguna, mencocokkannya dengan keahlian pengacara terdaftar, dan merekomendasikan maksimal 3 lawyer terverifikasi yang paling cocok.

Batasan:
- HANYA rekomendasikan lawyer dari daftar terdaftar yang disediakan di bawah ini. Jangan mengarang nama lawyer!
- Jelaskan alasan rekomendasi dengan bahasa profesional, ringkas, dan jelas yang menyoroti mengapa bidang keahlian pengacara tersebut cocok dengan masalah pengguna.
- Maksimal 3 lawyer rekomendasi.
- Kembalikan respons dalam format JSON Array berikut (dan HANYA JSON array tersebut, tanpa formatting markdown code blocks seperti \`\`\`json ... \`\`\`):
[
  {
    "lawyerId": "UUID lawyer",
    "reason": "Alasan kecocokan spesifik mengapa lawyer ini direkomendasikan untuk masalah pengguna."
  }
]

DAFTAR LAWYER YANG TERSEDIA:
${JSON.stringify(lawyerContext, null, 2)}`;

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
            parts: [{ text: problemDescription }]
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
    let aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Clean code blocks formatting if Gemini outputted it
    aiResponse = aiResponse.trim();
    if (aiResponse.startsWith('```')) {
      aiResponse = aiResponse.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    let recommendations = [];
    try {
      recommendations = JSON.parse(aiResponse);
    } catch (e) {
      console.error('Failed to parse Gemini recommendations JSON:', aiResponse, e);
      recommendations = [];
    }

    // Map recommendation reasons to the full lawyer objects
    const recommendedLawyers = [];
    for (const rec of recommendations) {
      const lawyer = lawyers.find(l => l.id === rec.lawyerId);
      if (lawyer) {
        recommendedLawyers.push({
          lawyer: {
            id: lawyer.id,
            name: lawyer.name,
            specialty: lawyer.specialty,
            experience: lawyer.experience_years,
            price: lawyer.consultation_price,
            image: lawyer.image,
            description: lawyer.description,
            rating: Number(lawyer.rating || 0),
            reviewCount: lawyer.review_count
          },
          reason: rec.reason
        });
      }
    }

    // If parsing failed or array is empty, find up to 3 lawyers based on specialty match as fallback
    if (recommendedLawyers.length === 0) {
      const descLower = problemDescription.toLowerCase();
      let matched = [];
      if (descLower.includes('cerai') || descLower.includes('waris') || descLower.includes('tanah') || descLower.includes('rumah') || descLower.includes('perdata')) {
        matched = lawyers.filter(l => l.specialty.toLowerCase().includes('perdata') || l.specialty.toLowerCase().includes('keluarga'));
      } else if (descLower.includes('bisnis') || descLower.includes('kontrak') || descLower.includes('usaha') || descLower.includes('umkm') || descLower.includes('perusahaan')) {
        matched = lawyers.filter(l => l.specialty.toLowerCase().includes('bisnis') || l.specialty.toLowerCase().includes('kontrak'));
      } else if (descLower.includes('pidana') || descLower.includes('penjara') || descLower.includes('polisi') || descLower.includes('tangkap') || descLower.includes('tipu')) {
        matched = lawyers.filter(l => l.specialty.toLowerCase().includes('pidana'));
      } else if (descLower.includes('pajak') || descLower.includes('investasi') || descLower.includes('audit') || descLower.includes('saham')) {
        matched = lawyers.filter(l => l.specialty.toLowerCase().includes('pajak') || l.specialty.toLowerCase().includes('investasi'));
      }

      // Default: take top rating
      if (matched.length === 0) {
        matched = [...lawyers].sort((a, b) => b.rating - a.rating);
      }

      matched.slice(0, 3).forEach(lawyer => {
        recommendedLawyers.push({
          lawyer: {
            id: lawyer.id,
            name: lawyer.name,
            specialty: lawyer.specialty,
            experience: lawyer.experience_years,
            price: lawyer.consultation_price,
            image: lawyer.image,
            description: lawyer.description,
            rating: Number(lawyer.rating || 0),
            reviewCount: lawyer.review_count
          },
          reason: `Advokat ini ahli dalam ${lawyer.specialty} dengan rating tinggi (${lawyer.rating}) dan pengalaman ${lawyer.experience_years} tahun.`
        });
      });
    }

    sendJson(res, 200, recommendedLawyers);

  } catch (error) {
    sendJson(res, 502, { error: error instanceof Error ? error.message : 'Gagal memproses rekomendasi lawyer' });
  }
}
