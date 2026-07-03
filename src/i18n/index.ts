import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import urCommon from './locales/ur/common.json';

const resources = {
  en: { common: enCommon },
  ur: { common: urCommon },
};

const getSavedLanguage = (): string => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('app-language') || 'en';
    }
  } catch {
    // localStorage not available
  }
  return 'en';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getSavedLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common'],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
