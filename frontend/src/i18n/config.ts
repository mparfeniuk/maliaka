import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import uk from './locales/uk.json';
import sl from './locales/sl.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      uk: { translation: uk },
      sl: { translation: sl },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'uk', 'sl'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

