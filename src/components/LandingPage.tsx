import { motion } from 'motion/react';
import { 
  Search, Gavel, Scale, Briefcase, Users, ArrowUpRight, MessageSquare, 
  ShieldCheck, Star, Heart, FileText, Landmark, UserPlus, PhoneIncoming,
  CheckCircle2, Plus, Minus
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Lawyer } from '../types';
import { fetchLawyers } from '../api';

const Navbar = ({ onAuthClick }: { onAuthClick: () => void }) => {
  const [active, setActive] = useState('HOME');

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { id: 'faq', name: 'FAQ' },
        { id: 'advokat', name: 'ADVOKAT' },
        { id: 'layanan', name: 'LAYANAN' },
        { id: 'home', name: 'HOME' }
      ];

      for (const section of sections) {
        if (section.id === 'home') {
          if (window.scrollY < 200) {
            setActive('HOME');
            break;
          }
        } else {
          const el = document.getElementById(section.id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 200) {
              setActive(section.name);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string, name: string) => {
    setActive(name);
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(id);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  const navItems = [
    { name: 'HOME', id: 'home' },
    { name: 'LAYANAN', id: 'layanan' },
    { name: 'ADVOKAT', id: 'advokat' },
    { name: 'FAQ', id: 'faq' }
  ];

  return (
    <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full sticky top-0 bg-white/80 backdrop-blur-md z-50">
      <div className="text-2xl font-bold font-display tracking-tight cursor-pointer" onClick={() => scrollTo('home', 'HOME')}>Raw Law</div>
      <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-brand-gray-600 relative">
        {navItems.map((item) => (
          <button 
            key={item.name}
            onClick={() => scrollTo(item.id, item.name)}
            className={`relative py-1 transition-colors ${active === item.name ? 'text-brand-black font-bold' : 'hover:text-brand-black'}`}
          >
            {item.name}
            {active === item.name && (
              <motion.div 
                layoutId="navbar-indicator"
                className="absolute left-0 right-0 bottom-0 h-[2px] bg-brand-black"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center space-x-6">
        <button onClick={onAuthClick} className="btn-primary py-2 px-6 text-sm hover:scale-105 transition-transform">GET STARTED</button>
      </div>
    </nav>
  );
};

const Hero = ({ lawyers, onBrowse, onSelectLawyer }: { lawyers: Lawyer[], onBrowse: () => void, onSelectLawyer: (lawyer: Lawyer) => void }) => {
  const [term, setTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredLawyers = term ? lawyers.filter(l =>
    l.name.toLowerCase().includes(term.toLowerCase()) || 
    l.specialty.toLowerCase().includes(term.toLowerCase())
  ) : [];

  return (
    <section className="px-8 pt-12 pb-24 max-w-7xl mx-auto w-full">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-brand-gray-100 rounded-full">
            <div className="w-2 h-2 bg-brand-black rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Tersedia 24/7 di Seluruh Indonesia</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold font-display leading-[1.1] tracking-tight">
            Konsultasi Hukum <br />
            <span className="text-brand-gray-400 italic">Kapan Saja.</span>
          </h1>
          <p className="text-xl text-brand-gray-500 max-w-lg leading-relaxed">
            Dapatkan bantuan hukum praktis dari pengacara terverifikasi. Selesaikan masalah Anda tanpa ribet, langsung dari ponsel.
          </p>
          
          <div className="relative max-w-md group z-50">
            <div className="absolute inset-y-0 left-4 flex items-center pr-3 pointer-events-none">
              <Search className="w-5 h-5 text-brand-gray-400 group-focus-within:text-brand-black transition-colors" />
            </div>
            <input 
              type="text" 
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder="Cari spesialisasi pengacara (mis: Perceraian, Pajak)..." 
              className="block w-full p-5 pl-12 text-sm text-brand-black border border-brand-gray-200 rounded-2xl bg-white focus:ring-1 focus:ring-brand-black focus:border-brand-black outline-none shadow-sm transition-all"
            />
            <button onClick={onBrowse} className="absolute right-2 top-2 bottom-2 bg-brand-black text-white px-4 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-brand-gray-800 transition-colors">
              Cari
            </button>

            {showDropdown && term && (
              <div className="absolute top-full mt-2 w-full bg-white border border-brand-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {filteredLawyers.length > 0 ? filteredLawyers.map(l => (
                  <div key={l.id} onClick={() => onSelectLawyer(l)} className="p-3 hover:bg-brand-gray-50 cursor-pointer flex items-center space-x-3">
                    <img src={l.image} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <div className="text-sm font-bold">{l.name}</div>
                      <div className="text-xs text-brand-gray-500">{l.specialty}</div>
                    </div>
                  </div>
                )) : (
                  <div className="p-4 text-sm text-brand-gray-500 text-center">Tidak ada pengacara ditemukan</div>
                )}
              </div>
            )}
          </div>

          <button onClick={onBrowse} className="text-sm font-bold underline underline-offset-4 uppercase tracking-widest">
            Lihat Advokat Tersedia
          </button>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative hidden md:block"
        >
          <div className="rounded-3xl overflow-hidden shadow-2xl">
            <img 
              src="/hero.png" 
              alt="Professional Lawyer" 
              className="w-full h-[600px] object-cover grayscale-[0.2]"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl max-w-[240px] border border-brand-gray-100">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-gray-400">Terverifikasi</span>
            </div>
            <p className="text-sm font-medium">Semua mitra hukum kami telah melewati screening ketat.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const LegalCategories = ({ onBrowse }: { onBrowse: () => void }) => {
  const categories = [
    { title: 'Perceraian', icon: Heart, desc: 'Mediasi dan pendampingan hukum keluarga.' },
    { title: 'Bisnis/Kontrak', icon: Briefcase, desc: 'Penyusunan dan tinjauan legalitas bisnis.' },
    { title: 'Pidana', icon: Gavel, desc: 'Pembelaan hukum pidana tingkat nasional.' },
    { title: 'Perdata', icon: Scale, desc: 'Sengketa tanah, hutang, dan wanprestasi.' },
    { title: 'Ketenagakerjaan', icon: Users, desc: 'Sengketa PHK dan kontrak kerja.' },
    { title: 'Pajak', icon: Landmark, desc: 'Konsultasi audit dan kepatuhan perpajakan.' },
    { title: 'Hak Waris', icon: FileText, desc: 'Pembagian aset dan sengketa waris.' },
  ];

  return (
    <section id="layanan" className="bg-brand-gray-50 py-24 px-8">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 space-y-4 md:space-y-0">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold font-display relative">
              Kategori Masalah Hukum
              <div className="absolute -bottom-4 left-0 w-16 h-1 bg-brand-black"></div>
            </h2>
            <p className="text-brand-gray-500 max-w-md">Bantuan hukum spesifik untuk setiap kebutuhan legalitas Anda.</p>
          </div>
          <button onClick={onBrowse} className="text-sm font-bold underline hover:text-brand-gray-500 transition-colors uppercase tracking-widest">Semua Kategori</button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, i) => (
            <motion.div 
              key={cat.title}
              whileHover={{ y: -8 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
              onClick={onBrowse}
              className="bg-white p-8 rounded-2xl border border-brand-gray-100 flex flex-col items-start space-y-4 group cursor-pointer"
            >
              <div className="p-3 bg-brand-gray-50 rounded-xl group-hover:bg-brand-black group-hover:text-white transition-colors">
                <cat.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">{cat.title}</h3>
              <p className="text-sm text-brand-gray-500 leading-relaxed">{cat.desc}</p>
            </motion.div>
          ))}
          <div onClick={onBrowse} className="bg-brand-black text-white p-8 rounded-2xl flex flex-col justify-center items-center text-center space-y-4 cursor-pointer hover:bg-brand-gray-800 transition-colors">
            <Plus className="w-8 h-8" />
            <h3 className="text-lg font-bold">Lainnya</h3>
            <p className="text-xs text-brand-gray-400">Temukan spesialisasi lainnya</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    { 
      icon: UserPlus, 
      title: 'Pilih Pengacara', 
      desc: 'Cari berdasarkan spesialisasi, rating, dan pengalaman yang sesuai.' 
    },
    { 
      icon: MessageSquare, 
      title: 'Konsultasi Langsung', 
      desc: 'Hubungi via chat atau video call secara instan untuk diagnosa masalah.' 
    },
    { 
      icon: PhoneIncoming, 
      title: 'Dapatkan Solusi', 
      desc: 'Terima saran hukum tertulis atau tindak lanjut pendampingan kasus.' 
    }
  ];

  return (
    <section className="py-24 px-8 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <h2 className="text-4xl font-bold font-display text-center mb-16 underline decoration-brand-gray-200 underline-offset-8">Cara Kerja Raw Law</h2>
        
        <div className="grid md:grid-cols-3 gap-12 relative">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center space-y-6 z-10">
              <div className="w-20 h-20 rounded-[30px] bg-brand-gray-50 flex items-center justify-center border border-brand-gray-100 relative">
                <step.icon className="w-8 h-8 text-brand-black" />
                <div className="absolute -top-2 -right-2 bg-brand-black text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-4 border-white">
                  {i + 1}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-brand-gray-500 text-sm leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            </div>
          ))}
          {/* Connector line for desktop */}
          <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px border-t-2 border-dashed border-brand-gray-100 -z-0"></div>
        </div>
      </div>
    </section>
  );
};

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  const faqs = [
    { q: "Berapa biaya konsultasi di Raw Law?", a: "Biaya bervariasi tergantung pada spesialisasi dan jam terbang pengacara. Anda bisa melihat tarif transparan di setiap profil sebelum memulai." },
    { q: "Apakah kerahasiaan kasus saya terjamin?", a: "Ya, Raw Law menggunakan enkripsi end-to-end dan setiap mitra pengacara terikat oleh kode etik kerahasiaan klien (Attorney-Client Privilege)." },
    { q: "Bagaimana jika saya tidak puas dengan konsultasi?", a: "Kami memiliki jaminan kepuasan. Jika ada kendala teknis atau pengacara tidak merespon, dana Anda akan dikembalikan sepenuhnya." },
    { q: "Dapatkah saya berkonsultasi di luar jam kerja?", a: "Tentu! Banyak pengacara kami yang tersedia pada malam hari atau akhir pekan untuk situasi darurat." }
  ];

  return (
    <section id="faq" className="bg-brand-gray-50 py-24 px-8">
      <div className="max-w-3xl mx-auto w-full">
        <h2 className="text-4xl font-bold font-display text-center mb-16">Pertanyaan Umum</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-brand-gray-100">
              <button 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-bold text-lg">{faq.q}</span>
                {openIndex === i ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
              {openIndex === i && (
                <div className="px-6 pb-6 text-brand-gray-500 text-sm leading-relaxed animate-in fade-in slide-in-from-top-2">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const RecommendedLawyers = ({ lawyers, onBrowse }: { lawyers: Lawyer[], onBrowse: () => void }) => {
  return (
    <section id="advokat" className="bg-brand-black text-white py-24 px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-16">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold font-display">Advokat Rekomendasi</h2>
            <p className="text-zinc-500 max-w-sm">Daftar advokat pilihan dengan tingkat kepuasan klien tertinggi bulan ini.</p>
          </div>
          <button onClick={onBrowse} className="hidden sm:block text-sm underline text-zinc-400 hover:text-white transition-colors">Lihat Semua Advokat</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {lawyers.slice(0, 3).map((lawyer, i) => (
            <motion.div
              key={lawyer.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              onClick={onBrowse}
              className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5 group hover:bg-zinc-900 transition-all cursor-pointer"
            >
              <div className="mb-6 flex justify-between items-start">
                <div className="relative">
                  <img 
                    src={lawyer.image} 
                    alt={lawyer.name} 
                    className="w-20 h-20 rounded-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-brand-black p-1 rounded-full border border-white/10">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1 mb-1">
                    <Star className="w-3 h-3 fill-white text-white" />
                    <span className="text-sm font-bold">{lawyer.rating}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">120+ Konsul</span>
                </div>
              </div>
              <h4 className="text-xl font-bold mb-1">{lawyer.name}</h4>
              <p className="text-zinc-400 text-sm mb-6 italic">{lawyer.specialty}</p>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBrowse();
                }}
                className="w-full py-4 bg-white text-brand-black rounded-full text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center space-x-2"
              >
                <span>Konsultasi Sekarang</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
          {lawyers.length === 0 && (
            <div className="col-span-full rounded-3xl border border-white/10 bg-zinc-900/50 p-10 text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Belum ada advokat aktif</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const CTASection = ({ onBrowse, onStart }: { onBrowse: () => void, onStart: () => void }) => {
  return (
    <section className="py-32 px-8 bg-white relative overflow-hidden">
      <div className="max-w-4xl mx-auto w-full text-center relative z-10 space-y-10">
        <div className="p-4 bg-brand-gray-50 rounded-3xl w-fit mx-auto animate-bounce">
          <Gavel className="w-10 h-10" />
        </div>
        <h2 className="text-6xl md:text-7xl font-bold font-display leading-tight tracking-tight">
          Masalah Hukum Sering Datang <br />
          <span className="text-brand-gray-400 italic">Tanpa Menunggu.</span>
        </h2>
        <p className="text-brand-gray-500 text-xl max-w-2xl mx-auto">
          Jangan tunda perlindungan hukum Anda. Mulai obrolan dengan ahli hukum terpercaya hari ini juga.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button onClick={onBrowse} className="btn-primary py-5 px-12 text-lg shadow-2xl shadow-black/20 hover:scale-105 transition-transform">
                Cari Pengacara
            </button>
            <button onClick={onStart} className="px-12 py-5 text-lg font-bold uppercase tracking-widest border border-brand-gray-200 rounded-full hover:bg-brand-gray-50 transition-all">
                Daftar Sekarang
            </button>
        </div>
      </div>
      
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[300px] font-bold text-brand-gray-50 -z-0 select-none opacity-50">RL</div>
      
      {/* Floating Chat Bubble */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <button onClick={onBrowse} className="bg-brand-black text-white p-5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-110 transition-transform flex items-center justify-center">
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-brand-gray-50 py-12 px-8 border-t border-brand-gray-200">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="md:col-span-1 space-y-6">
          <div className="text-brand-black text-2xl font-bold font-display">Raw Law</div>
          <p className="text-sm text-brand-gray-400 font-medium leading-relaxed uppercase tracking-widest text-[10px]">
            Platform Konsultasi Hukum Digital No. 1 di Indonesia.
          </p>
        </div>
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-brand-black">Perusahaan</h4>
          <ul className="text-sm text-brand-gray-400 space-y-2 font-medium">
            <li><a href="#" className="hover:text-brand-black">Tentang Kami</a></li>
            <li><a href="#" className="hover:text-brand-black">Karir</a></li>
            <li><a href="#" className="hover:text-brand-black">Media Kit</a></li>
          </ul>
        </div>
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-brand-black">Bantuan</h4>
          <ul className="text-sm text-brand-gray-400 space-y-2 font-medium">
            <li><a href="#" className="hover:text-brand-black">Pusat Bantuan</a></li>
            <li><a href="#" className="hover:text-brand-black">Kontak Kami</a></li>
            <li><a href="#" className="hover:text-brand-black">Status Layanan</a></li>
          </ul>
        </div>
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-brand-black">Legal</h4>
          <ul className="text-sm text-brand-gray-400 space-y-2 font-medium">
            <li><a href="#" className="hover:text-brand-black">Kebijakan Privasi</a></li>
            <li><a href="#" className="hover:text-brand-black">Syarat & Ketentuan</a></li>
            <li><a href="#" className="hover:text-brand-black">Informasi Hukum</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest border-t border-brand-gray-200 pt-8">
        <p>© 2024 Raw Law. Made with Precision.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <a href="#">Instagram</a>
          <a href="#">LinkedIn</a>
          <a href="#">Twitter</a>
        </div>
      </div>
    </footer>
  );
};

export const LandingPage = ({ onEnterApp, onBrowseLawyers, onSelectLawyer }: { 
  onEnterApp: () => void,
  onBrowseLawyers: () => void,
  onSelectLawyer: (lawyer: any) => void
}) => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchLawyers()
      .then(items => {
        if (mounted) setLawyers(items);
      })
      .catch(() => {
        if (mounted) setLawyers([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen selection:bg-brand-black selection:text-white scroll-smooth">
      <Navbar onAuthClick={onEnterApp} />
      <Hero lawyers={lawyers} onBrowse={onBrowseLawyers} onSelectLawyer={onSelectLawyer} />
      <HowItWorks />
      <LegalCategories onBrowse={onBrowseLawyers} />
      <RecommendedLawyers lawyers={lawyers} onBrowse={onBrowseLawyers} />
      <FAQSection />
      <CTASection onBrowse={onBrowseLawyers} onStart={onEnterApp} />
      <Footer />
    </div>
  );
};
