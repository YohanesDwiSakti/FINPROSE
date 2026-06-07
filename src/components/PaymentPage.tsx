import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileUp,
  QrCode,
  Receipt,
  ShieldCheck,
  Smartphone,
  Upload,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConsultationType } from '../types';
import {
  createOrGetInvoice,
  downloadInvoicePdf,
  fetchClientPayments,
  fetchPaymentMethods,
  getStoredUser,
  uploadPaymentProof,
  type ClientPaymentRow,
  type InvoiceRow,
  type PaymentMethodConfig
} from '../api';

interface PaymentMethodOption {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
}

const consultationTypeLabel = (type?: string) => {
  if (type === ConsultationType.VIDEO) return 'Video call internal';
  if (type === ConsultationType.PHONE) return 'Telepon internal';
  return 'Chat internal';
};

const paymentStatusTone = (status: string) => {
  if (status === 'paid') return 'text-green-600';
  if (status === 'waiting_verification') return 'text-blue-600';
  if (status === 'waiting_payment' || status === 'pending') return 'text-amber-600';
  if (status === 'rejected') return 'text-red-600';
  return 'text-brand-gray-400';
};

const statusLabel = (status: string) => {
  if (status === 'waiting_payment') return 'Menunggu Pembayaran';
  if (status === 'waiting_verification') return 'Menunggu Verifikasi';
  if (status === 'paid') return 'Lunas';
  if (status === 'rejected') return 'Ditolak';
  if (status === 'expired') return 'Kedaluwarsa';
  return status;
};

const methodMap: Record<string, string> = {
  bank: 'bank_transfer',
  bank_transfer: 'bank_transfer',
  wallet: 'ewallet',
  ewallet: 'ewallet',
  qris: 'qris'
};

