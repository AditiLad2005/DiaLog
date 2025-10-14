import React, { useState, useCallback, useRef } from 'react';
import { useTranslationContext } from '../contexts/TranslationContext';
import { translationService } from '../services/translationService';

// Queue for batching translation requests
let translationQueue = [];
let queueTimer = null;

export function useTranslation() {
  const { language, liveTranslateEnabled } = useTranslationContext();
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const translate = useCallback(async (text, options = {}) => {
    if (!text || !text.trim()) return text;
    if (language === 'en' || !liveTranslateEnabled) return text;

    try {
      return await translationService.translateText(text, 'en', language);
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback to original text
    }
  }, [language, liveTranslateEnabled]);

  const translateBatch = useCallback(async (textArray) => {
    if (!textArray || textArray.length === 0) return textArray;
    if (language === 'en' || !liveTranslateEnabled) return textArray;

    setLoading(true);

    try {
      return await translationService.translateBatch(textArray, 'en', language);
    } catch (error) {
      console.error('Batch translation error:', error);
      return textArray; // Fallback to original texts
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [language, liveTranslateEnabled]);

  // Queue translations for better performance
  const queueTranslation = useCallback((text, callback) => {
    translationQueue.push({ text, callback });
    
    if (queueTimer) {
      clearTimeout(queueTimer);
    }
    
    queueTimer = setTimeout(async () => {
      const queue = [...translationQueue];
      translationQueue = [];
      
      if (queue.length === 0) return;
      
      const texts = queue.map(item => item.text);
      const translations = await translateBatch(texts);
      
      queue.forEach((item, index) => {
        item.callback(translations[index]);
      });
    }, 100); // Batch requests every 100ms
  }, [translateBatch]);

  return {
    translate,
    translateBatch,
    queueTranslation,
    loading,
    isTranslationEnabled: liveTranslateEnabled && language !== 'en',
    currentLanguage: language
  };
}

// React component wrapper for easy translation
export function T({ children, ...props }) {
  const { translate } = useTranslation();
  const [translatedText, setTranslatedText] = useState(children);

  React.useEffect(() => {
    if (typeof children === 'string') {
      translate(children).then(setTranslatedText);
    }
  }, [children, translate]);

  return React.createElement(props.as || 'span', {
    ...props,
    'data-original-text': children
  }, translatedText);
}

// Hook for translating dynamic content
export function useTranslatedText(text) {
  const { translate, isTranslationEnabled } = useTranslation();
  const [translatedText, setTranslatedText] = useState(text);

  React.useEffect(() => {
    if (isTranslationEnabled && text) {
      translate(text).then(setTranslatedText);
    } else {
      setTranslatedText(text);
    }
  }, [text, translate, isTranslationEnabled]);

  return translatedText;
}