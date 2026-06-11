import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id?: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverWarning, setServerWarning] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize and load session on mount
  useEffect(() => {
    let savedSessionId = localStorage.getItem('spur_chat_session_id');
    if (!savedSessionId) {
      // Create a local session UUID for continuity if one does not exist
      savedSessionId = generateUUID();
      localStorage.setItem('spur_chat_session_id', savedSessionId);
    }
    setSessionId(savedSessionId);
    loadHistory(savedSessionId);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const loadHistory = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat/history/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          // If session doesn't exist on server yet, start with empty list
          setMessages([]);
          return;
        }
        throw new Error('Could not retrieve chat log from database.');
      }
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error('Error fetching history:', err);
      // Log silently in background, do not brick the UI
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading || trimmedInput.length > 1000) return;

    setError(null);
    setServerWarning(null);

    const userText = trimmedInput;
    setInput('');

    // Append user message immediately
    const tempUserMessage: Message = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          sessionId: sessionId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server processing error.');
      }

      if (data.warning) {
        setServerWarning(data.warning);
      }

      // Add AI reply
      const aiMessage: Message = {
        sender: 'ai',
        text: data.reply,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);

      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('spur_chat_session_id', data.sessionId);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err?.message || 'Failed to connect to assistant. Check server logs.');
    } finally {
      setIsLoading(false);
    }
  };

  const executeReset = async () => {
    setError(null);
    setServerWarning(null);
    setShowConfirmReset(false);
    
    const currentSessionId = sessionId;
    const newSessionId = generateUUID();

    // Clear frontend state and cycle key immediately for good UX responsiveness
    localStorage.setItem('spur_chat_session_id', newSessionId);
    setSessionId(newSessionId);
    setMessages([]);
    setInput('');

    // Send the delete request to database in the background
    if (currentSessionId) {
      try {
        const response = await fetch(`/api/chat/session/${currentSessionId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          console.error('Failed to delete chat session from database storage');
        }
      } catch (err) {
        console.error('Network error deleting chat session:', err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isInputOverLimit = input.length > 1000;
  const isSendDisabled = isLoading || !input.trim() || isInputOverLimit;

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderInlineFormatting = (text: string) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={`bold-${match.index}`} className="font-bold text-slate-100">
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderParsedMessage = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];

    const flushList = (key: string | number) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${key}`} className="list-disc pl-5 my-1.5 space-y-1 text-slate-200">
            {listItems}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Matches bullet points (*, -, •)
      const bulletRegex = /^[\s]*[\*\-•]\s+(.*)/;
      const match = line.match(bulletRegex);

      if (match) {
        const rawContent = match[1];
        const isNested = line.startsWith('    ') || line.startsWith('\t') || (line.startsWith('  ') && (line.indexOf('*') > 1 || line.indexOf('-') > 1));
        
        listItems.push(
          <li 
            key={`li-${index}`} 
            className={`text-xs text-slate-200 leading-relaxed ${
              isNested ? 'ml-4 list-[circle]' : ''
            }`}
          >
            {renderInlineFormatting(rawContent)}
          </li>
        );
      } else {
        flushList(index);
        
        if (trimmed === '') {
          if (elements.length > 0 && elements[elements.length - 1] !== null) {
            elements.push(<div key={`gap-${index}`} className="h-2" />);
          }
        } else {
          elements.push(
            <p key={`p-${index}`} className="text-xs text-slate-200 leading-relaxed mb-1">
              {renderInlineFormatting(line)}
            </p>
          );
        }
      }
    });

    flushList('final');
    return elements;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Widget Window */}
      {isOpen && (
        <div className="mb-4 w-[380px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-8rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-message-appear">
          {/* Header */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-sm text-white shadow-md">
                S
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse-glow"></span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 text-sm">Spur Support</h3>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  Online Agent
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Reset Session Button */}
              {messages.length > 0 && (
                <button 
                  onClick={() => setShowConfirmReset(true)}
                  title="Clear conversation log"
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}

              {/* Close Button */}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/50 relative">
            {/* Custom confirmation card replacing window.confirm popup */}
            {showConfirmReset && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center animate-message-appear">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20 mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h4 className="text-slate-100 font-bold text-sm">Delete Chat History?</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                  This will permanently delete this conversation log from the database.
                </p>
                <div className="mt-5 flex items-center gap-3 w-full max-w-[200px]">
                  <button
                    onClick={executeReset}
                    type="button"
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold tracking-wide shadow-md shadow-rose-600/10 transition-all active:scale-[0.98]"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowConfirmReset(false)}
                    type="button"
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold tracking-wide border border-slate-700 transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-slate-200 font-medium text-sm">How can we help you today?</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto">
                    Ask us about our shipping rates, return policy, or customer service hours!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                  <div 
                    key={index}
                    className={`flex items-end gap-2.5 animate-message-appear ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Bot Avatar */}
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 font-bold text-[10px] text-indigo-400">
                        🤖
                      </div>
                    )}
                    
                    <div className="flex flex-col max-w-[75%]">
                      {/* Bubble content */}
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isUser 
                          ? 'bg-indigo-600 text-white rounded-br-none whitespace-pre-wrap' 
                          : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/50'
                      }`}>
                        {isUser ? msg.text : renderParsedMessage(msg.text)}
                      </div>
                      
                      {/* Timestamp */}
                      <span className={`text-[9px] text-slate-500 mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp ? formatTime(msg.timestamp) : ''}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-end gap-2.5 justify-start animate-message-appear">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 font-bold text-[10px] text-indigo-400">
                  🤖
                </div>
                <div className="p-3 bg-slate-800/60 rounded-2xl rounded-bl-none border border-slate-700/30 flex items-center gap-1">
                  <span className="typing-dot bg-indigo-400"></span>
                  <span className="typing-dot bg-indigo-400"></span>
                  <span className="typing-dot bg-indigo-400"></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Error & Warning Displays */}
          {error && (
            <div className="mx-4 my-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-200 text-[11px] flex items-start gap-2 animate-message-appear">
              <svg className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-rose-300">Request Error</p>
                <p className="mt-0.5 opacity-90">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 font-bold ml-1">×</button>
            </div>
          )}

          {serverWarning && (
            <div className="mx-4 my-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-[10px] flex items-start gap-2 animate-message-appear">
              <svg className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="opacity-95">{serverWarning}</p>
              </div>
              <button onClick={() => setServerWarning(null)} className="text-amber-400 hover:text-amber-200 font-semibold ml-1">×</button>
            </div>
          )}

          {/* Footer Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-slate-950/80 border-t border-slate-800 flex flex-col gap-2">
            <div className="relative flex items-end bg-slate-900 border border-slate-800 focus-within:border-indigo-500/50 rounded-xl px-3 py-2 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                rows={1}
                className="flex-1 bg-transparent border-0 outline-none text-slate-100 text-xs resize-none placeholder-slate-500 max-h-24 min-h-[1.5rem]"
                style={{ height: 'auto' }}
              />
              
              <button
                type="submit"
                disabled={isSendDisabled}
                className={`p-1.5 rounded-lg shrink-0 transition-all ${
                  isSendDisabled 
                    ? 'text-slate-600 bg-slate-800/40 cursor-not-allowed' 
                    : 'text-white bg-indigo-600 hover:bg-indigo-500 shadow-md hover:scale-[1.03]'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>

            {/* Input helpers and character limits */}
            <div className="flex items-center justify-between px-1.5">
              <span className="text-[9px] text-slate-500">
                Press Enter to send
              </span>
              <span className={`text-[9px] font-medium transition-colors ${
                input.length > 900 ? (isInputOverLimit ? 'text-rose-500 font-bold' : 'text-amber-500') : 'text-slate-500'
              }`}>
                {input.length} / 1000
              </span>
            </div>
          </form>
        </div>
      )}

      {/* Floating Chat Bubble Launcher button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-indigo-500/20 hover:scale-[1.04] transition-all duration-200 border border-indigo-400/20"
        title="Chat with support"
      >
        {isOpen ? (
          <svg className="w-6 h-6 animate-message-appear" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 animate-message-appear" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
    </div>
  );
}
