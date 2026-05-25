import { requireSupabase, supabase } from './supabaseClient';
import { registerAccount, type StoredUser } from './api';

type AppRole = 'client' | 'lawyer' | 'admin';

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: AppRole;
  status: string;
};

function storeSession(accessToken: string, profile: ProfileRow) {
  const user: StoredUser = {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    role: profile.role,
    status: profile.status,
    phone: profile.phone || undefined
  };

  localStorage.setItem('finprose_token', accessToken);
  localStorage.setItem('finprose_user', JSON.stringify(user));
  return user;
}

async function ensureSupabaseProfile(
  client: ReturnType<typeof requireSupabase>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  fallback?: { fullName?: string; email?: string; role?: AppRole }
) {
  const metadata = user.user_metadata || {};
  const metadataRole = metadata.role === 'lawyer' || metadata.role === 'client' ? metadata.role : undefined;
  const role = fallback?.role || metadataRole || 'client';
  const email = (fallback?.email || user.email || '').toLowerCase().trim();
  const fullName = (
    fallback?.fullName ||
    (typeof metadata.full_name === 'string' ? metadata.full_name : '') ||
    email
  ).trim();
  const profileStatus = role === 'lawyer' ? 'pending_verification' : 'active';

  const { error: profileError } = await client
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: fullName,
      email,
      role,
      status: profileStatus
    }, { onConflict: 'id' });

  if (profileError) throw profileError;

  if (role === 'client') {
    const { error } = await client
      .from('client_profiles')
      .upsert({ user_id: user.id }, { onConflict: 'user_id' });

    if (error) throw error;
  }

  if (role === 'lawyer') {
    const { error } = await client.from('lawyer_profiles').upsert({
      user_id: user.id,
      specialty: 'Belum diisi',
      description: 'Profil advokat sedang menunggu verifikasi admin.',
      experience_years: 0,
      consultation_price: 150000,
      verification_status: 'pending'
    }, { onConflict: 'user_id' });

    if (error) throw error;
  }
}

export async function signUpWithSupabase(payload: {
  fullName: string;
  email: string;
  password: string;
  role: AppRole;
}) {
  try {
    return await registerAccount(payload);
  } catch (backendError) {
    if (import.meta.env.PROD) {
      throw backendError;
    }
  }

  const client = requireSupabase();
  const email = payload.email.toLowerCase().trim();
  const role = payload.role === 'admin' ? 'client' : payload.role;

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

  const profileStatus = role === 'lawyer' ? 'pending_verification' : 'active';
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
    .select('id, full_name, email, phone, role, status')
    .eq('id', data.user.id)
    .single<ProfileRow>();

  if (profileError) throw profileError;
  if (!profile) throw new Error('Profil user belum ada di Supabase.');
  if (profile.role !== expectedRole) {
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
    .select('id, full_name, email, phone, role, status')
    .eq('id', data.session.user.id)
    .single<ProfileRow>();

  if (error || !profile) return null;
  return storeSession(data.session.access_token, profile);
}

export async function signOutSupabase() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem('finprose_token');
  localStorage.removeItem('finprose_user');
}
