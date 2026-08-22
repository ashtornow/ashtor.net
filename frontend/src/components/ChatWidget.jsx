import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { useLanguage } from '@/i18n';
import { streamPost } from '@/lib/sse';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChatWidget() {
  const { lang, t } = useLanguage();
  const c = t.chat;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const listRef = useRef(null);
  const sessionRef = useRef(null);

  if (!sessionRef.current && typeof window !== 'undefined') {
    let s = localStorage.getItem('ashtor_chat_session');
    if (!s) {
      s = crypto.randomUUID();
      localStorage.setItem('ashtor_chat_session', s);
    }
    sessionRef.current = s;
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/chat/history?session_id=${sessionRef.current}`);
        if (res.ok) {
          const data = await res.json();
          if (data.length) setMessages(data.map((m) => ({ id: crypto.randomUUID(), role: m.role, content: m.content })));
        }
      } catch (err) {
        console.warn('Chat: failed to load history', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', content: text },
      { id: crypto.randomUUID(), role: 'assistant', content: '' },
    ]);
    setStreaming(true);
    let failed = false;
    try {
      await streamPost(
        `${API}/chat/stream`,
        { session_id: sessionRef.current, message: text, language: lang },
        (ev) => {
          if (ev.type === 'token') {
            setMessages((m) => {
              const cp = [...m];
              cp[cp.length - 1] = { ...cp[cp.length - 1], content: cp[cp.length - 1].content + ev.content };
              return cp;
            });
          } else if (ev.type === 'error') {
            failed = true;
          }
        }
      );
    } catch {
      failed = true;
    }
    if (failed) {
      setMessages((m) => {
        const cp = [...m];
        cp[cp.length - 1] = { ...cp[cp.length - 1], content: c.error };
        return cp;
      });
    }
    setStreaming(false);
  };

  const shown = messages.length ? messages : [{ id: 'welcome', role: 'assistant', content: c.welcome }];

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => setOpen((o) => !o)}
        data-testid="chat-widget-button"
        className="fixed bottom-6 left-6 z-[75] p-3.5 rounded-full bg-emerald-500 text-[#07090E] shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:bg-emerald-400 hover:scale-105 transition-all duration-300"
        aria-label="AI chat"
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 left-4 sm:left-6 z-[75] w-[calc(100vw-2rem)] max-w-[380px] rounded-2xl border border-white/10 bg-[#111620]/95 backdrop-blur-xl shadow-[0_30px_90px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col"
            data-testid="chat-panel"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5 bg-[#0B0E14]/80">
              <div className="flex items-center gap-2.5">
                <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono-tech text-[10px] tracking-[0.25em] uppercase text-emerald-400">{c.title}</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-200 transition-colors" data-testid="chat-close-button">
                <X size={16} />
              </button>
            </div>

            <div ref={listRef} className="h-[340px] overflow-y-auto p-4 space-y-3" data-testid="chat-messages">
              {shown.map((m, i) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-100'
                        : 'bg-white/[0.04] border border-white/[0.07] text-slate-300'
                    }`}
                  >
                    {m.content}
                    {streaming && i === shown.length - 1 && m.role === 'assistant' && (
                      <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-400 animate-pulse align-middle" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.07] p-3.5 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={c.placeholder}
                className="flex-1 rounded-lg border border-white/10 bg-[#0B0E14] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/60 transition-colors"
                data-testid="chat-input"
              />
              <button
                onClick={send}
                disabled={streaming || !input.trim()}
                data-testid="chat-send-button"
                className="shrink-0 w-10 h-10 rounded-lg bg-emerald-500 text-[#07090E] flex items-center justify-center hover:bg-emerald-400 disabled:opacity-50 transition-all duration-300"
              >
                {streaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
