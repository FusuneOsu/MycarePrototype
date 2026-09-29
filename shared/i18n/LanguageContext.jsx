import React, { createContext, useContext, useState, useEffect } from 'react';
import { dictionaries } from './dictionaries.js';

/** The languages both apps offer, in the order they are listed to the user. */
export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ms', label: 'Bahasa Melayu' },
  { value: 'zh', label: '中文 (Chinese)' },
];

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('mycare_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('mycare_lang', language);
  }, [language]);

  const t = (key) => {
    const dict = dictionaries[language] || dictionaries['en'];
    return dict[key] || dictionaries['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Falls back to English rather than throwing when there is no provider above —
 * the caregiver app renders some screens (auth, the apply wizard) outside the
 * workspace shell, and they should still render readable text.
 */
export function useLanguage() {
  return useContext(LanguageContext) || {
    language: 'en',
    setLanguage: () => {},
    t: (key) => dictionaries.en[key] || key,
  };
}
