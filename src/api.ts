import { Lawyer } from './types';
import { requireSupabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'lawyer' | 'admin';
  status: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
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
    status: PaymentStatus;
    total_amount: number;
    method: string;
    paid_at: string | null;
    created_at: string;
  }>;
};

export type PaymentStatus =
  | 'waiting_payment'
  | 'waiting_verification'
  | 'paid'
  | 'rejected'
  | 'expired'
  | 'pending'
  | 'failed'
  | 'refunded';

const SESSION_ACCESS_STATUSES: ConsultationStatus[] = ['paid', 'ongoing', 'in_review'];

export function canAccessConsultationSession(row: ConsultationRow): boolean {
  if (SESSION_ACCESS_STATUSES.includes(row.status)) return true;
  return (row.app_payments || []).some((payment) => payment.status === 'paid');
}

export function requiresPayment(row: ConsultationRow): boolean {
  if (['cancelled', 'expired', 'completed'].includes(row.status)) return false;
  return !canAccessConsultationSession(row);
}

export function consultationFromBookingData(data: Record<string, unknown> | null | undefined): ConsultationRow | null {
  if (!data) return null;
  const id = (data.consultationId || data.id) as string | undefined;
  if (!id) return null;

  return {
    id,
    client_id: (data.clientId as string) || null,
    lawyer_id: (data.lawyerId as string) || '',
    consultation_type: (data.type as string) || '',
    scheduled_day: (data.day as string) || null,
    scheduled_time: (data.time as string) || null,
    status: (data.status as ConsultationStatus) || 'pending',
    price: Number(data.price || 0),
    notes: (data.notes as string) || null,
    created_at: (data.created_at as string) || new Date().toISOString(),
    app_payments: (data.app_payments as ConsultationRow['app_payments']) || []
  };
}

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
  payment_sub_method?: string | null;
  provider: string | null;
  status: PaymentStatus;
  invoice_number?: string | null;
  payment_reference?: string | null;
  payment_proof_url?: string | null;
  proof_uploaded_at?: string | null;
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

export type ClientPaymentRow = {
  id: string;
  consultation_id: string;
  client_id: string | null;
  total_amount: number;
  amount?: number;
  method: string;
  payment_sub_method?: string | null;
  provider: string | null;
  status: PaymentStatus;
  invoice_number?: string | null;
  payment_reference?: string | null;
  payment_proof_url?: string | null;
  proof_uploaded_at?: string | null;
  due_date?: string | null;
  rejection_reason?: string | null;
  external_reference: string | null;
  created_at: string;
  paid_at: string | null;
  app_consultations?: {
    consultation_type: string;
    scheduled_day: string | null;
    status: ConsultationStatus;
    lawyer_directory?: {
      name: string;
      specialty: string;
    } | null;
    profiles?: {
      full_name: string;
      email: string;
    } | null;
  } | null;
};

export type PaymentMethodConfig = {
  id: string;
  method_type: 'bank_transfer' | 'ewallet' | 'qris';
  provider_code: string;
  display_name: string;
  account_name: string | null;
  account_number: string | null;
  phone_number: string | null;
  is_active: boolean;
  sort_order: number;
};

export type InvoiceRow = {
  id: string;
  consultationId: string;
  invoiceNumber: string;
  paymentReference: string;
  clientId?: string;
  clientName: string;
  lawyerId?: string;
  lawyerName: string;
  consultationName: string;
  consultationType?: string;
  consultationFee: number;
  adminFee?: number;
  taxAmount?: number;
  totalAmount: number;
  method: string | null;
  subMethod?: string | null;
  status: PaymentStatus;
  paymentProofUrl?: string | null;
  proofUploadedAt?: string | null;
  dueDate?: string | null;
  createdAt: string;
  paidAt?: string | null;
  rejectionReason?: string | null;
  instructions?: {
    type: string;
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    walletName?: string;
    accountName?: string;
    phoneNumber?: string;
    amount: number;
    paymentReference: string;
    invoiceNumber: string;
    qrisImageUrl?: string;
  } | null;
};

