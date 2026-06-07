import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationID from './locales/id/translation.json';
import translationEN from './locales/en/translation.json';
import translationJA from './locales/ja/translation.json';
import translationZH from './locales/zh/translation.json';

const resources = {
  id: {
    translation: translationID
  },
  en: {
    translation: translationEN
  },
  ja: {
    translation: translationJA
  },
  zh: {
    translation: translationZH
  }
};

const savedLang = localStorage.getItem('finprose_lang') || 'id';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'id',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
