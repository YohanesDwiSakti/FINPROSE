import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  Gavel,
  History,
  Loader2,
  LogOut,
  RefreshCcw,
  Search,
  ShieldCheck,
  TicketCheck,
  UserCheck,
  Users
} from 'lucide-react';
import { ActionModal } from './ActionModal';
import {
  fetchAdminClients,
  fetchAdminConsultations,
  fetchAdminPendingLawyers,
  fetchAdminSupportTickets,
  fetchAdminTransactions,
  rejectLawyerAccount,
  replySupportTicket,
  updateAdminPaymentStatus,
  updateClientAccountStatus,
  updateSupportTicketStatus,
  verifyLawyerAccount,
  type AdminClientRow,
  type AdminConsultationRow,
  type AdminSupportTicketRow,
  type AdminTransactionRow,
  type PendingLawyerRow
} from '../api';

type AdminTab = 'overview' | 'lawyers' | 'payments' | 'cases' | 'history' | 'clients' | 'support';

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
});

const shortDate = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
});

const tabItems: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'lawyers', label: 'Lawyers', icon: ShieldCheck },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'cases', label: 'Cases', icon: Gavel },
  { id: 'history', label: 'History', icon: History },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'support', label: 'Support', icon: AlertCircle }
];

const statusTone: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  pending_verification: 'bg-amber-50 text-amber-700 border-amber-100',
  ongoing: 'bg-blue-50 text-blue-700 border-blue-100',
  open: 'bg-red-50 text-red-700 border-red-100',
  failed: 'bg-red-50 text-red-700 border-red-100',
  rejected: 'bg-red-50 text-red-700 border-red-100',
  blocked: 'bg-red-50 text-red-700 border-red-100',
  suspended: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  refunded: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  expired: 'bg-zinc-100 text-zinc-700 border-zinc-200'
};