export type PaymentVerificationLog = {
  id: string;
  transaction_id: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  notes: string | null;
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

export type CallSignalRow = {
  id: string;
  consultation_id: string;
  sender_id: string | null;
  sender_role: string;
  signal_type: 'ring' | 'offer' | 'answer' | 'candidate' | 'leave';
  payload: any;
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options?.headers || {})
      },
      ...options
    });
  } catch (error) {
    const hint = import.meta.env.DEV
      ? ' Pastikan API lokal berjalan dengan `npm run server`.'
      : '';
    throw new Error(
      error instanceof Error && /failed to fetch/i.test(error.message)
        ? `Tidak dapat terhubung ke server API.${hint}`
        : error instanceof Error
          ? error.message
          : 'Request gagal'
    );
  }

  const rawText = await response.text().catch(() => '');
  let data: Record<string, unknown> = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const apiError = typeof data.error === 'string' ? data.error : '';
    if (apiError) throw new Error(apiError);

    const trimmed = rawText.replace(/\s+/g, ' ').trim();
    const snippet = trimmed ? trimmed.slice(0, 160) : '';
    const hint = import.meta.env.DEV && (response.status === 502 || response.status === 504)
      ? ' Pastikan API lokal berjalan dengan `npm run dev:all`.'
      : '';
    throw new Error(
      snippet
        ? `Request gagal (${response.status}): ${snippet}${hint}`
        : `Request gagal (${response.status}).${hint}`
    );
  }

  return data as T;
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem('YDA LAW OFFICE & Partners_user');
  if (!raw) return null;

  try {
    const user = JSON.parse(raw) as Record<string, unknown>;
    if (user.role === 'toliver') {
      user.role = 'client';
    }
    return user as StoredUser;
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
    availability: row.availability || []
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
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('lawyer_directory')
      .select('*')
      .eq('verification_status', 'verified')
      .order('name');

    if (error) throw error;
    return (data || []).map(row => mapLawyer(row as LawyerDirectoryRow));
  } catch {
    return [];
  }
}

export async function fetchClientConsultations(clientId: string) {
  try {
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
    const rows = ((data || []) as any[]).map(mapConsultationRow);
    return rows;
  } catch {
    return [];
  }
}

export async function fetchLawyerConsultations(lawyerId: string) {
  try {
    const rows = await request<any[]>(`/lawyer/consultations?lawyerId=${encodeURIComponent(lawyerId)}`);
    if (rows.length) return rows.map(mapConsultationRow);
  } catch {
    // Fallback to direct Supabase when policies are already applied.
  }

  try {
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
    const rows = ((data || []) as any[]).map(mapConsultationRow);
    return rows;
  } catch {
    return [];
  }
}

async function withAdminFallback<T>(loader: () => Promise<T[]>) {
  try {
    return await loader();
  } catch {
    return [] as T[];
  }
}

export async function fetchAdminPendingLawyers() {
  return withAdminFallback(
    async () => (await request<any[]>('/admin?resource=pending-lawyers')).map(mapPendingLawyerRow)
  );
}

export async function fetchAdminTransactions() {
  return withAdminFallback(
    async () => (await request<any[]>('/admin?resource=transactions')).map(mapAdminTransactionRow)
  );
}

export async function fetchAdminClients() {
  return withAdminFallback(
    async () => request<AdminClientRow[]>('/admin?resource=clients')
  );
}

export async function fetchAdminSupportTickets() {
  return withAdminFallback(
    async () => (await request<any[]>('/admin?resource=support-tickets')).map(mapAdminSupportTicketRow)
  );
}

export async function fetchAdminConsultations() {
  return withAdminFallback(
    async () => (await request<any[]>('/admin?resource=consultations')).map(mapAdminConsultationRow)
  );
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

export async function updateAdminPaymentStatus(paymentId: string, status: PaymentStatus, notes?: string) {
  await request('/admin', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'update-payment-status', paymentId, status, notes })
  });
}

export async function updateAdminPaymentMethod(configId: string, payload: Partial<PaymentMethodConfig>) {
  await request('/admin', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'update-payment-method',
      configId,
      displayName: payload.display_name,
      accountName: payload.account_name,
      accountNumber: payload.account_number,
      phoneNumber: payload.phone_number,
      isActive: payload.is_active
    })
  });
}

export async function replySupportTicket(ticketId: string, response: string) {
  await request('/admin', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'reply-support-ticket', ticketId, response })
  });
}

const INDONESIAN_DAY_INDEX: Record<string, number> = {
  minggu: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  sabtu: 6
};

function resolveScheduledDate(day: string): string {
  const trimmed = day.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const targetDay = INDONESIAN_DAY_INDEX[trimmed.toLowerCase()];
  const date = new Date();
  if (targetDay === undefined) {
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }

  const currentDay = date.getDay();
  let delta = targetDay - currentDay;
  if (delta <= 0) delta += 7;
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

function resolveScheduledTime(time: string): string {
  const trimmed = time.trim().replace('.', ':');
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hours, minutes] = trimmed.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
  }
  return '09:00:00';
}

