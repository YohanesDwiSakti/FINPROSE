import React, { useState } from 'react';
import { 
  ArrowLeft, Search, HelpCircle, ShieldCheck, 
  RefreshCcw, BookOpen, MessageCircle, ChevronDown, 
  ChevronRight, LifeBuoy, Mail, Phone, Globe, Gavel
} from 'lucide-react';
import { ActionModal } from './ActionModal';

interface FAQItem {
  question: string;
  answer: string;
  category: 'platform' | 'legal' | 'payment' | 'privacy';
}

export const HelpPage = ({ onBack }: { onBack: () => void }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'Bagaimana cara memulai konsultasi hukum?',
      answer: 'Cari advokat yang sesuai dengan kebutuhan Anda di halaman "Cari Advokat", pilih paket konsultasi, tentukan jadwal, selesaikan pembayaran, dan Anda akan langsung terhubung melalui chat atau video call pada waktu yang ditentukan.',
      category: 'platform'
    },
    {
      question: 'Apakah saya bisa mengajukan refund jika konsultasi batal?',
      answer: 'Ya, Anda dapat mengajukan refund penuh jika pembatalan dilakukan minimal 24 jam sebelum jadwal konsultasi. Jika pembatalan dilakukan oleh advokat, dana Anda akan dikembalikan secara otomatis 100%.',
      category: 'payment'
    },
    {
      question: 'Bagaimana kerahasiaan data saya dijamin?',
      answer: 'Privasi Anda adalah prioritas kami. Semua chat dan dokumen dienkripsi end-to-end (AES-256). Bahkan pihak platform tidak dapat mengakses isi percakapan Anda tanpa izin eksplisit dalam kasus sengketa.',
      category: 'privacy'
    },
    {
      question: 'Apa perbedaan konsultasi Pro dan Basic?',
      answer: 'Paket Pro mencakup review dokumen hukum mendalam dan draf surat tanggapan, sementara paket Basic berfokus pada saran hukum lisan dan jawaban atas pertanyaan umum.',
      category: 'legal'
    },
    {
      question: 'Bagaimana jika koneksi terputus saat video call?',
      answer: 'Jangan khawatir. Sistem kami akan mencoba menghubungkan kembali secara otomatis. Jika sesi tetap tidak dapat dilanjutkan, Anda dapat mengajukan jadwal ulang gratis melalui bantuan admin.',
      category: 'platform'
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    (activeCategory === 'all' || faq.category === activeCategory) &&
    (faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-brand-gray-50 flex flex-col font-sans">
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      <header className="bg-white border-b border-brand-gray-100 p-8 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button onClick={onBack} className="p-2 hover:bg-brand-gray-50 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-brand-black" />
            </button>
            <div>
              <h1 className="text-xl font-bold font-display">Pusat Bantuan.</h1>
              <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest mt-1">Kami siap membantu masalah hukum Anda</p>
            </div>
          </div>
          <div className="p-3 bg-brand-gray-50 rounded-2xl">
            <LifeBuoy className="w-6 h-6 text-brand-black" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-8 space-y-12 pb-24">
        {/* Search & Categories */}
        <section className="space-y-8 text-center pt-8">
          <div className="max-w-xl mx-auto relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-300 group-focus-within:text-brand-black transition-colors" />
            <input 
              type="text" 
              placeholder="Cari solusi kendala Anda..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-brand-gray-100 rounded-[32px] py-6 px-16 text-sm font-medium outline-none focus:border-brand-black transition-all shadow-xl shadow-black/5"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              { id: 'all', label: 'Semua', icon: BookOpen },
              { id: 'platform', label: 'Cara Pakai', icon: LifeBuoy },
              { id: 'payment', label: 'Refund & Biaya', icon: RefreshCcw },
              { id: 'privacy', label: 'Keamanan', icon: ShieldCheck },
              { id: 'legal', label: 'Layanan', icon: Gavel },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center space-x-2 ${
                  activeCategory === cat.id 
                    ? 'bg-brand-black border-brand-black text-white shadow-lg shadow-black/10' 
                    : 'bg-white border-brand-gray-100 text-brand-gray-400 hover:border-brand-gray-300'
                }`}
              >
                <cat.icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black px-4">Pertanyaan Populer</h3>
          <div className="bg-white rounded-[40px] border border-brand-gray-100 overflow-hidden shadow-sm">
            {filteredFaqs.map((faq, idx) => (
              <div key={idx} className="border-b last:border-b-0 border-brand-gray-50">
                <button 
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  className="w-full px-8 py-6 flex items-center justify-between hover:bg-brand-gray-50 transition-colors text-left"
                >
                  <span className="text-sm font-bold text-brand-black">{faq.question}</span>
                  <ChevronDown className={`w-4 h-4 text-brand-gray-300 transition-transform ${openIndex === idx ? 'rotate-180 text-brand-black' : ''}`} />
                </button>
                {openIndex === idx && (
                  <div className="px-8 pb-8 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-xs text-brand-gray-400 font-medium leading-relaxed uppercase tracking-wider">{faq.answer}</p>
                    <div className="mt-4 flex items-center space-x-4">
                       <span className="text-[9px] font-bold text-brand-gray-300 uppercase tracking-widest">Apakah ini membantu?</span>
                       <div className="flex items-center space-x-2">
                          <button onClick={() => setModal({ title: 'Terima kasih', description: 'Masukan Anda membantu kami meningkatkan pusat bantuan FINPROSE.' })} className="px-3 py-1 bg-brand-gray-50 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-brand-black hover:text-white transition-all">Ya</button>
                          <button onClick={() => setModal({ title: 'Masukan Dicatat', description: 'Artikel ini akan ditandai untuk ditinjau ulang oleh admin konten.' })} className="px-3 py-1 bg-brand-gray-50 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-brand-black hover:text-white transition-all">Tidak</button>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filteredFaqs.length === 0 && (
              <div className="p-20 text-center text-brand-gray-400">
                 <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                 <p className="text-xs font-bold uppercase tracking-widest">Tidak ada hasil yang sesuai</p>
              </div>
            )}
          </div>
        </section>

        {/* Contact Support */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-brand-black text-white p-12 rounded-[48px] space-y-8 shadow-2xl shadow-black/20">
              <div className="space-y-2">
                 <h3 className="text-3xl font-bold font-display">Masih bingung?</h3>
                 <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest leading-relaxed">Tim dukungan premium kami siap melayani Anda secara personal.</p>
              </div>
              <div className="space-y-4">
                 {[
                   { icon: Mail, label: 'Email Kami', val: 'support@rawlaw.id' },
                   { icon: MessageCircle, label: 'Live Chat', val: '24/7 Available' },
                   { icon: Phone, label: 'Hotline', val: '+62 21 0000 0000' },
                 ].map(item => (
                   <div key={item.label} onClick={() => setModal({ title: item.label, description: `Tim bantuan akan menghubungi Anda melalui ${item.val}.` })} className="flex items-center space-x-4 p-4 bg-zinc-800 rounded-2xl group cursor-pointer hover:bg-white hover:text-brand-black transition-all">
                      <item.icon className="w-4 h-4" />
                      <div>
                         <p className="text-[8px] font-bold uppercase tracking-widest opacity-50">{item.label}</p>
                         <p className="text-[10px] font-bold uppercase tracking-widest">{item.val}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-brand-gray-50 border border-brand-gray-100 p-12 rounded-[48px] flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest">Informasi Hukum Utama</h4>
                <div className="space-y-2">
                   {[
                     'Kebijakan Privasi Data',
                     'Syarat & Ketentuan Pengguna',
                     'Kode Etik Advokat Partner',
                     'Ketentuan Refund & Retensi',
                   ].map(link => (
                     <button key={link} onClick={() => setModal({ title: link, description: 'Dokumen kebijakan ini akan dibuka sebagai halaman legal terpisah pada versi production.' })} className="w-full flex items-center justify-between p-4 bg-white border border-brand-gray-100 rounded-2xl group hover:border-brand-black transition-all">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-brand-gray-400 group-hover:text-brand-black transition-colors">{link}</span>
                        <ChevronRight className="w-3 h-3 text-brand-gray-200 group-hover:text-brand-black transition-all" />
                     </button>
                   ))}
                </div>
              </div>
              <div className="mt-8 flex items-center justify-center space-x-2 text-brand-gray-300">
                <Globe className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase tracking-widest">RAW LAW GLOBAL | ID</span>
              </div>
           </div>
        </section>
      </main>
    </div>
  );
};
