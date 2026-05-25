import React, { useState } from 'react';
import { Briefcase, ShieldCheck, MessageSquare, ArrowLeft, Upload, FileCheck, CheckCircle2 } from 'lucide-react';
import { ActionModal } from './ActionModal';
import { signUpWithSupabase } from '../supabaseAuth';

type RegisterStep = 'initial' | 'lawyer-docs' | 'pending-verification';

export const RegisterPage = ({ 
  onRegister, 
  onNavigateToLogin,
  onBack,
  onVerifyOTP
}: { 
  onRegister: (role: 'client' | 'lawyer' | 'admin') => void,
  onNavigateToLogin: () => void,
  onBack: () => void,
  onVerifyOTP: () => void
}) => {
  const [identity, setIdentity] = useState<'client' | 'lawyer' | 'admin'>('client');
  const [step, setStep] = useState<RegisterStep>('initial');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);

  const openUploadInfo = (title: string) => {
    setModal({
      title,
      description: `${title} akan membuka pemilih file dan menyimpan dokumen ke antrean verifikasi advokat. Untuk demo ini dokumen belum diunggah permanen.`
    });
  };

  const registerAccount = async () => {
    setMessage('');
    setIsLoading(true);

    try {
      await signUpWithSupabase({ fullName, email, password, role: identity });

      setMessage('Akun berhasil dibuat. Mengarahkan ke halaman login...');
      window.setTimeout(() => {
        onNavigateToLogin();
      }, 900);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Pendaftaran Supabase gagal. Periksa data Anda.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (identity === 'lawyer') {
      setStep('lawyer-docs');
    } else {
      registerAccount();
    }
  };

  const handleLawyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await registerAccount();
  };

  if (step === 'pending-verification') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-8">
        <div className="w-24 h-24 bg-brand-gray-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <ShieldCheck className="w-12 h-12 text-brand-black" />
        </div>
        <div className="space-y-4 max-w-md">
            <h2 className="text-4xl font-bold font-display">Verifikasi Admin</h2>
            <p className="text-brand-gray-500 font-medium leading-relaxed">
                Dokumen Anda (STR, KTP, Sertifikat) sedang diverifikasi oleh tim kurator kami. Proses ini biasanya memakan waktu 1-2 hari kerja.
            </p>
        </div>
        <button onClick={onBack} className="btn-primary py-4 px-12">Kembali ke Beranda</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-brand-gray-50 flex-col p-16 justify-between relative border-r border-brand-gray-200">
        <div>
          <div onClick={onBack} className="text-2xl font-bold font-display mb-20 cursor-pointer">Raw Law</div>
          <div className="space-y-12">
            <div>
              <h1 className="text-8xl font-bold font-display mb-4">Raw Law</h1>
              <p className="text-brand-gray-400 text-xl font-medium tracking-tight">Keadilan untuk Semua.</p>
            </div>
            
            <div className="space-y-8 mt-24">
              <div className="flex items-start space-x-4">
                <Briefcase className="w-6 h-6 mt-1" />
                <div>
                  <h3 className="font-bold text-lg">Akses Profesional</h3>
                  <p className="text-brand-gray-500 text-sm">Terhubung dengan ribuan klien yang membutuhkan bantuan hukum Anda.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <ShieldCheck className="w-6 h-6 mt-1" />
                <div>
                  <h3 className="font-bold text-lg">Keamanan Data</h3>
                  <p className="text-brand-gray-500 text-sm">Semua percakapan dan dokumen dilindungi enkripsi tingkat tinggi.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-[10px] text-brand-gray-400 uppercase tracking-widest font-bold">
            © 2024 RAW LAW / LEGAL TECH INDONESIA
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col p-12 lg:p-24 overflow-y-auto">
        <div className="flex justify-between items-center mb-16">
          <button onClick={() => step === 'lawyer-docs' ? setStep('initial') : onBack()} className="flex items-center space-x-2 text-sm font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <button onClick={onNavigateToLogin} className="text-sm font-bold uppercase tracking-widest text-brand-black underline decoration-brand-gray-200 underline-offset-4">Login</button>
        </div>

        <div className="max-w-md mx-auto w-full">
          {step === 'initial' ? (
            <div className="space-y-10">
              <div className="space-y-2">
                <h2 className="text-4xl font-bold font-display">Daftar Akun</h2>
                <p className="text-brand-gray-400 font-medium">Bergabung dengan platform hukum terpercaya.</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Daftar Sebagai</label>
                  <div className="flex bg-brand-gray-50 p-1 rounded-2xl">
                    <button 
                      type="button"
                      onClick={() => setIdentity('client')}
                      className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${identity === 'client' ? 'bg-white shadow-sm' : 'text-brand-gray-400'}`}
                    >
                      Klien
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIdentity('lawyer')}
                      className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${identity === 'lawyer' ? 'bg-white shadow-sm' : 'text-brand-gray-400'}`}
                    >
                      Advokat
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <input type="text" placeholder="Nama Lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-brand-gray-50 p-5 rounded-2xl outline-none border border-transparent focus:border-brand-gray-200" required />
                  <input type="email" placeholder="Alamat Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-brand-gray-50 p-5 rounded-2xl outline-none border border-transparent focus:border-brand-gray-200" required />
                  <input type="password" placeholder="Kata Sandi (Min. 8 Karakter)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} className="w-full bg-brand-gray-50 p-5 rounded-2xl outline-none border border-transparent focus:border-brand-gray-200" required />
                </div>

                {message && (
                  <div className={`rounded-2xl border p-4 text-sm font-medium ${message.includes('berhasil') ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
                    {message}
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full btn-primary py-5 font-bold uppercase tracking-widest text-xs disabled:opacity-50">
                  {isLoading ? 'Menyimpan...' : identity === 'lawyer' ? 'Lanjutkan ke Dokumen' : 'Daftar Sekarang'}
                </button>

                {message.includes('berhasil') && (
                  <button type="button" onClick={onNavigateToLogin} className="w-full py-4 text-xs font-bold uppercase tracking-widest text-brand-black underline decoration-brand-gray-200 underline-offset-4">
                    Masuk ke Halaman Login
                  </button>
                )}
              </form>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="space-y-2">
                <h2 className="text-4xl font-bold font-display">Verifikasi Advokat</h2>
                <p className="text-brand-gray-400 font-medium">Unggah dokumen untuk proses verifikasi izin praktik.</p>
              </div>

              <form className="space-y-6" onSubmit={handleLawyerSubmit}>
                <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => openUploadInfo('KTP Sisi Depan')} className="col-span-2 p-6 border-2 border-dashed border-brand-gray-200 rounded-2xl flex flex-col items-center justify-center space-y-2 group cursor-pointer hover:border-brand-black transition-colors bg-brand-gray-50/50">
                        <Upload className="w-6 h-6 text-brand-gray-300" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">KTP (Sisi Depan)</span>
                    </button>

                    <button type="button" onClick={() => openUploadInfo('STR / Izin Praktik')} className="p-6 border-2 border-dashed border-brand-gray-200 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:border-brand-black transition-colors bg-brand-gray-50/50">
                        <FileCheck className="w-6 h-6 text-brand-gray-300" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">STR / Izin</span>
                    </button>
                    
                    <button type="button" onClick={() => openUploadInfo('Sertifikat Advokat')} className="p-6 border-2 border-dashed border-brand-gray-200 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:border-brand-black transition-colors bg-brand-gray-50/50">
                        <CheckCircle2 className="w-6 h-6 text-brand-gray-300" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Sertifikat</span>
                    </button>

                    <button type="button" onClick={() => openUploadInfo('Foto Profil Profesional')} className="col-span-2 p-6 border-2 border-dashed border-brand-gray-200 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:border-brand-black transition-colors bg-brand-gray-50/50">
                        <div className="w-12 h-12 bg-white rounded-full border border-brand-gray-200 flex items-center justify-center text-brand-gray-300">
                            <span className="text-xs uppercase font-bold">Foto</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Foto Profil Profesional</span>
                    </button>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-brand-gray-50 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-brand-black mt-0.5" />
                    <p className="text-[10px] text-brand-gray-500 font-medium leading-relaxed">
                        Data Anda aman dan tidak akan disebarluaskan sesuai dengan kebijakan privasi profesional kami.
                    </p>
                </div>

                {message && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                    {message}
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full btn-primary py-5 font-bold uppercase tracking-widest text-xs disabled:opacity-50">
                  {isLoading ? 'Menyimpan...' : 'Kirim untuk Verifikasi'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="mt-auto pt-12 flex justify-center">
          <div className="flex items-center space-x-6 text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">
            <button type="button" onClick={() => setModal({ title: 'Syarat & Ketentuan', description: 'Dokumen ini menjelaskan aturan pendaftaran klien dan advokat, proses verifikasi, serta penggunaan layanan.' })} className="hover:text-brand-black transition-colors">Syarat & Ketentuan</button>
            <button type="button" onClick={() => setModal({ title: 'Kebijakan Privasi', description: 'Kebijakan privasi menjelaskan penyimpanan data akun, dokumen verifikasi, dan keamanan konsultasi.' })} className="hover:text-brand-black transition-colors">Kebijakan Privasi</button>
          </div>
        </div>
      </div>
    </div>
  );
};
