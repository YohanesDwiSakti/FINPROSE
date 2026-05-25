import { Lawyer } from './types';
import { requireSupabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'lawyer' | 'admin';
  status: string;
  phone?: string;
  address?: string;
};

export type ConsultationStatus = 'pending' | 'paid' | 'ongoing' | 'in_review' | 'completed' | 'cancelled' | 'expired';

export type ConsultationRow = {
  id: string;
  client_id: string | null;
  lawyer_id: string;
  consultation_type: string;
  scheduled_day: string | null;
  scheduled_time: string | null;
  status: ConsultationStatus;
  price: number;
  notes: string | null;
  created_at: string;
  lawyer_directory?: {
    name: string;
    specialty: string;
    image: string;
  } | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
  app_payments?: Array<{
    id: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';
    total_amount: number;
    method: string;
    paid_at: string | null;
    created_at: string;
  }>;
};

export type PendingLawyerRow = {
  user_id: string;
  specialty: string;
  description: string | null;
  experience_years: number;
  consultation_price: number;
  verification_status: 'pending' | 'verified' | 'rejected' | 'suspended';
  profiles?: {
    full_name: string;
    email: string;
    status: string;
    avatar_url: string | null;
  } | null;
};

export type AdminTransactionRow = {
  id: string;
  consultation_id: string;
  client_id: string | null;
  amount: number;
  admin_fee: number;
  tax_amount: number;
  platform_fee: number;
  total_amount: number;
  method: string;
  provider: string | null;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';
  external_reference: string | null;
  created_at: string;
  paid_at: string | null;
  app_consultations?: {
    lawyer_id: string;
    consultation_type: string;
    status: ConsultationStatus;
    lawyer_directory?: {
      name: string;
      specialty: string;
    } | null;
  } | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
};

export type AdminClientRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'client' | 'lawyer' | 'admin';
  status: string;
  created_at: string;
};

export type AdminSupportTicketRow = {
  id: string;
  user_id: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
    role: string;
  } | null;
};

export type AdminConsultationRow = {
  id: string;
  client_id: string | null;
  lawyer_id: string;
  consultation_type: string;
  scheduled_day: string | null;
  scheduled_time: string | null;
  status: ConsultationStatus;
  price: number;
  notes: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
  lawyer_directory?: {
    name: string;
    specialty: string;
  } | null;
  app_payments?: Array<{
    id: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';
    total_amount: number;
    method: string;
    created_at: string;
  }>;
};

export type DocumentRow = {
  id: string;
  owner_id: string;
  consultation_id: string | null;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  visibility: string;
  created_at: string;
};

