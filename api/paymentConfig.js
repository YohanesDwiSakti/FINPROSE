export const DEFAULT_PAYMENT_METHOD_CONFIGS = [
  { id: 'default-bca', method_type: 'bank_transfer', provider_code: 'bca', display_name: 'BCA', account_name: 'YDA LAW OFFICE & Partners', account_number: '1234567890', phone_number: null, is_active: true, sort_order: 1 },
  { id: 'default-bni', method_type: 'bank_transfer', provider_code: 'bni', display_name: 'BNI', account_name: 'YDA LAW OFFICE & Partners', account_number: '9876543210', phone_number: null, is_active: true, sort_order: 2 },
  { id: 'default-bri', method_type: 'bank_transfer', provider_code: 'bri', display_name: 'BRI', account_name: 'YDA LAW OFFICE & Partners', account_number: '5555666677', phone_number: null, is_active: true, sort_order: 3 },
  { id: 'default-mandiri', method_type: 'bank_transfer', provider_code: 'mandiri', display_name: 'Mandiri', account_name: 'YDA LAW OFFICE & Partners', account_number: '1122334455', phone_number: null, is_active: true, sort_order: 4 },
  { id: 'default-gopay', method_type: 'ewallet', provider_code: 'gopay', display_name: 'GoPay', account_name: 'YDA LAW OFFICE & Partners', account_number: '081234567890', phone_number: '081234567890', is_active: true, sort_order: 1 },
  { id: 'default-ovo', method_type: 'ewallet', provider_code: 'ovo', display_name: 'OVO', account_name: 'YDA LAW OFFICE & Partners', account_number: '081234567891', phone_number: '081234567891', is_active: true, sort_order: 2 },
  { id: 'default-dana', method_type: 'ewallet', provider_code: 'dana', display_name: 'DANA', account_name: 'YDA LAW OFFICE & Partners', account_number: '081234567892', phone_number: '081234567892', is_active: true, sort_order: 3 },
  { id: 'default-shopeepay', method_type: 'ewallet', provider_code: 'shopeepay', display_name: 'ShopeePay', account_name: 'YDA LAW OFFICE & Partners', account_number: '081234567893', phone_number: '081234567893', is_active: true, sort_order: 4 },
  { id: 'default-qris', method_type: 'qris', provider_code: 'qris', display_name: 'QRIS Demo', account_name: 'YDA LAW OFFICE & Partners', account_number: null, phone_number: null, is_active: true, sort_order: 1 }
];

export const PAYMENT_METHODS = {
  bank_transfer: {
    label: 'Transfer Bank',
    providers: ['bca', 'bni', 'bri', 'mandiri']
  },
  ewallet: {
    label: 'E-Wallet',
    providers: ['gopay', 'ovo', 'dana', 'shopeepay']
  },
  qris: {
    label: 'QRIS',
    providers: ['qris']
  }
};

export const ALLOWED_PROOF_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf'
];

export const INVOICE_DUE_DAYS = 3;

export function normalizePaymentMethod(method = '') {
  const value = String(method).trim().toLowerCase();
  if (['bank', 'bank_transfer', 'transfer'].includes(value)) return 'bank_transfer';
  if (['wallet', 'ewallet', 'e-wallet'].includes(value)) return 'ewallet';
  if (value === 'qris') return 'qris';
  return 'bank_transfer';
}

export function normalizeSubMethod(method, subMethod = '') {
  const value = String(subMethod).trim().toLowerCase();
  const allowed = PAYMENT_METHODS[normalizePaymentMethod(method)]?.providers || [];
  if (allowed.includes(value)) return value;
  return allowed[0] || value;
}

export function resolvePaymentStatus(status) {
  const value = String(status || 'pending').trim().toLowerCase();
  if (value === 'paid') return 'paid';
  if (value === 'failed' || value === 'rejected') return 'failed';
  if (value === 'refunded') return 'refunded';
  if (value === 'expired') return 'expired';
  // Legacy DB enum may only support pending/paid/failed/refunded/expired.
  if (value === 'waiting_payment' || value === 'waiting_verification') return 'pending';
  return 'pending';
}

export function paymentStatusLabel(status) {
  switch (status) {
    case 'waiting_payment': return 'Menunggu Pembayaran';
    case 'waiting_verification': return 'Menunggu Verifikasi';
    case 'paid': return 'Lunas';
    case 'rejected': return 'Ditolak';
    case 'expired': return 'Kedaluwarsa';
    case 'pending': return 'Pending';
    default: return status;
  }
}
