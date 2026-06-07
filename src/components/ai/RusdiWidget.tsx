import React, { useState, useEffect } from 'react';
import { Bot, X, Maximize2, History, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AIChat } from './AIChat';
import { AIChatHistory } from './AIChatHistory';
import { askGemini } from '../../services/geminiService';
import {
  archiveAISession,
  createAISession,
  deleteAISession,
  fetchAIMessages,
  fetchAISessions,
  renameAISession,
  searchAISessions,
  AIMessage,
  AISession
} from '../../services/chatService';
import { getStoredUser } from '../../api';

type RusdiWidgetProps = {
  onOpenFullPage: () => void;
  onLoginRequired?: () => void;
};

export function RusdiWidget({ onOpenFullPage, onLoginRequired }: RusdiWidgetProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const user = getStoredUser();
  const userId = user?.id;

  const loadSessions = async (query = '') => {
    if (!userId) return;
    try {
      const data = query.trim()
        ? await searchAISessions(userId, query, showArchived)
        : await fetchAISessions(userId, { includeArchived: showArchived });
      setSessions(data);
    } catch (err) {
      console.error('Failed to load AI sessions:', err);
    }
  };

  const startNewSession = async () => {
    if (!userId) return;
    try {
      const session = await createAISession(userId);
      setCurrentSessionId(session.sessionId);
      setMessages([]);
      setShowHistory(false);
      await loadSessions();
    } catch (err) {
      console.error('Failed to create AI session:', err);
    }
  };

  // Load messages for specific session
  const loadMessages = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const data = await fetchAIMessages(sessionId);
      setMessages(data);
      setCurrentSessionId(sessionId);
      setShowHistory(false);
    } catch (err) {
      console.error('Failed to load AI messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selecting a session from history
  const handleSelectSession = (sessionId: string) => {
    loadMessages(sessionId);
  };

  // Handle deleting a session
  const handleDeleteSession = async (sessionId: string) => {
    if (!userId) return;
    if (confirm('Apakah Anda yakin ingin menghapus percakapan ini?')) {
      try {
        await deleteAISession(sessionId, userId);
        await loadSessions();
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
          setMessages([]);
        }
      } catch (err) {
        console.error('Failed to delete session:', err);
      }
    }
  };

  // Send message
  const handleSendMessage = async (text: string, attachment?: { base64: string, mimeType: string, name: string }) => {
    if (!userId) return;
    
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      const session = await createAISession(userId, text.slice(0, 60) || 'Percakapan Rusdi');
      activeSessionId = session.sessionId;
      setCurrentSessionId(activeSessionId);
    }

    let displayMessage = text;
    if (attachment) {
      displayMessage = displayMessage ? `[Mengirim file: ${attachment.name}]\n${displayMessage}` : `[Mengirim file: ${attachment.name}]`;
    }

    // Append user message locally first
    const language = localStorage.getItem('finprose_lang') || 'id';
    const tempUserMsg: AIMessage = {
      id: crypto.randomUUID(),
      session_id: activeSessionId,
      user_id: userId,
      role: 'user',
      message: displayMessage || text,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const aiReply = await askGemini(displayMessage || text, activeSessionId, attachment, language);

      const tempAiMsg: AIMessage = {
        id: crypto.randomUUID(),
        session_id: activeSessionId,
        user_id: userId,
        role: 'assistant',
        message: aiReply,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempAiMsg]);
      const persisted = await fetchAIMessages(activeSessionId);
      if (persisted.length) setMessages(persisted);
      await loadSessions();
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Append error message
      const tempErrorMsg: AIMessage = {
        id: crypto.randomUUID(),
        session_id: activeSessionId,
        user_id: userId,
        role: 'assistant',
        message: `Maaf, terjadi kesalahan: ${err.message || 'Gagal merespons.'} Silakan coba lagi.`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Setup initial session
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, showArchived]);

  const handleToggle = () => {
    if (!userId) {
      onLoginRequired?.();
      return;
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[115] flex flex-col items-end pointer-events-none">
      {/* Chat Panel Box */}
      {isOpen && userId && (
        <div className="pointer-events-auto flex flex-col md:flex-row w-[360px] md:w-[480px] max-h-[calc(100vh-8rem)] h-[550px] bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden mb-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 text-slate-100">
          
          {/* Sidebar (History) */}
          {showHistory && (
            <div className="w-[180px] h-full shrink-0 animate-in slide-in-from-left duration-250 border-r border-slate-850">
              <AIChatHistory
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
                onNewChat={startNewSession}
                onRenameSession={(sessionId, title) => renameAISession(sessionId, userId!, title).then(() => loadSessions())}
                onArchiveSession={(sessionId, archived) => archiveAISession(sessionId, userId!, archived).then(() => loadSessions())}
                onSearch={(query) => loadSessions(query)}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived((prev) => !prev)}
              />
            </div>
          )}

          {/* Main Chat Window */}
          <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950 text-white shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {showHistory ? (
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1 rounded-lg hover:bg-slate-800 transition-all text-white cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowHistory(true)}
                    className="p-1 rounded-lg hover:bg-slate-800 transition-all text-white cursor-pointer"
                    title="Riwayat Sesi"
                  >
                    <History size={16} />
                  </button>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-wide font-display text-white">Rusdi AI</span>
                  <span className="text-[9px] text-slate-400">{t('rusdi.title')}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullPage();
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 transition-all text-slate-400 hover:text-white cursor-pointer"
                  title="Buka Penuh"
                >
                  <Maximize2 size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 transition-all text-slate-400 hover:text-white cursor-pointer"
                  title="Tutup"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 min-h-0 bg-slate-900">
              <AIChat
                messages={messages}
                isLoading={isLoading}
                onSendMessage={handleSendMessage}
                onSelectSample={handleSendMessage}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={userId ? 'Buka Asisten Hukum AI Rusdi' : 'Masuk untuk menggunakan Rusdi AI'}
        className="relative z-[120] shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-slate-950 hover:bg-amber-600 transition-all duration-300 shadow-lg hover:scale-105 cursor-pointer border border-amber-600/30 pointer-events-auto"
        title={userId ? 'Buka Asisten Hukum AI Rusdi' : 'Masuk untuk menggunakan Rusdi AI'}
      >
        {isOpen ? <X size={22} /> : <Bot size={22} className="animate-bounce" />}
      </button>
    </div>
  );
}
