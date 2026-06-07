import React, { useRef, useEffect } from 'react';
import { Bot, HelpCircle, Loader2 } from 'lucide-react';
import { AIMessage } from './AIMessage';
import { AIInput, FileAttachment } from './AIInput';
import { AIMessage as MessageType } from '../../services/chatService';

type AIChatProps = {
  messages: MessageType[];
  isLoading: boolean;
  onSendMessage: (message: string, attachment?: FileAttachment) => void;
  onSelectSample: (sample: string) => void;
};

export function AIChat({ messages, isLoading, onSendMessage, onSelectSample }: AIChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const samples = [
    "Saya ditipu investasi online",
    "Apa itu wanprestasi?",
    "Saya ingin menggugat seseorang"
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Scrollable Messages Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scroll-smooth bg-brand-gray-50/30"
      >
        {messages.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-brand-black text-white mb-4 shadow-md animate-pulse">
              <Bot size={28} />
            </div>
            <h3 className="text-lg font-bold text-brand-black font-display tracking-tight">
              Selamat Datang di Rusdi AI
            </h3>
            <p className="text-xs text-brand-gray-500 max-w-[280px] mt-1.5 leading-relaxed">
              Saya adalah asisten hukum digital Anda. Tanyakan apa saja mengenai masalah hukum atau cari lawyer yang sesuai.
            </p>

            {/* Quick Suggestions */}
            <div className="w-full max-w-[280px] mt-8 space-y-2 text-left">
              <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold text-brand-gray-400 uppercase tracking-wider">
                <HelpCircle size={12} />
                <span>Pertanyaan Contoh</span>
              </div>
              {samples.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSample(sample)}
                  className="w-full text-left px-4 py-2.5 rounded-xl border border-brand-gray-200 bg-white text-xs text-brand-gray-700 hover:border-brand-black hover:text-brand-black transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer block truncate"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Message Bubbles
          messages.map((msg) => (
            <AIMessage
              key={msg.id}
              role={msg.role}
              message={msg.message}
              timestamp={msg.timestamp}
            />
          ))
        )}

        {/* Loading / Typing State */}
        {isLoading && (
          <div className="flex w-full items-start gap-3 my-3 justify-start">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-black text-white shrink-0 shadow-sm">
              <Bot size={16} />
            </div>
            <div className="bg-brand-gray-100 text-brand-gray-900 rounded-2xl rounded-tl-none px-4 py-3 border border-brand-gray-200/50 shadow-xs flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-brand-gray-500" />
              <span className="text-xs text-brand-gray-500">Menganalisis...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <AIInput onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
}