function normalizeConsultationType(type: string): string {
  if (type === 'phone') return 'voice';
  return type || 'chat';
}

function mapCreatedConsultation(data: {
  id: string;
  client_id?: string | null;
  lawyer_id: string;
  consultation_type: string;
  scheduled_day?: string | null;
  scheduled_time?: string | null;
  scheduled_date?: string | null;
  notes: string | null;
  price: number;
  status: string;
}, fallbackDay: string, fallbackTime: string) {
  return {
    id: data.id,
    consultationId: data.id,
    status: data.status,
    price: data.price,
    type: data.consultation_type,
    day: data.scheduled_day || fallbackDay,
    time: data.scheduled_time || fallbackTime,
    notes: data.notes,
    lawyerId: data.lawyer_id,
    clientId: data.client_id || null
  };
}

function formatBookingError(error: { code?: string; message?: string }) {
  if (error.code === '23503') {
    return 'Advokat tidak ditemukan di database. Pilih advokat terverifikasi dari daftar.';
  }
  if (error.code === '42501') {
    return 'Akses ditolak. Pastikan Anda login sebagai klien sebelum booking.';
  }
  if (/cannot insert into view/i.test(error.message || '')) {
    return 'Booking gagal disimpan karena skema database belum sinkron. Hubungi admin atau jalankan migrasi Supabase terbaru.';
  }
  return error.message || 'Booking gagal disimpan';
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
  const clientId = payload.clientId;
  if (!clientId) throw new Error('User belum login.');

  const legacyResult = await supabase
    .from('app_consultations')
    .insert({
      client_id: clientId,
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

  if (!legacyResult.error && legacyResult.data) {
    return mapCreatedConsultation(legacyResult.data, payload.day, payload.time);
  }

  const normalizedType = normalizeConsultationType(payload.type);
  const v2Attempts: Array<Record<string, unknown>> = [
    {
      client_id: clientId,
      lawyer_id: payload.lawyerId,
      consultation_type: normalizedType,
      meeting_mode: 'virtual',
      scheduled_date: resolveScheduledDate(payload.day),
      scheduled_time: resolveScheduledTime(payload.time),
      notes: payload.notes || null,
      price: payload.price,
      status: 'pending'
    },
    {
      client_id: clientId,
      lawyer_id: payload.lawyerId,
      consultation_type: payload.type || 'chat',
      scheduled_day: payload.day,
      scheduled_time: payload.time,
      notes: payload.notes || null,
      price: payload.price,
      status: 'pending'
    }
  ];

  let lastError: { code?: string; message?: string } | null = legacyResult.error;
  for (const row of v2Attempts) {
    const { data, error } = await supabase
      .from('consultations')
      .insert(row)
      .select('id, client_id, lawyer_id, consultation_type, scheduled_date, scheduled_time, scheduled_day, notes, price, status')
      .single();

    if (!error && data) {
      return mapCreatedConsultation(
        {
          ...data,
          scheduled_day: data.scheduled_day || payload.day,
          scheduled_time: data.scheduled_time || payload.time
        },
        payload.day,
        payload.time
      );
    }

    lastError = error;
    if (!/column|schema cache/i.test(error?.message || '')) break;
  }

  throw new Error(formatBookingError(lastError || { message: 'Booking gagal disimpan' }));
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

  let existingStatus: ConsultationStatus | null = null;
  const legacyRead = await supabase
    .from('app_consultations')
    .select('status')
    .eq('id', consultationId)
    .maybeSingle();

  if (!legacyRead.error && legacyRead.data) {
    existingStatus = legacyRead.data.status as ConsultationStatus;
    const legacyUpdate = await supabase
      .from('app_consultations')
      .update({ status })
      .eq('id', consultationId);
    if (!legacyUpdate.error) {
      try {
        await supabase.from('consultation_status_logs').insert({
          consultation_id: consultationId,
          actor_id: user?.id || null,
          old_status: existingStatus,
          new_status: status,
          note: note || null
        });
      } catch {
        // optional audit log
      }
      return;
    }
  }

  const v2Read = await supabase
    .from('consultations')
    .select('status')
    .eq('id', consultationId)
    .maybeSingle();

  if (v2Read.error || !v2Read.data) {
    throw v2Read.error || legacyRead.error || new Error('Konsultasi tidak ditemukan');
  }

  existingStatus = v2Read.data.status as ConsultationStatus;
  const { error } = await supabase
    .from('consultations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', consultationId);

  if (error) throw error;

  try {
    await supabase.from('consultation_status_logs').insert({
      consultation_id: consultationId,
      actor_id: user?.id || null,
      old_status: existingStatus,
      new_status: status,
      note: note || null
    });
  } catch {
    // optional audit log
  }
}

export async function fetchDocuments(ownerId: string) {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('documents')
      .select('id, owner_id, consultation_id, name, file_url, file_type, file_size, visibility, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DocumentRow[];
  } catch {
    return [];
  }
}

export async function fetchClientPayments(clientId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('app_payments')
    .select('id, consultation_id, client_id, total_amount, method, provider, status, external_reference, created_at, paid_at, app_consultations(consultation_type, scheduled_day, status, lawyer_directory(name, specialty))')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) throw error;
  return (data || []).map((row: any) => {
    const consultation = firstRelation(row.app_consultations) as any;
    const lawyer = firstRelation(consultation?.lawyer_directory) as any;

    return {
      id: row.id,
      consultation_id: row.consultation_id,
      client_id: row.client_id,
      total_amount: row.total_amount,
      method: row.method,
      provider: row.provider,
      status: row.status,
      external_reference: row.external_reference,
      created_at: row.created_at,
      paid_at: row.paid_at,
      app_consultations: consultation ? {
        consultation_type: consultation.consultation_type,
        scheduled_day: consultation.scheduled_day,
        status: consultation.status,
        lawyer_directory: lawyer ? {
          name: lawyer.name,
          specialty: lawyer.specialty
        } : null
      } : null
    };
  }) as ClientPaymentRow[];
}

export async function uploadLegalDocument(file: File, consultationId?: string) {
  const supabase = requireSupabase();
  const user = getStoredUser();
  if (!user?.id) throw new Error('User belum login.');

  if (consultationId) {
    const { data: consultation, error: consultationError } = await supabase
      .from('app_consultations')
      .select('id, status, app_payments(status)')
      .eq('id', consultationId)
      .maybeSingle();

    if (consultationError) throw consultationError;
    if (!consultation) throw new Error('Konsultasi tidak ditemukan.');

    const row = consultation as ConsultationRow;
    if (!canAccessConsultationSession(row)) {
      throw new Error('Dokumen konsultasi hanya tersedia setelah pembayaran terverifikasi.');
    }
  }

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

export async function uploadProfilePhoto(file: File) {
  const supabase = requireSupabase();
  const user = getStoredUser();
  if (!user?.id) throw new Error('User belum login.');

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Foto profil harus berupa JPG, PNG, atau WEBP.');
  }
  if (file.size > 3 * 1024 * 1024) {
    throw new Error('Ukuran foto maksimal 3MB.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `${user.id}/avatar-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(storagePath, file, { upsert: false, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('profile-photos')
    .getPublicUrl(storagePath);

  const avatarUrl = urlData.publicUrl;
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (profileError) throw profileError;

  if (user.role === 'lawyer') {
    await supabase
      .from('lawyer_directory')
      .update({ image: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);
  }

  const updatedUser = { ...user, avatarUrl };
  localStorage.setItem('YDA LAW OFFICE & Partners_user', JSON.stringify(updatedUser));
  return avatarUrl;
}

export async function getOrCreateChatSession(payload: {
  consultationId: string;
  clientId?: string | null;
  lawyerId: string;
  senderRole?: 'client' | 'lawyer' | 'admin';
}) {
  try {
    return await request<{
      id: string;
      consultation_id: string;
      client_id: string | null;
      lawyer_id: string;
      status: string;
    }>('/chat', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch {
    // Fallback to direct Supabase for local/dev environments.
  }

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
  try {
    return await request<AppMessageRow[]>(`/chat?sessionId=${encodeURIComponent(chatSessionId)}`);
  } catch {
    // Fallback to direct Supabase for local/dev environments.
  }

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
  const user = getStoredUser();
  try {
    return await request<AppMessageRow>('/chat', {
      method: 'POST',
      body: JSON.stringify({
        action: 'send-message',
        chatSessionId: payload.chatSessionId,
        senderId: user?.id || null,
        senderRole: user?.role || 'client',
        content: payload.content,
        messageType: payload.type || 'text'
      })
    });
  } catch {
    // Fallback to direct Supabase for local/dev environments.
  }

  const supabase = requireSupabase();
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

export function fetchCallSignals(consultationId: string, since?: string) {
  const params = new URLSearchParams({ consultationId });
  if (since) params.set('since', since);
  return request<CallSignalRow[]>(`/calls?${params.toString()}`);
}

export function sendCallSignal(payload: {
  consultationId: string;
  senderId: string;
  senderRole: 'client' | 'lawyer';
  signalType: 'ring' | 'offer' | 'answer' | 'candidate' | 'leave';
  payload: any;
}) {
  return request<CallSignalRow>('/calls', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function submitReview(payload: {
  consultationId?: string;
  lawyerId: string;
  rating: number;
  comment: string;
  tags: string[];
}) {
  const user = getStoredUser();
  if (!user?.id) throw new Error('User belum login.');

  try {
    await request('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        consultationId: payload.consultationId,
        clientId: user.id,
        lawyerId: payload.lawyerId,
        rating: payload.rating,
        comment: payload.comment,
        tags: payload.tags
      })
    });
    return;
  } catch {
    // Fallback to direct Supabase for local/dev environments.
  }

  const supabase = requireSupabase();
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

export function fetchPaymentMethods(methodType?: string) {
  const params = methodType ? `?methodType=${encodeURIComponent(methodType)}` : '';
  return request<PaymentMethodConfig[]>(`/payments${params}`);
}

export function createOrGetInvoice(payload: {
  consultationId: string;
  amount?: number;
  method?: string;
  subMethod?: string;
  action?: 'create-invoice' | 'select-method';
}) {
  return request<InvoiceRow>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      action: payload.action || 'create-invoice',
      consultationId: payload.consultationId,
      amount: payload.amount,
      method: payload.method,
      subMethod: payload.subMethod
    })
  });
}

export function getInvoice(payload: { paymentId?: string; consultationId?: string }) {
  return request<InvoiceRow>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      action: 'get-invoice',
      paymentId: payload.paymentId,
      consultationId: payload.consultationId
    })
  });
}

