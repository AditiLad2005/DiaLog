// Translation service for handling API calls
class TranslationService {
  constructor() {
    this.baseURL = '/api'; // Backend API base URL
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  async translateText(text, sourceLang = 'en', targetLang = 'hi') {
    if (!text || text.trim() === '') return text;
    if (sourceLang === targetLang) return text;

    const cacheKey = `${text}:${sourceLang}:${targetLang}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Check if there's already a pending request for this text
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Create the API request promise
    const requestPromise = this.makeTranslationRequest(text, sourceLang, targetLang);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const translatedText = await requestPromise;
      
      // Cache the result
      this.cache.set(cacheKey, translatedText);
      
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
      
      return translatedText;
    } catch (error) {
      // Clean up pending request on error
      this.pendingRequests.delete(cacheKey);
      console.error('Translation error:', error);
      return text; // Return original text on error
    }
  }

  async makeTranslationRequest(text, sourceLang, targetLang) {
    try {
      const response = await fetch(`${this.baseURL}/translate`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Use query parameters for GET request
        url: `${this.baseURL}/translate?text=${encodeURIComponent(text)}&source=${sourceLang}&target=${targetLang}`
      });

      // Actually make the GET request properly
      const url = new URL(`${window.location.origin}${this.baseURL}/translate`);
      url.searchParams.append('text', text);
      url.searchParams.append('source', sourceLang);
      url.searchParams.append('target', targetLang);

      const actualResponse = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!actualResponse.ok) {
        throw new Error(`HTTP error! status: ${actualResponse.status}`);
      }

      const data = await actualResponse.json();
      
      // Handle different response formats
      if (typeof data === 'string') {
        return data;
      } else if (data.translatedText) {
        return data.translatedText;
      } else if (data.translation) {
        return data.translation;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async translateBatch(texts, sourceLang = 'en', targetLang = 'hi') {
    if (!texts || texts.length === 0) return [];
    if (sourceLang === targetLang) return texts;

    // Check cache for all texts
    const results = [];
    const uncachedTexts = [];
    const uncachedIndices = [];

    texts.forEach((text, index) => {
      const cacheKey = `${text}:${sourceLang}:${targetLang}`;
      if (this.cache.has(cacheKey)) {
        results[index] = this.cache.get(cacheKey);
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
        results[index] = null; // Placeholder
      }
    });

    // If all texts are cached, return results
    if (uncachedTexts.length === 0) {
      return results;
    }

    try {
      const response = await fetch(`${this.baseURL}/translate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          texts: uncachedTexts,
          source: sourceLang,
          target: targetLang,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const translations = data.translations || data.results || uncachedTexts;

      // Fill in the uncached results and cache them
      uncachedIndices.forEach((originalIndex, i) => {
        const translatedText = translations[i] || texts[originalIndex];
        results[originalIndex] = translatedText;
        
        // Cache the result
        const cacheKey = `${texts[originalIndex]}:${sourceLang}:${targetLang}`;
        this.cache.set(cacheKey, translatedText);
      });

      return results;
    } catch (error) {
      console.error('Batch translation error:', error);
      // Return original texts on error
      return texts;
    }
  }

  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  getCacheSize() {
    return this.cache.size;
  }
}

// Create a singleton instance
export const translationService = new TranslationService();

// Export individual functions for convenience
export const translateText = (text, sourceLang, targetLang) => 
  translationService.translateText(text, sourceLang, targetLang);

export const translateBatch = (texts, sourceLang, targetLang) => 
  translationService.translateBatch(texts, sourceLang, targetLang);

export const clearTranslationCache = () => translationService.clearCache();

export default translationService;