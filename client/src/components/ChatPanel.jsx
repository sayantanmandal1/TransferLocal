import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';

export default function ChatPanel() {
  const { state } = useApp();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput('');
    try {
      await api.sendChat(text);
    } catch {
      // Message will still be shown via WebSocket
    }
    setSending(false);
  };

  return (
    <div className="card !p-0 flex flex-col h-[60vh]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {state.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">No messages yet</p>
            <p className="text-sm">Start a conversation with your peer</p>
          </div>
        ) : (
          <AnimatePresence>
            {state.messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.from === 'self' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                    msg.from === 'self'
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : 'bg-surface-200 dark:bg-surface-700 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className={`text-xs mt-1 ${
                    msg.from === 'self' ? 'text-primary-200' : 'text-gray-400'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-surface-200 dark:border-surface-700 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="input flex-1"
            maxLength={10000}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="btn-primary !p-2.5 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