export async function uploadPaymentProof(payload: {
  paymentId: string;
  file: File;
}) {
  const buffer = await payload.file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  const fileBase64 = btoa(binary);

  return request<InvoiceRow & { message?: string }>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      action: 'upload-proof',
      paymentId: payload.paymentId,
      fileName: payload.file.name,
      mimeType: payload.file.type || 'application/octet-stream',
      fileBase64
    })
  });
}

export function verifyPayment(payload: {
  paymentId: string;
  decision: 'approve' | 'reject' | 'override_approve' | 'override_reject';
  notes?: string;
}) {
  return request<{
    status: PaymentStatus;
    paymentId: string;
    consultationStatus: ConsultationStatus | null;
    verificationHistory: PaymentVerificationLog[];
  }>('/payments/verify', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function fetchPendingPaymentVerifications(status = 'waiting_verification') {
  return request<ClientPaymentRow[]>(`/payments/verify?status=${encodeURIComponent(status)}`);
}

export function downloadInvoicePdf(invoice: InvoiceRow) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${invoice.invoiceNumber}</title>
<style>body{font-family:Arial,sans-serif;padding:40px;color:#111}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:10px;border-bottom:1px solid #eee;text-align:left}th{font-size:12px;text-transform:uppercase;color:#666}</style></head><body>
<h1>Invoice ${invoice.invoiceNumber}</h1>
<p><strong>Referensi:</strong> ${invoice.paymentReference}</p>
<p><strong>Klien:</strong> ${invoice.clientName}</p>
<p><strong>Advokat:</strong> ${invoice.lawyerName}</p>
<p><strong>Konsultasi:</strong> ${invoice.consultationName}</p>
<table><tr><th>Item</th><th>Amount</th></tr>
<tr><td>Biaya Konsultasi</td><td>Rp ${Number(invoice.consultationFee).toLocaleString('id-ID')}</td></tr>
<tr><td><strong>Total</strong></td><td><strong>Rp ${Number(invoice.totalAmount).toLocaleString('id-ID')}</strong></td></tr></table>
<p><strong>Metode:</strong> ${invoice.method || '-'} ${invoice.subMethod ? `(${invoice.subMethod})` : ''}</p>
<p><strong>Status:</strong> ${invoice.status}</p>
<p><strong>Jatuh Tempo:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('id-ID') : '-'}</p>
<p><strong>Dibuat:</strong> ${new Date(invoice.createdAt).toLocaleString('id-ID')}</p>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice.invoiceNumber}.html`;
  link.click();
  URL.revokeObjectURL(url);
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
