import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Send, Paperclip, Image as ImageIcon, Mic, 
  MoreVertical, ShieldCheck, Clock, FileText, Download, 
  X, CheckCheck, User, Camera, Ban, Phone, Video, MessageSquare
} from 'lucide-react';
import { Lawyer, Message, MessageType } from '../types';
import { ActionModal } from './ActionModal';
import { fetchChatMessages, getOrCreateChatSession, getStoredUser, sendChatMessage, type AppMessageRow } from '../api';

export const ChatPage = ({ 
  lawyer, 
  consultationId,
  clientId,
  onBack,
  onStartCall,
  currentUserRole = 'client'
}: { 
  lawyer: Lawyer, 
  consultationId?: string,
  clientId?: string,
  onBack: () => void,
  onStartCall?: (type: 'video' | 'voice') => void,
  currentUserRole?: 'client' | 'lawyer'
}) => {
  const [messages, setMessages] = useState<Message[]>(consultationId ? [] : [
    {
      id: '1',
      senderId: lawyer.id,
      content: `Selamat siang. Saya ${lawyer.name}. Saya telah membaca catatan masalah hukum Anda terkait sengketa tanah. Bisa Anda kirimkan foto sertifikat atau dokumen pendukung lainnya?`,
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      type: MessageType.TEXT
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [chatSessionId, setChatSessionId] = useState('');
  const [isDatabaseBacked, setIsDatabaseBacked] = useState(!consultationId);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes in seconds
  const scrollRef = useRef<HTMLDivElement>(null);
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mapMessage = (row: AppMessageRow): Message => ({
    id: row.id,
    senderId: row.sender_id || row.sender_role,
    content: row.content || '',
    timestamp: new Date(row.created_at),
    type: row.message_type === 'file' ? MessageType.FILE : MessageType.TEXT,
    fileName: row.attachment_name || undefined,
    fileSize: row.attachment_size ? `${(row.attachment_size / 1024 / 1024).toFixed(1)} MB` : undefined,
    fileUrl: row.attachment_url || undefined
  });

  useEffect(() => {
    if (!consultationId) return;

    let mounted = true;
    const user = getStoredUser();

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const session = await getOrCreateChatSession({
          consultationId,
          clientId: clientId || user?.id,
          lawyerId: lawyer.id
        });
        if (!mounted) return;
        setChatSessionId(session.id);

        const rows = await fetchChatMessages(session.id);
        if (!mounted) return;
        if (rows.length > 0) {
          setMessages(rows.map(mapMessage));
        }
      } catch (error) {
        if (!mounted) return;
        setIsDatabaseBacked(false);
        setModal({
          title: 'Chat Database Belum Siap',
          description: error instanceof Error
            ? `${error.message}. Chat tetap bisa dipakai sementara di layar ini, tetapi jalankan migration 010_ensure_chat_runtime.sql agar pesan tersimpan permanen.`
            : 'Pesan belum bisa dimuat dari database. Jalankan migration 010_ensure_chat_runtime.sql agar chat tersimpan permanen.'
        });
      } finally {
        if (mounted) setIsLoadingMessages(false);
      }
    };

    loadMessages();
    const poll = window.setInterval(loadMessages, 5000);

    return () => {
      mounted = false;
      window.clearInterval(poll);
    };
  }, [consultationId, clientId, lawyer.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const content = inputText;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: getStoredUser()?.id || 'current-user',
      content,
      timestamp: new Date(),
      type: MessageType.TEXT
    };

    setMessages([...messages, newMessage]);
    setInputText('');

    if (chatSessionId) {
      try {
        const saved = await sendChatMessage({ chatSessionId, content });
        setMessages(prev => prev.map(item => item.id === newMessage.id ? mapMessage(saved) : item));
      } catch (error) {
        setModal({ title: 'Pesan Belum Tersimpan', description: error instanceof Error ? error.message : 'Pesan hanya tersimpan sementara di layar.' });
      }
    }
  };

  const sendFile = (type: MessageType, fileName: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'current-user',
      content: `Sending ${fileName}...`,
      timestamp: new Date(),
      type: type,
      fileName: fileName,
      fileSize: '2.4 MB'
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <div className="flex flex-col h-screen bg-brand-gray-50 overflow-hidden font-sans">
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      {/* Header */}
      <header className="bg-white border-b border-brand-gray-100 px-6 py-4 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-brand-gray-50 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-brand-gray-400" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img src={lawyer.image} alt={lawyer.name} className="w-10 h-10 rounded-full object-cover grayscale-[0.2]" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center space-x-1">
                <span>{lawyer.name}</span>
                <ShieldCheck className="w-3 h-3 text-brand-black" />
              </h3>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Active Consultation</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-6">
          <div className="hidden md:flex items-center space-x-2 bg-brand-black text-white px-4 py-2 rounded-xl">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold font-mono">{formatTime(timeLeft)}</span>
          </div>
          
          <div className="flex items-center border-l border-brand-gray-100 pl-2 md:pl-6 space-x-1 md:space-x-2">
            <button 
              onClick={() => onStartCall?.('voice')}
              className="p-2 hover:bg-brand-gray-50 rounded-full transition-colors text-brand-gray-400 hover:text-brand-black"
              title="Voice Call"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onStartCall?.('video')}
              className="p-2 hover:bg-brand-gray-50 rounded-full transition-colors text-brand-gray-400 hover:text-brand-black"
              title="Video Call"
            >
              <Video className="w-5 h-5" />
            </button>
            <button onClick={() => setModal({ title: 'Menu Percakapan', description: 'Menu ini berisi detail konsultasi, arsip chat, laporkan masalah, dan pengaturan dokumen bersama.' })} className="p-2 hover:bg-brand-gray-50 rounded-full">
              <MoreVertical className="w-5 h-5 text-brand-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Timer Bar (Mobile Only) */}
      <div className="md:hidden bg-brand-black text-white py-2 px-6 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
        <span>Sisa Waktu Sesi</span>
        <span className="font-mono">{formatTime(timeLeft)}</span>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth"
      >
        <div className="flex flex-col items-center space-y-4 mb-8">
            <div className="bg-white px-4 py-2 rounded-full border border-brand-gray-100 shadow-sm text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                Sesi Dimulai - {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
              <p className="text-center text-[10px] font-medium text-brand-gray-400 max-w-sm uppercase tracking-widest">
                {isLoadingMessages ? 'Memuat pesan tersimpan...' : isDatabaseBacked ? 'Percakapan ini tersimpan di database konsultasi.' : 'Mode sementara: pesan tampil di layar ini sampai database chat siap.'}
            </p>
        </div>

        {messages.length === 0 && (
          <div className="mx-auto max-w-md rounded-3xl border border-dashed border-brand-gray-200 bg-white p-8 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-brand-gray-300" />
            <p className="text-sm font-bold text-brand-black">Belum ada pesan</p>
            <p className="mt-2 text-xs font-medium leading-5 text-brand-gray-500">
              Mulai percakapan dengan menulis pesan pertama atau unggah dokumen pendukung.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === (getStoredUser()?.id || 'current-user');
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] space-y-1`}>
                <div className={`p-4 rounded-2xl ${isMe ? 'bg-brand-black text-white rounded-tr-none' : 'bg-white text-brand-black border border-brand-gray-100 shadow-sm rounded-tl-none'}`}>
                  {msg.type === MessageType.TEXT && (
                    <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                  )}
                  
                  {msg.type === MessageType.FILE && (
                    <div className="flex items-center space-x-4 p-2 bg-black/10 rounded-xl">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{msg.fileName}</p>
                            <p className="text-[10px] opacity-60 uppercase font-bold">{msg.fileSize}</p>
                        </div>
                        <button onClick={() => setModal({ title: msg.fileName || 'Lampiran', description: `File ${msg.fileName || 'lampiran'} siap dibuka dari ruang konsultasi.` })} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                  )}

                  {msg.type === MessageType.IMAGE && (
                    <div className="space-y-2">
                        <img 
                            src="https://images.unsplash.com/photo-1589252392320-d68619c72e94?auto=format&fit=crop&q=80&w=400" 
                            className="rounded-lg w-full aspect-video object-cover" 
                            alt="Attached" 
                        />
                        <p className="text-[10px] opacity-60 font-medium">Sertifikat_Tanah_v1.pdf.jpg</p>
                    </div>
                  )}
                </div>
                <div className={`flex items-center space-x-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] font-bold text-brand-gray-400 uppercase">
                    {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMe && <CheckCheck className="w-3 h-3 text-brand-gray-300" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-brand-gray-100 p-4 md:p-6 pb-8 md:pb-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center space-x-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
            {[
              { icon: FileText, label: 'Dokumen', type: MessageType.FILE, name: 'Bukti_Transfer.pdf' },
              { icon: ImageIcon, label: 'Foto', type: MessageType.IMAGE, name: 'Foto_Kejadian.jpg' },
              { icon: Mic, label: 'Voice', type: MessageType.VOICE, name: 'Rekaman.mp3' },
              { icon: Camera, label: 'Kamera', type: MessageType.IMAGE, name: 'Foto_Baru.png' },
            ].map((tool) => (
              <button 
                key={tool.label}
                onClick={() => sendFile(tool.type, tool.name)}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-gray-50 rounded-xl border border-brand-gray-100 hover:bg-brand-gray-100 transition-colors whitespace-nowrap"
              >
                <tool.icon className="w-4 h-4 text-brand-gray-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-500">{tool.label}</span>
              </button>
            ))}
          </div>

          <div className="relative flex items-center gap-4">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Tulis pesan hukum Anda..."
                className="w-full bg-brand-gray-50 border border-transparent focus:border-brand-gray-200 rounded-2xl px-6 py-4 text-sm font-medium outline-none transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                <button onClick={() => setModal({ title: 'Lampiran', description: 'Pilih dokumen dari vault atau unggah file baru untuk dikirim ke advokat.' })} className="p-2 hover:bg-brand-gray-100 rounded-full transition-colors">
                  <Paperclip className="w-5 h-5 text-brand-gray-400" />
                </button>
              </div>
            </div>
            <button 
              onClick={handleSendMessage}
              className="p-4 bg-brand-black text-white rounded-2xl shadow-xl shadow-black/10 hover:scale-105 active:scale-95 transition-all"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
