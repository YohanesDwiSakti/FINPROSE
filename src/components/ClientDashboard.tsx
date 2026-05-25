import React, { useEffect, useMemo, useState } from 'react';
import { 
  LayoutDashboard, Users, FileText, Settings, Search, 
  Bell, Video, User, ChevronRight, Gavel, Calendar, 
  ArrowUpRight, Upload, CreditCard, HelpCircle, 
  MessageSquare, Star, Heart, Clock, CheckCircle2, 
  ShieldCheck, Filter, LogOut
} from 'lucide-react';
import { RECENT_MESSAGES, ACTIVE_CONSULTATIONS, LAWYERS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { ActionModal } from './ActionModal';
import { fetchClientConsultations, getStoredUser, type ConsultationRow, type StoredUser } from '../api';

const getFirstName = (name: string) => name.trim().split(/\s+/)[0] || 'Klien';

const getInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'KL';
};

const statusCopy: Record<string, { label: string; action: string; tone: string }> = {
  pending: {
    label: 'Menunggu pembayaran',
    action: 'Selesaikan pembayaran agar advokat bisa memulai sesi.',
    tone: 'bg-amber-50 text-amber-700'
  },
  paid: {
    label: 'Siap konsultasi',
    action: 'Masuk ke chat atau ruang meeting sesuai jadwal.',
    tone: 'bg-emerald-50 text-emerald-700'
  },
  ongoing: {
    label: 'Sedang berjalan',
    action: 'Lanjutkan chat dan kirim dokumen pendukung.',
    tone: 'bg-zinc-900 text-white'
  },
  in_review: {
    label: 'Dalam review',
    action: 'Tunggu catatan atau legal opinion dari advokat.',
    tone: 'bg-blue-50 text-blue-700'
  },
  completed: {
    label: 'Selesai',
    action: 'Beri review agar kualitas layanan terukur.',
    tone: 'bg-zinc-100 text-zinc-600'
  },
  cancelled: {
    label: 'Dibatalkan',
    action: 'Hubungi bantuan jika perlu refund atau penjadwalan ulang.',
    tone: 'bg-red-50 text-red-700'
  },
  expired: {
    label: 'Kedaluwarsa',
    action: 'Buat booking baru jika masih butuh konsultasi.',
    tone: 'bg-zinc-100 text-zinc-600'
  }
};

const consultationDate = (row: ConsultationRow) => row.scheduled_day || new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
}).format(new Date(row.created_at));

const consultationTime = (row: ConsultationRow) => row.scheduled_time || '-';

