/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, User, GraduationCap, Sprout, Briefcase, Heart, ChevronRight, Bot, Languages, Info, RefreshCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type FormField = {
  id: string;
  label: string;
  type: string;
  options?: string[];
};

type FormProfile = {
  message: string;
  questions: FormField[];
};

type Message = {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp?: string;
  isForm?: boolean;
  form?: FormProfile;
};

const INITIAL_MESSAGE = `Namaste! I am your Yojana Sahayak. I can help you find information about Indian government schemes for students, farmers, women, and more. How can I help you today?\n\nनमस्ते! मैं आपका योजना सहायक हूँ। मैं आपको छात्रों, किसानों, महिलाओं और अन्य के लिए भारत सरकार की योजनाओं के बारे में जानकारी खोजने में मदद कर सकता हूँ। मैं आज आपकी क्या मदद कर सकता हूँ?`;

const CATEGORIES = [
  { label: "Student Schemes", icon: <GraduationCap className="w-6 h-6 mb-2" />, color: "text-blue-600", bg: "bg-blue-50/50", border: "border-blue-100", query: "Show me schemes for students" },
  { label: "Farmer Schemes", icon: <Sprout className="w-6 h-6 mb-2" />, color: "text-green-600", bg: "bg-green-50/50", border: "border-green-100", query: "Show me schemes for farmers" },
  { label: "Women Schemes", icon: <User className="w-6 h-6 mb-2" />, color: "text-pink-600", bg: "bg-pink-50/50", border: "border-pink-100", query: "Show me schemes for women" },
  { label: "Job & Skill", icon: <Briefcase className="w-6 h-6 mb-2" />, color: "text-orange-600", bg: "bg-orange-50/50", border: "border-orange-100", query: "Show me schemes for jobs and skills" },
  { label: "Health Schemes", icon: <Heart className="w-6 h-6 mb-2" />, color: "text-red-600", bg: "bg-red-50/50", border: "border-red-100", query: "Show me health schemes" }
];

const SUGGESTIONS = [
  "Farmer schemes in India",
  "PM Kisan Yojana details"
];

