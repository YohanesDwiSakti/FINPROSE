import { useState, type FormEvent } from 'react';
import { Briefcase, ShieldCheck, MessageSquare, ArrowLeft } from 'lucide-react';
import { ActionModal } from './ActionModal';
import { signInWithSupabase } from '../supabaseAuth';

export const LoginPage = ({ 
  onLogin, 
  onNavigateToRegister,
  onBack,
  onForgotPassword
}: { 
  onLogin: (role: 'client' | 'lawyer' | 'admin') => void,
  onNavigateToRegister: () => void,
  onBack: () => void,
  onForgotPassword: () => void
}) => {
  const [identity, setIdentity] = useState<'client' | 'lawyer' | 'admin'>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const user = await signInWithSupabase(email, password, identity);
      onLogin(user.role);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login Supabase gagal. Periksa akun Anda.');
    } finally {
      setIsLoading(false);
    }
  };

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
              <p className="text-brand-gray-400 text-xl font-medium tracking-tight">The Editorial Authority in Legal Access.</p>
            </div>
            
            <div className="space-y-8 mt-24">
              <div className="flex items-start space-x-4">
                <Briefcase className="w-6 h-6 mt-1" />
                <div>
                  <h3 className="font-bold text-lg">Curated Intelligence</h3>
                  <p className="text-brand-gray-500 text-sm">Clinical precision in every legal filing and automated insight.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <ShieldCheck className="w-6 h-6 mt-1" />
                <div>
                  <h3 className="font-bold text-lg">Institutional Grade</h3>
                  <p className="text-brand-gray-500 text-sm">Built on the bedrock of editorial integrity and data security.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <div className="px-2 py-1 bg-brand-gray-200 text-[10px] font-bold rounded">RL</div>
            <div className="px-2 py-1 bg-brand-gray-200 text-[10px] font-bold rounded">EA</div>
          </div>
          <div className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">
            Platform Konsultasi Hukum Digital
          </div>
          <div className="text-[10px] text-brand-gray-400">
            © 2024 RAW LAW. EDITORIAL AUTHORITY IN LEGAL-TECH.
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col p-12 lg:p-24 overflow-y-auto">
        <div className="flex justify-between items-center mb-20">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-sm font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <div className="flex space-x-8 text-sm font-medium text-brand-gray-400 uppercase tracking-widest">
            <button type="button" onClick={() => setModal({ title: 'Tentang Raw Law', description: 'Raw Law adalah platform konsultasi hukum digital yang menghubungkan klien dengan advokat terverifikasi.' })} className="hover:text-brand-black">Tentang</button>
            <button type="button" onClick={() => setModal({ title: 'Sumber Daya', description: 'Pusat sumber daya berisi artikel hukum, template dokumen, panduan biaya, dan edukasi sebelum konsultasi.' })} className="hover:text-brand-black">Sumber Daya</button>
            <button type="button" onClick={() => setModal({ title: 'Bantuan Login', description: 'Tim bantuan dapat membantu pemulihan akun, kendala pembayaran, dan pertanyaan sebelum konsultasi.' })} className="hover:text-brand-black">Bantuan</button>
          </div>
        </div>

        <div className="max-w-md mx-auto w-full">
          <div className="mb-12">
            <h2 className="text-4xl font-bold font-display mb-2">Masuk Akun</h2>
            <p className="text-brand-gray-400 font-medium">Akses ruang kerja hukum Anda.</p>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Masuk Sebagai</label>
                <div className="flex bg-brand-gray-50 p-1 rounded-2xl">
                  <button 
                    type="button"
                    onClick={() => setIdentity('client')}
                    className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${identity === 'client' ? 'bg-white shadow-sm text-brand-black' : 'text-brand-gray-400 hover:text-brand-black'}`}
                  >
                    Klien
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIdentity('lawyer')}
                    className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${identity === 'lawyer' ? 'bg-white shadow-sm text-brand-black' : 'text-brand-gray-400 hover:text-brand-black'}`}
                  >
                    Advokat
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIdentity('admin')}
                    className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${identity === 'admin' ? 'bg-white shadow-sm text-brand-black' : 'text-brand-gray-400 hover:text-brand-black'}`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Alamat Email</label>
                <input 
                  type="email" 
                  placeholder="name@firm.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-gray-50 p-5 rounded-2xl outline-none focus:ring-1 focus:ring-brand-black transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Kata Sandi</label>
                  <button 
                    type="button" 
                    onClick={onForgotPassword}
                    className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-300 hover:text-brand-black"
                  >
                    Lupa?
                  </button>
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-gray-50 p-5 rounded-2xl outline-none focus:ring-1 focus:ring-brand-black transition-all"
                  required
                />
              </div>
            </div>

            {message && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                {message}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="w-full btn-primary py-5 text-sm uppercase tracking-widest font-bold disabled:opacity-50">
              {isLoading ? 'Memeriksa...' : 'Login'}
            </button>

            <div className="pt-4 text-center">
              <p className="text-sm text-brand-gray-400">
                Belum punya akun?{' '}
                <button 
                  type="button"
                  onClick={onNavigateToRegister}
                  className="text-brand-black font-bold hover:underline"
                >
                  Daftar di sini
                </button>
              </p>
            </div>
          </form>
        </div>

        <div className="mt-auto pt-12 flex items-center justify-between">
          <div className="flex items-center space-x-6 text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest">
            <button type="button" onClick={() => setModal({ title: 'Kebijakan Privasi', description: 'Halaman kebijakan privasi akan menjelaskan pengelolaan data akun, konsultasi, dokumen, dan riwayat pembayaran.' })} className="hover:text-brand-black transition-colors">Kebijakan Privasi</button>
            <button type="button" onClick={() => setModal({ title: 'Syarat Layanan', description: 'Syarat layanan mengatur penggunaan platform, kewajiban klien dan advokat, refund, serta batasan tanggung jawab.' })} className="hover:text-brand-black transition-colors">Syarat Layanan</button>
            <button type="button" onClick={() => setModal({ title: 'Pemberitahuan Hukum', description: 'Pemberitahuan hukum memuat disclaimer bahwa konsultasi awal bukan pengganti pendampingan perkara penuh.' })} className="hover:text-brand-black transition-colors">Pemberitahuan Hukum</button>
          </div>
          <button type="button" onClick={() => setModal({ title: 'Bantuan Cepat', description: 'Chat bantuan akan menghubungkan Anda dengan admin FINPROSE untuk kendala login atau pendaftaran.' })} className="text-brand-black">
            <MessageSquare className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
