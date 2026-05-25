import { ConsultationType, Lawyer } from './types';

type WhatsAppPayload = {
  consultationId?: string;
  clientName?: string;
  lawyer?: Pick<Lawyer, 'name' | 'specialty' | 'whatsappNumber'> | null;
  lawyerName?: string;
  type?: string;
  day?: string;
  time?: string;
  notes?: string;
};

const normalizeWhatsAppNumber = (value?: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
};

export const consultationTypeLabel = (type?: string) => {
  if (type === ConsultationType.VIDEO) return 'Video call WhatsApp';
  if (type === ConsultationType.PHONE) return 'Telepon WhatsApp';
  return 'Chat WhatsApp';
};

export function buildWhatsAppConsultationUrl(payload: WhatsAppPayload) {
  const targetNumber = normalizeWhatsAppNumber(
    payload.lawyer?.whatsappNumber ||
    import.meta.env.VITE_FINPROSE_WHATSAPP_NUMBER
  );

  if (!targetNumber) return '';

  const message = [
    'Halo, saya ingin memulai konsultasi FINPROSE.',
    '',
    `ID Konsultasi: ${payload.consultationId || '-'}`,
    `Nama Klien: ${payload.clientName || '-'}`,
    `Advokat: ${payload.lawyer?.name || payload.lawyerName || '-'}`,
    `Bidang: ${payload.lawyer?.specialty || '-'}`,
    `Jenis: ${consultationTypeLabel(payload.type)}`,
    `Jadwal: ${payload.day || '-'} ${payload.time || ''}`.trim(),
    payload.notes ? `Catatan: ${payload.notes}` : '',
    '',
    'Pembayaran sudah saya selesaikan. Mohon dibantu untuk memulai konsultasi.'
  ].filter(Boolean).join('\n');

  return `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppConsultation(payload: WhatsAppPayload) {
  const url = buildWhatsAppConsultationUrl(payload);
  if (!url) return false;
  window.location.assign(url);
  return true;
}
