import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Download,
  Eye,
  File,
  FilePlus,
  FileText,
  Filter,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  Upload
} from 'lucide-react';
import { ActionModal } from './ActionModal';
import {
  fetchClientConsultations,
  fetchDocuments,
  getStoredUser,
  uploadLegalDocument,
  type ConsultationRow,
  type DocumentRow
} from '../api';

interface LegalDoc {
  id: string;
  consultationId: string | null;
  name: string;
  category: 'Evidence' | 'Contract' | 'Agreement' | 'Lawsuit' | 'Identity';
  uploadedAt: string;
  size: string;
  status: 'Encrypted' | 'Processing' | 'Safe';
  type: string;
}

const getCaseTitle = (item: ConsultationRow) => {
  const specialty = item.lawyer_directory?.specialty || item.consultation_type || 'Konsultasi Hukum';
  const lawyer = item.lawyer_directory?.name || 'Advokat FINPROSE';
  return `${specialty} - ${lawyer}`;
};

const getCaseSubtitle = (item: ConsultationRow) => {
  const date = item.scheduled_day || new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(item.created_at));

  return `${date} - ${item.status.replace('_', ' ')}`;
};

const statusTone: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  ongoing: 'bg-blue-50 text-blue-700 border-blue-100',
  in_review: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  completed: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  cancelled: 'bg-red-50 text-red-700 border-red-100',
  expired: 'bg-zinc-100 text-zinc-700 border-zinc-200'
};

