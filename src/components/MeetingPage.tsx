import React, { useState, useEffect } from 'react';
import { 
  Camera, CameraOff, Mic, MicOff, PhoneOff, Share2, 
  MessageSquare, Users, Settings, Maximize, Circle,
  FileText, Download, X, MoreHorizontal, ShieldCheck
} from 'lucide-react';
import { Lawyer } from '../types';
import { ActionModal } from './ActionModal';

export const MeetingPage = ({ 
  lawyer, 
  onEndCall,
  isVoiceOnly = false 
}: { 
  lawyer: Lawyer, 
  onEndCall: () => void,
  isVoiceOnly?: boolean
}) => {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(!isVoiceOnly);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [showChat, setShowChat] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen bg-[#0A0A0A] text-white flex flex-col overflow-hidden font-sans">
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent z-20">
        <div className="flex items-center space-x-4">
          <div className="bg-brand-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-3">
             <ShieldCheck className="w-4 h-4 text-green-500" />
             <span className="text-xs font-bold uppercase tracking-widest">Secured Meeting</span>
          </div>
          {isRecording && (
            <div className="flex items-center space-x-2 bg-red-500 px-3 py-1.5 rounded-lg animate-pulse">
                <Circle className="w-2 h-2 fill-current" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Recording</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${timeLeft < 300 ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
                <span className="text-xs font-mono font-bold">{formatTime(timeLeft)}</span>
            </div>
            <button onClick={() => setModal({ title: 'Layar Penuh', description: 'Mode layar penuh akan memperbesar ruang konsultasi video pada browser pengguna.' })} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Maximize className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Main Stage */}
      <main className="flex-1 relative flex items-center justify-center p-4">
        <div className="w-full h-full max-w-6xl flex gap-4">
            {/* Main Video (Lawyer) */}
            <div className="flex-1 relative rounded-[40px] overflow-hidden bg-zinc-900 shadow-2xl border border-white/5">
                {videoOn ? (
                    <img 
                      src={lawyer.image} 
                      className="w-full h-full object-cover grayscale-[0.2]" 
                      alt={lawyer.name} 
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
                        <img src={lawyer.image} className="w-40 h-40 rounded-full object-cover grayscale border-8 border-white/5" alt={lawyer.name} />
                        <div className="text-center">
                            <h2 className="text-2xl font-bold font-display">{lawyer.name}</h2>
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-2">{lawyer.specialty}</p>
                        </div>
                    </div>
                )}
                
                <div className="absolute bottom-8 left-8 bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
                    <h3 className="font-bold text-sm flex items-center space-x-2">
                        <span>{lawyer.name}</span>
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    </h3>
                </div>
            </div>

            {/* Self View (Client) */}
            <div className="absolute top-8 right-8 w-64 aspect-video rounded-3xl overflow-hidden bg-zinc-800 border-2 border-white/10 shadow-2xl z-10">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300" 
                  className="w-full h-full object-cover filter brightness-75" 
                  alt="You" 
                />
                <div className="absolute top-4 right-4 p-1.5 bg-black/40 rounded-lg">
                    {micOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3 text-red-500" />}
                </div>
                <div className="absolute bottom-4 left-4 text-[10px] font-bold uppercase tracking-widest">You (Client)</div>
            </div>
        </div>

        {/* Side Panels */}
        {(showChat || showDocs) && (
            <div className="w-96 h-full bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-[40px] ml-4 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-10">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold uppercase tracking-widest text-xs">{showDocs ? 'Shared Documents' : 'Quick Chat'}</h3>
                    <button onClick={() => { setShowChat(false); setShowDocs(false); }} className="hover:text-zinc-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {showDocs ? (
                        <div className="space-y-3">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center space-x-4">
                                <FileText className="w-8 h-8 text-zinc-400" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate">Draft_Kontrak_v2.pdf</p>
                                    <p className="text-[10px] text-zinc-500">1.4 MB • Shared by lawyer</p>
                                </div>
                                <button onClick={() => setModal({ title: 'Download Dokumen', description: 'Draft_Kontrak_v2.pdf siap diunduh dari ruang konsultasi.' })} className="p-2 hover:bg-white/10 rounded-full">
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none">
                                <p className="text-sm">Saya sudah membuka dokumen Anda.</p>
                            </div>
                        </div>
                    )}
                </div>

                {!showDocs && (
                    <div className="p-6 border-t border-white/5">
                        <div className="relative">
                            <input type="text" placeholder="Type a message..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-white/20" />
                        </div>
                    </div>
                )}
            </div>
        )}
      </main>

      {/* Control Bar */}
      <footer className="p-8 pb-12 flex items-center justify-center relative z-20">
        <div className="bg-zinc-900/80 backdrop-blur-2xl px-10 py-6 rounded-[32px] border border-white/10 flex items-center space-x-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center space-x-4 border-r border-white/5 pr-8">
                <button 
                  onClick={() => setMicOn(!micOn)}
                  className={`p-4 rounded-2xl transition-all ${micOn ? 'hover:bg-white/10' : 'bg-red-500 text-white'}`}
                >
                    {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setVideoOn(!videoOn)}
                  className={`p-4 rounded-2xl transition-all ${videoOn ? 'hover:bg-white/10' : 'bg-red-500 text-white'}`}
                >
                    {videoOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                </button>
            </div>

            <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setShowChat(!showChat)}
                  className={`p-4 rounded-2xl transition-all ${showChat ? 'bg-white text-brand-black' : 'hover:bg-white/10 text-zinc-400'}`}
                >
                    <MessageSquare className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowDocs(!showDocs)}
                  className={`p-4 rounded-2xl transition-all ${showDocs ? 'bg-white text-brand-black' : 'hover:bg-white/10 text-zinc-400'}`}
                >
                    <FileText className="w-5 h-5" />
                </button>
                <button onClick={() => setModal({ title: 'Bagikan Layar', description: 'Fitur share screen akan meminta izin browser lalu membagikan layar ke advokat.' })} className="p-4 rounded-2xl hover:bg-white/10 transition-all text-zinc-400">
                    <Share2 className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setIsRecording(!isRecording)}
                    className={`p-4 rounded-2xl transition-all ${isRecording ? 'text-red-500' : 'hover:bg-white/10 text-zinc-400'}`}
                >
                    <Circle className={`w-5 h-5 ${isRecording ? 'fill-current' : ''}`} />
                </button>
                <button onClick={() => setModal({ title: 'Menu Meeting', description: 'Menu meeting berisi pengaturan kamera, speaker, kualitas jaringan, dan laporan kendala.' })} className="p-4 rounded-2xl hover:bg-white/10 transition-all text-zinc-400">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            <div className="pl-8 border-l border-white/5">
                <button 
                  onClick={onEndCall}
                  className="bg-red-500 hover:bg-red-600 px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl shadow-red-500/20"
                >
                    End Call
                </button>
            </div>
        </div>
      </footer>
    </div>
  );
};
