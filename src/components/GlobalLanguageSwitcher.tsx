import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const GlobalLanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'id', label: 'ID' },
    { code: 'en', label: 'EN' },
    { code: 'ja', label: 'JA' },
    { code: 'zh', label: 'ZH' }
  ];

  const currentLang = i18n.language || 'id';

  const handleLangChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('finprose_lang', langCode);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-8 left-8 z-[100] flex flex-col-reverse items-start pointer-events-auto">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="bg-brand-black text-white p-3 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.3)] hover:scale-110 transition-transform flex items-center justify-center space-x-2"
      >
        <Globe className="w-5 h-5" />
        <span className="font-bold text-xs uppercase">{currentLang}</span>
      </button>

      {isOpen && (
        <div className="mb-2 bg-white border border-brand-gray-200 rounded-xl shadow-xl p-2 w-16">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLangChange(lang.code)}
              className={`w-full text-center py-2 text-xs font-medium hover:bg-brand-gray-50 transition-colors rounded-lg ${currentLang === lang.code ? 'text-brand-black font-bold bg-brand-gray-100' : 'text-brand-gray-500'}`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