export const DocumentVaultPage = ({ onBack }: { onBack: () => void }) => {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [cases, setCases] = useState<ConsultationRow[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mapDocument = (doc: DocumentRow): LegalDoc => ({
    id: doc.id,
    consultationId: doc.consultation_id,
    name: doc.name,
    category: doc.file_type?.includes('image') ? 'Evidence' : doc.name.toLowerCase().includes('ktp') ? 'Identity' : 'Contract',
    uploadedAt: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(doc.created_at)),
    size: doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : '-',
    status: doc.visibility === 'private' ? 'Encrypted' : 'Safe',
    type: (doc.file_type?.split('/')[1] || doc.name.split('.').pop() || 'FILE').toUpperCase()
  });

  const refreshData = async () => {
    const user = getStoredUser();
    if (!user?.id) return;

    try {
      const [consultationRows, documentRows] = await Promise.all([
        fetchClientConsultations(user.id),
        fetchDocuments(user.id)
      ]);

      setCases(consultationRows);
      setDocs(documentRows.map(mapDocument));
      setSelectedCaseId(current => current || consultationRows[0]?.id || null);
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat dokumen');
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const selectedCase = useMemo(
    () => cases.find(item => item.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const caseDocs = useMemo(() => {
    return docs.filter(doc => {
      const matchesCase = selectedCaseId ? doc.consultationId === selectedCaseId : false;
      const matchesCategory = !selectedCategory || doc.category === selectedCategory;
      const matchesQuery = !query || doc.name.toLowerCase().includes(query.toLowerCase());
      return matchesCase && matchesCategory && matchesQuery;
    });
  }, [docs, query, selectedCaseId, selectedCategory]);

  const uploadFiles = async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;
    if (!selectedCaseId) {
      setModal({
        title: 'Pilih Kasus Dulu',
        description: 'Dokumen harus masuk ke kasus tertentu. Pilih kasus seperti Perceraian, Kontrak, atau Sengketa sebelum mengunggah dokumen.'
      });
      return;
    }

    setIsUploading(true);
    try {
      await uploadLegalDocument(file, selectedCaseId);
      await refreshData();
      setModal({
        title: 'Dokumen Masuk ke Kasus',
        description: `${file.name} sudah ditautkan ke ${selectedCase ? getCaseTitle(selectedCase) : 'kasus yang dipilih'}.`
      });
    } catch (error) {
      setModal({ title: 'Upload Gagal', description: error instanceof Error ? error.message : 'Dokumen gagal diunggah.' });
    } finally {
      setIsUploading(false);
    }
  };

  const categories = [
    { id: 'Evidence', label: 'Bukti' },
    { id: 'Contract', label: 'Kontrak' },
    { id: 'Agreement', label: 'Surat Perjanjian' },
    { id: 'Lawsuit', label: 'Gugatan' },
    { id: 'Identity', label: 'Identitas' }
  ];

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') setDragActive(true);
    if (event.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer.files?.[0]) uploadFiles(event.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-brand-gray-50 flex flex-col font-sans">
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      <header className="bg-white border-b border-brand-gray-100 px-8 py-6 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="p-2 hover:bg-brand-gray-50 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-brand-black" />
            </button>
            <div>
              <h1 className="text-xl font-bold font-display">Dokumen per Kasus</h1>
              <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-[0.2em] mt-0.5">Pilih kasus dulu, lalu unggah dokumen pendukung</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-xl border border-green-100">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Tertaut ke Kasus</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-8">
          <section className="bg-white p-6 rounded-3xl border border-brand-gray-100 space-y-5">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">1. Pilih Kasus</h2>
              <p className="mt-2 text-xs font-medium leading-5 text-brand-gray-500">Dokumen tidak lagi dicampur. Semua file harus masuk ke kasus yang sesuai.</p>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {cases.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedCaseId(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedCaseId === item.id ? 'border-brand-black bg-brand-black text-white shadow-xl shadow-black/10' : 'border-brand-gray-100 bg-brand-gray-50 hover:border-brand-gray-300'}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Briefcase className="h-4 w-4 shrink-0" />
                    <span className={`rounded-md border px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${selectedCaseId === item.id ? 'border-white/20 bg-white/10 text-white' : statusTone[item.status] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-bold leading-5">{getCaseTitle(item)}</p>
                  <p className={`mt-2 text-[10px] font-bold uppercase tracking-widest ${selectedCaseId === item.id ? 'text-zinc-400' : 'text-brand-gray-400'}`}>{getCaseSubtitle(item)}</p>
                  <p className={`mt-3 text-[10px] font-bold uppercase tracking-widest ${selectedCaseId === item.id ? 'text-white' : 'text-brand-black'}`}>
                    {docs.filter(doc => doc.consultationId === item.id).length} dokumen
                  </p>
                </button>
              ))}

              {cases.length === 0 && (
                <div className="rounded-2xl border border-dashed border-brand-gray-200 bg-brand-gray-50 p-6 text-center">
                  <Briefcase className="mx-auto mb-3 h-7 w-7 text-brand-gray-300" />
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-gray-400">Belum ada kasus</p>
                  <p className="mt-2 text-xs font-medium leading-5 text-brand-gray-500">Buat booking konsultasi dulu, baru dokumen bisa ditaruh di kasus tersebut.</p>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-brand-gray-100 space-y-6">
            <button
              disabled={!selectedCaseId || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center space-x-3 bg-brand-black text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FilePlus className="w-4 h-4" />
              <span>{isUploading ? 'Mengunggah...' : 'Unggah ke Kasus Ini'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => event.target.files && uploadFiles(event.target.files)}
            />

            <div className="space-y-4 pt-4 border-t border-brand-gray-50">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 px-2">2. Filter Jenis Dokumen</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${!selectedCategory ? 'bg-brand-gray-100 text-brand-black' : 'text-brand-gray-400 hover:bg-brand-gray-50'}`}
                >
                  Semua di Kasus Ini
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${selectedCategory === cat.id ? 'bg-brand-gray-100 text-brand-black' : 'text-brand-gray-400 hover:bg-brand-gray-50'}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-brand-black text-white p-8 rounded-[40px] space-y-6 shadow-2xl shadow-black/20">
            <Lock className="w-8 h-8 text-zinc-500" />
            <div>
              <h3 className="text-sm font-bold mb-2">Dokumen Lebih Rapi</h3>
              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed uppercase tracking-wider">File perceraian, kontrak, waris, atau sengketa tanah tidak tercampur karena setiap upload wajib memilih kasus.</p>
              {loadError && <p className="mt-4 text-[10px] text-amber-300 font-bold uppercase tracking-widest">{loadError}</p>}
            </div>
          </section>
        </aside>

        <div className="lg:col-span-8 space-y-8">
          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { label: 'Dokumen Kasus', val: String(caseDocs.length), icon: File },
              { label: 'Total Kasus', val: String(cases.length), icon: Briefcase },
              { label: 'Status', val: selectedCase ? selectedCase.status.replace('_', ' ') : '-', icon: Shield }
            ].map(stat => (
              <div key={stat.label} className="bg-white p-6 rounded-3xl border border-brand-gray-100 flex items-center space-x-4">
                <div className="p-3 bg-brand-gray-50 rounded-2xl">
                  <stat.icon className="w-5 h-5 text-brand-black" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-xl font-bold font-display capitalize">{stat.val}</p>
                </div>
              </div>
            ))}
          </section>

          <section
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-[40px] p-12 text-center transition-all ${dragActive ? 'border-brand-black bg-brand-gray-100 scale-[0.99]' : selectedCaseId ? 'border-brand-gray-200 bg-white hover:border-brand-gray-300' : 'border-brand-gray-100 bg-white/50 opacity-70'}`}
          >
            <div className="max-w-sm mx-auto space-y-4">
              <div className="w-16 h-16 bg-brand-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-8 h-8 text-brand-gray-300" />
              </div>
              <h3 className="text-lg font-bold font-display">{selectedCase ? `Upload untuk ${getCaseTitle(selectedCase)}` : 'Pilih kasus dulu'}</h3>
              <p className="text-xs text-brand-gray-400 uppercase tracking-widest font-medium">{selectedCase ? 'Tarik file ke sini atau klik tombol unggah di samping' : 'Dokumen akan aktif setelah ada kasus yang dipilih'}</p>
            </div>
          </section>

          <section className="bg-white rounded-[40px] border border-brand-gray-100 overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-brand-gray-50 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest">Dokumen Kasus</h3>
                <p className="mt-1 text-xs font-medium text-brand-gray-500">{selectedCase ? getCaseTitle(selectedCase) : 'Belum ada kasus dipilih'}</p>
              </div>
              <div className="flex min-w-64 items-center space-x-3 rounded-2xl border border-brand-gray-100 bg-brand-gray-50 px-4 py-3">
                <Search className="w-4 h-4 text-brand-gray-300" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Cari dokumen kasus..."
                  className="w-full bg-transparent text-xs font-medium outline-none"
                />
                <Filter className="w-4 h-4 text-brand-gray-300" />
              </div>
            </div>

            <div className="divide-y divide-brand-gray-50">
              {caseDocs.map(doc => (
                <div key={doc.id} className="p-6 flex items-center justify-between hover:bg-brand-gray-50 transition-all group">
                  <div className="flex items-center space-x-6 flex-1 min-w-0">
                    <div className="p-4 bg-brand-gray-50 rounded-2xl group-hover:bg-white transition-colors">
                      <FileText className="w-6 h-6 text-brand-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h4 className="font-bold text-sm truncate">{doc.name}</h4>
                        <span className="px-2 py-0.5 bg-brand-gray-100 rounded text-[8px] font-bold uppercase tracking-widest text-brand-gray-400">{doc.category}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest">
                        <span>{doc.uploadedAt}</span>
                        <span>{doc.size}</span>
                        <span>{doc.type}</span>
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{doc.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button onClick={() => setModal({ title: `Preview ${doc.name}`, description: `Menampilkan pratinjau dokumen ${doc.name} di kasus ${selectedCase ? getCaseTitle(selectedCase) : '-'}.` })} className="p-3 hover:bg-brand-black hover:text-white rounded-xl transition-all text-brand-gray-400 group-hover:text-brand-black group-hover:hover:text-white" title="Preview">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => setModal({ title: `Download ${doc.name}`, description: 'File ini hanya diunduh dari folder kasus yang sedang dibuka.' })} className="p-3 hover:bg-brand-black hover:text-white rounded-xl transition-all text-brand-gray-400 group-hover:text-brand-black group-hover:hover:text-white" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => setModal({ title: `Hapus ${doc.name}`, description: 'Aksi hapus akan meminta konfirmasi ulang dan membuat audit log.' })} className="p-3 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all text-brand-gray-400" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {caseDocs.length === 0 && (
              <div className="p-20 text-center text-brand-gray-400">
                <File className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Belum ada dokumen di kasus ini</p>
                <p className="mt-3 text-xs font-medium">Pilih kasus yang benar, lalu unggah KTP, bukti, kontrak, gugatan, atau dokumen pendukung lain.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
