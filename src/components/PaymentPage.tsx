import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  QrCode,
  Receipt,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { ActionModal } from './ActionModal';
import { ConsultationType } from '../types';
import {
  confirmPaymentStatus,
  createPayment,
  fetchClientPayments,
  getStoredUser,
  type ClientPaymentRow
} from '../api';

type MidtransResult = {
  order_id?: string;
  transaction_status?: string;
  payment_type?: string;
};

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: {
        onSuccess?: (result: MidtransResult) => void;
        onPending?: (result: MidtransResult) => void;
        onError?: (result: MidtransResult) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
}

const loadMidtransSnap = (snapJsUrl: string, clientKey: string) => {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-finprose-midtrans="true"]');
    if (existing) {
      if (existing.dataset.clientKey === clientKey && window.snap) {
        resolve();
        return;
      }
      existing.remove();
    }

    const script = document.createElement('script');
    script.src = snapJsUrl;
    script.async = true;
    script.dataset.finproseMidtrans = 'true';
    script.dataset.clientKey = clientKey;
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap. Periksa koneksi internet atau Client Key.'));
    document.body.appendChild(script);
  });
};

const consultationTypeLabel = (type?: string) => {
  if (type === ConsultationType.VIDEO) return 'Video call internal';
  if (type === ConsultationType.PHONE) return 'Telepon internal';
  return 'Chat internal';
};

const paymentStatusTone = (status: string) => {
  if (status === 'paid') return 'text-green-600';
  if (status === 'pending') return 'text-amber-600';
  return 'text-red-600';
};