function Pill({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${statusTone[value] || 'bg-zinc-50 text-zinc-600 border-zinc-100'}`}>
      {value.replace('_', ' ')}
    </span>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-brand-gray-200 bg-brand-gray-50 p-8 text-center">
      <p className="text-sm font-bold text-brand-black">{title}</p>
      <p className="mt-2 text-xs font-medium leading-6 text-brand-gray-500">{detail}</p>
    </div>
  );
}

const isHistoryStatus = (status: string) => status === 'completed' || status === 'cancelled';

export const AdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);
  const [pendingLawyers, setPendingLawyers] = useState<PendingLawyerRow[]>([]);
  const [transactions, setTransactions] = useState<AdminTransactionRow[]>([]);
  const [clients, setClients] = useState<AdminClientRow[]>([]);
  const [tickets, setTickets] = useState<AdminSupportTicketRow[]>([]);
  const [consultations, setConsultations] = useState<AdminConsultationRow[]>([]);
  const [loadError, setLoadError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [supportReply, setSupportReply] = useState<{ ticketId: string; subject: string; response: string } | null>(null);
  const [caseFilter, setCaseFilter] = useState<'all' | 'pending' | 'paid' | 'ongoing' | 'in_review' | 'expired'>('all');

  const openAction = (title: string, description: string) => setModal({ title, description });

  const refreshAdminData = async () => {
    setIsRefreshing(true);
    setLoadError('');
    try {
      const [lawyerRows, transactionRows, clientRows, ticketRows, consultationRows] = await Promise.all([
        fetchAdminPendingLawyers(),
        fetchAdminTransactions(),
        fetchAdminClients(),
        fetchAdminSupportTickets(),
        fetchAdminConsultations()
      ]);

      setPendingLawyers(lawyerRows);
      setTransactions(transactionRows);
      setClients(clientRows);
      setTickets(ticketRows);
      setConsultations(consultationRows);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat data admin');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAdminData();
  }, []);

  const stats = useMemo(() => {
    const paidPayments = transactions.filter(item => item.status === 'paid');
    const openTickets = tickets.filter(item => item.status !== 'resolved').length;
    const paidRevenue = paidPayments.reduce((total, item) => total + Number(item.total_amount || 0), 0);
    const platformFees = paidPayments.reduce((total, item) => total + Number(item.platform_fee || 0), 0);
    const casesNeedingOps = consultations.filter(item => !isHistoryStatus(item.status)).length;
    const historyCount = consultations.filter(item => isHistoryStatus(item.status)).length;

    return [
      { label: 'Paid Revenue', value: currency.format(paidRevenue), hint: `${paidPayments.length} paid payments`, icon: CircleDollarSign },
      { label: 'Platform Fees', value: currency.format(platformFees), hint: 'from paid payments', icon: CreditCard },
      { label: 'Pending Lawyers', value: String(pendingLawyers.filter(item => item.verification_status === 'pending').length), hint: 'need verification', icon: ShieldCheck },
      { label: 'Open Support', value: String(openTickets), hint: 'tickets need response', icon: TicketCheck },
      { label: 'Client Accounts', value: String(clients.length), hint: 'registered clients', icon: Users },
      { label: 'Case Watchlist', value: String(casesNeedingOps), hint: 'not finished yet', icon: Gavel },
      { label: 'Case History', value: String(historyCount), hint: 'completed/cancelled', icon: History }
    ];
  }, [clients.length, consultations, pendingLawyers, tickets, transactions]);

  const filteredClients = clients.filter(item => {
    const text = `${item.full_name} ${item.email} ${item.status}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const filteredTransactions = transactions.filter(item => {
    const text = `${item.external_reference || item.id} ${item.profiles?.full_name || ''} ${item.app_consultations?.lawyer_directory?.name || ''} ${item.status}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const activeConsultations = consultations.filter(item => !isHistoryStatus(item.status));
  const historyConsultations = consultations.filter(item => isHistoryStatus(item.status));
  const filteredConsultations = activeConsultations.filter(item => caseFilter === 'all' || item.status === caseFilter);

  const handleVerifyLawyer = async (id: string, name: string) => {
    try {
      await verifyLawyerAccount(id);
      await refreshAdminData();
      openAction(`Verifikasi ${name}`, 'Advokat sudah aktif dan profilnya masuk ke direktori publik FINPROSE.');
    } catch (error) {
      openAction('Verifikasi Gagal', error instanceof Error ? error.message : 'Gagal memverifikasi advokat.');
    }
  };

  const handleRejectLawyer = async (id: string, name: string) => {
    try {
      await rejectLawyerAccount(id);
      await refreshAdminData();
      openAction(`Tolak ${name}`, 'Akun advokat ditandai suspended dan status verifikasi menjadi rejected.');
    } catch (error) {
      openAction('Penolakan Gagal', error instanceof Error ? error.message : 'Gagal menolak advokat.');
    }
  };

  const handleTicketStatus = async (id: string, status: string) => {
    try {
      await updateSupportTicketStatus(id, status);
      await refreshAdminData();
      openAction('Tiket Diperbarui', `Status tiket sekarang ${status}.`);
    } catch (error) {
      openAction('Update Tiket Gagal', error instanceof Error ? error.message : 'Gagal memperbarui tiket.');
    }
  };

  const handleSupportReply = async () => {
    if (!supportReply?.response.trim()) return;
    try {
      await replySupportTicket(supportReply.ticketId, supportReply.response);
      setSupportReply(null);
      await refreshAdminData();
      openAction('Balasan Terkirim', 'Tiket ditandai selesai dan balasan admin tersimpan di riwayat tiket.');
    } catch (error) {
      openAction('Balasan Gagal', error instanceof Error ? error.message : 'Gagal mengirim balasan tiket.');
    }
  };

  const handlePaymentStatus = async (id: string, status: 'pending' | 'paid' | 'failed' | 'refunded' | 'expired') => {
    try {
      await updateAdminPaymentStatus(id, status);
      await refreshAdminData();
      openAction('Status Pembayaran Diperbarui', `Pembayaran sekarang berstatus ${status}. Status konsultasi ikut disinkronkan bila relevan.`);
    } catch (error) {
      openAction('Update Pembayaran Gagal', error instanceof Error ? error.message : 'Gagal memperbarui pembayaran.');
    }
  };

  const handleClientStatus = async (id: string, status: 'active' | 'blocked' | 'suspended') => {
    try {
      await updateClientAccountStatus(id, status);
      await refreshAdminData();
      openAction('Status Klien Diperbarui', `Akun klien sekarang berstatus ${status}.`);
    } catch (error) {
      openAction('Update Klien Gagal', error instanceof Error ? error.message : 'Gagal memperbarui status klien.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f4ef] font-sans text-brand-black">
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      {supportReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl">
            <h3 className="font-display text-2xl font-bold">Balas Tiket Support</h3>
            <p className="mt-2 text-sm font-medium text-brand-gray-500">{supportReply.subject}</p>
            <textarea
              value={supportReply.response}
              onChange={event => setSupportReply({ ...supportReply, response: event.target.value })}
              className="mt-5 h-36 w-full rounded-lg border border-brand-gray-200 p-4 text-sm font-medium outline-none focus:border-brand-black"
              placeholder="Tulis jawaban admin untuk user..."
            />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setSupportReply(null)} className="rounded-lg border border-brand-gray-200 px-4 py-3 text-[10px] font-bold uppercase tracking-widest">
                Batal
              </button>
              <button onClick={handleSupportReply} className="rounded-lg bg-brand-black px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white">
                Kirim & Selesaikan
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-black/10 bg-[#121212] p-6 text-white">
        <div className="border-b border-white/10 pb-6">
          <p className="font-display text-2xl font-bold italic tracking-tighter">FINPROSE</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Ops Console</p>
        </div>

        <nav className="mt-8 flex-1 space-y-1">
          {tabItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${activeTab === item.id ? 'bg-white text-brand-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <button onClick={onLogout} className="flex items-center gap-3 border-t border-white/10 pt-6 text-left text-[10px] font-bold uppercase tracking-widest text-red-300 hover:text-red-200">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>

      <main className="ml-72 px-8 py-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gray-500">Admin workspace</p>
            <h1 className="mt-2 font-display text-5xl font-bold tracking-tight">Operations Console</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-brand-gray-600">
              Fokus ke hal yang benar-benar perlu disentuh admin: verifikasi advokat, transaksi, konsultasi bermasalah, klien, dan tiket support.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex min-w-72 items-center gap-3 rounded-lg border border-black/10 bg-white px-4 py-3">
              <Search className="h-4 w-4 text-brand-gray-400" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Cari klien, transaksi, status..."
                className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-brand-gray-400"
              />
            </div>
            <button onClick={refreshAdminData} className="inline-flex items-center gap-2 rounded-lg bg-brand-black px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-zinc-800">
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </header>

        {loadError && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            Data live gagal dimuat: {loadError}
          </div>
        )}

        {activeTab === 'overview' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-black/10 bg-white p-4 md:grid-cols-4">
              {[
                { icon: ShieldCheck, title: '1. Verifikasi lawyer', detail: `${pendingLawyers.filter(item => item.verification_status === 'pending').length} akun menunggu keputusan.`, tab: 'lawyers' as AdminTab },
                { icon: CreditCard, title: '2. Pantau pembayaran', detail: `${transactions.filter(item => item.status !== 'paid').length} transaksi belum paid.`, tab: 'payments' as AdminTab },
                { icon: Gavel, title: '3. Cek kasus aktif', detail: `${activeConsultations.length} konsultasi belum selesai.`, tab: 'cases' as AdminTab },
                { icon: History, title: '4. Lihat history', detail: `${historyConsultations.length} konsultasi selesai/dibatalkan.`, tab: 'history' as AdminTab },
                { icon: AlertCircle, title: '5. Selesaikan support', detail: `${tickets.filter(item => item.status !== 'resolved').length} tiket masih terbuka.`, tab: 'support' as AdminTab }
              ].map(item => (
                <button
                  key={item.title}
                  onClick={() => setActiveTab(item.tab)}
                  className="group rounded-lg border border-brand-gray-100 bg-brand-gray-50 p-4 text-left transition-all hover:border-brand-black hover:bg-white"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="rounded-lg bg-white p-3 group-hover:bg-brand-black group-hover:text-white">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Buka</span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-black">{item.title}</p>
                  <p className="mt-2 min-h-10 text-xs font-medium leading-5 text-brand-gray-500">{item.detail}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stats.map(stat => (
                <div key={stat.label} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <stat.icon className="h-5 w-5 text-brand-gray-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">{stat.hint}</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-500">{stat.label}</p>
                  <p className="mt-2 font-display text-3xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-lg border border-black/10 bg-white p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold">Payment Watchlist</h2>
                  <CreditCard className="h-5 w-5 text-brand-gray-400" />
                </div>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-brand-gray-100 p-4">
                      <div>
                        <p className="text-sm font-bold">{item.profiles?.full_name || 'Klien FINPROSE'}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">{item.external_reference || item.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{currency.format(item.total_amount)}</p>
                        <div className="mt-2"><Pill value={item.status} /></div>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && <EmptyState title="Belum ada transaksi" detail="Begitu pembayaran dibuat, daftar operasional akan muncul di sini." />}
                </div>
              </div>

              <div className="rounded-lg border border-black/10 bg-white p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold">Support Queue</h2>
                  <AlertCircle className="h-5 w-5 text-brand-gray-400" />
                </div>
                <div className="space-y-3">
                  {tickets.slice(0, 5).map(item => (
                    <div key={item.id} className="rounded-lg border border-brand-gray-100 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold">{item.subject}</p>
                          <p className="mt-1 text-xs text-brand-gray-500">{item.profiles?.full_name || 'User'} • {shortDate.format(new Date(item.created_at))}</p>
                        </div>
                        <Pill value={item.status} />
                      </div>
                    </div>
                  ))}
                  {tickets.length === 0 && <EmptyState title="Support queue kosong" detail="Tabel support_tickets sudah ada; tiket baru akan masuk ke sini." />}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'lawyers' && (
          <section className="rounded-lg border border-black/10 bg-white">
            <div className="flex items-center justify-between border-b border-brand-gray-100 p-6">
              <div>
                <h2 className="font-display text-2xl font-bold">Lawyer Verification</h2>
                <p className="mt-1 text-xs font-medium text-brand-gray-500">Approve advokat valid, reject yang dokumennya belum layak.</p>
              </div>
              <Pill value={`${pendingLawyers.length} records`} />
            </div>
            <div className="divide-y divide-brand-gray-100">
              {pendingLawyers.map(item => (
                <div key={item.user_id} className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
                  <div>
                    <p className="text-sm font-bold">{item.profiles?.full_name || 'Advokat Baru'}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">{item.profiles?.email || 'Email belum tersedia'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{item.specialty || 'Belum diisi'}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">{currency.format(item.consultation_price || 0)} • {item.experience_years || 0} tahun</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill value={item.verification_status} />
                    <button onClick={() => handleVerifyLawyer(item.user_id, item.profiles?.full_name || 'Advokat')} className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-700 hover:bg-emerald-600 hover:text-white" title="Verifikasi">
                      <UserCheck className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRejectLawyer(item.user_id, item.profiles?.full_name || 'Advokat')} className="rounded-lg border border-red-100 bg-red-50 p-3 text-red-700 hover:bg-red-600 hover:text-white" title="Tolak">
                      <Ban className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {pendingLawyers.length === 0 && <div className="p-6"><EmptyState title="Tidak ada advokat pending" detail="Bagus. Artinya queue verifikasi sedang bersih." /></div>}
            </div>
          </section>
        )}

        {activeTab === 'payments' && (
          <section className="rounded-lg border border-black/10 bg-white">
            <div className="flex items-center justify-between border-b border-brand-gray-100 p-6">
              <h2 className="font-display text-2xl font-bold">Payments</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Aksi: sync paid / gagal / refund</p>
            </div>
            <div className="divide-y divide-brand-gray-100">
              {filteredTransactions.map(item => (
                <div key={item.id} className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-center">
                  <div>
                    <p className="text-sm font-bold">{item.profiles?.full_name || 'Klien FINPROSE'}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">{item.external_reference || item.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{item.app_consultations?.lawyer_directory?.name || 'Advokat FINPROSE'}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">{item.method} • {shortDate.format(new Date(item.created_at))}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{currency.format(item.total_amount)}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">Fee platform {currency.format(item.platform_fee || 0)}</p>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <Pill value={item.status} />
                    {item.status !== 'paid' && (
                      <button onClick={() => handlePaymentStatus(item.id, 'paid')} className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700 hover:bg-emerald-600 hover:text-white">
                        Tandai Paid
                      </button>
                    )}
                    {item.status !== 'refunded' && (
                      <button onClick={() => handlePaymentStatus(item.id, 'refunded')} className="rounded-lg bg-zinc-100 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-700 hover:text-white">
                        Refund
                      </button>
                    )}
                    {item.status !== 'failed' && (
                      <button onClick={() => handlePaymentStatus(item.id, 'failed')} className="rounded-lg bg-red-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-700 hover:bg-red-600 hover:text-white">
                        Gagal
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && <div className="p-6"><EmptyState title="Tidak ada transaksi cocok" detail="Coba ubah pencarian atau refresh data pembayaran." /></div>}
            </div>
          </section>
        )}

        {activeTab === 'cases' && (
          <section className="rounded-lg border border-black/10 bg-white">
            <div className="border-b border-brand-gray-100 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold">Case Operations</h2>
                  <p className="mt-1 text-xs font-medium text-brand-gray-500">Pantau konsultasi yang belum selesai: pending payment, paid, ongoing, in review, atau expired.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['all', 'Semua'],
                    ['pending', 'Pending Payment'],
                    ['paid', 'Paid'],
                    ['ongoing', 'Ongoing'],
                    ['in_review', 'In Review'],
                    ['expired', 'Expired']
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setCaseFilter(id as typeof caseFilter)}
                      className={`rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${caseFilter === id ? 'bg-brand-black text-white' : 'border border-brand-gray-200 text-brand-gray-500 hover:bg-brand-gray-50'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="divide-y divide-brand-gray-100">
              {filteredConsultations.map(item => (
                <div key={item.id} className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-center">
                  <div>
                    <p className="text-sm font-bold">{item.profiles?.full_name || 'Klien FINPROSE'}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">{item.profiles?.email || 'Email tidak tersedia'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{item.lawyer_directory?.name || 'Advokat FINPROSE'}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">{item.consultation_type} • {item.scheduled_day || 'Belum dijadwalkan'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{currency.format(item.price)}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">{shortDate.format(new Date(item.created_at))}</p>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <Pill value={item.status} />
                    <button onClick={() => openAction(`Case ${item.id.slice(0, 8)}`, item.notes || 'Tidak ada catatan tambahan.')} className="rounded-lg border border-brand-gray-200 p-3 hover:bg-brand-gray-50" title="Detail">
                      <FileText className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredConsultations.length === 0 && <div className="p-6"><EmptyState title="Tidak ada konsultasi cocok" detail="Ubah filter untuk melihat status konsultasi lainnya." /></div>}
            </div>
          </section>
        )}

        {activeTab === 'history' && (
          <section className="rounded-lg border border-black/10 bg-white">
            <div className="border-b border-brand-gray-100 p-6">
              <h2 className="font-display text-2xl font-bold">Case History</h2>
              <p className="mt-1 text-xs font-medium text-brand-gray-500">Arsip final admin. Hanya konsultasi dengan status completed atau cancelled.</p>
            </div>
            <div className="divide-y divide-brand-gray-100">
              {historyConsultations.map(item => (
                <div key={item.id} className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-center">
                  <div>
                    <p className="text-sm font-bold">{item.profiles?.full_name || 'Klien FINPROSE'}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">{item.profiles?.email || 'Email tidak tersedia'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{item.lawyer_directory?.name || 'Advokat FINPROSE'}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">{item.consultation_type} â€¢ {item.scheduled_day || 'Belum dijadwalkan'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{currency.format(item.price)}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">{shortDate.format(new Date(item.created_at))}</p>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <Pill value={item.status} />
                    <button onClick={() => openAction(`History ${item.id.slice(0, 8)}`, item.notes || 'Konsultasi ini sudah masuk arsip final.')} className="rounded-lg border border-brand-gray-200 p-3 hover:bg-brand-gray-50" title="Detail">
                      <FileText className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {historyConsultations.length === 0 && <div className="p-6"><EmptyState title="History masih kosong" detail="Kasus baru masuk ke sini setelah statusnya completed atau cancelled." /></div>}
            </div>
          </section>
        )}

        {activeTab === 'clients' && (
          <section className="rounded-lg border border-black/10 bg-white">
            <div className="border-b border-brand-gray-100 p-6">
              <h2 className="font-display text-2xl font-bold">Client Accounts</h2>
              <p className="mt-1 text-xs font-medium text-brand-gray-500">Cari klien, cek status akun, dan lakukan suspend/block saat dibutuhkan.</p>
            </div>
            <div className="divide-y divide-brand-gray-100">
              {filteredClients.map(item => (
                <div key={item.id} className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
                  <div>
                    <p className="text-sm font-bold">{item.full_name}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">{item.email} {item.phone ? `• ${item.phone}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-gray-400">Joined</p>
                    <p className="mt-1 text-sm font-bold">{shortDate.format(new Date(item.created_at))}</p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Pill value={item.status} />
                    {item.status !== 'active' && (
                      <button onClick={() => handleClientStatus(item.id, 'active')} className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-700" title="Aktifkan">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleClientStatus(item.id, item.status === 'blocked' ? 'active' : 'blocked')} className="rounded-lg border border-red-100 bg-red-50 p-3 text-red-700" title="Block/unblock">
                      <Ban className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredClients.length === 0 && <div className="p-6"><EmptyState title="Klien tidak ditemukan" detail="Data klien diambil dari profiles dengan role client." /></div>}
            </div>
          </section>
        )}

        {activeTab === 'support' && (
          <section className="rounded-lg border border-black/10 bg-white">
            <div className="border-b border-brand-gray-100 p-6">
              <h2 className="font-display text-2xl font-bold">Support Tickets</h2>
              <p className="mt-1 text-xs font-medium text-brand-gray-500">Queue ini memakai tabel support_tickets yang sudah ada di Supabase.</p>
            </div>
            <div className="divide-y divide-brand-gray-100">
              {tickets.map(item => (
                <div key={item.id} className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-[1.1fr_1.4fr_auto] xl:items-center">
                  <div>
                    <p className="text-sm font-bold">{item.profiles?.full_name || 'User FINPROSE'}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">{item.profiles?.email || 'Email tidak tersedia'} • {item.priority}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{item.subject}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-6 text-brand-gray-500">{item.message}</p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Pill value={item.status} />
                    <button onClick={() => setSupportReply({ ticketId: item.id, subject: item.subject, response: '' })} className="rounded-lg border border-brand-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-gray-50">
                      Balas
                    </button>
                    <button onClick={() => handleTicketStatus(item.id, item.status === 'resolved' ? 'open' : 'resolved')} className="rounded-lg bg-brand-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
                      {item.status === 'resolved' ? 'Reopen' : 'Resolve'}
                    </button>
                  </div>
                </div>
              ))}
              {tickets.length === 0 && <div className="p-6"><EmptyState title="Belum ada tiket support" detail="Begitu user membuat tiket, admin bisa resolve/reopen dari sini." /></div>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
