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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <AnimatePresence>
            {state.messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.from === 'self' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-3 py-2 rounded-md text-sm ${
                    msg.from === 'self'
                      ? 'bg-neutral-200 text-neutral-900'
                      : 'bg-secondary border border-border'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className={`text-xs mt-1 ${
                    msg.from === 'self' ? 'text-neutral-500' : 'text-muted-foreground'
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
      <div className="border-t border-border p-3">
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
            className="btn-primary !p-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
