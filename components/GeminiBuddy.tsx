
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Send, Loader2, Bot, User as UserIcon, BookOpen } from 'lucide-react';
import { SyllabusItem, UserProfile } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface Props {
  syllabus: SyllabusItem[];
  user: UserProfile;
}

const GeminiBuddy: React.FC<Props> = ({ syllabus, user }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Hi ${user.name.split(' ')[0]}! I'm Crush Buddy. How can I help you with your studies today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  // Initialize Chat Session with system instruction
  useEffect(() => {
    const initChat = async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const syllabusContext = syllabus.length > 0 
        ? `The user's current syllabus topics are: ${syllabus.map(t => t.title).join(', ')}.`
        : "The user hasn't added any specific syllabus topics yet.";

      chatRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `You are 'Crush Buddy', a supportive and brilliant AI study assistant for the ExamCrush app. 
          Your goal is to help students excel in their exams.
          Current User: ${user.name}. 
          ${syllabusContext}
          Your personality is:
          1. Encouraging and positive (use emojis like 📚, ✨, 🚀).
          2. Clear and concise in explanations.
          3. Focused on active recall and effective study techniques.
          4. Capable of explaining complex academic topics simply.
          If the user asks about a topic in their syllabus, prioritize helping them master it.
          Use Markdown for formatting (bold, lists, etc.) if needed.`,
        },
      });
    };
    initChat();
  }, [syllabus, user.name]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading || !chatRef.current) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userText });
      const modelText = response.text || "I'm sorry, I couldn't process that. Let's try again!";
      setMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: "I'm having a little trouble connecting to my brain right now! 🧠 Please check your connection and let's try again in a moment." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between px-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Crush Buddy</h2>
            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">AI Expert Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
          <BookOpen className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{syllabus.length} Topics Syncing</span>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar min-h-0 py-2"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border-2 ${
                msg.role === 'user' ? 'bg-white border-indigo-100 shadow-sm' : 'bg-indigo-600 border-white shadow-sm'
              }`}>
                {msg.role === 'user' ? (
                  <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="User" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' 
                  : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm'
              }`}>
                {msg.text.split('\n').map((line, idx) => (
                  <p key={idx} className={line.trim() === '' ? 'h-2' : 'mb-1 last:mb-0'}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Buddy is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="relative mt-auto pt-2 shrink-0">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Buddy anything about your topics..."
          className="w-full bg-white border border-slate-200 rounded-2xl pl-4 pr-14 py-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm transition-all"
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            input.trim() && !loading ? 'bg-indigo-600 text-white shadow-lg active:scale-95' : 'bg-slate-100 text-slate-300'
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default GeminiBuddy;
