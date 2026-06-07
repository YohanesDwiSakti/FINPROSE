import React, { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, MessageSquare, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AISession } from '../../services/chatService';

type AIChatHistoryProps = {
  sessions: AISession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
  onRenameSession?: (sessionId: string, title: string) => void;
  onArchiveSession?: (sessionId: string, archived: boolean) => void;
  onSearch?: (query: string) => void;
  showArchived?: boolean;
  onToggleArchived?: () => void;
};

export function AIChatHistory({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onRenameSession,
  onArchiveSession,
  onSearch,
  showArchived = false,
  onToggleArchived
}: AIChatHistoryProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((session) => session.title.toLowerCase().includes(query));
  }, [sessions, searchQuery]);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const startRename = (session: AISession) => {
    setEditingId(session.sessionId);
    setEditTitle(session.title);
  };

  const commitRename = (sessionId: string) => {
    if (onRenameSession && editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <div className="flex flex-col h-full bg-brand-gray-50 border-r border-brand-gray-200">
      <div className="p-4 border-b border-brand-gray-200 space-y-3">
        <button
          onClick={onNewChat}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brand-black text-white text-sm font-medium hover:bg-brand-gray-800 transition-all duration-200 shadow-sm cursor-pointer"
        >
          <Plus size={16} />
          <span>{t('rusdi.newChat', 'Sesi Baru')}</span>
        </button>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('rusdi.searchChats', 'Cari percakapan...')}
            className="w-full rounded-xl border border-brand-gray-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-brand-black"
          />
        </div>

        {onToggleArchived && (
          <button
            onClick={onToggleArchived}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-gray-200 bg-white py-2 text-[10px] font-bold uppercase tracking-widest text-brand-gray-500 hover:border-brand-black hover:text-brand-black"
          >
            {showArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
            <span>{showArchived ? t('rusdi.activeChats', 'Percakapan Aktif') : t('rusdi.archivedChats', 'Arsip')}</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <h3 className="px-3 py-2 text-xs font-semibold text-brand-gray-500 uppercase tracking-wider">
          {showArchived ? t('rusdi.archivedChats', 'Arsip Percakapan') : t('rusdi.memoryTitle', 'Riwayat Percakapan')}
        </h3>

        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-brand-gray-400">
            {searchQuery ? t('rusdi.noSearchResults', 'Percakapan tidak ditemukan.') : t('rusdi.noHistory', 'Belum ada riwayat chat.')}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.sessionId === currentSessionId;
            const isEditing = editingId === session.sessionId;

            return (
              <div
                key={session.sessionId}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-gray-200 text-brand-gray-900 font-medium'
                    : 'text-brand-gray-700 hover:bg-brand-gray-100'
                }`}
                onClick={() => !isEditing && onSelectSession(session.sessionId)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MessageSquare size={15} className={isActive ? 'text-brand-black shrink-0' : 'text-brand-gray-400 shrink-0'} />
                  <div className="flex flex-col min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-lg border border-brand-gray-200 px-2 py-1 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(session.sessionId);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button onClick={() => commitRename(session.sessionId)} className="p-1 text-brand-black">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-brand-gray-400">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs truncate block pr-2">{session.title}</span>
                        <span className="text-[9px] text-brand-gray-400">{formatDate(session.timestamp)}</span>
                      </>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    {onRenameSession && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(session);
                        }}
                        className="hover:text-brand-black text-brand-gray-400 p-1 rounded-md cursor-pointer"
                        title={t('rusdi.renameChat', 'Ubah nama')}
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                    {onArchiveSession && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveSession(session.sessionId, !session.isArchived);
                        }}
                        className="hover:text-amber-700 text-brand-gray-400 p-1 rounded-md cursor-pointer"
                        title={session.isArchived ? t('rusdi.unarchiveChat', 'Pulihkan') : t('rusdi.archiveChat', 'Arsipkan')}
                      >
                        {session.isArchived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.sessionId);
                      }}
                      className="hover:text-red-600 text-brand-gray-400 p-1 rounded-md cursor-pointer"
                      title={t('rusdi.deleteChat', 'Hapus')}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
