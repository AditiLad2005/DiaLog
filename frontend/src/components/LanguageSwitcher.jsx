import React, { useEffect, useRef, useState } from 'react';
import { GlobeAltIcon, ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { INDIAN_LANGUAGES, useTranslationContext } from '../contexts/TranslationContext';

export default function LanguageSwitcher({ className = '' }) {
  const { language, setLanguage, liveTranslateEnabled, setLiveTranslateEnabled } = useTranslationContext();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = INDIAN_LANGUAGES.find(l => l.code === language) || INDIAN_LANGUAGES[0];

  return (
    <div ref={ref} className={`relative ${className}`} data-no-translate>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center px-3 py-2 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-white/90 dark:hover:bg-gray-800 transition-all duration-200 shadow-soft"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change language"
      >
        <GlobeAltIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
        <span className="text-sm font-medium">{current?.name || 'Language'}</span>
        <ChevronDownIcon className="h-4 w-4 ml-2 opacity-70" />
      </button>

      {open && (
        <ul
          className="absolute right-0 mt-2 w-56 max-h-72 overflow-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl z-30"
          role="listbox"
        >
          <li className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Translations
          </li>
          <li className="px-3 py-2 flex items-center justify-between text-sm">
            <span className="text-neutral-700 dark:text-neutral-200">Live translate</span>
            <button
              onMouseDown={(e) => { e.preventDefault(); setLiveTranslateEnabled(v => !v); }}
              aria-pressed={liveTranslateEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-white dark:bg-gray-900 border border-neutral-300 dark:border-neutral-600 ${liveTranslateEnabled ? 'ring-1 ring-primary-500' : ''}`}
              title="Toggle live translation"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform ${liveTranslateEnabled ? 'bg-primary-600 translate-x-6' : 'bg-neutral-400 dark:bg-neutral-500 translate-x-1'}`}
              />
            </button>
          </li>
          <li className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Languages
          </li>
          {INDIAN_LANGUAGES.map((opt) => (
            <li
              key={opt.code}
              role="option"
              aria-selected={language === opt.code}
              onMouseDown={(e) => {
                e.preventDefault();
                setLanguage(opt.code);
                setOpen(false);
              }}
              className={`px-3 py-2 cursor-pointer flex items-center justify-between text-sm hover:bg-neutral-50 dark:hover:bg-gray-800 ${language === opt.code ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-200'}`}
            >
              <span>{opt.name}</span>
              {language === opt.code && <CheckIcon className="h-4 w-4" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
