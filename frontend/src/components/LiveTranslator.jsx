import React, { useEffect, useRef } from 'react';
import { useTranslationContext } from '../contexts/TranslationContext';

// Simple cache to reduce API calls
const cacheKey = (text, from, to) => `tx_${from}_${to}_${text}`;

async function translateText(text, from, to) {
  if (!text || from === to) return text;
  const key = cacheKey(text, from, to);
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return cached;
  } catch {}

  // Free API: MyMemory
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  let translated = text;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const warn = (data?.responseDetails || '').toString();
    // If rate-limited or any warning from provider, keep original text (avoid warning injection)
    if (warn.includes('MYMEMORY WARNING') || data?.responseStatus === 429) {
      translated = text;
    } else {
      translated = data?.responseData?.translatedText || text;
    }
  } catch {
    translated = text;
  }
  try { sessionStorage.setItem(key, translated); } catch {}
  return translated;
}

function walkTextNodes(root, callback) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const value = node.nodeValue?.trim();
      if (!value) return NodeFilter.FILTER_REJECT;
      // Skip scripts/styles or if parent has data-no-translate
      const parent = node.parentElement;
      if (!parent || parent.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(callback);
}

export default function LiveTranslator({ from = 'en' }) {
  const { language, liveTranslateEnabled } = useTranslationContext();
  const prevLang = useRef(language);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!liveTranslateEnabled) return;
    const to = language;
    if (to === prevLang.current) return;

    let cancelled = false;
    const originals = new WeakMap();

    const translateAll = async () => {
      walkTextNodes(document.body, async (node) => {
        const original = node.nodeValue;
        if (!originals.has(node)) originals.set(node, original);
        const baseText = originals.get(node) || original;
        try {
          const translated = await translateText(baseText, from, to);
          if (!cancelled) node.nodeValue = translated;
        } catch {
          // fail silently
        }
      });
    };

    translateAll();
    prevLang.current = to;
    return () => { cancelled = true; };
  }, [language, liveTranslateEnabled, from]);

  return null; // no UI
}
