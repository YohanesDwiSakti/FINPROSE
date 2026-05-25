import React, { useState } from 'react';
import { 
  ArrowLeft, Star, Clock, Globe, ShieldCheck, GraduationCap, 
  Award, Calendar, MessageSquare, Video, Phone, ChevronRight, 
  MapPin, CheckCircle2, User, Heart, Share2, Info
} from 'lucide-react';
import { Lawyer } from '../types';
import { ActionModal } from './ActionModal';

export const LawyerDetail = ({ 
  lawyer, 
  onBack,
  onAction
}: { 
  lawyer: Lawyer, 
  onBack: () => void,
  onAction: (type: 'chat' | 'video' | 'phone' | 'book') => void
}) => {
  const [selectedDay, setSelectedDay] = useState(lawyer.availability[0]?.day || '');
  const [selectedTime, setSelectedTime] = useState('');
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      {/* Header Navigation */}
      <nav className="sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-brand-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-sm font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <div className="flex items-center space-x-4">
            <button onClick={() => setModal({ title: 'Advokat Disimpan', description: `${lawyer.name} masuk ke daftar advokat favorit Anda.` })} className="p-2 hover:bg-brand-gray-50 rounded-full transition-colors text-brand-gray-400 hover:text-brand-black">
                <Heart className="w-5 h-5" />
            </button>
            <button onClick={() => setModal({ title: 'Bagikan Profil', description: `Link profil ${lawyer.name} siap dibagikan ke kontak Anda.` })} className="p-2 hover:bg-brand-gray-50 rounded-full transition-colors text-brand-gray-400 hover:text-brand-black">
                <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Left Content: Profile Info */}
          <div className="lg:col-span-2 space-y-12">
            {/* Hero Profile */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="relative">
                <img 
                  src={lawyer.image} 
                  alt={lawyer.name} 
                  className="w-40 h-40 rounded-[40px] object-cover shadow-2xl shadow-black/10 grayscale-[0.2]"
                />
                {lawyer.isOnline && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full border-4 border-white uppercase tracking-wider">
                        Online
                    </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold font-display tracking-tight">{lawyer.name}</h1>
                    <p className="text-lg font-bold text-brand-gray-400 uppercase tracking-widest text-sm">{lawyer.specialty}</p>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                        <Star className="w-5 h-5 fill-brand-black text-brand-black" />
                        <span className="text-lg font-bold">{lawyer.rating}</span>
                        <span className="text-sm font-medium text-brand-gray-400">({lawyer.reviewCount} Reviews)</span>
                    </div>
                    <div className="w-px h-6 bg-brand-gray-100"></div>
                    <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-brand-gray-400" />
                        <span className="text-lg font-bold">{lawyer.experience} Thn</span>
                        <span className="text-sm font-medium text-brand-gray-400">Pengalaman</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                    {lawyer.languages.map(lang => (
                        <span key={lang} className="px-3 py-1 bg-brand-gray-50 text-[10px] font-bold rounded-lg uppercase tracking-wider text-brand-gray-500 flex items-center space-x-1">
                            <Globe className="w-3 h-3" />
                            <span>{lang}</span>
                        </span>
                    ))}
                </div>
              </div>
            </div>

            {/* About Section */}
            <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Tentang Advokat</span>
                </h3>
                <p className="text-lg text-brand-gray-600 leading-relaxed font-medium">
                    {lawyer.description}
                </p>
            </section>

            {/* Experience & Education */}
            <div className="grid md:grid-cols-2 gap-12">
                <section className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black flex items-center space-x-2">
                        <GraduationCap className="w-4 h-4" />
                        <span>Pendidikan</span>
                    </h3>
                    <ul className="space-y-6">
                        {lawyer.education.map((edu, i) => (
                            <li key={i} className="flex space-x-4">
                                <div className="w-1.5 h-1.5 bg-brand-black rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm font-bold text-brand-gray-600 leading-relaxed">{edu}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black flex items-center space-x-2">
                        <Award className="w-4 h-4" />
                        <span>Sertifikasi & Izin</span>
                    </h3>
                    <ul className="space-y-6">
                        {lawyer.certifications.map((cert, i) => (
                            <li key={i} className="flex space-x-4">
                                <CheckCircle2 className="w-5 h-5 text-brand-black mt-0.5 flex-shrink-0" />
                                <span className="text-sm font-bold text-brand-gray-600 leading-relaxed">{cert}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>

            {/* Review Highlight */}
            <section className="p-8 bg-brand-gray-50 rounded-[40px] space-y-6 border border-brand-gray-100">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black">Testimoni Klien</h3>
                    <button onClick={() => setModal({ title: 'Semua Testimoni', description: `Menampilkan seluruh ulasan klien untuk ${lawyer.name}, termasuk rating, tag pengalaman, dan riwayat konsultasi.` })} className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black transition-colors">Lihat Semua</button>
                </div>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-brand-black text-brand-black" />)}
                        </div>
                        <p className="text-brand-gray-600 font-medium italic">"Beliau memberikan solusi yang sangat praktis dan mudah dipahami untuk kasus sengketa tanah yang saya hadapi. Sangat direkomendasikan!"</p>
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[10px] font-bold font-display border border-brand-gray-200">AS</div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Andika S. • 2 Minggu Lalu</span>
                        </div>
                    </div>
                </div>
            </section>
          </div>

          {/* Right Content: Consultation Sidebar */}
          <div className="space-y-8">
            <div className="bg-brand-black text-white p-8 rounded-[40px] shadow-2xl shadow-black/20 sticky top-32 space-y-8">
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Tarif Konsultasi</p>
                    <div className="flex items-baseline space-x-2">
                        <h4 className="text-4xl font-bold font-display">Rp {lawyer.price.toLocaleString('id-ID')}</h4>
                        <span className="text-xs font-bold text-zinc-500 uppercase">/ Sesi</span>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Pilih Hari</p>
                        <div className="flex flex-wrap gap-2">
                            {lawyer.availability.map(avail => (
                                <button 
                                    key={avail.day}
                                    onClick={() => setSelectedDay(avail.day)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${selectedDay === avail.day ? 'bg-white text-brand-black border-white' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                                >
                                    {avail.day}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Waktu Tersedia</p>
                        <div className="grid grid-cols-2 gap-2">
                            {lawyer.availability.find(a => a.day === selectedDay)?.times.map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setSelectedTime(t)}
                                    className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${selectedTime === t ? 'bg-white text-brand-black border-white' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={() => onAction('chat')}
                        className="w-full py-4 bg-white text-brand-black rounded-2xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3"
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span>Chat Sekarang</span>
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => onAction('video')}
                            className="bg-zinc-900 border border-zinc-800 py-4 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-zinc-800 transition-colors"
                        >
                            <Video className="w-4 h-4" />
                            <span className="text-[8px] font-bold uppercase tracking-widest">Video Call</span>
                        </button>
                        <button 
                            onClick={() => onAction('phone')}
                            className="bg-zinc-900 border border-zinc-800 py-4 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-zinc-800 transition-colors"
                        >
                            <Phone className="w-4 h-4" />
                            <span className="text-[8px] font-bold uppercase tracking-widest">Telepon</span>
                        </button>
                    </div>
                </div>

                <div className="bg-zinc-900/50 p-4 rounded-2xl flex items-start space-x-3 border border-zinc-900">
                    <Info className="w-4 h-4 text-zinc-600 mt-0.5" />
                    <p className="text-[9px] text-zinc-500 font-medium leading-relaxed uppercase tracking-wider">
                        Pembayaran aman & terenkripsi. Sesi Konsultasi berdurasi 60 Menit.
                    </p>
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* Recommended for you footer sticky */}
      <div className="max-w-5xl mx-auto px-6 py-24 border-t border-brand-gray-100">
        <h3 className="text-xl font-bold mb-12">Rekomendasi Lainnya</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-center space-x-4 p-4 border border-brand-gray-100 rounded-2xl hover:bg-brand-gray-50 transition-colors cursor-pointer group">
                <img src="https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=100" className="w-12 h-12 rounded-xl object-cover filter grayscale group-hover:grayscale-0 transition-all" alt="" />
                <div>
                    <h4 className="font-bold text-sm">Hendra Pratama, S.H.</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Hukum Properti</p>
                </div>
                <ArrowLeft className="w-4 h-4 rotate-180 ml-auto text-brand-gray-300" />
            </div>
            <div className="flex items-center space-x-4 p-4 border border-brand-gray-100 rounded-2xl hover:bg-brand-gray-50 transition-colors cursor-pointer group">
                <img src="https://images.unsplash.com/photo-1598550874175-4d0ef436c909?auto=format&fit=crop&q=80&w=100" className="w-12 h-12 rounded-xl object-cover filter grayscale group-hover:grayscale-0 transition-all" alt="" />
                <div>
                    <h4 className="font-bold text-sm">Dewi Lestari, S.H.</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Hukum Ketenagakerjaan</p>
                </div>
                <ArrowLeft className="w-4 h-4 rotate-180 ml-auto text-brand-gray-300" />
            </div>
        </div>
      </div>
    </div>
  );
};