const NotificationPanel = ({ isOpen, onClose, onViewAll }: { isOpen: boolean, onClose: () => void, onViewAll: () => void }) => {
  const notifications = [
    { id: 1, title: 'Pembayaran Dikonfirmasi', desc: 'Sesi dengan Budi Santoso telah dibayar.', time: '2m ago', icon: CheckCircle2, color: 'text-green-500' },
    { id: 2, title: 'Dokumen Baru', desc: 'Lawyer mengunggah Legal Opinion baru.', time: '1h ago', icon: FileText, color: 'text-brand-black' },
    { id: 3, title: 'Jadwal Mendatang', desc: 'Konsultasi dimulai dalam 30 menit.', time: '2h ago', icon: Clock, color: 'text-amber-500' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/5 backdrop-blur-sm z-40"
          />
          <motion.div 
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="fixed top-24 right-12 w-80 bg-white rounded-[32px] border border-brand-gray-100 shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-6 border-b border-brand-gray-50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-brand-black">Notifikasi</h3>
              <span className="text-[10px] font-bold text-brand-gray-300 uppercase tracking-widest">3 Baru</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y divide-brand-gray-50">
              {notifications.map(n => (
                <div key={n.id} className="p-5 hover:bg-brand-gray-50 transition-colors flex items-start space-x-4">
                  <div className={`p-2 bg-brand-gray-50 rounded-xl ${n.color}`}>
                    <n.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-brand-black mb-1">{n.title}</p>
                    <p className="text-[10px] text-brand-gray-400 font-medium leading-relaxed">{n.desc}</p>
                    <p className="text-[9px] font-bold text-brand-gray-300 uppercase tracking-widest mt-2">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onViewAll} className="w-full p-4 text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black bg-brand-gray-50 transition-colors">
              Lihat Semua Notifikasi
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const Sidebar = ({ 
  onLogout, 
  onBrowseLawyers, 
  onViewHistory, 
  onViewDocuments,
  onViewHelp,
  onViewSettings
}: { 
  onLogout: () => void, 
  onBrowseLawyers: () => void, 
  onViewHistory?: () => void, 
  onViewDocuments?: () => void,
  onViewHelp?: () => void,
  onViewSettings?: () => void
}) => {
  const items = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Users, label: 'Cari Advokat', onClick: onBrowseLawyers },
    { icon: FileText, label: 'Riwayat Kasus', onClick: onViewHistory },
    { icon: Upload, label: 'Dokumen', onClick: onViewDocuments },
    { icon: HelpCircle, label: 'FAQ & Bantuan', onClick: onViewHelp },
    { icon: Settings, label: 'Pengaturan', onClick: onViewSettings },
  ];

  return (
    <div className="w-64 bg-brand-gray-50 border-r border-brand-gray-200 flex flex-col p-8 fixed h-full z-20 hidden lg:flex">
      <div className="text-2xl font-bold font-display mb-12 italic tracking-tighter">Raw Law</div>
      
      <div className="flex-1 space-y-6">
        {items.map((item) => (
          <button 
            key={item.label}
            onClick={item.onClick}
            className={`flex items-center space-x-4 w-full p-3 rounded-xl transition-all ${item.active ? 'bg-white shadow-sm font-bold text-brand-black border-l-4 border-brand-black' : 'text-brand-gray-400 hover:text-brand-black'}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="pt-8 border-t border-brand-gray-200 space-y-4">
        <button onClick={onBrowseLawyers} className="flex items-center space-x-4 w-full bg-brand-black text-white p-4 rounded-2xl shadow-xl hover:scale-[1.02] transition-all">
          <span className="text-[10px] font-bold uppercase tracking-widest">Buat Konsultasi</span>
        </button>
        <button onClick={onLogout} className="flex items-center space-x-4 w-full p-3 text-red-400 hover:text-red-500 transition-all">
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Logout</span>
        </button>
      </div>
    </div>
  );
};

const Header = ({ user, onToggleNotif, onViewSettings }: { user: StoredUser, onToggleNotif: () => void, onViewSettings?: () => void }) => {
  return (
    <header className="ml-0 lg:ml-64 px-12 py-8 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between border-b border-brand-gray-50">
      <div className="flex-1 max-w-xl relative hidden md:block">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-300" />
        <input 
          type="text" 
          placeholder="Cari konsultasi, dokumen, atau biaya..." 
          className="w-full bg-brand-gray-50 border border-brand-gray-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium outline-none focus:border-brand-black transition-all"
        />
      </div>
      
      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-2">
          <button 
            onClick={onToggleNotif}
            className="p-3 bg-brand-gray-50 rounded-2xl relative group hover:bg-brand-black transition-all"
          >
            <Bell className="w-5 h-5 text-brand-black group-hover:text-white" />
            <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-brand-black border-2 border-white rounded-full group-hover:bg-white group-hover:border-brand-black"></div>
          </button>
        </div>
        
        <div className="h-10 w-px bg-brand-gray-100 hidden md:block"></div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold">{user.name}</p>
            <p className="text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest">{user.status || 'Member Aktif'}</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            onClick={onViewSettings}
            className="w-12 h-12 rounded-2xl bg-brand-black text-white flex items-center justify-center font-display text-xl font-bold shadow-xl shadow-black/10 border-2 border-white"
          >
            {getInitials(user.name)}
          </motion.button>
        </div>
      </div>
    </header>
  );
};

export const ClientDashboard = ({ 
  onLogout, 
  onBrowseLawyers,
  onViewHistory,
  onViewDocuments,
  onViewHelp,
  onViewSettings
}: { 
  onLogout: () => void,
  onBrowseLawyers: () => void,
  onViewHistory?: () => void,
  onViewDocuments?: () => void,
  onViewHelp?: () => void,
  onViewSettings?: () => void
}) => {
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [modal, setModal] = React.useState<{ title: string; description: string } | null>(null);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(true);
  const [loadError, setLoadError] = useState('');
  const user = getStoredUser() || {
    id: 'guest-client',
    name: 'Klien FINPROSE',
    email: 'klien@example.com',
    role: 'client' as const,
    status: 'Member Aktif',
    phone: '',
    address: ''
  };

  useEffect(() => {
    if (!user.id || user.id === 'guest-client') {
      setIsLoadingConsultations(false);
      return;
    }

    let mounted = true;
    fetchClientConsultations(user.id)
      .then(rows => {
        if (mounted) setConsultations(rows);
      })
      .catch(error => {
        if (mounted) setLoadError(error.message || 'Gagal memuat konsultasi aktif');
      })
      .finally(() => {
        if (mounted) setIsLoadingConsultations(false);
      });

    return () => {
      mounted = false;
    };
  }, [user.id]);

  const activeConsultations = useMemo(() => consultations.filter(item => item.status !== 'completed' && item.status !== 'cancelled'), [consultations]);
  const nextConsultation = activeConsultations[0] || consultations[0] || null;
  const completedCount = consultations.filter(item => item.status === 'completed').length || ACTIVE_CONSULTATIONS.filter(item => item.status === 'Completed').length;
  const pendingPaymentCount = consultations.filter(item => item.status === 'pending').length;
  const paidPaymentTotal = consultations
    .flatMap(item => item.app_payments || [])
    .filter(payment => payment.status === 'paid')
    .reduce((total, payment) => total + Number(payment.total_amount || 0), 0);
  const nextStatus = nextConsultation ? statusCopy[nextConsultation.status] || statusCopy.pending : null;
  const recentRows = consultations.length > 0
    ? consultations.slice(0, 4)
    : user.id === 'guest-client' ? ACTIVE_CONSULTATIONS.map(item => ({
        id: item.id,
        lawyer_directory: { name: item.lawyerName, specialty: item.specialty, image: '' },
        scheduled_day: item.date,
        scheduled_time: item.time,
        status: item.status === 'Completed' ? 'completed' : item.status === 'Ongoing' ? 'ongoing' : 'in_review',
        price: item.price,
        created_at: new Date().toISOString()
      } as ConsultationRow)) : [];
  const recentMessages = user.id === 'guest-client' ? RECENT_MESSAGES : [];

  return (
    <div className="min-h-screen bg-white font-sans">
      <Sidebar 
        onLogout={onLogout} 
        onBrowseLawyers={onBrowseLawyers} 
        onViewHistory={onViewHistory} 
        onViewDocuments={onViewDocuments}
        onViewHelp={onViewHelp}
        onViewSettings={onViewSettings}
      />
      <Header user={user} onToggleNotif={() => setIsNotifOpen(!isNotifOpen)} onViewSettings={onViewSettings} />
      <NotificationPanel
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onViewAll={() => {
          setIsNotifOpen(false);
          setModal({ title: 'Semua Notifikasi', description: 'Daftar lengkap notifikasi akan memuat pembayaran, jadwal konsultasi, pesan baru, dan pembaruan dokumen.' });
        }}
      />
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      
      <main className="lg:ml-64 p-6 lg:p-12 space-y-12 max-w-7xl animate-in fade-in duration-700">
        <header className="space-y-3">
          <h1 className="text-5xl font-bold font-display tracking-tight text-brand-black">Halo, {getFirstName(user.name)}.</h1>
          <div className="flex items-center space-x-4 text-brand-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
            <span>{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span>
            <span className="w-1 h-1 bg-brand-gray-200 rounded-full"></span>
            <span>{user.address || 'Domisili belum diatur'}</span>
            <span className="w-1 h-1 bg-brand-gray-200 rounded-full"></span>
            <span>{user.email}</span>
          </div>
        </header>

        {/* Stats & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8 space-y-8">
            <section className="grid grid-cols-1 gap-4 rounded-3xl border border-brand-gray-100 bg-brand-gray-50 p-5 md:grid-cols-3">
              {[
                { icon: Search, title: '1. Pilih advokat', detail: 'Bandingkan spesialis, harga, rating, dan jadwal.', action: 'Cari Advokat', onClick: onBrowseLawyers },
                { icon: CreditCard, title: '2. Bayar booking', detail: pendingPaymentCount > 0 ? `${pendingPaymentCount} konsultasi menunggu pembayaran.` : 'Invoice dibuat setelah jadwal dipilih.', action: 'Cek Riwayat', onClick: onViewHistory },
                { icon: MessageSquare, title: '3. Konsultasi', detail: 'Chat, meeting, dokumen, dan review ada di riwayat kasus.', action: 'Buka Kasus', onClick: onViewHistory }
              ].map(item => (
                <button
                  key={item.title}
                  onClick={item.onClick}
                  className="group rounded-2xl border border-brand-gray-100 bg-white p-5 text-left transition-all hover:border-brand-black hover:shadow-lg hover:shadow-black/5"
                >
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

            {loadError && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs font-bold text-amber-700">
                Data konsultasi live gagal dimuat: {loadError}. Data contoh tetap ditampilkan agar alur bisa dicek.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-brand-black text-white p-10 rounded-[48px] relative overflow-hidden shadow-2xl shadow-black/20"
              >
                <div className="relative z-10 space-y-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
                      <Video className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sesi Berikutnya</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold font-display mb-2">{nextConsultation?.lawyer_directory?.name || 'Belum ada sesi aktif'}</h3>
                    <p className="text-xs text-zinc-400 font-medium tracking-wide uppercase">
                      {nextConsultation ? `${consultationDate(nextConsultation)} pukul ${consultationTime(nextConsultation)}` : 'Mulai dari cari advokat'}
                    </p>
                    {nextStatus && (
                      <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">{nextStatus.action}</p>
                    )}
                  </div>
                  <button 
                    onClick={nextConsultation ? onViewHistory : onBrowseLawyers}
                    className="w-full bg-white text-brand-black py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-all font-display"
                  >
                    {nextConsultation ? 'Buka Detail Konsultasi' : 'Cari Advokat Sekarang'}
                  </button>
                </div>
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/5 blur-[100px] rounded-full"></div>
              </motion.div>

              <div className="bg-brand-gray-50 p-10 rounded-[48px] border border-brand-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-white rounded-2xl shadow-sm">
                    <Gavel className="w-6 h-6 text-brand-black" />
                  </div>
                  <button 
                    onClick={onViewHistory}
                    className="p-2 hover:bg-brand-gray-100 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-brand-gray-400" />
                  </button>
                </div>
                <div className="mt-8">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 mb-2">Total Kasus Selesai</p>
                  <h3 className="text-5xl font-bold font-display">{isLoadingConsultations ? '...' : completedCount}</h3>
                </div>
              </div>
            </div>

            {/* Favorite Lawyers */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-bold font-display">Lawyer Favorit</h2>
                <button 
                  onClick={onBrowseLawyers}
                  className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black transition-colors"
                >
                  Lihat Semua
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {LAWYERS.slice(0, 2).map((lawyer) => (
                  <div key={lawyer.id} className="p-5 bg-white border border-brand-gray-100 rounded-3xl flex items-center space-x-4 hover:border-brand-black transition-all group shadow-sm">
                    <img src={lawyer.image} className="w-14 h-14 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{lawyer.name}</h4>
                      <p className="text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest">{lawyer.specialty}</p>
                    </div>
                    <button onClick={() => setModal({ title: `${lawyer.name} Disimpan`, description: 'Advokat ini sudah masuk daftar favorit. Dari sini pengguna bisa lanjut melihat profil, tarif, dan jadwal konsultasi.' })} className="p-2 text-red-500 bg-red-50 rounded-xl">
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="md:col-span-4 space-y-8">
            {/* Wallet / Payment Card */}
            <div className="bg-brand-gray-50 border border-brand-gray-100 rounded-[48px] p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-white rounded-2xl shadow-sm">
                    <CreditCard className="w-5 h-5 text-brand-black" />
                  </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 text-right">Pembayaran Berhasil</span>
                </div>
                <div>
                  <p className="text-3xl font-bold font-display">Rp {paidPaymentTotal.toLocaleString('id-ID')}</p>
                  <p className="text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest mt-1">{pendingPaymentCount} invoice menunggu pembayaran</p>
                </div>
              </div>

              <div 
                onClick={pendingPaymentCount > 0 ? onViewHistory : onViewDocuments}
                className="border-2 border-dashed border-brand-gray-200 bg-white/50 rounded-[32px] p-8 flex flex-col items-center justify-center space-y-3 group cursor-pointer hover:bg-white transition-all shadow-sm"
              >
                <div className="p-4 bg-brand-gray-100 rounded-2xl group-hover:bg-brand-black transition-colors shadow-sm">
                  <Upload className="w-5 h-5 text-brand-gray-400 group-hover:text-white" />
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1">{pendingPaymentCount > 0 ? 'Bayar Invoice' : 'Unggah Dokumen'}</p>
                  <p className="text-[8px] text-brand-gray-300 font-medium">{pendingPaymentCount > 0 ? 'Buka riwayat kasus untuk lanjut bayar' : 'PDF, PNG, JPG (Maks 20MB)'}</p>
                </div>
              </div>
            </div>

            {/* Quick Support */}
            <div className="p-10 bg-brand-black text-white rounded-[48px] space-y-6 shadow-2xl shadow-black/20 relative overflow-hidden">
              <HelpCircle className="w-10 h-10 text-white/20" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold font-display mb-2 leading-tight">Butuh Bantuan Hukum Cepat?</h3>
                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed uppercase tracking-widest mb-8 italic">Layanan FAQ & bantuan siaga 24/7 kami siap membantu.</p>
                <button onClick={onViewHelp} className="w-full bg-zinc-800 text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-brand-black transition-all">Pusat Bantuan</button>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Messaging & Archive Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-8">
          {/* Chat Sessions */}
          <section className="lg:col-span-4 space-y-8">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-bold font-display">Chat Terbaru</h2>
              <button onClick={() => setModal({ title: 'Filter Chat', description: 'Panel filter chat akan menampilkan pesan belum dibaca, dokumen masuk, dan percakapan aktif. Untuk demo ini daftar chat sudah diringkas dari aktivitas terbaru.' })} className="p-2 border border-brand-gray-100 rounded-xl hover:bg-brand-gray-50 transition-colors">
                <Filter className="w-4 h-4 text-brand-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              {recentMessages.length === 0 && (
                <div className="rounded-3xl border border-dashed border-brand-gray-200 bg-brand-gray-50 p-8 text-center">
                  <MessageSquare className="mx-auto mb-3 h-7 w-7 text-brand-gray-300" />
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-gray-400">Belum ada chat aktif</p>
                  <p className="mt-2 text-xs font-medium leading-5 text-brand-gray-500">Chat akan muncul setelah konsultasi dibuat dan pembayaran selesai.</p>
                </div>
              )}
              {recentMessages.map((msg, i) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setModal({ title: `Chat dengan ${msg.sender}`, description: msg.content || msg.lastMessage || 'Percakapan ini akan membuka ruang chat konsultasi terkait.' })}
                  className="p-5 bg-white border border-brand-gray-100 rounded-3xl flex items-center space-x-4 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all cursor-pointer group"
                >
                  <div className="relative">
                    <img src={msg.senderImage} alt={msg.sender} className="w-12 h-12 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all border border-brand-gray-50 shadow-sm" />
                    {msg.unreadCount > 0 && (
                       <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-black text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                         {msg.unreadCount}
                       </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-bold text-sm truncate">{msg.sender}</h4>
                      <span className="text-[9px] font-bold text-brand-gray-300 uppercase tracking-widest">{msg.timestamp}</span>
                    </div>
                    <p className="text-[10px] text-brand-gray-400 font-medium truncate italic leading-relaxed">"{msg.lastMessage}"</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Table Archive */}
          <section className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-bold font-display">Riwayat Kedatangan</h2>
              <button 
                onClick={onViewHistory}
                className="text-[10px] font-bold uppercase tracking-widest text-brand-black border-b-2 border-brand-black pb-1 hover:text-brand-gray-400 hover:border-brand-gray-400 transition-colors"
              >
                Lihat Semua Riwayat
              </button>
            </div>
            <div className="bg-white rounded-[48px] border border-brand-gray-100 overflow-hidden shadow-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-brand-gray-50">
                    <th className="px-8 py-6 text-left text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Advokat</th>
                    <th className="px-8 py-6 text-left text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Waktu</th>
                    <th className="px-8 py-6 text-left text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Status</th>
                    <th className="px-8 py-6 text-right text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Detil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-50">
                  {recentRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center">
                        <p className="text-sm font-bold text-brand-black">Belum ada konsultasi</p>
                        <p className="mt-2 text-xs font-medium text-brand-gray-500">Klik Cari Advokat untuk membuat booking pertama.</p>
                      </td>
                    </tr>
                  )}
                  {recentRows.map((item) => {
                    const copy = statusCopy[item.status] || statusCopy.pending;

                    return (
                    <tr key={item.id} className="group hover:bg-brand-gray-50 transition-colors">
                      <td className="px-8 py-8">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-brand-gray-100 rounded-xl flex items-center justify-center font-bold text-sm text-brand-black group-hover:bg-brand-black group-hover:text-white transition-all">{item.lawyer_directory?.name?.[0] || 'A'}</div>
                          <div>
                            <p className="text-sm font-bold">{item.lawyer_directory?.name || 'Advokat FINPROSE'}</p>
                            <p className="text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest">{item.lawyer_directory?.specialty || item.consultation_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="space-y-1">
                          <p className="text-xs font-bold">{consultationDate(item)}</p>
                          <div className="flex items-center space-x-2 text-[9px] font-bold text-brand-gray-300 uppercase tracking-widest">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{consultationTime(item)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <span className={`px-2.5 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest ${copy.tone}`}>
                          {copy.label}
                        </span>
                      </td>
                      <td className="px-8 py-8 text-right">
                        <button onClick={() => setModal({ title: `Detail ${item.id}`, description: `${copy.action} Klik Riwayat Kasus untuk melihat catatan, dokumen, dan progres lengkap.` })} className="p-3 hover:bg-brand-black hover:text-white rounded-2xl transition-all text-brand-gray-200">
                          <ArrowUpRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
