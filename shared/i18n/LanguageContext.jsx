import React, { createContext, useContext, useState, useEffect } from 'react';
import { dictionaries } from './dictionaries.js';

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

export function useLanguage() {
  return useContext(LanguageContext);
}
