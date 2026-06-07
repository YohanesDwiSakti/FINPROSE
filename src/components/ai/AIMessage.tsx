import React from 'react';
import { Bot, User } from 'lucide-react';

type AIMessageProps = {
  role: 'user' | 'assistant';
  message: string;
  timestamp?: string;
  key?: any;
};

export function AIMessage({ role, message, timestamp }: AIMessageProps) {
  const isUser = role === 'user';

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderInlineMarkdown = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-semibold text-brand-black">{part}</strong>;
      }
      return part;
    });
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    let isInsideList = false;
    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Check if bullet point
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        isInsideList = true;
        elements.push(
          <li key={`li-${idx}`} className="ml-4 list-disc mb-1 pl-1 text-brand-gray-700 text-sm">
            {renderInlineMarkdown(trimmed.substring(2))}
          </li>
        );
        return;
      }

      // Check for Section Headers in case analysis
      const isHeaderKeyword = trimmed.endsWith(':') && (
        trimmed.startsWith('Ringkasan Masalah') ||
        trimmed.startsWith('Bidang Hukum Terkait') ||
        trimmed.startsWith('Kemungkinan Dasar Hukum') ||
        trimmed.startsWith('Langkah') ||
        trimmed.startsWith('Risiko') ||
        trimmed.startsWith('Rekomendasi')
      );

      if (isHeaderKeyword || trimmed.startsWith('### ')) {
        const cleanHeader = trimmed.startsWith('### ') ? trimmed.substring(4) : trimmed;
        elements.push(
          <h4 key={`h-${idx}`} className="text-sm font-bold mt-4 mb-2 text-brand-black tracking-wide border-b border-brand-gray-200 pb-1">
            {cleanHeader}
          </h4>
        );
        return;
      }

      if (trimmed === '') {
        elements.push(<div key={`spacer-${idx}`} className="h-2" />);
        return;
      }

      // Standard paragraph
      elements.push(
        <p key={`p-${idx}`} className="mb-2 leading-relaxed text-sm text-brand-gray-800">
          {renderInlineMarkdown(line)}
        </p>
      );
    });

    return elements;
  };

  return (
    <div className={`flex w-full items-start gap-3 my-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Bot Icon */}
      {!isUser && (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-black text-white shrink-0 shadow-sm">
          <Bot size={16} />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-xs transition-all duration-200 ${
          isUser
            ? 'bg-brand-black text-white rounded-tr-none'
            : 'bg-brand-gray-100 text-brand-gray-900 rounded-tl-none border border-brand-gray-200/50'
        }`}
      >
        {/* Render message body */}
        <div className="space-y-1">
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
          ) : (
            <div className="prose prose-sm max-w-none text-left">
              {renderMarkdown(message)}
            </div>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <div
            className={`text-[10px] mt-1 text-right ${
              isUser ? 'text-brand-gray-400' : 'text-brand-gray-500'
            }`}
          >
            {formatTime(timestamp)}
          </div>
        )}
      </div>

      {/* User Icon */}
      {isUser && (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-gray-200 text-brand-gray-800 shrink-0 shadow-sm border border-brand-gray-300">
          <User size={16} />
        </div>
      )}
    </div>
  );
}
