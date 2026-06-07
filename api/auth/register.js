import { createClient } from '@supabase/supabase-js';
import { handleOptions, sendJson, supabaseRest, supabaseServiceKey, supabaseUrl } from '../_runtime.js';

function cleanText(value) {
  return String(value || '').trim();
}

function cleanEmail(value) {
  return cleanText(value).toLowerCase();
}

function cleanRole(value) {
  return value === 'lawyer' ? 'lawyer' : 'client';
}

function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const requestBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const fullName = cleanText(requestBody.fullName);
    const email = cleanEmail(requestBody.email);
    const password = String(requestBody.password || '');
    const role = cleanRole(requestBody.role);

    if (!fullName || !email || !password) {
      sendJson(res, 400, { error: 'Nama, email, dan kata sandi wajib diisi.' });
      return;
    }

    if (!isLikelyEmail(email)) {
      sendJson(res, 400, { error: 'Format email belum valid.' });
      return;
    }

    if (password.length < 8) {
      sendJson(res, 400, { error: 'Kata sandi minimal 8 karakter.' });
      return;
    }

    const url = supabaseUrl();
    const serviceKey = supabaseServiceKey();
    if (!url || !serviceKey) {
      sendJson(res, 500, { error: 'Konfigurasi Supabase backend belum lengkap.' });
      return;
    }

    const admin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role
      }
    });

    if (error) {
      const message = error.message || 'Pendaftaran gagal.';
      if (message.toLowerCase().includes('already')) {
        sendJson(res, 409, { error: 'Email sudah terdaftar. Silakan login.' });
        return;
      }

      sendJson(res, 400, { error: message });
      return;
    }

    if (!data.user?.id) {
      sendJson(res, 502, { error: 'Supabase tidak mengembalikan user baru.' });
      return;
    }

    const status = 'active';
    await supabaseRest('POST', 'profiles?on_conflict=id', {
      id: data.user.id,
      full_name: fullName,
      email,
      role,
      status
    });

    if (role === 'lawyer') {
      await supabaseRest('POST', 'lawyer_profiles?on_conflict=user_id', {
        user_id: data.user.id,
        specialty: 'Belum diisi',
        description: 'Advokat terverifikasi.',
        experience_years: 0,
        consultation_price: 150000,
        verification_status: 'verified'
      });

      await supabaseRest('POST', 'lawyer_directory?on_conflict=id', {
        id: data.user.id,
        name: fullName,
        specialty: 'Belum diisi',
        description: 'Advokat terverifikasi.',
        experience_years: 0,
        consultation_price: 150000,
        image: '/lawyer1.png',
        verification_status: 'verified',
        languages: ['Bahasa Indonesia'],
        education: [],
        certifications: ['Verifikasi otomatis YDA LAW OFFICE & Partners'],
        availability: [
          { day: 'Senin', times: ['09:00', '11:00', '14:00'] },
          { day: 'Rabu', times: ['10:00', '13:00', '15:00'] },
          { day: 'Jumat', times: ['09:30', '13:30', '16:00'] }
        ]
      });
    } else {
      await supabaseRest('POST', 'client_profiles?on_conflict=user_id', {
        user_id: data.user.id
      });
    }

    sendJson(res, 201, {
      user: {
        id: data.user.id,
        email
      },
      role,
      status
    });
  } catch (error) {
    sendJson(res, 502, { error: error instanceof Error ? error.message : 'Pendaftaran gagal.' });
  }
}
