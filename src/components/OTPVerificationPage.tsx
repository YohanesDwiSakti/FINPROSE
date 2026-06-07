import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, ShieldCheck } from 'lucide-react';

export const OTPVerificationPage = ({ 
  email,
  onVerified,
  onBack 
}: { 
  email: string,
  onVerified: () => void,
  onBack: () => void 
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(timer - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Focus next
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.join('').length === 6) {
      onVerified();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-brand-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-4xl font-bold font-display">Verifikasi Email</h2>
          <p className="text-brand-gray-400 font-medium">
            Kami telah mengirimkan kode OTP ke <span className="text-brand-black font-bold">{email || 'anda@email.com'}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex justify-between gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                className="w-12 h-16 md:w-14 md:h-20 text-3xl font-bold text-center bg-brand-gray-50 border border-brand-gray-100 rounded-2xl focus:ring-1 focus:ring-brand-black focus:bg-white outline-none transition-all"
              />
            ))}
          </div>

          <button 
            type="submit" 
            disabled={otp.join('').length !== 6}
            className="w-full btn-primary py-5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verifikasi Kode
          </button>

          <div className="text-center">
            {timer > 0 ? (
              <p className="text-xs font-bold text-brand-gray-300 uppercase tracking-widest">
                Kirim ulang kode dalam <span className="text-brand-black">{timer}s</span>
              </p>
            ) : (
              <button onClick={() => setTimer(60)} className="text-xs font-bold text-brand-black uppercase tracking-widest border-b border-brand-black">
                Kirim Ulang Kode
              </button>
            )}
          </div>
        </form>

        <button onClick={onBack} className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black mx-auto">
          <ArrowLeft className="w-4 h-4" />
          <span>Ganti Email</span>
        </button>
      </div>
    </div>
  );
};
