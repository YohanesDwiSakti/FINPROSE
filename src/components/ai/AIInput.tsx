import React, { useState, useRef, useEffect } from 'react';
import { SendHorizonal, Paperclip, X, Image as ImageIcon } from 'lucide-react';

export type FileAttachment = {
  base64: string;
  mimeType: string;
  name: string;
};

type AIInputProps = {
  onSendMessage: (message: string, attachment?: FileAttachment) => void;
  isLoading: boolean;
  placeholder?: string;
};

export function AIInput({ onSendMessage, isLoading, placeholder = "Ketik pertanyaan Anda di sini..." }: AIInputProps) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize the textarea height based on contents
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [
      'image/png', 'image/jpeg', 'image/jpg',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (!allowed.includes(file.type) && !file.name.match(/\.(png|jpe?g|pdf|docx?)$/i)) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        // result is "data:image/png;base64,....."
        const base64 = result.split(',')[1];
        setAttachment({
          base64,
          mimeType: file.type,
          name: file.name
        });
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    if ((text.trim() || attachment) && !isLoading) {
      onSendMessage(text.trim(), attachment || undefined);
      setText('');
      setAttachment(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-white border-t border-brand-gray-200">
      {/* Attachment Preview */}
      {attachment && (
        <div className="flex items-center gap-2 bg-brand-gray-100 p-2 rounded-xl self-start max-w-[80%] border border-brand-gray-200">
          {attachment.mimeType.startsWith('image/') ? (
            <img src={`data:${attachment.mimeType};base64,${attachment.base64}`} alt="preview" className="w-10 h-10 object-cover rounded-md" />
          ) : (
            <ImageIcon size={24} className="text-brand-gray-500 m-1" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-brand-black truncate">{attachment.name}</p>
            <p className="text-[10px] text-brand-gray-500">Terlampir</p>
          </div>
          <button 
            onClick={() => setAttachment(null)}
            className="p-1 hover:bg-brand-gray-200 rounded-full cursor-pointer transition-colors"
          >
            <X size={14} className="text-brand-gray-600" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input 
          type="file" 
          accept="image/png,image/jpeg,image/jpg,application/pdf,.doc,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-gray-50 border border-brand-gray-200 text-brand-gray-600 hover:bg-brand-gray-100 disabled:opacity-50 transition-all duration-200 shrink-0 shadow-sm cursor-pointer"
          title="Lampirkan PDF, DOCX, PNG, JPG"
        >
          <Paperclip size={18} />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 min-h-[40px] max-h-[120px] resize-none px-4 py-2.5 rounded-2xl bg-brand-gray-50 border border-brand-gray-200 text-brand-gray-900 text-sm focus:outline-none focus:border-brand-black focus:ring-1 focus:ring-brand-black transition-all duration-150 disabled:opacity-60"
        />
        <button
          onClick={handleSend}
          disabled={(!text.trim() && !attachment) || isLoading}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-black text-white hover:bg-brand-gray-800 disabled:bg-brand-gray-200 disabled:text-brand-gray-400 transition-all duration-200 shrink-0 shadow-sm cursor-pointer"
        >
          <SendHorizonal size={16} />
        </button>
      </div>
    </div>
  );
}
