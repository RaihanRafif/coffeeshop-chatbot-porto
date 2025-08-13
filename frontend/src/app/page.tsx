// frontend/src/app/page.tsx
'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { AIMessage } from './components/AIMessage';
import { UserIcon } from './components/UserIcon';
import { SparklesIcon } from './components/SparklesIcon';
import { motion } from 'framer-motion';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

// --- BARU: Daftar pertanyaan yang disarankan ---
const suggestedQuestions = [
  'Ada rekomendasi kopi yang tidak terlalu pahit?',
  'Tampilkan semua menu dan harganya',
  'Menu non-kopi apa saja yang ada?',
  'Biji kopi apa yang sedang dijual?',
];

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
  </svg>
);


export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Halo! Selamat datang di KopaKopi. Tanyakan apa saja tentang menu kami, rekomendasi, atau ketersediaan biji kopi.' }
  ]);
  
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // --- REFAKTOR: Logika pengiriman pesan dipindahkan ke fungsi sendiri ---
  const submitMessage = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;

    const userMessage: Message = { sender: 'user', text: questionText };
    // Tambahkan pesan user dan placeholder AI dalam satu kali set state
    setMessages((prev) => [...prev, userMessage, { sender: 'ai', text: '' }]);
    setIsLoading(true);

    try {
      const response = await fetch('https://hajirehan.store/api-coffee/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          history: [...messages, userMessage], 
        }),
      });

      if (!response.ok) throw new Error('Gagal mendapatkan respon dari server');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Gagal membaca response stream');
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setMessages((prevMessages) => {
          const allButLast = prevMessages.slice(0, -1);
          const lastMessage = prevMessages[prevMessages.length - 1];
          const updatedLastMessage = { ...lastMessage, text: lastMessage.text + chunk };
          return [...allButLast, updatedLastMessage];
        });
      }
    } catch (error) {
      console.error("Gagal menghubungi API:", error);
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.sender === 'ai' && lastMessage?.text === '') {
          const allButLast = prev.slice(0, -1);
          const errorMessage: Message = { sender: 'ai', text: 'Maaf, sepertinya ada sedikit gangguan di mesin kopi kami. Coba beberapa saat lagi.' };
          return [...allButLast, errorMessage];
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler untuk form submit
  const handleSendMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitMessage(input);
    setInput('');
  };

  // Handler untuk klik tombol saran
  const handleSuggestionClick = (questionText: string) => {
    submitMessage(questionText);
  };


  return (
    <div className="font-sans antialiased bg-stone-100 h-screen w-screen flex justify-center items-center">
      <div className="w-full max-w-2xl h-full sm:h-[95vh] sm:max-h-[800px] flex flex-col bg-white/70 backdrop-blur-xl sm:rounded-2xl shadow-lg shadow-black/5">
        <main className="flex-1 flex flex-col h-full grid grid-rows-[auto,1fr,auto]">
          <header className="p-4 border-b border-stone-200">
            <h1 className="text-xl font-bold text-center text-stone-700 tracking-tight">
              KopaKopi AI Assistant ☕
            </h1>
          </header>

          <div className="p-6 overflow-y-auto">
            <div className="flex flex-col gap-5">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-amber-900 text-amber-100' : 'bg-stone-700 text-stone-100'}`}>
                    {msg.sender === 'user' ? <UserIcon /> : <SparklesIcon />}
                  </div>
                  <div className={`prose prose-sm md:prose-base max-w-md p-3 px-4 rounded-2xl shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-amber-900 text-white rounded-br-none' 
                      : 'bg-white text-stone-800 rounded-bl-none border border-stone-200/80'
                  }`}>
                    {msg.sender === 'ai' ? <AIMessage text={msg.text} /> : <p className="text-white">{msg.text}</p>}
                  </div>
                </motion.div>
              ))}
              {isLoading && messages[messages.length - 1]?.text === '' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-end gap-3 justify-start"
                >
                   <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-stone-700 text-stone-100"><SparklesIcon /></div>
                  <div className="max-w-xs p-3 px-4 rounded-2xl bg-white border border-stone-200/80 rounded-bl-none">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-2 h-2 bg-stone-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-stone-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-stone-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <footer className="p-4 bg-white/50 backdrop-blur-lg border-t border-stone-200/80">
            {/* --- BARU: Area untuk menampilkan tombol saran --- */}
            {!isLoading && messages.length <= 1 && (
              <div className="pb-4">
                <p className="text-center text-xs text-stone-500 mb-2">Atau coba tanyakan:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(q)}
                      className="px-3 py-1.5 bg-white/80 border border-stone-300 rounded-full text-sm text-stone-700 hover:bg-stone-200/80 transition-colors duration-150"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanyakan soal menu, stok, dll..."
                className="flex-1 py-2.5 px-4 bg-white/80 border border-stone-300 rounded-full text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-600 focus:outline-none transition-shadow duration-200"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className="w-10 h-10 flex items-center justify-center bg-amber-900 text-white rounded-full font-semibold hover:bg-amber-950 disabled:bg-amber-900/50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 active:scale-100 disabled:scale-100" 
                disabled={isLoading || !input.trim()}
              >
                <SendIcon />
              </button>
            </form>
          </footer>
        </main>
      </div>
    </div>
  );
}