import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, FileText, Download, Clock, CheckCircle2, 
  AlertCircle, History, CreditCard, ChevronRight, Filter,
  Search, Calendar, MessageSquare, StickyNote
} from 'lucide-react';
import { Consultation } from '../types';
import { ACTIVE_CONSULTATIONS } from '../constants';
import { ActionModal } from './ActionModal';
import { fetchClientConsultations, getStoredUser, type ConsultationRow } from '../api';

type CaseView = Consultation & {
  consultationId: string;
  clientId?: string | null;
  lawyerId?: string;
  consultationType?: string;
};

const statusLabel = (status: ConsultationRow['status']): Consultation['status'] => {
  if (status === 'completed') return 'Completed';
  if (status === 'ongoing' || status === 'paid') return 'Ongoing';
  if (status === 'in_review') return 'In Review';
  return 'Pending';
};

const typeLabel = (type: string): Consultation['type'] => {
  return type === 'chat' ? 'Virtual Session' : 'Virtual Session';
};

const formatDate = (row: ConsultationRow) => {
  const source = row.created_at ? new Date(row.created_at) : new Date();
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(source);
};

const mapConsultation = (row: ConsultationRow): CaseView => ({
  id: row.id,
  consultationId: row.id,
  clientId: row.client_id,
  lawyerId: row.lawyer_id,
  consultationType: row.consultation_type,
  clientName: 'Saya',
  lawyerName: row.lawyer_directory?.name || 'Advokat FINPROSE',
  specialty: row.lawyer_directory?.specialty || row.consultation_type,
  date: row.scheduled_day || formatDate(row),
  time: row.scheduled_time || '-',
  status: statusLabel(row.status),
  type: typeLabel(row.consultation_type),
  price: row.price,
  lawyerNotes: row.notes || 'Catatan awal konsultasi sudah tersimpan. Catatan advokat akan muncul setelah sesi selesai.',
  files: []
});