function ProfileForm({ form, onSubmit, disabled }: { form: FormProfile, onSubmit: (data: Record<string, string>) => void, disabled: boolean }) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
      {form.questions.map((q) => (
        <div key={q.id} className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700">
            {q.label}
          </label>
          {q.type === 'select' ? (
            <select
              disabled={disabled}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
              value={formData[q.id] || ""}
              onChange={(e) => setFormData({ ...formData, [q.id]: e.target.value })}
            >
              <option value="" disabled>Select an option</option>
              {(q.options || []).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type={q.type === 'number' ? 'number' : 'text'}
              disabled={disabled}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
              value={formData[q.id] || ""}
              onChange={(e) => setFormData({ ...formData, [q.id]: e.target.value })}
            />
          )}
        </div>
      ))}
      <button
        type="submit"
        disabled={disabled}
        className="w-full mt-2 bg-green-600 text-white font-medium py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        Submit Details
      </button>
    </form>
  );
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "model",
      text: INITIAL_MESSAGE,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: "user", 
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, text: m.text }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, message: userMsg.text }),
      });

      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { 
          id: Date.now().toString(), 
          role: "model", 
          text: data.text,
          isForm: data.isForm,
          form: data.form,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "model",
          text: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleProfileSubmit = (formData: Record<string, string>) => {
    const textResponse = Object.entries(formData)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
      
    handleSend(`Here are my details:\n${textResponse}`);
  };

  const handleLanguageSelect = (lang: string) => {
    setShowLangMenu(false);
    handleSend(`Please communicate with me in ${lang} from now on.`);
  };

  const handleReset = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "model",
        text: INITIAL_MESSAGE,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b border-gray-100 relative">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-[#00a86b] text-white rounded-full flex items-center justify-center shadow-sm">
            <Bot className="w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Yojana Sahayak</h1>
            <p className="text-sm font-semibold text-[#00a86b] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b]"></span>
              AI Government Assistant
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 relative">
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="p-2 text-slate-500 hover:text-slate-800 transition-colors bg-gray-50 hover:bg-gray-100 rounded-full"
              title="Choose Language"
            >
              <Languages className="w-5 h-5 stroke-[2]" />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden z-20">
                <div className="py-1">
                  <button onClick={() => handleLanguageSelect('English')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">English</button>
                  <button onClick={() => handleLanguageSelect('Hindi (हिंदी)')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">हिंदी (Hindi)</button>
                  <button onClick={() => handleLanguageSelect('Hinglish')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Hinglish</button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowInfo(true)}
            className="p-2 text-slate-500 hover:text-slate-800 transition-colors bg-gray-50 hover:bg-gray-100 rounded-full"
            title="Info"
          >
            <Info className="w-5 h-5 stroke-[2]" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 text-slate-500 hover:text-slate-800 transition-colors bg-gray-50 hover:bg-gray-100 rounded-full"
            title="Reset Conversation"
          >
            <RefreshCcw className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white max-w-sm w-full rounded-[2rem] p-8 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-serif text-gray-800 mb-4 px-1">About Yojana Sahayak</h2>
            <div className="space-y-4 px-1 text-gray-600 text-sm leading-relaxed mb-8">
              <p>Yojana Sahayak is an AI assistant to help you discover and understand Indian Government schemes, scholarships, and welfare programs.</p>
              <p><strong>Disclaimer:</strong> This is an AI tool and not an official government platform. Always verify information and deadlines on the respective official government portals before applying.</p>
            </div>
            <button 
              onClick={() => setShowInfo(false)}
              className="w-full bg-[#00a86b] text-white font-medium py-3 rounded-xl hover:bg-[#00905a] transition-colors"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-4 pb-8">
        
        {/* Welcome Hero */}
        <div className="bg-white rounded-[2rem] p-8 md:p-10 mb-8 border border-gray-100 shadow-sm mt-4">
          <h1 className="text-4xl text-gray-800 font-serif mb-4 leading-tight italic">
            How can I help you today?
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl leading-relaxed">
            I can help you find the right government schemes based on your age, occupation, and needs. Select a category or type your question below.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {CATEGORIES.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(cat.query)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all hover:shadow-sm hover:opacity-80 ${cat.bg} ${cat.border} ${cat.color}`}
              >
                {cat.icon}
                <span className="text-sm font-semibold text-center leading-tight">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Suggestion Pills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {SUGGESTIONS.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sug)}
              className="flex items-center justify-between bg-white text-gray-800 px-6 py-4 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm font-medium transition-all text-left"
            >
              <span>{sug}</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex items-start gap-4 ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                  message.role === "user"
                    ? "bg-[#00a86b] text-white"
                    : "bg-[#00a86b] text-white"
                }`}
              >
                {message.role === "user" ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] md:max-w-[80%] rounded-2xl p-6 shadow-sm border ${
                  message.role === "user"
                    ? "bg-[#00a86b] border-[#00a86b] text-white rounded-tr-sm"
                    : "bg-white border-gray-100 text-gray-800 rounded-tl-sm prose-slate"
                }`}
                style={{ fontSize: "16px", lineHeight: "1.6" }}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap">{message.text}</p>
                ) : (
                  <>
                    <div className="prose prose-sm md:prose-base prose-slate max-w-none text-gray-800">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.text}
                      </ReactMarkdown>
                    </div>
                    {message.isForm && message.form && (
                      <ProfileForm 
                        form={message.form} 
                        onSubmit={handleProfileSubmit}
                        disabled={index !== messages.length - 1} // Disable old forms
                      />
                    )}
                    {message.timestamp && (
                      <div className="mt-4 text-xs text-gray-400 font-medium">
                        {message.timestamp}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#00a86b] text-white flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-6 shadow-sm flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#00a86b]" />
                <span className="text-gray-500 font-medium">Searching schemes...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-transparent p-4 pb-8 sm:pb-6 sticky bottom-0 z-10 w-full backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-[2rem] shadow-sm focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 p-2 transition-all"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me about yourself or ask about a scheme..."
              className="flex-1 bg-transparent border-none focus:outline-none px-4 py-2 text-gray-900 placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-[#00a86b] text-white p-3 rounded-full hover:bg-[#00905a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5 ml-1 mr-0.5" />
            </button>
          </form>
          <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">
            Yojana Sahayak can make mistakes. Please verify important information on official government portals.
          </p>
        </div>
      </footer>
    </div>
  );
}