export const PaymentPage = ({
  bookingData,
  onBack,
  onPaymentVerified,
  onStartConsultation
}: {
  bookingData: any,
  onBack: () => void,
  onPaymentVerified?: () => void,
  onStartConsultation?: () => void
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMethod, setSelectedMethod] = useState('bank');
  const [selectedSubMethod, setSelectedSubMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [methodConfigs, setMethodConfigs] = useState<PaymentMethodConfig[]>([]);
  const [payments, setPayments] = useState<ClientPaymentRow[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<InvoiceRow | null>(null);

  const subtotal = Number(bookingData?.price || invoice?.consultationFee || 0);
  const adminFee = invoice?.adminFee ?? 5000;
  const taxAmount = invoice?.taxAmount ?? Math.floor(subtotal * 0.11);
  const totalAmount = invoice?.totalAmount ?? subtotal + adminFee + taxAmount;

  const methods: PaymentMethodOption[] = [
    { id: 'bank', name: 'Transfer Bank', icon: Building2, description: 'BCA, BNI, BRI, Mandiri' },
    { id: 'wallet', name: 'E-Wallet', icon: Smartphone, description: 'GoPay, OVO, DANA, ShopeePay' },
    { id: 'qris', name: 'QRIS', icon: QrCode, description: 'Scan QR demo (tanpa provider eksternal)' }
  ];

  const refreshPayments = async () => {
    const user = getStoredUser();
    if (!user?.id) return;
    const rows = await fetchClientPayments(user.id);
    setPayments(rows);
  };

  const loadInvoice = async (method?: string, subMethod?: string) => {
    const consultationId = bookingData?.consultationId || bookingData?.id;
    if (!consultationId) throw new Error('Konsultasi belum tersedia.');

    const data = await createOrGetInvoice({
      consultationId,
      amount: subtotal,
      method: method ? methodMap[method] || method : undefined,
      subMethod,
      action: method ? 'select-method' : 'create-invoice'
    });
    setInvoice(data);
    if (data.method === 'bank_transfer') setSelectedMethod('bank');
    else if (data.method === 'ewallet') setSelectedMethod('wallet');
    else if (data.method === 'qris') setSelectedMethod('qris');
    if (data.subMethod) setSelectedSubMethod(data.subMethod);
    return data;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        await refreshPayments();
        const configs = await fetchPaymentMethods();
        if (!mounted) return;
        setMethodConfigs(configs);
        await loadInvoice();
      } catch (error) {
        if (mounted) {
          setMessage(error instanceof Error ? error.message : 'Gagal memuat invoice.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const subMethodOptions = useMemo(() => {
    const apiMethod = methodMap[selectedMethod] || selectedMethod;
    return methodConfigs.filter(item => item.method_type === apiMethod);
  }, [methodConfigs, selectedMethod]);

  useEffect(() => {
    if (!selectedSubMethod && subMethodOptions.length > 0) {
      setSelectedSubMethod(subMethodOptions[0].provider_code);
    }
  }, [subMethodOptions, selectedSubMethod]);

  const handleSelectMethod = async (methodId: string) => {
    setSelectedMethod(methodId);
    setMessage('');
    const apiMethod = methodMap[methodId] || methodId;
    const options = methodConfigs.filter(item => item.method_type === apiMethod);
    const sub = options[0]?.provider_code || '';
    setSelectedSubMethod(sub);
    if (!sub && methodId !== 'qris') return;

    try {
      setIsProcessing(true);
      const data = await loadInvoice(methodId, sub || 'qris');
      setInvoice(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal memilih metode pembayaran.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectSubMethod = async (sub: string) => {
    setSelectedSubMethod(sub);
    setMessage('');
    try {
      setIsProcessing(true);
      const data = await loadInvoice(selectedMethod, sub);
      setInvoice(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal memperbarui instruksi pembayaran.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProofChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setMessage('Format bukti harus PNG, JPG, JPEG, atau PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Ukuran bukti maksimal 5MB.');
      return;
    }

    setProofFile(file);
    setMessage('');
    if (file.type.startsWith('image/')) {
      setProofPreview(URL.createObjectURL(file));
    } else {
      setProofPreview(null);
    }
  };

  const handleSubmitProof = async () => {
    if (!invoice?.id) {
      setMessage('Invoice belum tersedia.');
      return;
    }
    if (!proofFile) {
      setMessage('Unggah bukti pembayaran terlebih dahulu.');
      return;
    }

    try {
      setIsProcessing(true);
      setMessage('');
      const result = await uploadPaymentProof({ paymentId: invoice.id, file: proofFile });
      const paidInvoice = { ...result, status: 'paid' as const };
      setInvoice(paidInvoice);
      setSuccessModal(paidInvoice);
      onPaymentVerified?.();
      refreshPayments().catch(() => null);
      setProofFile(null);
      setProofPreview(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload bukti gagal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const instructions = invoice?.instructions;
  const displayPayments = useMemo(() => payments, [payments]);
  const canUploadProof = invoice && ['waiting_payment', 'rejected', 'pending'].includes(invoice.status);
  const awaitingVerification = invoice?.status === 'waiting_verification';

  return (
    <div className="min-h-screen bg-brand-gray-50 flex flex-col font-sans">
      {successModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-6 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[32px] border border-white/20 bg-white/70 p-8 shadow-[0_25px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-6 flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-700 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <button onClick={() => setSuccessModal(null)} className="rounded-full p-2 hover:bg-white/50">
                <X className="h-5 w-5 text-brand-gray-500" />
              </button>
            </div>
            <h3 className="text-2xl font-bold font-display text-brand-black">Payment Successful</h3>
            <p className="mt-2 text-sm text-brand-gray-600">
              Pembayaran terverifikasi otomatis. Fitur konsultasi langsung — chat advokat, meeting room, dan dokumen kasus — sudah aktif. Rusdi AI tetap gratis kapan saja.
            </p>
            <div className="mt-6 space-y-3 rounded-2xl bg-white/50 p-4 text-sm ring-1 ring-white/40">
              <div className="flex justify-between border-b border-brand-gray-100/80 pb-2">
                <span className="text-brand-gray-500">Invoice Number</span>
                <span className="font-bold text-brand-black">{successModal.invoiceNumber || successModal.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-b border-brand-gray-100/80 pb-2">
                <span className="text-brand-gray-500">Payment Method</span>
                <span className="font-bold uppercase text-brand-black">{successModal.method} {successModal.subMethod ? `• ${successModal.subMethod}` : ''}</span>
              </div>
              <div className="flex justify-between border-b border-brand-gray-100/80 pb-2">
                <span className="text-brand-gray-500">Amount</span>
                <span className="font-bold text-brand-black">Rp {Number(successModal.totalAmount || totalAmount).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between border-b border-brand-gray-100/80 pb-2">
                <span className="text-brand-gray-500">Submission Time</span>
                <span className="font-bold text-brand-black">{new Date(successModal.proofUploadedAt || Date.now()).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-brand-gray-500">Consultation Status</span>
                <span className="font-bold text-emerald-700">Activated</span>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => downloadInvoicePdf(successModal)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-brand-gray-200/80 bg-white/60 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-white/80"
              >
                <Download className="h-4 w-4" />
                Download Invoice
              </button>
              {onStartConsultation && (
                <button
                  onClick={() => {
                    setSuccessModal(null);
                    onStartConsultation();
                  }}
                  className="flex-1 rounded-2xl bg-brand-black py-4 text-[10px] font-bold uppercase tracking-widest text-white"
                >
                  Mulai Konsultasi
                </button>
              )}
              {!onStartConsultation && (
                <button
                  onClick={() => setSuccessModal(null)}
                  className="flex-1 rounded-2xl bg-brand-black py-4 text-[10px] font-bold uppercase tracking-widest text-white"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-brand-gray-100 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('common.back')}</span>
          </button>
          <h1 className="text-xl font-bold font-display">{t('payment.title')}</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 md:py-12 space-y-12">
        {isLoading ? (
          <div className="rounded-[40px] border border-brand-gray-100 bg-white p-12 text-center">
            <Clock className="mx-auto h-8 w-8 animate-spin text-brand-gray-300" />
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-brand-gray-400">{t('payment.processing')}</p>
          </div>
        ) : (
          <>
            {invoice && (
              <section className="rounded-[32px] border border-brand-gray-100 bg-white p-8 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Invoice</p>
                    <h2 className="mt-1 text-2xl font-bold font-display">{invoice.invoiceNumber}</h2>
                    <p className="mt-2 text-xs text-brand-gray-500">Ref: {invoice.paymentReference}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${paymentStatusTone(invoice.status)}`}>
                      {statusLabel(invoice.status)}
                    </p>
                    <p className="mt-2 text-xs text-brand-gray-500">
                      Jatuh tempo: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('id-ID') : '-'}
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-brand-gray-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Klien</p>
                    <p className="mt-1 text-sm font-bold">{invoice.clientName}</p>
                  </div>
                  <div className="rounded-2xl bg-brand-gray-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Advokat</p>
                    <p className="mt-1 text-sm font-bold">{invoice.lawyerName}</p>
                  </div>
                  <div className="rounded-2xl bg-brand-gray-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Konsultasi</p>
                    <p className="mt-1 text-sm font-bold">{invoice.consultationName}</p>
                  </div>
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-8">
                <section className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black px-2">1. {t('payment.selectMethod')}</h3>
                  <div className="space-y-3">
                    {methods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => handleSelectMethod(method.id)}
                        disabled={isProcessing || invoice?.status === 'paid'}
                        className={`w-full flex items-center p-6 rounded-3xl border transition-all text-left ${selectedMethod === method.id ? 'bg-white border-brand-black shadow-xl shadow-black/5 ring-1 ring-brand-black' : 'bg-white/50 border-brand-gray-100 hover:border-brand-gray-300'}`}
                      >
                        <div className={`p-4 rounded-2xl mr-6 transition-colors ${selectedMethod === method.id ? 'bg-brand-black text-white' : 'bg-brand-gray-50 text-brand-gray-400'}`}>
                          <method.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm mb-1">{method.name}</h4>
                          <p className="text-[10px] font-medium text-brand-gray-400 uppercase tracking-widest">{method.description}</p>
                        </div>
                        {selectedMethod === method.id && <CheckCircle2 className="w-5 h-5 text-brand-black" />}
                      </button>
                    ))}
                  </div>
                </section>

                {selectedMethod !== 'qris' && subMethodOptions.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black px-2">2. Pilih Provider</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {subMethodOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => handleSelectSubMethod(option.provider_code)}
                          disabled={isProcessing || invoice?.status === 'paid'}
                          className={`rounded-2xl border p-4 text-left transition-all ${selectedSubMethod === option.provider_code ? 'border-brand-black bg-white shadow-lg' : 'border-brand-gray-100 bg-white/70 hover:border-brand-gray-300'}`}
                        >
                          <p className="text-sm font-bold">{option.display_name}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-widest text-brand-gray-400">{option.provider_code}</p>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {instructions && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black px-2">3. Instruksi Pembayaran Manual</h3>
                    <div className="rounded-[32px] border border-brand-gray-100 bg-white p-8 space-y-4">
                      {instructions.type === 'bank_transfer' && (
                        <>
                          <Row label="Bank Name" value={instructions.bankName || '-'} />
                          <Row label="Account Holder Name" value={instructions.accountHolderName || '-'} />
                          <Row label="Account Number" value={instructions.accountNumber || '-'} />
                        </>
                      )}
                      {instructions.type === 'ewallet' && (
                        <>
                          <Row label="E-Wallet Name" value={instructions.walletName || '-'} />
                          <Row label="Account Name" value={instructions.accountName || '-'} />
                          <Row label="Phone / Account Number" value={instructions.phoneNumber || '-'} />
                        </>
                      )}
                      {instructions.type === 'qris' && (
                        <div className="flex flex-col items-center gap-4">
                          <img src={instructions.qrisImageUrl || '/qris-demo.svg'} alt="QRIS Demo" className="h-56 w-56 rounded-2xl border border-brand-gray-100 bg-white p-3" />
                          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                            QRIS demo — bukan koneksi provider nyata
                          </p>
                        </div>
                      )}
                      <Row label="Payment Amount" value={`Rp ${Number(instructions.amount).toLocaleString('id-ID')}`} />
                      <Row label="Payment Reference" value={instructions.paymentReference} />
                      <Row label="Invoice Number" value={instructions.invoiceNumber} />
                    </div>
                  </section>
                )}

                {(canUploadProof || awaitingVerification) && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black px-2">4. Upload Bukti Pembayaran</h3>
                    <div className="rounded-[32px] border border-brand-gray-100 bg-white p-8 space-y-6">
                      <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" className="hidden" onChange={handleProofChange} />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canUploadProof || isProcessing}
                        className="flex w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-brand-gray-100 bg-brand-gray-50/40 p-10 transition-all hover:border-brand-black disabled:opacity-50"
                      >
                        <Upload className="mb-3 h-8 w-8 text-brand-gray-300" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">PNG, JPG, JPEG, atau PDF (max 5MB)</p>
                        {proofFile && <p className="mt-3 text-xs font-bold text-brand-black">{proofFile.name}</p>}
                      </button>

                      {proofPreview && (
                        <img src={proofPreview} alt="Preview bukti" className="max-h-64 rounded-2xl border border-brand-gray-100 object-contain" />
                      )}

                      {invoice?.paymentProofUrl && (
                        <div className="rounded-2xl bg-brand-gray-50 p-4 text-sm">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Bukti Terunggah</p>
                          <a href={invoice.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 font-bold text-brand-black hover:underline">
                            <FileUp className="h-4 w-4" />
                            Lihat bukti pembayaran
                          </a>
                          {invoice.proofUploadedAt && (
                            <p className="mt-2 text-xs text-brand-gray-500">
                              Diunggah: {new Date(invoice.proofUploadedAt).toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                      )}

                      {canUploadProof && (
                        <button
                          disabled={isProcessing || !proofFile}
                          onClick={handleSubmitProof}
                          className="w-full rounded-2xl bg-brand-black py-5 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
                        >
                          {isProcessing ? t('payment.processing') : 'Kirim Bukti Pembayaran'}
                        </button>
                      )}

                      {awaitingVerification && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs font-medium text-blue-700">
                          Bukti pembayaran sudah dikirim. Status: <strong>Menunggu Verifikasi</strong>.
                        </div>
                      )}

                      {invoice?.status === 'paid' && (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-medium text-emerald-700">
                          Pembayaran berhasil. Chat advokat, meeting room, dan dokumen konsultasi sudah aktif. Rusdi AI tetap gratis kapan saja.
                        </div>
                      )}

                      {invoice?.status === 'rejected' && (
                        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-medium text-red-700">
                          Pembayaran ditolak. {invoice.rejectionReason || 'Silakan unggah bukti pembayaran yang valid.'}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                <section className="bg-white p-8 rounded-[40px] border border-brand-gray-100 flex items-start space-x-6">
                  <div className="p-4 bg-brand-gray-50 rounded-2xl">
                    <ShieldCheck className="w-6 h-6 text-brand-black" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold">{t('payment.securePayment')}</h4>
                    <p className="text-[10px] text-brand-gray-400 font-medium leading-relaxed uppercase tracking-wider">
                      Pembayaran diverifikasi otomatis setelah bukti diunggah. Admin tetap dapat override status kapan saja.
                    </p>
                  </div>
                </section>
              </div>

              <div className="lg:col-span-5">
                <div className="bg-white p-8 rounded-[40px] border border-brand-gray-100 shadow-2xl shadow-black/5 sticky top-32 space-y-8">
                  <div className="flex items-center justify-between border-b border-brand-gray-50 pb-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest">{t('payment.orderDetails')}</h3>
                    <Receipt className="w-4 h-4 text-brand-gray-300" />
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold mb-1">{t('consultation.legalConsultation')}</p>
                          <p className="text-[10px] text-brand-gray-400 font-medium uppercase tracking-widest">{t('consultation.oneSession')} via {consultationTypeLabel(bookingData?.type)}</p>
                        </div>
                        <p className="text-sm font-bold font-mono">Rp {subtotal.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">
                        <span>{t('payment.serviceFee')}</span>
                        <span>Rp {adminFee.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">
                        <span>{t('payment.tax')}</span>
                        <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    <div className="h-px bg-brand-gray-50"></div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold uppercase tracking-widest">{t('payment.grandTotal')}</span>
                      <span className="text-3xl font-bold font-display">Rp {totalAmount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {invoice && (
                    <button
                      onClick={() => downloadInvoicePdf(invoice)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-gray-200 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-gray-50"
                    >
                      <Download className="h-4 w-4" />
                      Download Invoice
                    </button>
                  )}

                  {invoice?.status === 'paid' && onStartConsultation && (
                    <button
                      onClick={onStartConsultation}
                      className="w-full btn-primary py-5 rounded-2xl flex items-center justify-center space-x-3 shadow-xl shadow-black/10"
                    >
                      <span className="text-xs font-bold uppercase tracking-widest">Masuk Sesi Konsultasi</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  {message && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-700">
                      {message}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-brand-gray-100 pb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black">{t('payment.recentTransactions')}</h3>
                <button onClick={() => refreshPayments().catch(() => null)} className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest hover:text-brand-black transition-colors">{t('payment.refresh')}</button>
              </div>

              <div className="bg-white rounded-[40px] border border-brand-gray-100 overflow-hidden shadow-sm">
                <div className="divide-y divide-brand-gray-50">
                  {displayPayments.map((tx) => {
                    const title = tx.app_consultations?.lawyer_directory?.specialty || `Konsultasi ${tx.app_consultations?.consultation_type || 'hukum'}`;
                    const date = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(tx.created_at));

                    return (
                      <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-brand-gray-50 transition-colors">
                        <div className="flex items-center space-x-6">
                          <div className="p-4 bg-brand-gray-50 rounded-2xl">
                            <Banknote className="w-5 h-5 text-brand-gray-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm mb-1">{title}</h4>
                            <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">
                              {tx.invoice_number || tx.external_reference || tx.id.slice(0, 8)} • {date}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center space-x-6">
                          <div>
                            <p className="text-sm font-bold font-mono">Rp {Number(tx.total_amount || 0).toLocaleString('id-ID')}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${paymentStatusTone(tx.status)}`}>{statusLabel(tx.status)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {displayPayments.length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-brand-gray-400">{t('payment.noTransactions')}</p>
                      <p className="mt-2 text-xs font-medium text-brand-gray-500">Invoice akan muncul setelah booking konsultasi.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-brand-gray-50 pb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">{label}</span>
      <span className="text-right text-sm font-bold">{value}</span>
    </div>
  );
}
