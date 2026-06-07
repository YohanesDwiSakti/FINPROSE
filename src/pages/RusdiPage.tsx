import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, Briefcase, Users, ChevronLeft, SendHorizonal, Loader2, Sparkles, Copy, Check, ArrowRight } from 'lucide-react';
import { AIChatHistory } from '../components/ai/AIChatHistory';
import { AIChat } from '../components/ai/AIChat';
import { askGemini } from '../services/geminiService';
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
} from '../services/chatService';
import { analyzeCase } from '../services/caseAnalyzer';
import { getLawyerRecommendations, LawyerRecommendation } from '../services/lawyerRecommendation';
import { recommendLawyers } from '../ai/services/RecommendationService';
import { summarizeCase } from '../ai/services/ChatService';
import { getStoredUser } from '../api';
import { trackRusdiError } from '../utils/monitoring';
import { Lawyer } from '../types';

type RusdiPageProps = {
  onBack: () => void;
  onSelectLawyer: (lawyer: Lawyer) => void;
};

type TabType = 'chat' | 'analysis' | 'recommendation';

export function RusdiPage({ onBack, onSelectLawyer }: RusdiPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  
  // Chat Tab States
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Case Analysis Tab States
  const [caseDescription, setCaseDescription] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Lawyer Recommendation Tab States
  const [problemDescription, setProblemDescription] = useState('');
  const [recommendations, setRecommendations] = useState<LawyerRecommendation[]>([]);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);

  const user = getStoredUser();
  const userId = user?.id;

  useEffect(() => {
    if (userId) {
      loadSessions();
    }
  }, [userId, showArchived]);

  const loadSessions = async (query = '') => {
    if (!userId) return;
    try {
      const data = query.trim()
        ? await searchAISessions(userId, query, showArchived)
        : await fetchAISessions(userId, { includeArchived: showArchived });
      setSessions(data);
    } catch (err) {
      console.error('Failed to load Rusdi sessions:', err);
    }
  };

  const startNewSession = async () => {
    if (!userId) return;
    try {
      const session = await createAISession(userId);
      setCurrentSessionId(session.sessionId);
      setMessages([]);
      await loadSessions();
    } catch (err) {
      console.error('Failed to create Rusdi session:', err);
    }
  };

  const loadMessages = async (sessionId: string) => {
    setIsLoadingChat(true);
    try {
      const data = await fetchAIMessages(sessionId);
      setMessages(data);
      setCurrentSessionId(sessionId);
    } catch (err) {
      console.error('Failed to load Rusdi messages:', err);
    } finally {
      setIsLoadingChat(false);
    }
  };

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

  const handleRenameSession = async (sessionId: string, title: string) => {
    if (!userId) return;
    try {
      await renameAISession(sessionId, userId, title);
      await loadSessions();
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
  };

  const handleArchiveSession = async (sessionId: string, archived: boolean) => {
    if (!userId) return;
    try {
      await archiveAISession(sessionId, userId, archived);
      await loadSessions();
      if (currentSessionId === sessionId && archived) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to archive session:', err);
    }
  };

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

    const language = localStorage.getItem('YDA LAW OFFICE & Partners_lang') || 'id';
    const tempUserMsg: AIMessage = {
      id: crypto.randomUUID(),
      session_id: activeSessionId,
      user_id: userId,
      role: 'user',
      message: displayMessage || text,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoadingChat(true);

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
    } catch (err: unknown) {
      trackRusdiError('rusdi.chat.send', err, { sessionId: activeSessionId });
      const errorText = err instanceof Error ? err.message : 'Error api.';
      const tempErrorMsg: AIMessage = {
        id: crypto.randomUUID(),
        session_id: activeSessionId,
        user_id: userId,
        role: 'assistant',
        message: `Maaf, Rusdi gagal merespons: ${errorText}`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempErrorMsg]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Run Case Analysis
  const handleAnalyzeCase = async () => {
    if (!caseDescription.trim() || isLoadingAnalysis) return;
    setIsLoadingAnalysis(true);
    setAnalysisResult('');
    try {
      const result = await analyzeCase(caseDescription).catch(() => summarizeCase(caseDescription));
      setAnalysisResult(result);
    } catch (err: unknown) {
      setAnalysisResult(`Gagal menganalisis kasus: ${err instanceof Error ? err.message : 'Silakan coba lagi.'}`);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleCopyAnalysis = () => {
    navigator.clipboard.writeText(analysisResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Run Lawyer Recommendations
  const handleGetRecommendations = async () => {
    if (!problemDescription.trim() || isLoadingRecommendation) return;
    setIsLoadingRecommendation(true);
    setRecommendations([]);
    try {
      const data = await getLawyerRecommendations(problemDescription);
      setRecommendations(data);
    } catch (err) {
      const local = await recommendLawyers(problemDescription, 5);
      setRecommendations(local.map(item => ({
        lawyer: {
          id: item.lawyerId,
          name: item.name,
          specialty: item.specialty,
          rating: item.rating,
          reviewCount: 0,
          experience: 0,
          price: item.price,
          image: item.image,
          description: item.reason,
          isOnline: true,
          languages: [],
          education: [],
          certifications: [],
          availability: []
        },
        reason: item.reason
      })));
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  const renderAnalysisMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc mb-1 text-sm text-brand-gray-700">
            {trimmed.substring(2)}
          </li>
        );
      }
      const isHeader = trimmed.endsWith(':') && (
        trimmed.startsWith('Ringkasan Masalah') ||
        trimmed.startsWith('Bidang Hukum Terkait') ||
        trimmed.startsWith('Kemungkinan Dasar Hukum') ||
        trimmed.startsWith('Langkah') ||
        trimmed.startsWith('Risiko') ||
        trimmed.startsWith('Rekomendasi')
      );
      if (isHeader || trimmed.startsWith('### ')) {
        const clean = trimmed.startsWith('### ') ? trimmed.substring(4) : trimmed;
        return (
          <h3 key={idx} className="text-md font-bold mt-5 mb-2 text-brand-black border-b border-brand-gray-200 pb-1">
            {clean}
          </h3>
        );
      }
      if (trimmed === '') return <div key={idx} className="h-2" />;
      return <p key={idx} className="text-sm leading-relaxed text-brand-gray-800 mb-2">{line}</p>;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-brand-gray-50 text-brand-gray-900 font-sans">
      
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-brand-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-brand-gray-100 transition-all text-brand-gray-600 cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-black text-white shrink-0 shadow-sm">
              <Bot size={18} />
            </div>
            <div>
              <h1 className="text-md font-bold font-display tracking-tight text-brand-black">Workspace Rusdi</h1>
              <p className="text-[10px] text-brand-gray-500">Asisten Hukum AI YDA LAW OFFICE & Partners</p>
            </div>
          </div>
        </div>

        {/* Tab Switching */}
        <div className="flex rounded-xl bg-brand-gray-100 p-1 border border-brand-gray-200/50">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-white text-brand-black shadow-xs font-bold'
                : 'text-brand-gray-500 hover:text-brand-black'
            }`}
          >
            <MessageSquare size={13} />
            <span>Chat Rusdi</span>
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'analysis'
                ? 'bg-white text-brand-black shadow-xs font-bold'
                : 'text-brand-gray-500 hover:text-brand-black'
            }`}
          >
            <Briefcase size={13} />
            <span>Analisis Kasus</span>
          </button>
          <button
            onClick={() => setActiveTab('recommendation')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'recommendation'
                ? 'bg-white text-brand-black shadow-xs font-bold'
                : 'text-brand-gray-500 hover:text-brand-black'
            }`}
          >
            <Users size={13} />
            <span>Rekomendasi Advokat</span>
          </button>
        </div>

        <div className="w-10 h-10" /> {/* Spacer */}
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex min-h-0 bg-brand-gray-50/50">
        
        {/* TAB 1: Chat Workspace */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex h-full min-w-0">
            {/* Sidebar */}
            <div className="w-64 border-r border-brand-gray-200 shrink-0 h-full">
              <AIChatHistory
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={loadMessages}
                onDeleteSession={handleDeleteSession}
                onNewChat={startNewSession}
                onRenameSession={handleRenameSession}
                onArchiveSession={handleArchiveSession}
                onSearch={(query) => loadSessions(query)}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived((prev) => !prev)}
              />
            </div>
            {/* Chat Area */}
            <div className="flex-1 h-full min-w-0">
              <AIChat
                messages={messages}
                isLoading={isLoadingChat}
                onSendMessage={handleSendMessage}
                onSelectSample={handleSendMessage}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Case Analysis Workspace */}
        {activeTab === 'analysis' && (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden p-6 gap-6">
            {/* Input Form Column */}
            <div className="flex-1 bg-white border border-brand-gray-200 rounded-3xl p-6 flex flex-col shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-brand-gray-100 text-brand-black">
                  <Sparkles size={16} />
                </div>
                <h2 className="text-md font-bold text-brand-black">Tulis Fakta Kasus Hukum</h2>
              </div>
              <p className="text-xs text-brand-gray-500 mb-4 leading-relaxed">
                Ceritakan secara detail kronologi masalah yang Anda alami, pihak yang terlibat, dan kerugian yang Anda alami. Rusdi akan menyusun analisis hukum awal terstruktur.
              </p>
              <textarea
                value={caseDescription}
                onChange={(e) => setCaseDescription(e.target.value)}
                placeholder="Contoh: Saya membeli sebuah barang secara online seharga Rp 15 juta dan sudah mentransfer uangnya. Namun, setelah 2 minggu, barang belum juga dikirim dan nomor kontak penjual tidak dapat dihubungi..."
                className="flex-1 resize-none border border-brand-gray-200 bg-brand-gray-50/50 rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-black focus:ring-1 focus:ring-brand-black text-brand-gray-900 leading-relaxed mb-4 disabled:opacity-60"
                disabled={isLoadingAnalysis}
              />
              <button
                onClick={handleAnalyzeCase}
                disabled={!caseDescription.trim() || isLoadingAnalysis}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:bg-brand-gray-200 disabled:text-brand-gray-400 disabled:cursor-not-allowed shrink-0"
              >
                {isLoadingAnalysis ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Rusdi Menganalisis Kasus...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Mulai Analisis Kasus</span>
                  </>
                )}
              </button>
            </div>

            {/* Output Report Column */}
            <div className="flex-1 bg-white border border-brand-gray-200 rounded-3xl p-6 flex flex-col shadow-xs overflow-hidden">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-brand-gray-100 text-brand-black">
                    <Briefcase size={16} />
                  </div>
                  <h2 className="text-md font-bold text-brand-black">Laporan Analisis Hukum</h2>
                </div>
                {analysisResult && (
                  <button
                    onClick={handleCopyAnalysis}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-gray-200 hover:border-brand-black text-xs font-semibold transition-all cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check size={13} className="text-green-600" />
                        <span className="text-green-600">Disalin</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Salin Laporan</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Laporan Render */}
              <div className="flex-1 overflow-y-auto bg-brand-gray-50/50 border border-brand-gray-200/50 rounded-2xl p-5">
                {isLoadingAnalysis ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Loader2 size={32} className="animate-spin text-brand-black mb-3" />
                    <h4 className="text-sm font-semibold text-brand-black">Rusdi Membuat Analisis Hukum</h4>
                    <p className="text-xs text-brand-gray-500 mt-1 max-w-[240px]">
                      Rusdi sedang meneliti kronologi, mengidentifikasi pasal terkait, dan menyusun rekomendasi langkah Anda...
                    </p>
                  </div>
                ) : analysisResult ? (
                  <div className="text-left prose prose-sm max-w-none">
                    {renderAnalysisMarkdown(analysisResult)}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12 text-brand-gray-400">
                    <Bot size={32} className="opacity-40 mb-3 animate-pulse" />
                    <p className="text-xs max-w-[200px]">
                      Laporan analisis hukum akan tampil di sini setelah Anda mengklik "Mulai Analisis Kasus".
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Lawyer Matchmaking Workspace */}
        {activeTab === 'recommendation' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Recommendation Query Bar */}
            <div className="bg-white border border-brand-gray-200 rounded-3xl p-6 shadow-xs max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-brand-gray-100 text-brand-black">
                  <Users size={16} />
                </div>
                <h2 className="text-md font-bold text-brand-black">Cari Rekomendasi Advokat</h2>
              </div>
              <p className="text-xs text-brand-gray-500 mb-4 leading-relaxed">
                Tuliskan inti permasalahan hukum Anda. Rusdi akan mencocokkannya dengan portofolio Advokat dan menyarankan yang terbaik.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Contoh: Saya membutuhkan pengacara perceraian dan hak asuh anak di Surabaya..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-brand-gray-50 border border-brand-gray-200 text-brand-gray-900 text-sm focus:outline-none focus:border-brand-black focus:ring-1 focus:ring-brand-black transition-all duration-150 disabled:opacity-60"
                  disabled={isLoadingRecommendation}
                />
                <button
                  onClick={handleGetRecommendations}
                  disabled={!problemDescription.trim() || isLoadingRecommendation}
                  className="btn-primary flex items-center justify-center gap-2 py-3 px-6 cursor-pointer shadow-sm disabled:bg-brand-gray-200 disabled:text-brand-gray-400 disabled:cursor-not-allowed shrink-0"
                >
                  {isLoadingRecommendation ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Mencari...</span>
                    </>
                  ) : (
                    <span>Cari Advokat</span>
                  )}
                </button>
              </div>
            </div>

            {/* Results Grid */}
            <div className="max-w-4xl mx-auto space-y-4">
              <h3 className="text-sm font-bold text-brand-black uppercase tracking-wider px-1">
                {isLoadingRecommendation ? "Rusdi Menganalisis Advokat Terkait..." : recommendations.length > 0 ? "Advokat yang Direkomendasikan" : ""}
              </h3>

              {isLoadingRecommendation ? (
                // Loading Grid
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((n) => (
                    <div key={n} className="bg-white border border-brand-gray-200 rounded-3xl p-5 shadow-xs flex flex-col gap-4 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-brand-gray-200 shrink-0" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-4 bg-brand-gray-200 rounded-md w-3/4" />
                          <div className="h-3 bg-brand-gray-200 rounded-md w-1/2" />
                          <div className="h-3 bg-brand-gray-200 rounded-md w-1/3" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-brand-gray-100 rounded-md" />
                        <div className="h-3 bg-brand-gray-100 rounded-md w-5/6" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recommendations.length > 0 ? (
                // Render recommendations
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recommendations.map((rec: LawyerRecommendation, idx: number) => {
                    const lawyer = rec.lawyer;
                    return (
                      <div key={idx} className="bg-white border border-brand-gray-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                        <div>
                          {/* Lawyer Info */}
                          <div className="flex gap-4 mb-4">
                            <img
                              src={lawyer.image || '/lawyer1.png'}
                              alt={lawyer.name}
                              className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-brand-gray-100 shadow-2xs"
                              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { (e.target as HTMLImageElement).src = '/lawyer1.png'; }}
                            />
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-brand-black truncate">{lawyer.name}</h4>
                              <p className="text-xs text-brand-gray-500 font-semibold">{lawyer.specialty}</p>
                              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-brand-gray-600">
                                <span>⭐ {lawyer.rating.toFixed(1)}</span>
                                <span className="text-brand-gray-300">•</span>
                                <span>{lawyer.experience} tahun eksp.</span>
                                <span className="text-brand-gray-300">•</span>
                                <span className="font-bold text-brand-black">Rp {lawyer.price.toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Matching Reason */}
                          <div className="bg-brand-gray-50/80 border border-brand-gray-100 rounded-2xl p-4 mb-5 text-[11px] leading-relaxed text-brand-gray-700">
                            <span className="font-bold text-brand-black block mb-1">Alasan rekomendasi Rusdi:</span>
                            {rec.reason}
                          </div>
                        </div>

                        {/* Booking Link button */}
                        <button
                          onClick={() => onSelectLawyer(lawyer)}
                          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-brand-black hover:bg-brand-black hover:text-white text-xs font-semibold text-brand-black transition-all duration-200 cursor-pointer"
                        >
                          <span>Mulai Konsultasi Resmi</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Empty recommendations state
                <div className="flex flex-col items-center justify-center text-center py-12 text-brand-gray-400 bg-white border border-brand-gray-200 rounded-3xl shadow-xs max-w-4xl mx-auto">
                  <Bot size={32} className="opacity-40 mb-3 animate-pulse" />
                  <p className="text-xs max-w-[260px] leading-relaxed">
                    Belum ada rekomendasi. Masukkan keluhan hukum Anda di atas dan Rusdi akan carikan advokat yang relevan.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
