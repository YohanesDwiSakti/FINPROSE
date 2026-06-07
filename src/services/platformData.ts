import {
  buildPlatformDataset,
  getConsultationsForUser,
  getFavoriteLawyersForUser,
  getLawyerById,
  getNotificationsForUser,
  getPlatformDataset,
  getRelatedLawyers,
  getReviewsForLawyer,
  getTransactionsForUser,
  mergeLawyersWithPlatform,
  getFilesForUser,
  toConsultationRow,
  type PlatformCategory,
  type PlatformFile,
  type PlatformReview,
  type PlatformTransaction
} from '../data/platformSeed';
import { Lawyer } from '../types';
import { requireSupabase } from '../supabaseClient';
import type { AdminClientRow, AdminConsultationRow, AdminTransactionRow, ConsultationRow } from '../api';

export {
  buildPlatformDataset,
  getPlatformDataset,
  getLawyerById,
  getReviewsForLawyer,
  getRelatedLawyers,
  mergeLawyersWithPlatform
};

export type PlatformStats = {
  totalLawyers: number;
  totalClients: number;
  totalConsultations: number;
  totalTransactions: number;
  totalReviews: number;
  totalRevenue: number;
  activeLawyers: number;
  activeClients: number;
  pendingConsultations: number;
  completedConsultations: number;
};

export function getPlatformStats(): PlatformStats {
  const data = getPlatformDataset();
  const paid = data.transactions.filter(t => t.status === 'paid');
  return {
    totalLawyers: data.lawyers.length,
    totalClients: data.clients.length,
    totalConsultations: data.consultations.length,
    totalTransactions: data.transactions.length,
    totalReviews: data.reviews.length,
    totalRevenue: paid.reduce((sum, t) => sum + t.totalAmount, 0),
    activeLawyers: data.lawyerRecords.filter(l => l.isOnline).length,
    activeClients: data.clients.filter(c => c.membershipStatus === 'active' || c.membershipStatus === 'premium').length,
    pendingConsultations: data.consultations.filter(c => ['pending', 'paid', 'ongoing'].includes(c.status)).length,
    completedConsultations: data.consultations.filter(c => c.status === 'completed').length
  };
}

export function getFeaturedLawyers(limit = 6): Lawyer[] {
  return [...getPlatformDataset().lawyers]
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, limit);
}

