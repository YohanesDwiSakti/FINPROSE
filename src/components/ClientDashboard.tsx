import React, { useEffect, useMemo, useState } from 'react';
import { 
  LayoutDashboard, Users, FileText, Settings, Search, 
  Bell, Video, User, ChevronRight, Gavel, Calendar, 
  ArrowUpRight, Upload, CreditCard, HelpCircle, 
  MessageSquare, Star, Heart, Clock, CheckCircle2, 
  ShieldCheck, Filter, LogOut, Bot, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ActionModal } from './ActionModal';
import { fetchClientConsultations, getStoredUser, type ConsultationRow, type StoredUser } from '../api';
import { Message } from '../types';

const getFirstName = (name: string) => name.trim().split(/\s+/)[0] || 'Client';

const getInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'TL';
};

const statusCopy: Record<string, { label: string; action: string; tone: string }> = {
  pending: {
    label: 'Menunggu pembayaran',
    action: 'Selesaikan pembayaran untuk membuka sesi konsultasi.',
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

const isHistoryStatus = (status: string) => status === 'completed' || status === 'cancelled';

const NotificationPanel = ({ isOpen, onClose, onViewAll, notifications }: { isOpen: boolean, onClose: () => void, onViewAll: () => void, notifications: Array<{ id: string; title: string; desc: string; time: string; icon: typeof CheckCircle2; color: string }> }) => {
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
              <span className="text-[10px] font-bold text-brand-gray-300 uppercase tracking-widest">{notifications.filter(n => n.title).length} Baru</span>
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
              {notifications.length === 0 && (
                <div className="p-6 text-center text-xs font-bold uppercase tracking-widest text-brand-gray-300">
                  Belum ada notifikasi
                </div>
              )}
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
  onViewSettings,
  onOpenRusdi
}: { 
  onLogout: () => void, 
  onBrowseLawyers: () => void, 
  onViewHistory?: () => void, 
  onViewDocuments?: () => void,
  onViewHelp?: () => void,
  onViewSettings?: () => void,
  onOpenRusdi?: () => void
}) => {
  const { t } = useTranslation();
  const items = [
    { icon: LayoutDashboard, label: t('common.dashboard'), active: true },
    { icon: Bot, label: 'Rusdi AI', onClick: onOpenRusdi, highlight: true },
    { icon: Users, label: t('nav.lawyers'), onClick: onBrowseLawyers },
    { icon: FileText, label: t('common.history'), onClick: onViewHistory },
    { icon: Upload, label: t('common.documents'), onClick: onViewDocuments },
    { icon: HelpCircle, label: t('common.help'), onClick: onViewHelp },
    { icon: Settings, label: t('common.profileSettings'), onClick: onViewSettings },
  ];

  return (
    <div className="w-64 bg-brand-gray-50 border-r border-brand-gray-200 flex-col p-8 fixed h-full z-20 hidden lg:flex">
      <div className="text-2xl font-bold font-display mb-12 italic tracking-tighter">YDA LAW OFFICE & Partners</div>
      
      <div className="flex-1 space-y-6">
        {items.map((item) => (
          <button 
            key={item.label}
            onClick={item.onClick}
            className={`flex items-center space-x-4 w-full p-3 rounded-xl transition-all ${item.active ? 'bg-white shadow-sm font-bold text-brand-black border-l-4 border-brand-black' : item.highlight ? 'bg-amber-50 text-amber-900 font-bold hover:bg-amber-100' : 'text-brand-gray-400 hover:text-brand-black'}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="pt-8 border-t border-brand-gray-200 space-y-4">
        <button onClick={onBrowseLawyers} className="flex items-center space-x-4 w-full bg-brand-black text-white p-4 rounded-2xl shadow-xl hover:scale-[1.02] transition-all">
          <span className="text-[10px] font-bold uppercase tracking-widest">{t('dashboards.client.bookNew')}</span>
        </button>
        <button onClick={onLogout} className="flex items-center space-x-4 w-full p-3 text-red-400 hover:text-red-500 transition-all">
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">{t('common.logout')}</span>
        </button>
      </div>
    </div>
  );
};

const Header = ({ user, onToggleNotif, onViewSettings }: { user: StoredUser, onToggleNotif: () => void, onViewSettings?: () => void }) => {
  const { t, i18n } = useTranslation();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const currentLang = i18n.language || 'id';

  const handleLangChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('YDA LAW OFFICE & Partners_lang', lang);
    setLangDropdownOpen(false);
  };

  const languages = [
    { code: 'id', label: 'Indonesian (ID)' },
    { code: 'en', label: 'English (EN)' },
    { code: 'ja', label: 'Japanese (JA)' },
    { code: 'zh', label: 'Chinese (ZH)' }
  ];

  return (
    <header className="ml-0 lg:ml-64 px-12 py-8 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between border-b border-brand-gray-50">
      <div className="flex-1 max-w-xl relative hidden md:block">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-300" />
        <input 
          type="text" 
          placeholder={t('common.loading')}
          className="w-full bg-brand-gray-50 border border-brand-gray-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium outline-none focus:border-brand-black transition-all"
        />
      </div>
      
      <div className="flex items-center space-x-8">
        {/* Language Switcher Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center space-x-1 px-3 py-2 border border-brand-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-brand-gray-50 transition-colors cursor-pointer"
          >
            <span>{currentLang}</span>
            <span className="text-[10px]">▼</span>
          </button>
          
          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-brand-gray-200 rounded-xl shadow-xl z-50 py-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLangChange(lang.code)}
                  className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-brand-gray-50 transition-colors cursor-pointer ${currentLang === lang.code ? 'text-brand-black font-bold' : 'text-brand-gray-400'}`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

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
            <p className="text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest">{user.status || t('common.client')}</p>
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
  onViewSettings,
  onOpenRusdi,
  onOpenConsultation
}: { 
  onLogout: () => void,
  onBrowseLawyers: () => void,
  onViewHistory?: () => void,
  onViewDocuments?: () => void,
  onViewHelp?: () => void,
  onViewSettings?: () => void,
  onOpenRusdi?: () => void,
  onOpenConsultation?: (consultation: ConsultationRow) => void
}) => {
  const { t } = useTranslation();
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [modal, setModal] = React.useState<{ title: string; description: string } | null>(null);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [favoriteLawyers, setFavoriteLawyers] = useState<Array<{ id: string; name: string; specialty: string; image: string; rating: number }>>([]);
  const [notificationItems, setNotificationItems] = useState<Array<{ id: string; title: string; desc: string; time: string; icon: typeof CheckCircle2; color: string }>>([]);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(true);
  const [loadError, setLoadError] = useState('');
  const user = getStoredUser();

  useEffect(() => {
    if (!user?.id) {
      setConsultations([]);
      setFavoriteLawyers([]);
      setNotificationItems([]);
      setIsLoadingConsultations(false);
      return;
    }

    let mounted = true;
    setIsLoadingConsultations(true);
    setLoadError('');
    fetchClientConsultations(user.id)
      .then(rows => {
        if (!mounted) return;
        setConsultations(rows);
        setFavoriteLawyers(
          [...new Map(
            rows
              .filter(item => item.lawyer_directory?.name)
              .map(item => [item.lawyer_id, {
                id: item.lawyer_id,
                name: item.lawyer_directory?.name || 'Advokat',
                specialty: item.lawyer_directory?.specialty || item.consultation_type,
                image: item.lawyer_directory?.image || '/lawyer1.png',
                rating: 0
              }])
          ).values()].slice(0, 4)
        );
        setNotificationItems(
          rows.slice(0, 6).map(item => ({
            id: item.id,
            title: `Konsultasi ${item.consultation_type}`,
            desc: item.notes || `Status: ${item.status}`,
            time: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(item.created_at)),
            icon: item.status === 'paid' ? CheckCircle2 : item.status === 'ongoing' ? MessageSquare : ShieldCheck,
            color: item.status === 'paid' ? 'text-emerald-600' : 'text-brand-black'
          }))
        );
      })
      .catch((error) => {
        if (mounted) {
          setConsultations([]);
          setLoadError(error instanceof Error ? error.message : 'Gagal memuat konsultasi.');
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingConsultations(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const activeConsultations = useMemo(() => consultations.filter(item => !isHistoryStatus(item.status)), [consultations]);
  const historyConsultations = useMemo(() => consultations.filter(item => isHistoryStatus(item.status)), [consultations]);
  const nextConsultation = activeConsultations[0] || null;
  const completedCount = historyConsultations.length;
  const pendingSessionCount = consultations.filter(item => item.status === 'pending').length;
  const paidPaymentTotal = consultations
    .flatMap(item => item.app_payments || [])
    .filter(payment => payment.status === 'paid')
    .reduce((total, payment) => total + Number(payment.total_amount || 0), 0);
  const nextStatus = nextConsultation ? statusCopy[nextConsultation.status] || statusCopy.pending : null;
  const recentRows = activeConsultations.length > 0
    ? activeConsultations.slice(0, 4)
    : consultations.slice(0, 4);
  const recentMessages: Message[] = activeConsultations.slice(0, 4).map(item => ({
    id: item.id,
    sender: item.lawyer_directory?.name || 'Advokat',
    senderImage: item.lawyer_directory?.image || '/lawyer1.png',
    lastMessage: item.notes || `Konsultasi ${item.consultation_type} • ${item.status}`,
    timestamp: consultationDate(item),
    unreadCount: item.status === 'ongoing' || item.status === 'paid' ? 1 : 0
  }));

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-sm text-brand-gray-500">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <Sidebar 
        onLogout={onLogout} 
        onBrowseLawyers={onBrowseLawyers} 
        onViewHistory={onViewHistory} 
        onViewDocuments={onViewDocuments}
        onViewHelp={onViewHelp}
        onViewSettings={onViewSettings}
        onOpenRusdi={onOpenRusdi}
      />
      <Header user={user} onToggleNotif={() => setIsNotifOpen(!isNotifOpen)} onViewSettings={onViewSettings} />
      <NotificationPanel
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notificationItems}
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

        {/* Rusdi AI — primary free entry point */}
        <section className="rounded-[40px] border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-white p-8 md:p-10 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-900">
                <Sparkles className="h-3.5 w-3.5" />
                Gratis untuk Klien
              </div>
              <h2 className="text-3xl font-bold font-display tracking-tight text-brand-black">Mulai dengan Rusdi AI</h2>
              <p className="text-sm leading-relaxed text-brand-gray-600">
                Analisis masalah hukum, pahami kasus Anda, dan dapatkan rekomendasi advokat — tanpa booking atau pembayaran. Rusdi AI adalah pintu masuk utama platform sebelum konsultasi resmi.
              </p>
            </div>
            <button
              onClick={onOpenRusdi}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600"
            >
              <Bot className="h-5 w-5" />
              Buka Rusdi AI
            </button>
          </div>
        </section>

        {/* Stats & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8 space-y-8">
            <section className="grid grid-cols-1 gap-4 rounded-3xl border border-brand-gray-100 bg-brand-gray-50 p-5 md:grid-cols-3">
              {[
                { icon: Bot, title: '1. Rusdi AI', detail: 'Analisis kasus, edukasi hukum, dan rekomendasi advokat — gratis.', action: 'Buka Rusdi AI', onClick: onOpenRusdi },
                { icon: Search, title: '2. Pilih advokat', detail: 'Bandingkan spesialis, harga, rating, dan jadwal.', action: 'Cari Advokat', onClick: onBrowseLawyers },
                { icon: CreditCard, title: '3. Konsultasi resmi', detail: pendingSessionCount > 0 ? `${pendingSessionCount} konsultasi menunggu pembayaran.` : 'Booking → bayar → chat & meeting aktif.', action: pendingSessionCount > 0 ? 'Bayar Sekarang' : 'Booking Konsultasi', onClick: pendingSessionCount > 0 ? onViewHistory : onBrowseLawyers }
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
                    onClick={nextConsultation ? () => onOpenConsultation?.(nextConsultation) : onBrowseLawyers}
                    className="w-full bg-white text-brand-black py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-all font-display"
                  >
                    {nextConsultation ? (nextConsultation.status === 'pending' ? t('payment.payNow') : t('consultation.openActive')) : t('dashboards.client.findLawyer')}
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

            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-bold font-display">Advokat Tersimpan</h2>
                <button
                  onClick={onBrowseLawyers}
                  className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black transition-colors"
                >
                  Cari Advokat
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {favoriteLawyers.map(lawyer => (
                  <div key={lawyer.id} className="rounded-2xl border border-brand-gray-100 bg-white p-5 flex items-center gap-4">
                    <img src={lawyer.image} alt={lawyer.name} className="w-14 h-14 rounded-2xl object-cover" />
                    <div>
                      <p className="text-sm font-bold">{lawyer.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">{lawyer.specialty}</p>
                      <p className="mt-1 text-xs font-bold">★ {lawyer.rating}</p>
                    </div>
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
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 text-right">{t('payment.walletLabel')}</span>
                </div>
                <div>
                  <p className="text-3xl font-bold font-display">Rp {paidPaymentTotal.toLocaleString('id-ID')}</p>
                  <p className="text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest mt-1">{pendingSessionCount} konsultasi siap dibuka</p>
                </div>
              </div>

              <div 
                onClick={pendingSessionCount > 0 ? onViewHistory : onViewDocuments}
                className="border-2 border-dashed border-brand-gray-200 bg-white/50 rounded-[32px] p-8 flex flex-col items-center justify-center space-y-3 group cursor-pointer hover:bg-white transition-all shadow-sm"
              >
                <div className="p-4 bg-brand-gray-100 rounded-2xl group-hover:bg-brand-black transition-colors shadow-sm">
                  <Upload className="w-5 h-5 text-brand-gray-400 group-hover:text-white" />
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1">{pendingSessionCount > 0 ? 'Buka Konsultasi' : 'Unggah Dokumen'}</p>
                  <p className="text-[8px] text-brand-gray-300 font-medium">{pendingSessionCount > 0 ? t('payment.completePaymentHint') : t('documents.uploadHint')}</p>
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
              <button onClick={() => setModal({ title: 'Filter Chat', description: 'Panel filter chat akan menampilkan pesan belum dibaca, dokumen masuk, dan percakapan aktif.' })} className="p-2 border border-brand-gray-100 rounded-xl hover:bg-brand-gray-50 transition-colors">
                <Filter className="w-4 h-4 text-brand-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
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
              <h2 className="text-2xl font-bold font-display">Konsultasi Aktif</h2>
              <button 
                onClick={onViewHistory}
                className="text-[10px] font-bold uppercase tracking-widest text-brand-black border-b-2 border-brand-black pb-1 hover:text-brand-gray-400 hover:border-brand-gray-400 transition-colors"
              >
                Lihat History
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
                        <p className="text-sm font-bold text-brand-black">Belum ada konsultasi aktif</p>
                        <p className="mt-2 text-xs font-medium text-brand-gray-500">Kasus selesai atau dibatalkan dipindahkan ke History Kasus.</p>
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
                            <p className="text-sm font-bold">{item.lawyer_directory?.name || 'Advokat'}</p>
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
                        <button
                          onClick={() => {
                            if (onOpenConsultation) {
                              onOpenConsultation(item);
                              return;
                            }
                            setModal({ title: `Detail ${item.id}`, description: `${copy.action} Konsultasi ini masih aktif, jadi belum masuk history sampai selesai atau dibatalkan.` });
                          }}
                          className="p-3 hover:bg-brand-black hover:text-white rounded-2xl transition-all text-brand-gray-200"
                        >
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