export const PaymentPage = ({
  bookingData,
  onBack,
  onSuccess
}: {
  bookingData: any,
  onBack: () => void,
  onSuccess: () => void
}) => {
  const [selectedMethod, setSelectedMethod] = useState('bank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);
  const [payments, setPayments] = useState<ClientPaymentRow[]>([]);

  const subtotal = Number(bookingData?.price || 0);
  const adminFee = 5000;
  const taxAmount = Math.floor(subtotal * 0.11);
  const totalAmount = subtotal + adminFee + taxAmount;

  const refreshPayments = async () => {
    const user = getStoredUser();
    if (!user?.id) return;
    const rows = await fetchClientPayments(user.id);
    setPayments(rows);
  };

  useEffect(() => {
    refreshPayments().catch(() => null);
  }, []);

  const displayPayments = useMemo(() => payments, [payments]);

  const methods: PaymentMethod[] = [
    { id: 'bank', name: 'Transfer Bank', icon: Building2, description: 'Virtual Account (BCA, Mandiri, BNI)' },
    { id: 'qris', name: 'QRIS', icon: QrCode, description: 'Scan via GoPay, OVO, Dana, LinkAja' },
    { id: 'wallet', name: 'E-Wallet', icon: Smartphone, description: 'Gopay, OVO, ShopeePay' },
    { id: 'credit_card', name: 'Kartu Kredit', icon: CreditCard, description: 'Visa, Mastercard, JCB dengan 3DS' }
  ];

  const handlePayment = async () => {
    setIsProcessing(true);
    setMessage('');

    try {
      const user = getStoredUser();
      const payment = await createPayment({
        consultationId: bookingData?.consultationId || bookingData?.id,
        clientId: user?.id || bookingData?.clientId,
        method: selectedMethod,
        amount: subtotal
      });

      if (!payment.snapToken || !payment.clientKey || !payment.snapJsUrl) {
        throw new Error('Konfigurasi Midtrans belum lengkap. Isi MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di Vercel.');
      }

      await loadMidtransSnap(payment.snapJsUrl, payment.clientKey);
      if (!window.snap) {
        throw new Error('Midtrans Snap belum siap. Coba lagi beberapa detik.');
      }

      window.snap.pay(payment.snapToken, {
        onSuccess: async (result) => {
          const orderId = result?.order_id || payment.externalReference;
          try {
            const confirmation = await confirmPaymentStatus(orderId);
            await refreshPayments().catch(() => null);
            setIsProcessing(false);

            if (confirmation.status === 'paid') {
              onSuccess();
              return;
            }

            setModal({
              title: 'Pembayaran Belum Settlement',
              description: `Midtrans mengembalikan status ${confirmation.status}. Sesi akan terbuka otomatis setelah status menjadi paid.`
            });
          } catch (error) {
            setIsProcessing(false);
            setModal({
              title: 'Konfirmasi Pembayaran Tertunda',
              description: error instanceof Error ? error.message : 'Pembayaran sukses di popup, tetapi status belum bisa diverifikasi ke Midtrans. Coba refresh atau cek lagi beberapa saat.'
            });
          }
        },
        onPending: () => {
          setIsProcessing(false);
          refreshPayments().catch(() => null);
          setModal({
            title: 'Menunggu Pembayaran',
            description: 'Invoice Midtrans sudah dibuat. Selesaikan transfer/QRIS/e-wallet sesuai instruksi agar sesi konsultasi aktif otomatis.'
          });
        },
        onError: () => {
          setIsProcessing(false);
          setMessage('Pembayaran gagal di Midtrans. Silakan pilih metode lain atau coba lagi.');
        },
        onClose: () => {
          setIsProcessing(false);
          setMessage('Popup pembayaran ditutup. Invoice masih bisa dibuat ulang dengan menekan Bayar Sekarang.');
        }
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Pembayaran gagal diproses');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-gray-50 flex flex-col font-sans">
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      <header className="bg-white border-b border-brand-gray-100 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <h1 className="text-xl font-bold font-display">Pembayaran</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 md:py-12 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black px-2">1. Pilih Metode Pembayaran</h3>
              <div className="space-y-3">
                {methods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
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

            <section className="bg-white p-8 rounded-[40px] border border-brand-gray-100 flex items-start space-x-6">
              <div className="p-4 bg-brand-gray-50 rounded-2xl">
                <ShieldCheck className="w-6 h-6 text-brand-black" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold">Pembayaran Aman & Terpercaya</h4>
                <p className="text-[10px] text-brand-gray-400 font-medium leading-relaxed uppercase tracking-wider">
                  Status sukses diverifikasi ulang ke Midtrans lewat backend sebelum sesi konsultasi dibuka.
                </p>
              </div>
            </section>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white p-8 rounded-[40px] border border-brand-gray-100 shadow-2xl shadow-black/5 sticky top-32 space-y-8">
              <div className="flex items-center justify-between border-b border-brand-gray-50 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest">Detail Pesanan</h3>
                <Receipt className="w-4 h-4 text-brand-gray-300" />
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold mb-1">Konsultasi Hukum</p>
                      <p className="text-[10px] text-brand-gray-400 font-medium uppercase tracking-widest">1 Sesi (60 Menit) via {consultationTypeLabel(bookingData?.type)}</p>
                    </div>
                    <p className="text-sm font-bold font-mono">Rp {subtotal.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">
                    <span>Biaya Layanan</span>
                    <span>Rp {adminFee.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">
                    <span>Pajak (PPN 11%)</span>
                    <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="h-px bg-brand-gray-50"></div>

                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold uppercase tracking-widest">Grand Total</span>
                  <span className="text-3xl font-bold font-display">Rp {totalAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <button
                disabled={isProcessing || !subtotal}
                onClick={handlePayment}
                className="w-full btn-primary py-5 rounded-2xl flex items-center justify-center space-x-3 shadow-xl shadow-black/10 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest">Memproses...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-bold uppercase tracking-widest">Bayar via Midtrans</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {message && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-700">
                  {message}
                </div>
              )}

              <p className="text-center text-[9px] font-medium text-brand-gray-400 uppercase tracking-[0.2em]">
                Dengan membayar, Anda menyetujui <span onClick={() => setModal({ title: 'Syarat & Ketentuan', description: 'Pembayaran dititipkan sampai sesi konsultasi selesai. Refund dapat diajukan jika advokat membatalkan sesi atau terjadi kendala teknis yang tervalidasi.' })} className="text-brand-black underline cursor-pointer">Syarat & Ketentuan</span> kami.
              </p>
            </div>
          </div>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-brand-gray-100 pb-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black">Riwayat Transaksi Terakhir</h3>
            <button onClick={() => refreshPayments().catch(() => null)} className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest hover:text-brand-black transition-colors">Refresh</button>
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
                        <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">{tx.method.replace('_', ' ')} - {date}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-6">
                      <div>
                        <p className="text-sm font-bold font-mono">Rp {Number(tx.total_amount || 0).toLocaleString('id-ID')}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${paymentStatusTone(tx.status)}`}>{tx.status}</p>
                      </div>
                      <button onClick={() => setModal({ title: `Invoice ${tx.external_reference || tx.id}`, description: `Invoice ${title} sebesar Rp ${Number(tx.total_amount || 0).toLocaleString('id-ID')} berstatus ${tx.status}.` })} className="p-2 hover:bg-brand-gray-100 rounded-full transition-colors text-brand-gray-400">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {displayPayments.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-gray-400">Belum ada transaksi live</p>
                  <p className="mt-2 text-xs font-medium text-brand-gray-500">Transaksi akan muncul setelah invoice Midtrans dibuat.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
