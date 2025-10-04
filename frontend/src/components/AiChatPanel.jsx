import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { chatWithAssistant } from '../services/aiProxy';

const AiChatPanel = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'model', content: 'Hi! I\'m the DiaLog assistant. Ask me about safe meals, glycemic load, or how to log meals.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);

  if (!isOpen) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const answer = await chatWithAssistant(next);
      setMessages(prev => [...prev, { role: 'model', content: answer }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, I\'m having trouble answering right now. Please check your connection or API key.' }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[90vw] sm:w-[420px] max-h-[75vh] rounded-2xl shadow-strong border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white">
        <div className="font-semibold">DiaLog Assistant</div>
        <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-primary-700">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-auto bg-primary-100 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100' : 'mr-auto bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100'}`}>
            {m.content}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-700 p-3">
        <div className="flex items-end space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Ask about safe meals, GL, or logging..."
            className="flex-1 resize-none rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-gray-700 text-neutral-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            disabled={loading || !input.trim()}
            onClick={send}
            className={`px-3 py-2 rounded-xl text-white flex items-center space-x-1 ${loading || !input.trim() ? 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}`}
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            <span>Send</span>
          </button>
        </div>
        {/* No frontend key needed when using server-side proxy */}
      </div>
    </div>
  );
};

export default AiChatPanel;