export function getTopRatedLawyers(limit = 6): Lawyer[] {
  return [...getPlatformDataset().lawyers]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function getMostConsultedLawyers(limit = 6): Lawyer[] {
  return [...getPlatformDataset().lawyerRecords]
    .sort((a, b) => b.consultationCount - a.consultationCount)
    .slice(0, limit);
}

export function getRecentReviews(limit = 8): PlatformReview[] {
  return [...getPlatformDataset().reviews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function getRecentConsultations(limit = 8) {
  return [...getPlatformDataset().consultations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function getCategoriesWithCounts(): PlatformCategory[] {
  return getPlatformDataset().categories;
}

export async function fetchLawyersEnriched() {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('lawyer_directory')
      .select('*')
      .eq('verification_status', 'verified')
      .order('name');

    if (!error && data?.length) {
      return mergeLawyersWithPlatform(data.map(row => ({
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
      })));
    }
  } catch {
    // fall through to platform dataset
  }

  return [];
}

export function getClientDashboardData(userId: string, role: 'client' | 'lawyer' | 'admin') {
  const consultations = getConsultationsForUser(userId, role).map(toConsultationRow) as ConsultationRow[];
  const transactions = getTransactionsForUser(userId, role);
  const notifications = getNotificationsForUser(userId);
  const favorites = getFavoriteLawyersForUser(userId, 4);
  const recentReviews = getRecentReviews(5);

  return { consultations, transactions, notifications, favorites, recentReviews };
}

export function getLawyerDashboardData(userId: string) {
  const consultations = getConsultationsForUser(userId, 'lawyer').map(toConsultationRow) as ConsultationRow[];
  const transactions = getTransactionsForUser(userId, 'lawyer');
  const clients = [...new Map(
    consultations
      .filter(c => c.client_id)
      .map(c => [c.client_id, {
        id: c.client_id!,
        name: c.profiles?.full_name || 'Klien',
        case: c.notes || c.consultation_type,
        status: c.status,
        image: '/avatars/client-1.png',
        consultation: c
      }])
  ).values()];

  const paid = transactions.filter(t => t.status === 'paid');
  const reviews = getPlatformDataset().reviews.filter(r => r.lawyerId === userId);
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 4.8;

  return {
    consultations,
    transactions,
    clients,
    stats: {
      totalClients: clients.length,
      totalConsultations: consultations.length,
      monthlyRevenue: paid.reduce((sum, t) => sum + t.netRevenue, 0),
      successRate: getPlatformDataset().lawyerRecords.find(l => l.id === userId)?.successRate || 88,
      averageRating: Number(avgRating.toFixed(1)),
      pendingConsultations: consultations.filter(c => c.status === 'pending').length,
      activeConsultations: consultations.filter(c => ['paid', 'ongoing', 'in_review'].includes(c.status)).length
    }
  };
}

export function getAdminDashboardData() {
  const data = getPlatformDataset();
  const stats = getPlatformStats();

  const clients: AdminClientRow[] = data.clients.map(c => ({
    id: c.id,
    full_name: c.fullName,
    email: c.email,
    phone: c.phone,
    role: 'client',
    status: c.membershipStatus,
    created_at: c.registeredAt
  }));

  const consultations: AdminConsultationRow[] = data.consultations.map(c => ({
    id: c.id,
    client_id: c.clientId,
    lawyer_id: c.lawyerId,
    consultation_type: c.consultationType,
    scheduled_day: c.scheduledDate,
    scheduled_time: c.scheduledTime,
    status: c.status,
    price: c.price,
    notes: c.notes,
    created_at: c.createdAt,
    profiles: { full_name: c.clientName, email: `${c.clientName.toLowerCase().replace(/\s+/g, '.')}@client.finpro.id` },
    lawyer_directory: { name: c.lawyerName, specialty: c.lawyerSpecialty },
    app_payments: [{
      id: `pay-${c.id.slice(0, 8)}`,
      status: c.status === 'completed' ? 'paid' : c.status === 'cancelled' ? 'failed' : 'pending',
      total_amount: c.price,
      method: 'qris',
      created_at: c.createdAt
    }]
  }));

  const transactions: AdminTransactionRow[] = data.transactions.map(t => ({
    id: t.id,
    consultation_id: t.consultationId,
    client_id: t.clientId,
    amount: t.amount,
    admin_fee: t.adminFee,
    tax_amount: t.taxAmount,
    platform_fee: t.platformFee,
    total_amount: t.totalAmount,
    method: t.method,
    provider: 'Manual Verification',
    status: t.status,
    external_reference: t.invoiceNumber,
    created_at: t.createdAt,
    paid_at: t.paidAt,
    profiles: { full_name: t.clientName, email: `${t.clientName.toLowerCase().replace(/\s+/g, '.')}@client.finpro.id` },
    app_consultations: {
      lawyer_id: t.lawyerId,
      consultation_type: 'chat',
      status: 'completed',
      lawyer_directory: { name: t.lawyerName, specialty: 'Legal Consultation' }
    }
  }));

  return {
    stats,
    analytics: data.analytics,
    clients,
    consultations,
    transactions,
    reviews: data.reviews,
    categories: data.categories,
    pendingLawyers: data.lawyerRecords.slice(0, 5).map(l => ({
      user_id: l.id,
      specialty: l.specialty,
      description: l.description,
      experience_years: l.experience,
      consultation_price: l.price,
      verification_status: 'verified' as const,
      profiles: {
        full_name: l.name,
        email: `${l.name.split(',')[0].toLowerCase().replace(/\s+/g, '.')}@lawyer.finpro.id`,
        status: 'active',
        avatar_url: l.image
      }
    })),
    supportTickets: data.clients.slice(0, 12).map((c, index) => ({
      id: `ticket-${index + 1}`,
      user_id: c.id,
      subject: ['Refund request', 'Reschedule consultation', 'Document upload issue', 'Payment verification'][index % 4],
      message: `Permintaan bantuan dari ${c.fullName} terkait konsultasi dan pembayaran.`,
      status: index % 3 === 0 ? 'open' : 'resolved',
      priority: index % 2 === 0 ? 'high' : 'normal',
      created_at: c.registeredAt,
      updated_at: c.registeredAt,
      profiles: { full_name: c.fullName, email: c.email, role: 'client' }
    }))
  };
}

export function getAiUsageStats() {
  return getPlatformDataset().analytics.aiUsage;
}

export function getPlatformReviews(limit = 50) {
  return getPlatformDataset().reviews.slice(0, limit);
}

export function mapPlatformFileToDocumentRow(file: PlatformFile) {
  return {
    id: file.id,
    owner_id: file.uploadedBy,
    consultation_id: file.entityType === 'consultation' ? file.entityId : null,
    name: file.originalName,
    file_url: file.publicUrl,
    file_type: file.mimeType,
    file_size: file.fileSize,
    visibility: file.entityType === 'consultation' ? 'shared' : 'private',
    created_at: file.createdAt
  };
}

export function getClientDocuments(userId: string) {
  return getFilesForUser(userId, 'client').map(mapPlatformFileToDocumentRow);
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize))
  };
}

export type { PlatformReview, PlatformTransaction, PlatformCategory };
