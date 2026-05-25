import React, { useEffect, useState, useRef } from 'react';
import { 
  ArrowLeft, Upload, FileText, ShieldCheck, Download, 
  Trash2, Eye, File, Clock, CheckCircle2, AlertCircle, 
  Search, Filter, Lock, Shield, FilePlus, ChevronRight
} from 'lucide-react';
import { ActionModal } from './ActionModal';
import { fetchDocuments, getStoredUser, uploadLegalDocument, type DocumentRow } from '../api';

interface LegalDoc {
  id: string;
  name: string;
  category: 'Evidence' | 'Contract' | 'Agreement' | 'Lawsuit' | 'Identity';
  uploadedAt: string;
  size: string;
  status: 'Encrypted' | 'Processing' | 'Safe';
  type: string;
}

export const DocumentVaultPage = ({ onBack }: { onBack: () => void }) => {
  const [docs, setDocs] = useState<LegalDoc[]>([
    {
      id: 'DOC-001',
      name: 'KTP_Identitas.pdf',
      category: 'Identity',
      uploadedAt: '12 Mei 2024',
      size: '1.2 MB',
      status: 'Encrypted',
      type: 'PDF'
    },
    {
      id: 'DOC-002',
      name: 'Draft_Kontrak_Sewa.docx',
      category: 'Contract',
      uploadedAt: '14 Mei 2024',
      size: '0.8 MB',
      status: 'Safe',
      type: 'DOCX'
    },
    {
      id: 'DOC-003',
      name: 'Bukti_Rekaman_Suara.mp3',
      category: 'Evidence',
      uploadedAt: '15 Mei 2024',
      size: '4.5 MB',
      status: 'Encrypted',
      type: 'MP3'
    }
  ]);

  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mapDocument = (doc: DocumentRow): LegalDoc => ({
    id: doc.id,
    name: doc.name,
    category: doc.file_type?.includes('image') ? 'Evidence' : doc.name.toLowerCase().includes('ktp') ? 'Identity' : 'Contract',
    uploadedAt: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(doc.created_at)),
    size: doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : '-',
    status: doc.visibility === 'private' ? 'Encrypted' : 'Safe',
    type: (doc.file_type?.split('/')[1] || doc.name.split('.').pop() || 'FILE').toUpperCase()
  });

  const refreshDocs = async () => {
    const user = getStoredUser();
    if (!user?.id) return;

    try {
      const rows = await fetchDocuments(user.id);
      if (rows.length > 0) setDocs(rows.map(mapDocument));
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat dokumen');
    }
  };

  useEffect(() => {
    refreshDocs();
  }, []);

  const uploadFiles = async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadLegalDocument(file);
      await refreshDocs();
      setModal({ title: 'Dokumen Tersimpan', description: `${file.name} sudah diunggah ke storage dan dicatat di brankas dokumen.` });
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
    { id: 'Identity', label: 'Identitas' },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
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
              <h1 className="text-xl font-bold font-display">Brankas Dokumen Hukum</h1>
              <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-[0.2em] mt-0.5">Penyimpanan Aman Terenkripsi AES-256</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
             <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">End-to-End Encrypted</span>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Controls */}
        <aside className="lg:col-span-3 space-y-8">
          <div className="bg-white p-6 rounded-3xl border border-brand-gray-100 space-y-6">
            <button 
              onClick={() => {
                onButtonClick();
              }}
              className="w-full flex items-center justify-center space-x-3 bg-brand-black text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10"
            >
              <FilePlus className="w-4 h-4" />
                <span>{isUploading ? 'Mengunggah...' : 'Unggah Dokumen'}</span>
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              multiple 
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            />

            <div className="space-y-4 pt-4 border-t border-brand-gray-50">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 px-2">Kategori</h3>
              <div className="space-y-1">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${!selectedCategory ? 'bg-brand-gray-100 text-brand-black' : 'text-brand-gray-400 hover:bg-brand-gray-50'}`}
                >
                  Semua Dokumen
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
          </div>

          <div className="bg-brand-black text-white p-8 rounded-[40px] space-y-6 shadow-2xl shadow-black/20">
            <Lock className="w-8 h-8 text-zinc-500" />
            <div>
              <h3 className="text-sm font-bold mb-2">Keamanan Prioritas</h3>
              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed uppercase tracking-wider">
                Dokumen Anda dienkripsi secara lokal sebelum diunggah ke cloud. Bahkan tim kami tidak dapat membukanya tanpa kunci pribadi Anda.
              </p>
              {loadError && <p className="text-[10px] text-amber-300 font-bold uppercase tracking-widest">{loadError}</p>}
            </div>
          </div>
        </aside>

        {/* Document List & Grid */}
        <div className="lg:col-span-9 space-y-8">
          {/* Dash Stats */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Total File', val: '24', icon: File },
              { label: 'Terlindungi', val: '100%', icon: Shield },
              { label: 'Sisa Kuota', val: '4.2 GB', icon: AlertCircle },
            ].map(stat => (
              <div key={stat.label} className="bg-white p-6 rounded-3xl border border-brand-gray-100 flex items-center space-x-4">
                <div className="p-3 bg-brand-gray-50 rounded-2xl">
                  <stat.icon className="w-5 h-5 text-brand-black" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-xl font-bold font-display">{stat.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Drag & Drop Zone */}
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-[40px] p-12 text-center transition-all ${dragActive ? 'border-brand-black bg-brand-gray-100 scale-[0.99]' : 'border-brand-gray-200 bg-white hover:border-brand-gray-300'}`}
          >
            <div className="max-w-xs mx-auto space-y-4">
              <div className="w-16 h-16 bg-brand-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-8 h-8 text-brand-gray-300" />
              </div>
              <h3 className="text-lg font-bold font-display">Tarik dokumen ke sini</h3>
              <p className="text-xs text-brand-gray-400 uppercase tracking-widest font-medium">Atau klik tombol unggah di samping untuk memilih file</p>
            </div>
          </div>

          {/* Files List */}
          <section className="bg-white rounded-[40px] border border-brand-gray-100 overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-brand-gray-50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest">Daftar Dokumen</h3>
              <div className="flex items-center space-x-4">
                <Search className="w-4 h-4 text-brand-gray-300" />
                <Filter className="w-4 h-4 text-brand-gray-300" />
              </div>
            </div>
            
            <div className="divide-y divide-brand-gray-50">
              {docs.filter(d => !selectedCategory || d.category === selectedCategory).map(doc => (
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
                      <div className="flex items-center space-x-4 text-[9px] font-bold text-brand-gray-400 uppercase tracking-widest">
                        <span>{doc.uploadedAt}</span>
                        <span>•</span>
                        <span>{doc.size}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{doc.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button onClick={() => setModal({ title: `Preview ${doc.name}`, description: `Menampilkan pratinjau dokumen ${doc.name}. Status keamanan: ${doc.status}.` })} className="p-3 hover:bg-brand-black hover:text-white rounded-xl transition-all text-brand-gray-400 group-hover:text-brand-black group-hover:hover:text-white" title="Preview">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => setModal({ title: `Download ${doc.name}`, description: 'Permintaan unduh dicatat. Pada produksi, file terenkripsi akan didekripsi untuk pemilik dokumen sebelum diunduh.' })} className="p-3 hover:bg-brand-black hover:text-white rounded-xl transition-all text-brand-gray-400 group-hover:text-brand-black group-hover:hover:text-white" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => setModal({ title: `Hapus ${doc.name}`, description: 'Aksi hapus akan meminta konfirmasi ulang dan membuat audit log. Untuk demo, dokumen belum dihapus permanen.' })} className="p-3 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all text-brand-gray-400" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {docs.length === 0 && (
              <div className="p-20 text-center text-brand-gray-400">
                <File className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Belum ada dokumen yang diunggah</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
