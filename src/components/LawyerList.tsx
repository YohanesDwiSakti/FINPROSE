import { useEffect, useMemo, useState } from 'react';
import { 
  Search, Filter, Star, Clock, Globe, ShieldCheck, 
  ChevronRight, ArrowLeft, X, Check, SlidersHorizontal 
} from 'lucide-react';
import { CATEGORIES, LANGUAGES } from '../constants';
import { Lawyer } from '../types';
import { fetchLawyers } from '../api';
import { paginate } from '../services/platformData';

export const LawyerList = ({ onBack, onSelectLawyer }: { 
  onBack: () => void, 
  onSelectLawyer: (lawyer: Lawyer) => void 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 4500000]);
  const [minExperience, setMinExperience] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchLawyers()
      .then((items) => {
        if (mounted) {
          setLawyers(items);
        }
      })
      .catch((error) => {
        if (mounted) setLoadError(error.message || 'Gagal memuat advokat dari server');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredLawyers = useMemo(() => {
    return lawyers.filter(lawyer => {
      const matchesSearch = lawyer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           lawyer.specialty.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || lawyer.specialty.includes(selectedCategory);
      const matchesLanguage = !selectedLanguage || lawyer.languages.includes(selectedLanguage);
      const matchesOnline = !onlineOnly || lawyer.isOnline;
      const matchesPrice = lawyer.price >= priceRange[0] && lawyer.price <= priceRange[1];
      const matchesExp = lawyer.experience >= minExperience;
      
      return matchesSearch && matchesCategory && matchesLanguage && matchesOnline && matchesPrice && matchesExp;
    });
  }, [lawyers, searchTerm, selectedCategory, selectedLanguage, onlineOnly, priceRange, minExperience]);

  const paged = paginate<Lawyer>(filteredLawyers, page, pageSize);

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-40 border-b border-brand-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={onBack}
              className="flex items-center space-x-2 text-sm font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <div className="text-xl font-bold font-display">Directory</div>
            <div className="w-10"></div> {/* Spacer */}
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-400 group-focus-within:text-brand-black transition-colors" />
              <input 
                type="text" 
                placeholder="Cari nama atau spesialisasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-brand-gray-50 border border-transparent focus:border-brand-gray-200 rounded-2xl outline-none transition-all shadow-sm"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl border transition-all ${showFilters ? 'bg-brand-black text-white border-brand-black' : 'bg-white border-brand-gray-200 text-brand-black hover:bg-brand-gray-50'}`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-widest">Filter</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex gap-8">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0 space-y-8 h-fit sticky top-40">
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Kategori</h4>
            <div className="space-y-2">
              <button 
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-all ${!selectedCategory ? 'bg-brand-black text-white' : 'hover:bg-brand-gray-50'}`}
              >
                Semua Bidang
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedCategory === cat ? 'bg-brand-black text-white' : 'hover:bg-brand-gray-50'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Status</h4>
            <label className="flex items-center space-x-3 cursor-pointer group">
              <div 
                onClick={() => setOnlineOnly(!onlineOnly)}
                className={`w-12 h-6 rounded-full relative transition-all ${onlineOnly ? 'bg-green-500' : 'bg-brand-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${onlineOnly ? 'left-7' : 'left-1'}`}></div>
              </div>
              <span className="text-sm font-bold">Online Sekarang</span>
            </label>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Bahasa</h4>
            <div className="space-y-2">
              <button 
                onClick={() => setSelectedLanguage(null)}
                className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-all ${!selectedLanguage ? 'bg-brand-black text-white' : 'hover:bg-brand-gray-50'}`}
              >
                Semua Bahasa
              </button>
              {LANGUAGES.map(lang => (
                <button 
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedLanguage === lang ? 'bg-brand-black text-white' : 'hover:bg-brand-gray-50'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Pengalaman Minimal</h4>
            <select 
              value={minExperience}
              onChange={(e) => setMinExperience(Number(e.target.value))}
              className="w-full p-3 bg-brand-gray-50 border border-brand-gray-100 rounded-xl text-sm outline-none font-medium"
            >
              <option value={0}>Semua Pengalaman</option>
              <option value={5}>5+ Tahun</option>
              <option value={10}>10+ Tahun</option>
              <option value={15}>15+ Tahun</option>
            </select>
          </div>
        </aside>

        {/* Lawyer Grid */}
        <main className="flex-1 space-y-6">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 bg-brand-gray-50 p-4 rounded-xl">
            <span>{isLoading ? 'Memuat advokat...' : `Menampilkan ${paged.items.length} dari ${paged.total} Advokat`}</span>
            <div className="flex items-center space-x-2">
              <span className="text-brand-black">Urutkan:</span>
              <select className="bg-transparent text-brand-black outline-none border-none">
                <option>Rekomendasi</option>
                <option>Rating Tertinggi</option>
                <option>Harga Terendah</option>
              </select>
            </div>
          </div>

          {loadError && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-medium text-amber-700">
              {loadError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
            {paged.items.map(lawyer => (
              <div 
                key={lawyer.id}
                onClick={() => onSelectLawyer(lawyer)}
                className="bg-white border border-brand-gray-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-black/5 transition-all cursor-pointer group"
              >
                <div className="flex gap-6 mb-6">
                  <div className="relative flex-shrink-0">
                    <img 
                      src={lawyer.image} 
                      alt={lawyer.name} 
                      className="w-24 h-24 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${lawyer.isOnline ? 'bg-green-500' : 'bg-brand-gray-300'}`}></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold group-hover:text-brand-gray-600 transition-colors">{lawyer.name}</h3>
                      <ShieldCheck className="w-4 h-4 text-brand-black" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-gray-400">{lawyer.specialty}</p>
                    <div className="flex items-center space-x-4 mt-4">
                        <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 fill-brand-black text-brand-black" />
                            <span className="text-sm font-bold">{lawyer.rating}</span>
                            <span className="text-[10px] font-bold text-brand-gray-300">({lawyer.reviewCount})</span>
                        </div>
                        <div className="w-1 h-1 bg-brand-gray-200 rounded-full"></div>
                        <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4 text-brand-gray-400" />
                            <span className="text-sm font-bold">{lawyer.experience} Thn</span>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {lawyer.languages.map(lang => (
                        <span key={lang} className="px-3 py-1 bg-brand-gray-50 text-[10px] font-bold rounded-lg uppercase tracking-wider text-brand-gray-500">
                            {lang}
                        </span>
                    ))}
                  </div>
                  
                  <div className="h-px bg-brand-gray-50 w-full"></div>

                  <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-300 mb-1">Mulai Dari</p>
                        <p className="text-lg font-bold">Rp {lawyer.price.toLocaleString('id-ID')}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLawyer(lawyer);
                      }}
                      className="px-6 py-3 bg-brand-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center space-x-2"
                    >
                        <span>Konsultasi</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredLawyers.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-brand-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-8 h-8 text-brand-gray-300" />
                </div>
                <h3 className="text-xl font-bold">Tidak ada advocat ditemukan</h3>
                <p className="text-brand-gray-400 font-medium">Coba ubah filter atau kata kunci pencarian Anda.</p>
                <button 
                    onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory(null);
                        setOnlineOnly(false);
                    }}
                    className="text-sm font-bold underline underline-offset-4"
                >
                    Reset Semua Filter
                </button>
              </div>
            )}
          </div>

          {paged.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="rounded-xl border border-brand-gray-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                Halaman {page} / {paged.totalPages}
              </span>
              <button
                disabled={page >= paged.totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-xl border border-brand-gray-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filter Overlay */}
      {showFilters && (
        <div className="fixed inset-0 bg-white z-[60] lg:hidden animate-in fade-in slide-in-from-bottom-10">
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-bold font-display">Filters</h2>
              <button onClick={() => setShowFilters(false)} className="p-2 bg-brand-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-12 pb-12">
              <div className="space-y-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-brand-black">Kategori Masalah</h4>
                <div className="flex flex-wrap gap-3">
                  {['Semua Bidang', ...CATEGORIES].map(cat => {
                    const isAll = cat === 'Semua Bidang';
                    const active = isAll ? !selectedCategory : selectedCategory === cat;
                    return (
                        <button 
                            key={cat}
                            onClick={() => setSelectedCategory(isAll ? null : cat)}
                            className={`px-6 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest border transition-all ${active ? 'bg-brand-black text-white border-brand-black' : 'border-brand-gray-200 text-brand-gray-400'}`}
                        >
                            {cat}
                        </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-brand-black">Bahasa</h4>
                <div className="flex flex-wrap gap-3">
                  {['Semua Bahasa', ...LANGUAGES].map(lang => {
                    const isAll = lang === 'Semua Bahasa';
                    const active = isAll ? !selectedLanguage : selectedLanguage === lang;
                    return (
                        <button 
                            key={lang}
                            onClick={() => setSelectedLanguage(isAll ? null : lang)}
                            className={`px-6 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest border transition-all ${active ? 'bg-brand-black text-white border-brand-black' : 'border-brand-gray-200 text-brand-gray-400'}`}
                        >
                            {lang}
                        </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-brand-black">Status Kehadiran</h4>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setOnlineOnly(true)}
                        className={`flex-1 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest border transition-all ${onlineOnly ? 'bg-green-500 text-white border-green-500' : 'border-brand-gray-200 text-brand-gray-400'}`}
                    >
                        Online
                    </button>
                    <button 
                        onClick={() => setOnlineOnly(false)}
                        className={`flex-1 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest border transition-all ${!onlineOnly ? 'bg-brand-black text-white border-brand-black' : 'border-brand-gray-200 text-brand-gray-400'}`}
                    >
                        Semua
                    </button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowFilters(false)}
              className="w-full btn-primary py-5 text-sm font-bold uppercase tracking-widest shadow-2xl shadow-black/20"
            >
              Tampilkan {filteredLawyers.length} Hasil
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
