import React, { useState } from 'react';
import { ArrowLeft, Mail, ChevronRight, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage = ({ onBack, onVerifyOTP }: { onBack: () => void, onVerifyOTP: () => void }) => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
        onVerifyOTP();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-brand-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-4xl font-bold font-display">Lupa Password?</h2>
          <p className="text-brand-gray-400 font-medium">
            Masukkan email Anda untuk menerima instruksi pemulihan password.
          </p>
        </div>

        {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 pl-1">Email Address</label>
                    <input 
                    type="email" 
                    placeholder="name@firm.com" 
                    className="w-full bg-brand-gray-50 p-5 rounded-2xl outline-none border border-transparent focus:border-brand-gray-200 transition-all"
                    required
                    />
                </div>

                <button type="submit" className="w-full btn-primary py-5 font-bold uppercase tracking-widest text-xs flex items-center justify-center space-x-2">
                    <span>Kirim Instruksi</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </form>
        ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95">
                <div className="p-6 bg-brand-gray-50 rounded-2xl border border-brand-gray-100 flex items-center space-x-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <p className="text-sm font-bold">Email pemulihan telah dikirim!</p>
                </div>
                <p className="text-center text-xs text-brand-gray-400 font-medium italic">Anda akan dialihkan ke halaman verifikasi...</p>
            </div>
        )}

        <button onClick={onBack} className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black mx-auto">
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Login</span>
        </button>
      </div>
    </div>
  );
};
