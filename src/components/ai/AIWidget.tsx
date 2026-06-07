import React, { useState, useEffect } from 'react';
import { Bot, X, Maximize2, History, ChevronLeft } from 'lucide-react';
import { AIChat } from './AIChat';
import { AIChatHistory } from './AIChatHistory';
import { askGemini } from '../../services/geminiService';
import { fetchAISessions, fetchAIMessages, deleteAISession, AIMessage, AISession } from '../../services/chatService';
import { getStoredUser } from '../../api';

type AIWidgetProps = {
  onOpenFullPage: () => void;
};

export function AIWidget({ onOpenFullPage }: AIWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const user = getStoredUser();
  const userId = user?.id;

  const generateUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Load session list
  const loadSessions = async () => {
    if (!userId) return;
    try {
      const data = await fetchAISessions(userId);
      setSessions(data);
    } catch (err) {
      console.error('Failed to load AI sessions:', err);
    }
  };

  // Start a brand new session
  const startNewSession = () => {
    const newId = generateUuid();
    setCurrentSessionId(newId);
    setMessages([]);
    setShowHistory(false);
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
          startNewSession();
        }
      } catch (err) {
        console.error('Failed to delete session:', err);
      }
    }
  };

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!userId) return;
    
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      activeSessionId = generateUuid();
      setCurrentSessionId(activeSessionId);
    }

    // Append user message locally first
    const tempUserMsg: AIMessage = {
      id: generateUuid(),
      session_id: activeSessionId,
      user_id: userId,
      role: 'user',
      message: text,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const aiReply = await askGemini(text, activeSessionId);
      
      // Append assistant message locally
      const tempAiMsg: AIMessage = {
        id: generateUuid(),
        session_id: activeSessionId,
        user_id: userId,
        role: 'assistant',
        message: aiReply,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempAiMsg]);
      
      // Refresh session list
      await loadSessions();
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Append error message
      const tempErrorMsg: AIMessage = {
        id: generateUuid(),
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
      if (!currentSessionId) {
        startNewSession();
      }
    }
  }, [isOpen]);

  if (!userId) return null; // Render only for logged-in users

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Panel Box */}
      {isOpen && (
        <div className="flex flex-col md:flex-row w-[360px] md:w-[480px] h-[550px] bg-white rounded-3xl shadow-2xl border border-brand-gray-200 overflow-hidden mb-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          
          {/* Sidebar (History) */}
          {showHistory && (
            <div className="w-[180px] h-full shrink-0 animate-in slide-in-from-left duration-250">
              <AIChatHistory
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
                onNewChat={startNewSession}
              />
            </div>
          )}

          {/* Main Chat Window */}
          <div className="flex-1 flex flex-col h-full min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-brand-black text-white shrink-0">
              <div className="flex items-center gap-2">
                {showHistory ? (
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1 rounded-lg hover:bg-brand-gray-800 transition-all text-white cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowHistory(true)}
                    className="p-1 rounded-lg hover:bg-brand-gray-800 transition-all text-white cursor-pointer"
                    title="Riwayat Sesi"
                  >
                    <History size={16} />
                  </button>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-wide font-display">Rusdi AI</span>
                  <span className="text-[9px] text-brand-gray-400">Asisten Hukum Digital</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullPage();
                  }}
                  className="p-1.5 rounded-lg hover:bg-brand-gray-800 transition-all text-brand-gray-300 hover:text-white cursor-pointer"
                  title="Buka Penuh"
                >
                  <Maximize2 size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-brand-gray-800 transition-all text-brand-gray-300 hover:text-white cursor-pointer"
                  title="Tutup"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 min-h-0">
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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-brand-black text-white hover:bg-brand-gray-800 transition-all duration-300 shadow-lg hover:scale-105 cursor-pointer"
        title="Buka Asisten Hukum AI"
      >
        {isOpen ? <X size={22} /> : <Bot size={22} className="animate-bounce-slow" />}
      </button>
    </div>
  );
}
