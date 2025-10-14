import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

// Component for translating static text
export function TranslatedText({ 
  text, 
  children, 
  as: Component = 'span', 
  fallback = null,
  ...props 
}) {
  const { translate, isTranslationEnabled } = useTranslation();
  const [translatedText, setTranslatedText] = useState(text || children);
  const [loading, setLoading] = useState(false);

  const sourceText = text || children;

  useEffect(() => {
    if (!sourceText) return;

    if (isTranslationEnabled && typeof sourceText === 'string') {
      setLoading(true);
      translate(sourceText)
        .then(setTranslatedText)
        .finally(() => setLoading(false));
    } else {
      setTranslatedText(sourceText);
    }
  }, [sourceText, translate, isTranslationEnabled]);

  if (loading && fallback) {
    return fallback;
  }

  return (
    <Component 
      {...props} 
      data-original-text={sourceText}
      data-translation-enabled={isTranslationEnabled}
    >
      {translatedText}
    </Component>
  );
}

// Short alias for convenience
export const T = TranslatedText;

// Auto-translation wrapper for any component
export function WithTranslation({ children, ...props }) {
  const { isTranslationEnabled } = useTranslation();

  if (!isTranslationEnabled) {
    return children;
  }

  // Clone children and add translation wrapper
  return React.cloneElement(children, {
    ...props,
    'data-translate': 'yes'
  });
}

// Hook for translating arrays of text
export function useTranslatedTexts(texts) {
  const { translateBatch, isTranslationEnabled } = useTranslation();
  const [translatedTexts, setTranslatedTexts] = useState(texts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!texts || texts.length === 0) return;

    if (isTranslationEnabled) {
      setLoading(true);
      translateBatch(texts)
        .then(setTranslatedTexts)
        .finally(() => setLoading(false));
    } else {
      setTranslatedTexts(texts);
    }
  }, [texts, translateBatch, isTranslationEnabled]);

  return { translatedTexts, loading };
}

// Component for handling dynamic content translation
export function DynamicTranslation({ content, ...props }) {
  const { translate, isTranslationEnabled } = useTranslation();
  const [translatedContent, setTranslatedContent] = useState(content);

  useEffect(() => {
    if (isTranslationEnabled && content) {
      if (typeof content === 'string') {
        translate(content).then(setTranslatedContent);
      } else if (Array.isArray(content)) {
        // Handle array of strings
        Promise.all(content.map(item => 
          typeof item === 'string' ? translate(item) : item
        )).then(setTranslatedContent);
      } else {
        setTranslatedContent(content);
      }
    } else {
      setTranslatedContent(content);
    }
  }, [content, translate, isTranslationEnabled]);

  return translatedContent;
}

export default TranslatedText;