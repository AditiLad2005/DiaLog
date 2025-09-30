import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const TranslationContext = createContext({
  language: 'en',
  setLanguage: () => {},
  liveTranslateEnabled: true,
  setLiveTranslateEnabled: () => {},
});

export const INDIAN_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'or', name: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'ur', name: 'Urdu (اردو)' },
];

export function TranslationProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preferredLanguage') || 'en';
    }
    return 'en';
  });
  const [liveTranslateEnabled, setLiveTranslateEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('liveTranslateEnabled');
      return v === null ? true : v === 'true';
    }
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('preferredLanguage', language);
    } catch {}
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem('liveTranslateEnabled', String(liveTranslateEnabled));
    } catch {}
  }, [liveTranslateEnabled]);

  const value = useMemo(() => ({ language, setLanguage, liveTranslateEnabled, setLiveTranslateEnabled }), [language, liveTranslateEnabled]);
  return (
    <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>
  );
}

export function useTranslationContext() {
  return useContext(TranslationContext);
}