export type AppMessageRow = {
  id: string;
  chat_session_id: string;
  sender_id: string | null;
  sender_role: string;
  content: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  message_type: string;
  created_at: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders: Record<string, string> = {};
  try {
    const { data } = await requireSupabase().auth.getSession();
    if (data.session?.access_token) {
      authHeaders.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {
    // Public/runtime endpoints still work without a session.
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options?.headers || {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request gagal');
  }

  return data as T;
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem('finprose_user');
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

type LawyerDirectoryRow = {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  review_count: number;
  experience_years: number;
  consultation_price: number;
  image: string;
  description: string;
  is_online: boolean;
  languages: string[];
  education: string[];
  certifications: string[];
  availability: { day: string; times: string[] }[];
  whatsapp_number?: string | null;
};

function mapLawyer(row: LawyerDirectoryRow): Lawyer {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    rating: Number(row.rating || 0),
    reviewCount: row.review_count || 0,
    experience: row.experience_years || 0,
    price: row.consultation_price || 0,
    image: row.image,
    description: row.description,
    isOnline: row.is_online,
    languages: row.languages || [],
    education: row.education || [],
    certifications: row.certifications || [],
    availability: row.availability || [],
    whatsappNumber: row.whatsapp_number || undefined
  };
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function mapConsultationRow(row: any): ConsultationRow {
  return {
    ...row,
    lawyer_directory: firstRelation(row.lawyer_directory),
    profiles: firstRelation(row.profiles),
    app_payments: row.app_payments || []
  };
}

function mapPendingLawyerRow(row: any): PendingLawyerRow {
  return {
    ...row,
    profiles: firstRelation(row.profiles)
  };
}

function mapAdminTransactionRow(row: any): AdminTransactionRow {
  const consultation = firstRelation(row.app_consultations) as any;

  return {
    ...row,
    profiles: firstRelation(row.profiles),
    app_consultations: consultation
      ? {
          ...consultation,
          lawyer_directory: firstRelation(consultation.lawyer_directory)
        }
      : null
  };
}

function mapAdminSupportTicketRow(row: any): AdminSupportTicketRow {
  return {
    ...row,
    profiles: firstRelation(row.profiles)
  };
}

function mapAdminConsultationRow(row: any): AdminConsultationRow {
  return {
    ...row,
    profiles: firstRelation(row.profiles),
    lawyer_directory: firstRelation(row.lawyer_directory),
    app_payments: row.app_payments || []
  };
}

export async function fetchLawyers() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('lawyer_directory')
    .select('*')
    .eq('verification_status', 'verified')
    .order('name');

  if (error) throw error;
  return (data || []).map(row => mapLawyer(row as LawyerDirectoryRow));
}

export async function fetchClientConsultations(clientId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('app_consultations')
    .select(`
      id,
      client_id,
      lawyer_id,
      consultation_type,
      scheduled_day,
      scheduled_time,
      status,
      price,
      notes,
      created_at,
      lawyer_directory(name, specialty, image),
      app_payments(id, status, total_amount, method, paid_at, created_at)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data || []) as any[]).map(mapConsultationRow);
}

export async function fetchLawyerConsultations(lawyerId: string) {
  try {
    const rows = await request<any[]>(`/lawyer/consultations?lawyerId=${encodeURIComponent(lawyerId)}`);
    return rows.map(mapConsultationRow);
  } catch {
    // Fallback to direct Supabase when policies are already applied.
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('app_consultations')
    .select(`
      id,
      client_id,
      lawyer_id,
      consultation_type,
      scheduled_day,
      scheduled_time,
      status,
      price,
      notes,
      created_at,
      lawyer_directory(name, specialty, image),
      profiles(full_name, email),
      app_payments(id, status, total_amount, method, paid_at, created_at)
    `)
    .eq('lawyer_id', lawyerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data || []) as any[]).map(mapConsultationRow);
}

export async function fetchAdminPendingLawyers() {
  const rows = await request<any[]>('/admin?resource=pending-lawyers');
  return rows.map(mapPendingLawyerRow);
}

export async function fetchAdminTransactions() {
  const rows = await request<any[]>('/admin?resource=transactions');
  return rows.map(mapAdminTransactionRow);
}

export async function fetchAdminClients() {
  return request<AdminClientRow[]>('/admin?resource=clients');
}

export async function fetchAdminSupportTickets() {
  const rows = await request<any[]>('/admin?resource=support-tickets');
  return rows.map(mapAdminSupportTicketRow);
}

export async function fetchAdminConsultations() {
  const rows = await request<any[]>('/admin?resource=consultations');
  return rows.map(mapAdminConsultationRow);
}

export async function updateSupportTicketStatus(ticketId: string, status: string) {
  await request('/admin', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'update-support-ticket', ticketId, status })
  });
}

export async function updateClientAccountStatus(clientId: string, status: 'active' | 'blocked' | 'suspended') {
  await request('/admin', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'update-client-status', clientId, status })
  });
}

export async function verifyLawyerAccount(lawyerUserId: string) {
  await request('/admin', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'verify-lawyer', lawyerUserId })
  });
}

export async function rejectLawyerAccount(lawyerUserId: string) {
  await request('/admin', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'reject-lawyer', lawyerUserId })
  });
}

export async function updateAdminPaymentStatus(paymentId: string, status: 'pending' | 'paid' | 'failed' | 'refunded' | 'expired') {
  await request('/admin', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'update-payment-status', paymentId, status })
  });
}

export async function replySupportTicket(ticketId: string, response: string) {
  await request('/admin', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'reply-support-ticket', ticketId, response })
  });
}

export async function createConsultation(payload: {
  clientId?: string;
  lawyerId: string;
  type: string;
  day: string;
  time: string;
  notes: string;
  price: number;
}) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('app_consultations')
    .insert({
      client_id: payload.clientId || null,
      lawyer_id: payload.lawyerId,
      consultation_type: payload.type || 'chat',
      scheduled_day: payload.day,
      scheduled_time: payload.time,
      notes: payload.notes,
      price: payload.price,
      status: 'pending'
    })
    .select('id, client_id, lawyer_id, consultation_type, scheduled_day, scheduled_time, notes, price, status')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    consultationId: data.id,
    status: data.status,
    price: data.price,
    type: data.consultation_type,
    day: data.scheduled_day,
    time: data.scheduled_time,
    notes: data.notes,
    lawyerId: data.lawyer_id,
    clientId: data.client_id
  };
}

export async function updateConsultationStatus(consultationId: string, status: ConsultationStatus, note?: string) {
  const user = getStoredUser();
  try {
    await request('/consultations/status', {
      method: 'PATCH',
      body: JSON.stringify({
        consultationId,
        actorId: user?.id || '',
        status,
        note: note || ''
      })
    });
    return;
  } catch {
    // Fallback to direct Supabase when the runtime backend is unavailable.
  }

  const supabase = requireSupabase();

  const { data: existing, error: readError } = await supabase
    .from('app_consultations')
    .select('status')
    .eq('id', consultationId)
    .single();

  if (readError) throw readError;

  const { error } = await supabase
    .from('app_consultations')
    .update({ status })
    .eq('id', consultationId);

  if (error) throw error;

  await supabase.from('consultation_status_logs').insert({
    consultation_id: consultationId,
    actor_id: user?.id || null,
    old_status: existing?.status || null,
    new_status: status,
    note: note || null
  });
}

export async function fetchDocuments(ownerId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select('id, owner_id, consultation_id, name, file_url, file_type, file_size, visibility, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as DocumentRow[];
}

export async function uploadLegalDocument(file: File, consultationId?: string) {
  const supabase = requireSupabase();
  const user = getStoredUser();
  if (!user?.id) throw new Error('User belum login.');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${user.id}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from('legal-documents')
    .upload(storagePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('legal-documents')
    .getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from('documents')
    .insert({
      owner_id: user.id,
      consultation_id: consultationId || null,
      name: file.name,
      file_url: urlData.publicUrl,
      file_type: file.type || null,
      file_size: file.size,
      visibility: consultationId ? 'shared' : 'private'
    })
    .select('id, owner_id, consultation_id, name, file_url, file_type, file_size, visibility, created_at')
    .single();

  if (error) throw error;
  return data as DocumentRow;
}

export async function getOrCreateChatSession(payload: {
  consultationId: string;
  clientId?: string | null;
  lawyerId: string;
}) {
  const supabase = requireSupabase();
  const { data: existing, error: existingError } = await supabase
    .from('app_chat_sessions')
    .select('id, consultation_id, client_id, lawyer_id, status')
    .eq('consultation_id', payload.consultationId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing;

  const { data, error } = await supabase
    .from('app_chat_sessions')
    .insert({
      consultation_id: payload.consultationId,
      client_id: payload.clientId || null,
      lawyer_id: payload.lawyerId,
      status: 'active'
    })
    .select('id, consultation_id, client_id, lawyer_id, status')
    .single();

  if (error) throw error;
  return data;
}

export async function fetchChatMessages(chatSessionId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('app_messages')
    .select('id, chat_session_id, sender_id, sender_role, content, attachment_url, attachment_name, attachment_size, message_type, created_at')
    .eq('chat_session_id', chatSessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as AppMessageRow[];
}

export async function sendChatMessage(payload: {
  chatSessionId: string;
  content: string;
  type?: string;
}) {
  const supabase = requireSupabase();
  const user = getStoredUser();
  const { data, error } = await supabase
    .from('app_messages')
    .insert({
      chat_session_id: payload.chatSessionId,
      sender_id: user?.id || null,
      sender_role: user?.role || 'client',
      content: payload.content,
      message_type: payload.type || 'text'
    })
    .select('id, chat_session_id, sender_id, sender_role, content, attachment_url, attachment_name, attachment_size, message_type, created_at')
    .single();

  if (error) throw error;
  return data as AppMessageRow;
}

export async function submitReview(payload: {
  consultationId?: string;
  lawyerId: string;
  rating: number;
  comment: string;
  tags: string[];
}) {
  const supabase = requireSupabase();
  const user = getStoredUser();
  if (!user?.id) throw new Error('User belum login.');

  const { error } = await supabase
    .from('reviews')
    .upsert({
      consultation_id: payload.consultationId || null,
      client_id: user.id,
      lawyer_id: payload.lawyerId,
      rating: payload.rating,
      comment: payload.comment,
      tags: payload.tags
    }, { onConflict: 'consultation_id,client_id' });

  if (error) throw error;

  const { data: reviews, error: reviewError } = await supabase
    .from('reviews')
    .select('rating')
    .eq('lawyer_id', payload.lawyerId);

  if (reviewError) throw reviewError;

  const reviewCount = reviews?.length || 0;
  const rating = reviewCount
    ? reviews.reduce((total, item) => total + Number(item.rating || 0), 0) / reviewCount
    : payload.rating;

  const { error: lawyerError } = await supabase
    .from('lawyer_directory')
    .update({
      rating: Number(rating.toFixed(2)),
      review_count: reviewCount
    })
    .eq('id', payload.lawyerId);

  if (lawyerError) throw lawyerError;

  if (payload.consultationId) {
    await updateConsultationStatus(payload.consultationId, 'completed', 'Review submitted by client');
  }
}

export function createPayment(payload: {
  consultationId: string;
  clientId?: string;
  method: string;
  amount: number;
}) {
  return request<{
    id: string;
    paymentId: string;
    consultationId: string;
    status: 'pending' | 'paid' | 'failed' | 'expired';
    amount: number;
    adminFee: number;
    taxAmount: number;
    platformFee: number;
    totalAmount: number;
    provider?: string;
    snapToken?: string;
    redirectUrl?: string;
    clientKey?: string;
    snapJsUrl?: string;
    isProduction?: boolean;
  }>('/payments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function registerAccount(payload: {
  fullName: string;
  email: string;
  password: string;
  role: 'client' | 'lawyer' | 'admin';
}) {
  return request<{
    user: {
      id: string;
      email: string;
    };
    role: 'client' | 'lawyer';
    status: string;
  }>('/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
