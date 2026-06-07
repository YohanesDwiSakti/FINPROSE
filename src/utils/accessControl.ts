import type { ConsultationRow, StoredUser } from '../api';
import { canAccessConsultationSession, getStoredUser } from '../api';

export type ClientFeature =
  | 'rusdi-ai'
  | 'case-analysis'
  | 'lawyer-recommendation'
  | 'lawyer-search'
  | 'lawyer-profiles'
  | 'consultation-booking'
  | 'public-legal-info'
  | 'help'
  | 'profile-settings'
  | 'case-history'
  | 'lawyer-chat'
  | 'meeting-room'
  | 'consultation-documents'
  | 'consultation-review';

export type AppView =
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'otp'
  | 'lawyer-dash'
  | 'client-dash'
  | 'admin-dash'
  | 'lawyer-list'
  | 'lawyer-detail'
  | 'booking'
  | 'payment'
  | 'chat'
  | 'meeting'
  | 'case-history'
  | 'document-vault'
  | 'review'
  | 'help'
  | 'profile-settings'
  | 'lawyer-profile-settings'
  | 'rusdi-chat';

const FREE_AUTHENTICATED_CLIENT_FEATURES: ClientFeature[] = [
  'rusdi-ai',
  'case-analysis',
  'lawyer-recommendation',
  'lawyer-search',
  'lawyer-profiles',
  'consultation-booking',
  'public-legal-info',
  'help',
  'profile-settings',
  'case-history'
];

const PAID_CONSULTATION_FEATURES: ClientFeature[] = [
  'lawyer-chat',
  'meeting-room',
  'consultation-documents',
  'consultation-review'
];

const VIEW_FEATURE_MAP: Partial<Record<AppView, ClientFeature>> = {
  'rusdi-chat': 'rusdi-ai',
  'lawyer-list': 'lawyer-search',
  'lawyer-detail': 'lawyer-profiles',
  booking: 'consultation-booking',
  payment: 'consultation-booking',
  chat: 'lawyer-chat',
  meeting: 'meeting-room',
  'document-vault': 'consultation-documents',
  review: 'consultation-review',
  help: 'public-legal-info',
  'profile-settings': 'profile-settings',
  'case-history': 'case-history'
};

const AUTH_REQUIRED_VIEWS: AppView[] = [
  'booking',
  'payment',
  'chat',
  'meeting',
  'admin-dash',
  'lawyer-dash',
  'client-dash',
  'profile-settings',
  'lawyer-profile-settings',
  'case-history',
  'document-vault',
  'review',
  'rusdi-chat',
  'help'
];

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('YDA LAW OFFICE & Partners_token') && !!getStoredUser();
}

export function requiresAuthentication(view: AppView): boolean {
  return AUTH_REQUIRED_VIEWS.includes(view);
}

export function isFreeClientFeature(feature: ClientFeature): boolean {
  return FREE_AUTHENTICATED_CLIENT_FEATURES.includes(feature);
}

export function isPaidConsultationFeature(feature: ClientFeature): boolean {
  return PAID_CONSULTATION_FEATURES.includes(feature);
}

export function hasAnyPaidConsultation(consultations: ConsultationRow[]): boolean {
  return consultations.some((row) => canAccessConsultationSession(row));
}

export function canAccessClientFeature(
  feature: ClientFeature,
  options: {
    user?: StoredUser | null;
    consultation?: ConsultationRow | null;
    consultations?: ConsultationRow[];
  } = {}
): boolean {
  const user = options.user ?? getStoredUser();
  if (!user) return false;

  if (user.role === 'admin' || user.role === 'lawyer') {
    return feature !== 'consultation-booking';
  }

  if (isFreeClientFeature(feature)) return true;

  if (isPaidConsultationFeature(feature)) {
    if (feature === 'consultation-documents') {
      return hasAnyPaidConsultation(options.consultations || []);
    }
    if (options.consultation) {
      return canAccessConsultationSession(options.consultation);
    }
    return false;
  }

  return false;
}

export function canAccessView(
  view: AppView,
  options: {
    user?: StoredUser | null;
    consultation?: ConsultationRow | null;
    consultations?: ConsultationRow[];
  } = {}
): { allowed: boolean; redirect?: AppView; reason?: string } {
  if (view === 'landing' || view === 'login' || view === 'register' || view === 'forgot-password' || view === 'otp') {
    return { allowed: true };
  }

  const user = options.user ?? getStoredUser();

  if (requiresAuthentication(view) && !user) {
    return { allowed: false, redirect: 'login', reason: 'Authentication required' };
  }

  if (view === 'lawyer-list' || view === 'lawyer-detail') {
    return { allowed: true };
  }

  if (user?.role === 'lawyer' && (view === 'chat' || view === 'meeting')) {
    return { allowed: true };
  }

  if (user?.role === 'admin') {
    return { allowed: true };
  }

  const feature = VIEW_FEATURE_MAP[view];
  if (!feature) {
    return { allowed: true };
  }

  if (canAccessClientFeature(feature, options)) {
    return { allowed: true };
  }

  if (isPaidConsultationFeature(feature)) {
    if (feature === 'consultation-documents') {
      return {
        allowed: false,
        redirect: 'client-dash',
        reason: 'Consultation documents require a paid consultation'
      };
    }
    return {
      allowed: false,
      redirect: 'payment',
      reason: 'Paid consultation required for direct lawyer interaction'
    };
  }

  return { allowed: false, redirect: 'login', reason: 'Access denied' };
}

export const CLIENT_WORKFLOW = [
  'Guest → Landing Page',
  'Register/Login → Client Dashboard',
  'Rusdi AI (Free) → Case Analysis → Lawyer Recommendation',
  'Lawyer Search → Consultation Booking → Invoice → Payment',
  'Consultation Activation → Lawyer Chat → Meeting Room → Documents'
] as const;
