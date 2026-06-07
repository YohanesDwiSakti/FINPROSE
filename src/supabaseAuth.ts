import { requireSupabase, supabase } from './supabaseClient';
import { registerAccount, type StoredUser } from './api';

type AppRole = 'client' | 'lawyer' | 'admin';

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole | 'client';
  status: string;
};

function normalizeAppRole(role: string): AppRole {
  if (role === 'lawyer') return 'lawyer';
  if (role === 'admin') return 'admin';
  return 'client';
}

function storeSession(accessToken: string, profile: ProfileRow) {
  const user: StoredUser = {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    role: normalizeAppRole(profile.role),
    status: profile.status,
    phone: profile.phone || undefined,
    avatarUrl: profile.avatar_url || undefined
  };

  localStorage.setItem('YDA LAW OFFICE & Partners_token', accessToken);
  localStorage.setItem('YDA LAW OFFICE & Partners_user', JSON.stringify(user));
  return user;
}

async function ensureSupabaseProfile(
  client: ReturnType<typeof requireSupabase>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  fallback?: { fullName?: string; email?: string; role?: AppRole }
) {
  const metadata = user.user_metadata || {};
  const metadataRole = metadata.role === 'lawyer' || metadata.role === 'client' || metadata.role === 'toliver'
    ? normalizeAppRole(String(metadata.role))
    : undefined;
  const role = fallback?.role || metadataRole || 'client';
  const email = (fallback?.email || user.email || '').toLowerCase().trim();
  const fullName = (
    fallback?.fullName ||
    (typeof metadata.full_name === 'string' ? metadata.full_name : '') ||
    email
  ).trim();
  const profileStatus = 'active';

  const { error: profileError } = await client
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: fullName,
      email,
      role: role === 'admin' ? 'client' : role,
      status: profileStatus
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('Profile Upsert Error', profileError);
  }

  if (role === 'lawyer') {
    const { error } = await client.from('lawyer_profiles').upsert({
      user_id: user.id,
      specialty: 'Belum diisi',
      description: 'Advokat terverifikasi.',
      experience_years: 0,
      consultation_price: 150000,
      verification_status: 'verified'
    }, { onConflict: 'user_id' });

    if (error) console.error(error);

    const { error: directoryError } = await client.from('lawyer_directory').upsert({
      id: user.id,
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
    }, { onConflict: 'id' });

    if (directoryError) console.error(directoryError);
  }
}

export async function signUpWithSupabase(payload: {
  fullName: string;
  email: string;
  password: string;
  role: AppRole;
}) {
  const role = payload.role === 'admin' ? 'client' : payload.role;

  try {
    return await registerAccount({ ...payload, role });
  } catch (backendError) {
    if (import.meta.env.PROD) {
      throw backendError;
    }
  }

  const client = requireSupabase();
  const email = payload.email.toLowerCase().trim();

  const { data, error } = await client.auth.signUp({
    email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName.trim(),
        role
      }
    }
  });

  if (error) throw error;
  if (!data.user) throw new Error('Supabase tidak mengembalikan user baru.');

  const profileStatus = 'active';
  if (data.session) {
    await ensureSupabaseProfile(client, data.user, {
      fullName: payload.fullName,
      email,
      role
    });
  }

  return {
    session: data.session,
    user: data.user,
    role,
    status: profileStatus
  };
}

export async function signInWithSupabase(email: string, password: string, expectedRole: AppRole) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password
  });

  if (error) throw error;
  if (!data.session || !data.user) throw new Error('Session Supabase tidak tersedia.');

  await ensureSupabaseProfile(client, data.user, {
    email: email.toLowerCase().trim(),
    role: expectedRole
  });

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url, role, status')
    .eq('id', data.user.id)
    .single<ProfileRow>();

  if (profileError) throw profileError;
  if (!profile) throw new Error('Profil user belum ada di Supabase.');

  const profileRole = normalizeAppRole(profile.role);
  if (profileRole !== expectedRole) {
    await client.auth.signOut();
    throw new Error('Role login tidak cocok dengan akun ini.');
  }

  if (profile.status === 'blocked' || profile.status === 'suspended') {
    await client.auth.signOut();
    throw new Error('Akun sedang tidak aktif.');
  }

  return storeSession(data.session.access_token, profile);
}

export async function restoreSupabaseSession() {
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url, role, status')
    .eq('id', data.session.user.id)
    .single<ProfileRow>();

  if (error || !profile) return null;
  return storeSession(data.session.access_token, profile);
}

export async function signOutSupabase() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem('YDA LAW OFFICE & Partners_token');
  localStorage.removeItem('YDA LAW OFFICE & Partners_user');
}
