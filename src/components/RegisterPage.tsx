import React, { useState } from 'react';
import { Briefcase, ShieldCheck, ArrowLeft, Upload, FileCheck, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      description: `${title} akan membuka pemilih file dan menyimpan dokumen ke antrean verifikasi advokat.`
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
      setMessage(error instanceof Error ? error.message : 'Pendaftaran gagal. Periksa data Anda.');
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
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-8 text-center space-y-8">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <ShieldCheck className="w-12 h-12 text-amber-500" />
        </div>
        <div className="space-y-4 max-w-md">
          <h2 className="text-4xl font-bold font-display text-white">Verifikasi Admin</h2>
          <p className="text-slate-400 font-medium leading-relaxed">
            Dokumen Anda (STR, KTP, Sertifikat) sedang diverifikasi oleh tim kurator kami. Proses ini biasanya memakan waktu 1-2 hari kerja.
          </p>
        </div>
        <button onClick={onBack} className="bg-amber-500 hover:bg-amber-600 text-slate-950 py-4 px-12 rounded-2xl font-bold transition-colors">Kembali ke Beranda</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100 font-sans">
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-slate-950 flex-col p-16 justify-between relative border-r border-slate-800">
        <div>
          <div onClick={onBack} className="text-2xl font-bold font-display cursor-pointer tracking-wider text-amber-500">
            {t('common.appName')}
          </div>
          <div className="space-y-12 mt-20">
            <div>
              <h1 className="text-6xl font-bold font-display mb-4 text-white leading-tight">YDA LAW OFFICE & Partners</h1>
              <p className="text-slate-400 text-lg font-medium tracking-tight">Keadilan untuk Semua.</p>
            </div>
            
            <div className="space-y-8 mt-24">
              <div className="flex items-start space-x-4">
                <Briefcase className="w-6 h-6 mt-1 text-amber-500" />
                <div>
                  <h3 className="font-bold text-lg text-white">Akses Profesional</h3>
                  <p className="text-slate-400 text-sm">Terhubung dengan ribuan klien yang membutuhkan bantuan hukum Anda.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <ShieldCheck className="w-6 h-6 mt-1 text-amber-500" />
                <div>
                  <h3 className="font-bold text-lg text-white">Keamanan Data</h3>
                  <p className="text-slate-400 text-sm">Semua percakapan dan dokumen dilindungi enkripsi tingkat tinggi.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          © 2026 YDA LAW OFFICE & Partners / LEGAL TECH INDONESIA
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 bg-slate-900 flex flex-col p-12 lg:p-24 overflow-y-auto border-l border-slate-800">
        <div className="flex justify-between items-center mb-16">
          <button 
            onClick={() => step === 'lawyer-docs' ? setStep('initial') : onBack()} 
            className="flex items-center space-x-2 text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-amber-500" />
            <span>{t('common.back')}</span>
          </button>
          <button onClick={onNavigateToLogin} className="text-sm font-bold uppercase tracking-widest text-amber-500 underline underline-offset-4">{t('common.login')}</button>
        </div>

        <div className="max-w-md mx-auto w-full my-auto">
          {step === 'initial' ? (
            <div className="space-y-10">
              <div className="space-y-2">
                <h2 className="text-4xl font-bold font-display text-white">{t('auth.registerTitle')}</h2>
                <p className="text-slate-400 font-medium">{t('auth.registerSubtitle')}</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('auth.roleLabel')}</label>
                  <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                    <button 
                      type="button"
                      onClick={() => setIdentity('client')}
                      className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${identity === 'client' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      {t('common.client')}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIdentity('lawyer')}
                      className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${identity === 'lawyer' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      {t('common.lawyer')}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <input type="text" placeholder={t('auth.fullNameLabel')} value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-slate-950 text-white p-5 rounded-2xl outline-none border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all" required />
                  <input type="email" placeholder={t('auth.emailLabel')} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 text-white p-5 rounded-2xl outline-none border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all" required />
                  <input type="password" placeholder={t('auth.passwordLabel')} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} className="w-full bg-slate-950 text-white p-5 rounded-2xl outline-none border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all" required />
                </div>

                {message && (
                  <div className={`rounded-2xl border p-4 text-sm font-medium ${message.includes('berhasil') ? 'border-green-900 bg-green-950/50 text-green-400' : 'border-red-900 bg-red-950/50 text-red-400'}`}>
                    {message}
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-5 font-bold uppercase tracking-widest text-xs rounded-2xl disabled:opacity-50 transition-colors">
                  {isLoading ? t('common.loading') : identity === 'lawyer' ? 'Lanjutkan ke Dokumen' : t('auth.registerNow')}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="space-y-2">
                <h2 className="text-4xl font-bold font-display text-white">Verifikasi Advokat</h2>
                <p className="text-slate-400 font-medium">Unggah dokumen untuk proses verifikasi izin praktik.</p>
              </div>

              <form className="space-y-6" onSubmit={handleLawyerSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => openUploadInfo('KTP Sisi Depan')} className="col-span-2 p-6 border-2 border-dashed border-slate-800 hover:border-amber-500 rounded-2xl flex flex-col items-center justify-center space-y-2 group cursor-pointer transition-colors bg-slate-950">
                    <Upload className="w-6 h-6 text-slate-500 group-hover:text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-white">KTP (Sisi Depan)</span>
                  </button>

                  <button type="button" onClick={() => openUploadInfo('STR / Izin Praktik')} className="p-6 border-2 border-dashed border-slate-800 hover:border-amber-500 rounded-2xl flex flex-col items-center justify-center space-y-2 group cursor-pointer transition-colors bg-slate-950">
                    <FileCheck className="w-6 h-6 text-slate-500 group-hover:text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-white">STR / Izin</span>
                  </button>
                  
                  <button type="button" onClick={() => openUploadInfo('Sertifikat Advokat')} className="p-6 border-2 border-dashed border-slate-800 hover:border-amber-500 rounded-2xl flex flex-col items-center justify-center space-y-2 group cursor-pointer transition-colors bg-slate-950">
                    <CheckCircle2 className="w-6 h-6 text-slate-500 group-hover:text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-white">Sertifikat</span>
                  </button>

                  <button type="button" onClick={() => openUploadInfo('Foto Profil Profesional')} className="col-span-2 p-6 border-2 border-dashed border-slate-800 hover:border-amber-500 rounded-2xl flex flex-col items-center justify-center space-y-2 group cursor-pointer transition-colors bg-slate-950">
                    <div className="w-12 h-12 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center text-slate-500">
                      <span className="text-xs uppercase font-bold text-slate-300">Foto</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-white">Foto Profil Profesional</span>
                  </button>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 mt-0.5" />
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Data Anda aman dan tidak akan disebarluaskan sesuai dengan kebijakan privasi profesional kami.
                  </p>
                </div>

                {message && (
                  <div className="rounded-2xl border border-red-900 bg-red-950/50 p-4 text-sm font-medium text-red-400">
                    {message}
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-5 font-bold uppercase tracking-widest text-xs rounded-2xl disabled:opacity-50 transition-colors">
                  {isLoading ? t('common.loading') : 'Kirim untuk Verifikasi'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="mt-auto pt-12 flex justify-center">
          <div className="flex items-center space-x-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <button type="button" onClick={() => setModal({ title: 'Syarat & Ketentuan', description: 'Aturan pendaftaran platform.' })} className="hover:text-white transition-colors">Syarat & Ketentuan</button>
            <button type="button" onClick={() => setModal({ title: 'Kebijakan Privasi', description: 'Keamanan data dan dokumen.' })} className="hover:text-white transition-colors">Kebijakan Privasi</button>
          </div>
        </div>
      </div>
    </div>
  );
};
