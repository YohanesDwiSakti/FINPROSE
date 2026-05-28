import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, FileText, Calendar, User, Settings, 
  Plus, Search, Bell, MoreHorizontal, 
  Sparkles, LogOut, DollarSign, Users, Clock, 
  MessageSquare, ChevronRight, ArrowUpRight, 
  Upload, CheckCircle2, FileCheck, Briefcase
} from 'lucide-react';
import { ActionModal } from './ActionModal';
import { fetchLawyerConsultations, getStoredUser, updateConsultationStatus, type ConsultationRow, type StoredUser } from '../api';

const getInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'AD';
};

// Mock Data
const CLIENTS = [
  { id: 'CL-1', name: 'Elena Rodriguez', case: 'Sengketa Tanah', status: 'Active', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { id: 'CL-2', name: 'Budi Santoso', case: 'Perceraian', status: 'In Review', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
  { id: 'CL-3', name: 'Dewi Lestari', case: 'Hukum Waris', status: 'Pending', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
];

const SCHEDULE = [
  { id: 'SC-1', time: '09:00 - 10:00', client: 'Elena Rodriguez', subject: 'Review Dokumen Sengketa', type: 'Video Call' },
  { id: 'SC-2', time: '13:00 - 14:00', client: 'Budi Santoso', subject: 'Konsultasi Lanjutan', type: 'Voice Call' },
  { id: 'SC-3', time: '16:00 - 17:00', client: 'Dewi Lestari', subject: 'Drafting Surat Kuasa', type: 'Video Call' },
];

const workStatusCopy: Record<string, { label: string; next: string; tone: string }> = {
  pending: {
    label: 'Perlu keputusan',
    next: 'Terima atau tolak booking agar klien tahu langkah berikutnya.',
    tone: 'bg-amber-50 text-amber-700'
  },
  paid: {
    label: 'Siap dimulai',
    next: 'Masuk ke chat atau meeting pada jadwal konsultasi.',
    tone: 'bg-emerald-50 text-emerald-700'
  },
  ongoing: {
    label: 'Sedang konsultasi',
    next: 'Balas chat, cek dokumen, lalu tandai selesai jika sudah tuntas.',
    tone: 'bg-zinc-900 text-white'
  },
  in_review: {
    label: 'Tulis legal opinion',
    next: 'Kirim ringkasan nasihat hukum atau dokumen lanjutan.',
    tone: 'bg-blue-50 text-blue-700'
  },
  completed: {
    label: 'Selesai',
    next: 'Kasus sudah selesai dan menunggu/menyimpan review.',
    tone: 'bg-zinc-100 text-zinc-600'
  },
  cancelled: {
    label: 'Dibatalkan',
    next: 'Tidak ada aksi kecuali admin meminta klarifikasi.',
    tone: 'bg-red-50 text-red-700'
  }
};

const formatConsultationDate = (item: ConsultationRow) => item.scheduled_day || new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
}).format(new Date(item.created_at));

const isHistoryStatus = (status: string) => status === 'completed' || status === 'cancelled';

const Sidebar = ({ onLogout, activeTab, setActiveTab, onViewProfile }: { onLogout: () => void, activeTab: string, setActiveTab: (t: string) => void, onViewProfile?: () => void }) => {
  const items = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'clients', icon: Users, label: 'Client' },
    { id: 'schedules', icon: Calendar, label: 'Jadwal' },
    { id: 'earnings', icon: DollarSign, label: 'Pendapatan' },
    { id: 'cases', icon: Briefcase, label: 'Riwayat' },
    { id: 'profile', icon: Settings, label: 'Profil', onClick: onViewProfile },
  ];

  return (
    <div className="w-64 bg-brand-gray-50 border-r border-brand-gray-200 flex flex-col p-8 fixed h-full z-20">
      <div className="text-2xl font-bold font-display mb-12 italic tracking-tighter">Raw Law <span className="text-brand-gray-300 text-xs align-top not-italic">ADV</span></div>
      
      <div className="flex-1 space-y-2">
        {items.map((item) => (
          <button 
            key={item.id}
            onClick={() => item.onClick ? item.onClick() : setActiveTab(item.id)}
            className={`flex items-center space-x-4 w-full p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-white shadow-sm font-bold text-brand-black border-l-4 border-brand-black' : 'text-brand-gray-400 hover:text-brand-black'}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] uppercase font-bold tracking-widest">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="pt-8 border-t border-brand-gray-200 space-y-4">
        <button onClick={onLogout} className="flex items-center space-x-4 w-full p-3 text-red-400 hover:text-red-500 transition-all">
          <LogOut className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Logout</span>
        </button>
      </div>
    </div>
  );
};

const Header = ({ user, onAction, onViewProfile }: { user: StoredUser, onAction: (title: string, description: string) => void, onViewProfile?: () => void }) => (
  <div className="ml-64 px-12 py-8 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-brand-gray-50">
    <div className="flex-1 max-w-xl relative">
      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-300" />
      <input 
        type="text" 
        placeholder="Cari client, kasus, atau dokumen..." 
        className="w-full bg-brand-gray-50 border border-brand-gray-100 p-4 pl-14 rounded-2xl outline-none focus:ring-1 focus:ring-brand-black text-sm"
      />
    </div>
    <div className="flex items-center space-x-8">
      <button onClick={() => onAction('Notifikasi Advokat', 'Panel ini akan menampilkan booking baru, dokumen klien, pesan belum dibaca, dan status pencairan.')} className="p-3 bg-brand-gray-50 rounded-2xl relative">
        <Bell className="w-5 h-5 text-brand-black" />
        <div className="absolute top-3 right-3 w-2 h-2 bg-brand-black border-2 border-white rounded-full"></div>
      </button>
      <div className="flex items-center space-x-4 pl-8 border-l border-brand-gray-100">
        <div className="text-right">
          <p className="text-sm font-bold">{user.name}</p>
          <p className="text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest">Advokat FINPROSE</p>
        </div>
        <button
          onClick={onViewProfile}
          className="w-12 h-12 rounded-2xl bg-brand-black text-white flex items-center justify-center font-display text-lg font-bold shadow-xl shadow-black/10 border-2 border-white"
          title="Profil Advokat"
        >
          {getInitials(user.name)}
        </button>
      </div>
    </div>
  </div>
);

export const LawyerDashboard = ({
  onLogout,
  onViewProfile,
  onOpenConsultation
}: {
  onLogout: () => void,
  onViewProfile?: () => void,
  onOpenConsultation?: (consultation: ConsultationRow) => void
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showOpinionModal, setShowOpinionModal] = useState(false);
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [loadError, setLoadError] = useState('');
  const openAction = (title: string, description: string) => setModal({ title, description });
  const user = getStoredUser() || {
    id: 'local-lawyer',
    name: 'Advokat FINPROSE',
    email: 'advokat@example.com',
    role: 'lawyer' as const,
    status: 'active'
  };

  useEffect(() => {
    if (!user.id || user.id === 'local-lawyer') return;

    let mounted = true;
    fetchLawyerConsultations(user.id)
      .then((rows) => {
        if (mounted) setConsultations(rows);
      })
      .catch((error) => {
        if (mounted) setLoadError(error.message || 'Gagal memuat konsultasi advokat');
      });

    return () => {
      mounted = false;
    };
  }, [user.id]);

  const dashboardStats = useMemo(() => {
    const paidPayments = consultations.flatMap(item => item.app_payments || []).filter(payment => payment.status === 'paid');
    const grossRevenue = paidPayments.reduce((total, payment) => total + (payment.total_amount || 0), 0);
    const activeCount = consultations.filter(item => ['paid', 'ongoing', 'in_review'].includes(item.status)).length;
    const pendingCount = consultations.filter(item => item.status === 'pending').length;
    const activeScheduleCount = consultations.filter(item => !isHistoryStatus(item.status)).length;

    return {
      revenue: grossRevenue,
      activeCount,
      pendingCount,
      scheduleCount: activeScheduleCount || (user.id === 'local-lawyer' ? SCHEDULE.length : 0)
    };
  }, [consultations, user.id]);

  const scheduleRows = useMemo(() => {
    if (consultations.length === 0) return user.id === 'local-lawyer' ? SCHEDULE : [];

    return consultations.filter(item => !isHistoryStatus(item.status)).slice(0, 5).map(item => ({
      id: item.id,
      time: `${item.scheduled_time || '-'} - 60m`,
      client: item.profiles?.full_name || 'Klien FINPROSE',
      subject: item.notes || `Konsultasi ${item.consultation_type}`,
      type: item.consultation_type === 'phone' ? 'Voice Call' : item.consultation_type === 'video' ? 'Video Call' : 'Chat',
      status: item.status
    }));
  }, [consultations, user.id]);

  const priorityRows = useMemo(() => {
    const orderedStatus = ['pending', 'paid', 'ongoing', 'in_review', 'completed', 'cancelled'];
    return [...consultations].sort((a, b) => orderedStatus.indexOf(a.status) - orderedStatus.indexOf(b.status));
  }, [consultations]);
  const activeWorkRows = useMemo(() => priorityRows.filter(item => !isHistoryStatus(item.status)), [priorityRows]);
  const historyRows = useMemo(() => priorityRows.filter(item => isHistoryStatus(item.status)), [priorityRows]);

  const lawyerPayments = useMemo(() => consultations.flatMap(item => (item.app_payments || []).map(payment => ({
    ...payment,
    client: item.profiles?.full_name || 'Klien FINPROSE'
  }))), [consultations]);

  const clientRows = useMemo(() => {
    if (consultations.length === 0 && user.id === 'local-lawyer') return CLIENTS;
    const seen = new Set<string>();
    return consultations
      .filter(item => item.client_id && !seen.has(item.client_id))
      .map(item => {
        seen.add(item.client_id || '');
        return {
          id: item.client_id || item.id,
          name: item.profiles?.full_name || 'Klien FINPROSE',
          case: item.notes || item.consultation_type,
          status: item.status,
          image: '/lawyer1.png'
        };
      });
  }, [consultations, user.id]);

  const refreshLawyerData = async () => {
    if (!user.id || user.id === 'local-lawyer') return;
    const rows = await fetchLawyerConsultations(user.id);
    setConsultations(rows);
  };

  const handleConsultationStatus = async (id: string, status: 'paid' | 'cancelled') => {
    try {
      await updateConsultationStatus(id, status, status === 'paid' ? 'Booking accepted by lawyer' : 'Booking rejected by lawyer');
      await refreshLawyerData();
      openAction(status === 'paid' ? 'Booking Diterima' : 'Booking Ditolak', status === 'paid' ? 'Konsultasi sudah siap dijalankan pada jadwal yang dipilih.' : 'Konsultasi dibatalkan dan perlu proses refund/admin jika sudah ada pembayaran.');
    } catch (error) {
      openAction('Status Gagal Diperbarui', error instanceof Error ? error.message : 'Status konsultasi gagal diperbarui.');
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-brand-black">
      <Sidebar onLogout={onLogout} activeTab={activeTab} setActiveTab={setActiveTab} onViewProfile={onViewProfile} />
      <Header user={user} onAction={openAction} onViewProfile={onViewProfile} />
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      
      <main className="ml-64 p-12 space-y-16 max-w-7xl animate-in fade-in duration-700">
        {activeTab === 'overview' && (
          <>
            <header className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-bold font-display tracking-tighter">Ringkasan Kerja.</h1>
              <div className="flex items-center space-x-4 text-[10px] font-bold text-brand-gray-400 uppercase tracking-[0.2em]">
                <span>{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span>
                <span className="w-1 h-1 bg-brand-gray-200 rounded-full"></span>
                <span className="text-brand-black">{dashboardStats.scheduleCount} Janji Temu</span>
                {loadError && <span className="text-amber-600 normal-case tracking-normal">{loadError}</span>}
              </div>
            </header>

            {user.status !== 'active' && (
              <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-sm font-bold text-amber-900">Akun advokat belum aktif penuh</p>
                    <p className="mt-2 max-w-3xl text-xs font-medium leading-6 text-amber-800">
                      Status akun Anda masih {user.status}. Lengkapi profil dan tunggu admin memverifikasi agar profil tampil di direktori publik dan klien tidak bingung saat booking.
                    </p>
                  </div>
                  <button onClick={onViewProfile} className="rounded-xl bg-amber-900 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white">
                    Lengkapi Profil
                  </button>
                </div>
              </div>
            )}

            <section className="grid grid-cols-1 gap-4 rounded-3xl border border-brand-gray-100 bg-brand-gray-50 p-5 md:grid-cols-4">
              {[
                { icon: CheckCircle2, title: '1. Terima booking', detail: `${dashboardStats.pendingCount} booking perlu keputusan.`, action: 'Lihat Jadwal', onClick: () => setActiveTab('schedules') },
                { icon: MessageSquare, title: '2. Balas klien', detail: 'Buka chat dari sesi aktif dan jawab pertanyaan utama.', action: 'Lihat Klien', onClick: () => setActiveTab('clients') },
                { icon: FileCheck, title: '3. Kirim dokumen', detail: 'Upload legal opinion atau catatan konsultasi.', action: 'Upload', onClick: () => setShowOpinionModal(true) },
                { icon: Briefcase, title: '4. Tutup kasus', detail: 'Tandai selesai setelah konsultasi dan dokumen tuntas.', action: 'Riwayat', onClick: () => setActiveTab('cases') }
              ].map(item => (
                <button key={item.title} onClick={item.onClick} className="group rounded-2xl border border-brand-gray-100 bg-white p-5 text-left transition-all hover:border-brand-black hover:shadow-lg hover:shadow-black/5">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="rounded-xl bg-brand-gray-50 p-3 group-hover:bg-brand-black group-hover:text-white">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-brand-gray-300 group-hover:text-brand-black" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-black">{item.title}</p>
                  <p className="mt-2 min-h-10 text-xs font-medium leading-5 text-brand-gray-500">{item.detail}</p>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-brand-black">{item.action}</p>
                </button>
              ))}
            </section>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-10 bg-brand-black text-white rounded-[48px] relative overflow-hidden shadow-2xl shadow-black/20">
                <div className="relative z-10 space-y-8">
                   <div className="p-3 bg-zinc-800 rounded-2xl w-fit">
                      <DollarSign className="w-6 h-6 text-zinc-400" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Pendapatan Bersih</p>
                      <h3 className="text-4xl font-bold font-display">Rp {dashboardStats.revenue.toLocaleString('id-ID')}</h3>
                      <p className="text-[10px] font-bold text-green-500 mt-2 uppercase tracking-widest">{lawyerPayments.filter(item => item.status === 'paid').length} pembayaran selesai</p>
                   </div>
                </div>
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-zinc-800/50 blur-[100px] rounded-full"></div>
              </div>

              <div className="p-10 bg-brand-gray-50 rounded-[48px] border border-brand-gray-100 flex flex-col justify-between">
                 <div className="flex justify-between items-start">
                    <div className="p-3 bg-white rounded-2xl shadow-sm">
                       <Clock className="w-6 h-6 text-brand-black" />
                    </div>
                    <span className="px-3 py-1 bg-white rounded-full text-[8px] font-bold uppercase tracking-widest border border-brand-gray-100">Live</span>
                 </div>
                 <div className="mt-8">
                    <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest mb-2">Jadwal Sesi Mendatang</p>
                    <h3 className="text-5xl font-bold font-display">{String(dashboardStats.scheduleCount).padStart(2, '0')}</h3>
                 </div>
              </div>

              <div onClick={() => openAction('Diskusi Aktif', 'Daftar diskusi aktif akan membuka chat klien yang sedang berjalan dan pesan yang belum dijawab.')} className="p-10 bg-brand-gray-50 rounded-[48px] border border-brand-gray-100 flex flex-col justify-between group cursor-pointer hover:bg-white transition-all">
                 <div className="flex justify-between items-start">
                    <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:bg-brand-black transition-colors">
                       <MessageSquare className="w-6 h-6 text-brand-black group-hover:text-white" />
                    </div>
                    <div className="w-2 h-2 bg-brand-black rounded-full animate-pulse"></div>
                 </div>
                 <div className="mt-8">
                    <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest mb-2">Diskusi Aktif</p>
                    <h3 className="text-5xl font-bold font-display">{dashboardStats.activeCount || 12}</h3>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Today's Schedule */}
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold font-display">Sesi Konsultasi</h2>
                  <button onClick={() => setActiveTab('schedules')} className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest hover:text-brand-black transition-colors">Kelola Jadwal</button>
                </div>
                <div className="space-y-4">
                  {scheduleRows.map(sc => (
                    <div key={sc.id} className="p-6 bg-white border border-brand-gray-100 rounded-3xl flex items-center space-x-6 hover:shadow-xl hover:shadow-black/5 transition-all group">
                      <div className="text-center min-w-[70px] border-r border-brand-gray-50 pr-6">
                        <p className="text-sm font-bold">{sc.time.split(' - ')[0]}</p>
                        <p className="text-[8px] font-bold text-brand-gray-300 uppercase tracking-widest">{sc.time.split(' - ')[1]}</p>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm mb-1">{sc.subject}</h4>
                        <p className="text-[10px] font-medium text-brand-gray-400 uppercase tracking-widest">{sc.client} - {sc.type}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {'status' in sc && sc.status === 'pending' && (
                          <>
                            <button onClick={() => handleConsultationStatus(sc.id, 'paid')} className="px-3 py-2 bg-green-50 text-green-700 rounded-xl text-[8px] font-bold uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all">
                              Terima
                            </button>
                          <button onClick={() => handleConsultationStatus(sc.id, 'cancelled')} className="px-3 py-2 bg-red-50 text-red-700 rounded-xl text-[8px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
                              Tolak
                            </button>
                            <button onClick={() => openAction('Ajukan Reschedule', `Kirim usulan jadwal baru untuk ${sc.client}. Fitur pengiriman jadwal ulang akan masuk ke chat konsultasi.`)} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-[8px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                              Reschedule
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            const liveConsultation = consultations.find(item => item.id === sc.id);
                            if (liveConsultation) {
                              onOpenConsultation?.(liveConsultation);
                              return;
                            }
                            openAction(sc.subject, `Masuk ke sesi ${sc.type} dengan ${sc.client} pada ${sc.time}.`);
                          }}
                          className="p-3 bg-brand-gray-50 rounded-2xl group-hover:bg-brand-black group-hover:text-white transition-all"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Opinion Upload */}
              <section className="p-10 bg-brand-gray-50 border border-brand-gray-100 rounded-[48px] space-y-8">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-2xl">
                    <FileCheck className="w-6 h-6 text-brand-black" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-display">Legal Opinion</h3>
                    <p className="text-[10px] font-medium text-brand-gray-400 uppercase tracking-widest">Kirim saran hukum tertulis</p>
                  </div>
                </div>
                
                <div 
                  onClick={() => setShowOpinionModal(true)}
                  className="border-2 border-dashed border-brand-gray-200 bg-white/50 rounded-[32px] p-10 flex flex-col items-center justify-center space-y-4 cursor-pointer hover:bg-white transition-all group"
                >
                   <div className="p-4 bg-brand-gray-100 rounded-2xl group-hover:bg-brand-black transition-colors">
                    <Upload className="w-6 h-6 text-brand-gray-400 group-hover:text-white" />
                   </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Upload New Advice</p>
                    <p className="text-[8px] text-brand-gray-300 font-medium">PDF, DOC (Max 20MB)</p>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}

        {activeTab === 'clients' && (
          <section className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
             <header className="flex items-center justify-between border-b border-brand-gray-100 pb-8">
               <h1 className="text-5xl font-bold font-display tracking-tight">Klien Saya.</h1>
               <button onClick={() => openAction('Tambah Klien', 'Form tambah klien manual akan mencatat nama, kontak, kategori perkara, dan dokumen awal.')} className="bg-brand-black text-white px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center space-x-2">
                 <Plus className="w-4 h-4" />
                 <span>Tambah Klien</span>
               </button>
             </header>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {clientRows.map(client => (
                 <div key={client.id} className="bg-brand-gray-50 border border-brand-gray-100 p-8 rounded-[40px] space-y-6 hover:bg-white hover:shadow-2xl hover:shadow-black/5 transition-all group">
                   <div className="flex items-center justify-between">
                     <img src={client.image} className="w-16 h-16 rounded-[24px] object-cover grayscale group-hover:grayscale-0 transition-all border-4 border-white" />
                     <span className={`px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border ${client.status === 'Active' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-brand-gray-400'}`}>
                       {client.status}
                     </span>
                   </div>
                   <div>
                     <h4 className="text-xl font-bold font-display">{client.name}</h4>
                     <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest mt-1">Perkara: {client.case}</p>
                   </div>
                   <div className="pt-6 border-t border-brand-gray-200/50 flex items-center justify-between">
                     <button onClick={() => openAction(`Hubungi ${client.name}`, `Membuka kanal chat untuk perkara ${client.case}.`)} className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-brand-black">
                       <MessageSquare className="w-4 h-4" />
                       <span>Hubungi Klien</span>
                     </button>
                     <ChevronRight className="w-4 h-4 text-brand-gray-300" />
                   </div>
                 </div>
               ))}
               {clientRows.length === 0 && (
                 <div className="col-span-full rounded-[40px] border border-dashed border-brand-gray-200 bg-brand-gray-50 p-10 text-center">
                   <Users className="mx-auto mb-4 h-8 w-8 text-brand-gray-300" />
                   <p className="text-sm font-bold">Belum ada klien aktif</p>
                   <p className="mt-2 text-xs font-medium text-brand-gray-500">Klien akan muncul setelah booking diterima atau konsultasi dimulai.</p>
                 </div>
               )}
             </div>
          </section>
        )}

        {activeTab === 'schedules' && (
          <section className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-end justify-between border-b border-brand-gray-100 pb-8">
              <div>
                <h1 className="text-5xl font-bold font-display tracking-tight">Jadwal & Booking.</h1>
                <p className="mt-3 text-sm font-medium text-brand-gray-500">Semua booking baru muncul di sini supaya advokat tahu harus menerima, menolak, atau masuk sesi.</p>
              </div>
              <button onClick={refreshLawyerData} className="rounded-2xl border border-brand-gray-200 px-5 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-gray-50">
                Refresh
              </button>
            </header>

            <div className="space-y-4">
              {activeWorkRows.map(item => {
                const copy = workStatusCopy[item.status] || workStatusCopy.pending;
                return (
                  <div key={item.id} className="grid grid-cols-1 gap-5 rounded-3xl border border-brand-gray-100 bg-white p-6 shadow-sm lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-lg px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest ${copy.tone}`}>{copy.label}</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-brand-gray-300">#{item.id.slice(0, 8)}</span>
                      </div>
                      <p className="text-sm font-bold">{item.profiles?.full_name || 'Klien FINPROSE'}</p>
                      <p className="mt-1 text-xs font-medium leading-5 text-brand-gray-500">{copy.next}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{formatConsultationDate(item)} pukul {item.scheduled_time || '-'}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">{item.consultation_type} - Rp {Number(item.price || 0).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {item.status === 'pending' && (
                        <>
                          <button onClick={() => handleConsultationStatus(item.id, 'paid')} className="rounded-xl bg-emerald-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-emerald-700 hover:bg-emerald-600 hover:text-white">
                            Terima
                          </button>
                          <button onClick={() => handleConsultationStatus(item.id, 'cancelled')} className="rounded-xl bg-red-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-700 hover:bg-red-600 hover:text-white">
                            Tolak
                          </button>
                          <button onClick={() => openAction('Ajukan Reschedule', `Usulkan jadwal baru untuk ${item.profiles?.full_name || 'klien'} lewat ruang chat konsultasi.`)} className="rounded-xl bg-blue-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-blue-700 hover:bg-blue-600 hover:text-white">
                            Reschedule
                          </button>
                        </>
                      )}
                      {['paid', 'ongoing', 'in_review'].includes(item.status) && (
                        <button onClick={() => onOpenConsultation?.(item)} className="rounded-xl bg-brand-black px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white">
                          Masuk Sesi
                        </button>
                      )}
                      {item.status !== 'completed' && item.status !== 'cancelled' && (
                        <button onClick={() => updateConsultationStatus(item.id, 'completed', 'Closed by lawyer').then(refreshLawyerData).then(() => openAction('Kasus Selesai', 'Konsultasi ditandai selesai. Klien bisa memberikan review.')).catch(error => openAction('Gagal Menutup Kasus', error instanceof Error ? error.message : 'Status tidak berubah.'))} className="rounded-xl border border-brand-gray-200 px-4 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-gray-50">
                          Selesai
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {activeWorkRows.length === 0 && (
                <div className="rounded-3xl border border-dashed border-brand-gray-200 bg-brand-gray-50 p-10 text-center">
                  <Calendar className="mx-auto mb-4 h-8 w-8 text-brand-gray-300" />
                  <p className="text-sm font-bold">Belum ada booking aktif</p>
                  <p className="mt-2 text-xs font-medium text-brand-gray-500">Kasus selesai atau dibatalkan sudah dipindahkan ke Riwayat.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'cases' && (
          <section className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <header className="border-b border-brand-gray-100 pb-8">
              <h1 className="text-5xl font-bold font-display tracking-tight">Riwayat Kasus.</h1>
              <p className="mt-3 text-sm font-medium text-brand-gray-500">Hanya kasus yang sudah selesai atau dibatalkan. Booking pending dan sesi aktif tetap berada di Jadwal.</p>
            </header>

            <div className="overflow-hidden rounded-3xl border border-brand-gray-100 bg-white">
              <table className="w-full border-collapse">
                <thead className="bg-brand-gray-50">
                  <tr>
                    <th className="px-6 py-5 text-left text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Klien</th>
                    <th className="px-6 py-5 text-left text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Jadwal</th>
                    <th className="px-6 py-5 text-left text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Status</th>
                    <th className="px-6 py-5 text-right text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-50">
                  {historyRows.map(item => {
                    const copy = workStatusCopy[item.status] || workStatusCopy.pending;
                    return (
                      <tr key={item.id} className="hover:bg-brand-gray-50">
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold">{item.profiles?.full_name || 'Klien FINPROSE'}</p>
                          <p className="mt-1 text-xs text-brand-gray-500">{item.profiles?.email || item.notes || 'Tidak ada catatan'}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold">{formatConsultationDate(item)}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">{item.scheduled_time || '-'} - {item.consultation_type}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`rounded-lg px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest ${copy.tone}`}>{copy.label}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button onClick={() => openAction(`Kasus ${item.id.slice(0, 8)}`, item.notes || copy.next)} className="rounded-xl border border-brand-gray-200 px-4 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-black hover:text-white">
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {historyRows.length === 0 && (
                <div className="p-10 text-center text-sm font-bold text-brand-gray-400">Riwayat kasus belum tersedia.</div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'earnings' && (
          <section className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
             <header className="space-y-4">
                <h1 className="text-5xl font-bold font-display tracking-tight">Pendapatan.</h1>
                <p className="text-brand-gray-400 text-lg">Kelola keuangan dan klaim pembayaran Anda.</p>
             </header>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                   <div className="bg-brand-black text-white p-10 rounded-[48px] space-y-12 shadow-2xl shadow-black/20">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Balance</p>
                        <h2 className="text-5xl font-bold font-display">Rp {dashboardStats.revenue.toLocaleString('id-ID')}</h2>
                      </div>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 pb-2 border-b border-zinc-800">
                            <span>Sesi Konsultasi</span>
                            <span className="text-white">Rp {dashboardStats.revenue.toLocaleString('id-ID')}</span>
                         </div>
                         <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 pb-2 border-b border-zinc-800">
                            <span>Biaya Dokumen</span>
                            <span className="text-white">Rp 0</span>
                         </div>
                      </div>
                      <button onClick={() => openAction('Tarik Dana', 'Permintaan pencairan akan dikirim ke admin finance dan diproses ke rekening terdaftar.')} className="w-full py-5 bg-zinc-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-brand-black transition-all">Tarik Dana Ke Rekening</button>
                   </div>
                </div>

                <div className="lg:col-span-2 space-y-8 bg-brand-gray-50 border border-brand-gray-100 p-10 rounded-[48px]">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-brand-black">Riwayat Transaksi</h3>
                   <div className="space-y-4">
                      {lawyerPayments.map(tx => (
                        <div key={tx.id} className="p-6 bg-white rounded-3xl border border-brand-gray-100 flex items-center justify-between group">
                          <div className="flex items-center space-x-6">
                             <div className="p-3 bg-brand-gray-50 rounded-2xl group-hover:bg-brand-black group-hover:text-white transition-colors">
                                <DollarSign className="w-5 h-5" />
                             </div>
                             <div>
                                <h4 className="font-bold text-sm mb-1">{tx.client}</h4>
                                <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">{new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(tx.created_at))} - {tx.id.slice(0, 8)}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-bold">Rp {tx.total_amount.toLocaleString('id-ID')}</p>
                             <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest">{tx.status}</p>
                          </div>
                        </div>
                      ))}
                      {lawyerPayments.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-brand-gray-200 bg-white p-8 text-center">
                          <p className="text-sm font-bold">Belum ada transaksi live</p>
                          <p className="mt-2 text-xs font-medium text-brand-gray-500">Pendapatan akan muncul setelah pembayaran konsultasi berhasil.</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </section>
        )}
      </main>

      {/* Modal Overlay / Mock Upload UI */}
      <AnimatePresence>
        {showOpinionModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl p-12 space-y-8 relative"
            >
              <button 
                onClick={() => setShowOpinionModal(false)}
                className="absolute top-8 right-8 p-3 hover:bg-brand-gray-50 rounded-full transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45 text-brand-gray-300" />
              </button>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-brand-black text-white rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-black/20">
                  <FileCheck className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold font-display">Kirim Legal Opinion</h3>
                <p className="text-xs text-brand-gray-400 font-medium max-w-xs mx-auto uppercase tracking-widest leading-relaxed">
                  Dokumen akan dienkripsi secara otomatis dan dikirimkan kepada klien yang Anda pilih.
                </p>
              </div>

              <div className="space-y-6">
                 <div className="space-y-3 px-2">
                   <p className="text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest">Pilih Klien Tujuan</p>
                   <div className="grid grid-cols-1 gap-2">
                     {clientRows.map(c => (
                        <button key={c.id} onClick={() => openAction('Klien Dipilih', `${c.name} dipilih sebagai penerima legal opinion.`)} className="p-4 bg-brand-gray-50 rounded-2xl border border-brand-gray-100 text-left hover:border-brand-black transition-all flex items-center space-x-3">
                           <img src={c.image} className="w-8 h-8 rounded-lg grayscale" />
                           <span className="text-[10px] font-bold uppercase tracking-widest">{c.name}</span>
                        </button>
                     ))}
                     {clientRows.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-brand-gray-200 bg-brand-gray-50 p-5 text-center text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                          Belum ada klien untuk dipilih
                        </div>
                     )}
                   </div>
                 </div>
                 
                 <div className="border-2 border-dashed border-brand-gray-100 rounded-[32px] p-12 text-center space-y-4 bg-brand-gray-50/30 group hover:border-brand-black transition-all cursor-pointer">
                    <Upload className="w-8 h-8 text-brand-gray-200 mx-auto group-hover:text-brand-black transition-colors" />
                    <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest group-hover:text-brand-black transition-colors">Tarik file Legal Opinion ke sini</p>
                 </div>
              </div>

              <button 
                onClick={() => setShowOpinionModal(false)}
                className="w-full bg-brand-black text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-black/10 hover:translate-y-[-2px] transition-all"
              >
                Kirim Saran Hukum
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
