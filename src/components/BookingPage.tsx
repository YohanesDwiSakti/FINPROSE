import React, { useState } from 'react';
import { 
  ArrowLeft, MessageSquare, FileText, ChevronRight, ShieldCheck, Video, Phone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Lawyer, ConsultationType } from '../types';
import { createConsultation, getStoredUser } from '../api';

export const BookingPage = ({ 
  lawyer, 
  onBack,
  onConfirm
}: { 
  lawyer: Lawyer, 
  onBack: () => void,
  onConfirm: (data: any) => void
}) => {
  const { t } = useTranslation();
  const [selectedDay, setSelectedDay] = useState(lawyer.availability[0]?.day || '');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedType, setSelectedType] = useState<ConsultationType>(ConsultationType.CHAT);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const estimatedPrice = lawyer.price;

  const handleConfirm = async () => {
    if (!selectedDay || !selectedTime) return;
    setMessage('');
    setIsSaving(true);

    try {
      const user = getStoredUser();
      if (!user?.id) {
        setMessage(t('booking.loginRequired'));
        return;
      }

      const consultation = await createConsultation({
        clientId: user.id,
        lawyerId: lawyer.id,
        type: selectedType,
        day: selectedDay,
        time: selectedTime,
        notes,
        price: estimatedPrice
      });

      onConfirm({
        ...consultation,
        lawyerId: lawyer.id,
        lawyer,
        lawyerName: lawyer.name,
        type: selectedType,
        day: selectedDay,
        time: selectedTime,
        notes,
        price: estimatedPrice
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('booking.failed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-gray-50 flex flex-col">
      <header className="bg-white border-b border-brand-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-sm font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('common.back')}</span>
          </button>
          <h1 className="text-xl font-bold font-display">{t('booking.title')}</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Lawyer Summary Card */}
          <section className="bg-white p-6 rounded-3xl border border-brand-gray-100 flex items-center space-x-6">
            <img src={lawyer.image} alt={lawyer.name} className="w-20 h-20 rounded-2xl object-cover grayscale-[0.2]" />
            <div>
              <h3 className="text-lg font-bold">{lawyer.name}</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-gray-400">{lawyer.specialty}</p>
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-brand-gray-100 flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-black text-white flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black">Sesi Konsultasi</h4>
              <p className="mt-2 text-sm font-medium text-brand-gray-500 leading-relaxed">
                Semua konsultasi dibuka lewat ruang chat YDA LAW OFFICE & Partners. Dari dalam chat, Anda bisa langsung memakai telepon atau video call.
              </p>
            </div>
          </section>

          {/* Schedule Selection */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black">1. Pilih Tipe Konsultasi</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { type: ConsultationType.CHAT, label: 'Chat Consultation', icon: MessageSquare },
                { type: ConsultationType.VOICE, label: 'Voice Call Consultation', icon: Phone },
                { type: ConsultationType.VIDEO, label: 'Video Consultation', icon: Video },
                { type: ConsultationType.DOCUMENT_REVIEW, label: 'Document Review Consultation', icon: FileText }
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => setSelectedType(item.type)}
                  className={`rounded-2xl border p-4 text-left transition-all ${selectedType === item.type ? 'border-brand-black bg-brand-gray-50' : 'border-brand-gray-100 bg-white'}`}
                >
                  <item.icon className="mb-3 h-5 w-5" />
                  <p className="text-sm font-bold">{item.label}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black">2. Pilih Jadwal</h4>
            <div className="bg-white p-8 rounded-3xl border border-brand-gray-100 space-y-8">
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">Hari Tersedia</p>
                <div className="flex flex-wrap gap-2">
                  {lawyer.availability.map(avail => (
                    <button
                      key={avail.day}
                      onClick={() => { setSelectedDay(avail.day); setSelectedTime(''); }}
                      className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${selectedDay === avail.day ? 'bg-brand-gray-50 border-brand-black text-brand-black' : 'border-brand-gray-100 text-brand-gray-400 hover:border-brand-gray-200'}`}
                    >
                      {avail.day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">Waktu Tersedia</p>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {lawyer.availability.find(a => a.day === selectedDay)?.times.map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${selectedTime === t ? 'bg-brand-gray-50 border-brand-black text-brand-black shadow-inner' : 'border-brand-gray-100 text-brand-gray-400 hover:border-brand-gray-200'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Legal Notes */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black">2. Catatan Masalah Hukum</h4>
            <div className="relative">
                <FileText className="absolute left-4 top-5 w-5 h-5 text-brand-gray-300" />
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ceritakan singkat permasalahan hukum Anda agar advokat dapat mempelajari kasus terlebih dahulu..."
                    className="w-full bg-white p-5 pl-12 rounded-3xl border border-brand-gray-100 focus:border-brand-gray-300 outline-none h-40 resize-none text-sm font-medium leading-relaxed"
                />
            </div>
          </section>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-brand-gray-100 sticky top-36 space-y-8 shadow-xl shadow-black/5">
            <h3 className="text-lg font-bold border-b border-brand-gray-50 pb-4">Ringkasan Pesanan</h3>
            
            <div className="space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-brand-gray-400 font-medium">Jenis</span>
                    <span className="font-bold">Sesi Konsultasi</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-brand-gray-400 font-medium">Jadwal</span>
                    <span className="font-bold">{selectedDay || '-'}, {selectedTime || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-brand-gray-400 font-medium">Durasi</span>
                    <span className="font-bold">60 Menit</span>
                </div>
                <div className="h-px bg-brand-gray-50"></div>
                <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold uppercase tracking-widest">Total Estimasi</span>
                    <span className="text-2xl font-bold font-display">Rp {estimatedPrice.toLocaleString('id-ID')}</span>
                </div>
            </div>

            <button 
              disabled={!selectedDay || !selectedTime || isSaving}
              onClick={handleConfirm}
              className="w-full btn-primary py-5 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-black/10"
            >
              <span className="text-xs font-bold uppercase tracking-widest">{isSaving ? 'Menyimpan...' : 'Konfirmasi Booking'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {message && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-700">
                {message}
              </div>
            )}

            <div className="flex items-start space-x-3 p-4 bg-brand-gray-50 rounded-2xl">
                <ShieldCheck className="w-5 h-5 text-brand-black flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-brand-gray-500 font-medium leading-relaxed uppercase tracking-wider">
                    Privasi Anda dilindungi. Dana hanya diteruskan setelah sesi konsultasi selesai.
                </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