export const CaseHistoryPage = ({ 
  onBack,
  onContinueDiscussion,
  onPayConsultation
}: { 
  onBack: () => void,
  onContinueDiscussion?: (data: CaseView) => void,
  onPayConsultation?: (data: CaseView) => void
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<CaseView | null>(null);
  const [cases, setCases] = useState<CaseView[]>(ACTIVE_CONSULTATIONS.map(item => ({
    ...item,
    consultationId: item.id,
    consultationType: 'chat'
  })));
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    fetchClientConsultations(user.id)
      .then((rows) => {
        if (!mounted) return;
        const mapped = rows.map(mapConsultation);
        if (mapped.length > 0) {
          setCases(mapped);
          setSelectedCase(mapped[0]);
        }
      })
      .catch((error) => {
        if (mounted) setLoadError(error.message || 'Gagal memuat riwayat konsultasi');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCases = cases.filter(c => 
    c.lawyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-50 text-green-700 border-green-100';
      case 'Ongoing': return 'bg-brand-black text-white border-transparent';
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-brand-gray-50 text-brand-gray-500 border-brand-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-brand-gray-50 font-sans">
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      <header className="bg-white border-b border-brand-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="p-2 hover:bg-brand-gray-50 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-brand-black" />
            </button>
            <div>
              <h1 className="text-xl font-bold font-display">Riwayat Kasus</h1>
              <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest mt-0.5">Semua data konsultasi dan dokumen hukum Anda</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
             <div className="relative hidden md:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-300" />
                <input 
                  type="text" 
                  placeholder="Cari kasus, advokat..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 pr-4 py-2.5 bg-brand-gray-50 border border-brand-gray-100 rounded-xl text-xs font-medium outline-none focus:border-brand-black transition-all w-64"
                />
             </div>
             <button onClick={() => setModal({ title: 'Filter Riwayat', description: 'Filter riwayat akan memisahkan kasus berdasarkan status, advokat, kategori, dan tanggal konsultasi.' })} className="p-2.5 bg-brand-gray-50 border border-brand-gray-100 rounded-xl hover:bg-brand-gray-100 transition-colors">
                <Filter className="w-4 h-4 text-brand-gray-400" />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Case List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Kasus Terbaru</h2>
            <span className="text-[10px] font-bold text-brand-black bg-brand-gray-100 px-2 py-1 rounded-md">{isLoading ? 'Memuat...' : `${filteredCases.length} Kasus`}</span>
          </div>

          {loadError && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs font-bold text-amber-700">
              {loadError}. Menampilkan data contoh sementara.
            </div>
          )}
          
          {filteredCases.map((item) => (
            <button 
              key={item.id}
              onClick={() => setSelectedCase(item)}
              className={`w-full text-left bg-white p-5 rounded-2xl border transition-all ${selectedCase?.id === item.id ? 'border-brand-black ring-1 ring-brand-black shadow-lg translate-x-2' : 'border-brand-gray-100 hover:border-brand-gray-300'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 rounded-md border text-[9px] font-bold uppercase tracking-widest ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
                <span className="text-[10px] font-mono text-brand-gray-400 font-bold">#{item.id}</span>
              </div>
              <h3 className="font-bold text-sm mb-1">{item.lawyerName}</h3>
              <p className="text-xs text-brand-gray-400 font-medium mb-4">{item.specialty}</p>
              <div className="flex items-center justify-between pt-4 border-t border-brand-gray-50">
                <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                  <Calendar className="w-3 h-3" />
                  <span>{item.date}</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${selectedCase?.id === item.id ? 'text-brand-black rotate-90' : 'text-brand-gray-300'}`} />
              </div>
            </button>
          ))}
        </div>

        {/* Details View */}
        <div className="lg:col-span-8">
          {selectedCase ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              {/* Header Info */}
              <div className="bg-white p-8 rounded-3xl border border-brand-gray-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                             <div className="w-12 h-12 bg-brand-black text-white rounded-2xl flex items-center justify-center font-display text-xl font-bold">
                                {selectedCase.lawyerName[0]}
                             </div>
                             <div>
                                <h2 className="text-xl font-bold font-display">{selectedCase.lawyerName}</h2>
                                <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-widest">{selectedCase.specialty}</p>
                             </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <div className="flex items-center space-x-2 bg-brand-gray-50 px-3 py-1.5 rounded-lg border border-brand-gray-100">
                                <Calendar className="w-3.5 h-3.5 text-brand-gray-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{selectedCase.date} • {selectedCase.time}</span>
                            </div>
                            <div className="flex items-center space-x-2 bg-brand-gray-50 px-3 py-1.5 rounded-lg border border-brand-gray-100">
                                <History className="w-3.5 h-3.5 text-brand-gray-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{selectedCase.type}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                        <div className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">Biaya Konsultasi</div>
                        <div className="text-2xl font-bold font-display">Rp {(selectedCase.price || 0).toLocaleString('id-ID')}</div>
                        <button onClick={() => setModal({ title: `Invoice ${selectedCase.id}`, description: `Invoice konsultasi ${selectedCase.id} sebesar Rp ${selectedCase.price.toLocaleString('id-ID')} siap diunduh.` })} className="flex items-center space-x-2 text-[10px] font-bold text-brand-black hover:underline uppercase tracking-widest">
                            <CreditCard className="w-3 h-3" />
                            <span>Lihat Invoice</span>
                        </button>
                    </div>
                </div>
              </div>

              {/* Grid Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Notes */}
                 <div className="bg-white p-6 rounded-3xl border border-brand-gray-100 space-y-4">
                    <div className="flex items-center space-x-2 border-b border-brand-gray-50 pb-3">
                        <StickyNote className="w-4 h-4 text-brand-black" />
                        <h3 className="text-[10px] font-bold uppercase tracking-widest">Catatan Advokat</h3>
                    </div>
                    <p className="text-sm text-brand-gray-600 leading-relaxed font-medium italic">
                        "{selectedCase.lawyerNotes || 'Belum ada catatan dari advokat.'}"
                    </p>
                 </div>

                 {/* Status Progress */}
                 <div className="bg-white p-6 rounded-3xl border border-brand-gray-100 space-y-6">
                    <div className="flex items-center space-x-2 border-b border-brand-gray-50 pb-3">
                        <Clock className="w-4 h-4 text-brand-black" />
                        <h3 className="text-[10px] font-bold uppercase tracking-widest">Progress Kasus</h3>
                    </div>
                    <div className="space-y-6 relative">
                        <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-brand-gray-100 ml-[-1px]"></div>
                        {[
                            { label: 'Booking Dikonfirmasi', time: selectedCase.date, completed: true },
                            { label: 'Sesi Konsultasi', time: selectedCase.date, completed: selectedCase.status !== 'Pending' },
                            { label: 'Penyelesaian Kasus', time: selectedCase.status === 'Completed' ? selectedCase.date : '-', completed: selectedCase.status === 'Completed' }
                        ].map((step, idx) => (
                            <div key={idx} className="flex items-start space-x-6 relative">
                                <div className={`w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 transition-colors ${step.completed ? 'bg-brand-black' : 'bg-brand-gray-200'}`}>
                                    {step.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                                </div>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-widest ${step.completed ? 'text-brand-black' : 'text-brand-gray-300'}`}>{step.label}</p>
                                    <p className="text-[10px] font-mono text-brand-gray-400 mt-1">{step.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
              </div>

              {/* Documents Archive */}
              <div className="bg-white p-8 rounded-3xl border border-brand-gray-100 space-y-6">
                <div className="flex items-center justify-between border-b border-brand-gray-50 pb-4">
                    <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-brand-black" />
                        <h3 className="text-[10px] font-bold uppercase tracking-widest">Arsip Dokumen</h3>
                    </div>
                    <button onClick={() => setModal({ title: 'Tambah Dokumen', description: 'Dokumen baru akan ditautkan langsung ke kasus yang sedang dibuka.' })} className="text-[10px] font-bold text-brand-black bg-brand-gray-50 px-3 py-1.5 rounded-lg border border-brand-gray-100 hover:bg-brand-gray-100 uppercase tracking-widest transition-all">
                        Unggah Dokumen Baru
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCase.files ? selectedCase.files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-brand-gray-50 rounded-2xl border border-brand-gray-100 group hover:border-brand-black transition-all">
                            <div className="flex items-center space-x-4 min-w-0">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <FileText className="w-5 h-5 text-brand-gray-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold truncate group-hover:text-brand-black transition-colors">{file.name}</p>
                                    <p className="text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest mt-0.5">{file.date} • {file.size}</p>
                                </div>
                            </div>
                            <button onClick={() => setModal({ title: file.name, description: `Dokumen ${file.name} (${file.size}) siap dibuka atau diunduh dari arsip kasus.` })} className="p-2 hover:bg-brand-black hover:text-white rounded-full transition-all">
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    )) : (
                        <div className="col-span-2 text-center py-12 border-2 border-dashed border-brand-gray-100 rounded-3xl">
                            <FileText className="w-8 h-8 text-brand-gray-200 mx-auto mb-3" />
                            <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-widest">Tidak ada dokumen terlampir</p>
                        </div>
                    )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center space-x-4 pt-4">
                 <button 
                    onClick={() => {
                        if (selectedCase.status === 'Pending') {
                          onPayConsultation?.(selectedCase);
                          return;
                        }
                        onContinueDiscussion?.(selectedCase);
                    }}
                    className="flex-1 bg-brand-black text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-black/10 hover:translate-y-[-2px] transition-all flex items-center justify-center space-x-2"
                 >
                    {selectedCase.status === 'Pending' ? <CreditCard className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                    <span>{selectedCase.status === 'Pending' ? 'Bayar Sekarang' : 'Lanjutkan Diskusi'}</span>
                 </button>
                 <button onClick={() => setModal({ title: 'Laporkan Masalah', description: 'Laporan akan dikirim ke admin dengan lampiran detail konsultasi, transaksi, dan chat terkait.' })} className="flex-1 bg-white border border-brand-gray-100 text-brand-black py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-brand-gray-50 transition-all flex items-center justify-center space-x-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Laporkan Masalah</span>
                 </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] bg-white rounded-[40px] border border-brand-gray-100 border-dashed flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-brand-gray-50 rounded-full flex items-center justify-center mb-6">
                <History className="w-8 h-8 text-brand-gray-200" />
              </div>
              <h3 className="text-lg font-bold font-display mb-2">Pilih riwayat konsultasi</h3>
              <p className="text-xs text-brand-gray-400 font-medium max-w-xs uppercase tracking-[0.1em] leading-relaxed">Pilih kasus dari daftar di samping untuk melihat rincian, dokumen, dan catatan advokat.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
