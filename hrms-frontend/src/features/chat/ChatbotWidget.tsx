import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Mic, Loader2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { MiniLeaveForm } from './components/MiniLeaveForm';
import { ChatChart } from './components/ChatChart';

interface Message {
  senderId: string;
  content: string;
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = sessionStorage.getItem('hrms_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [{ senderId: 'ai-bot', content: 'Chào bạn, tôi là trợ lý ảo HR. Tôi có thể giúp gì cho bạn hôm nay?' }];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  const getSuggestions = (pathname: string) => {
    if (pathname.includes('/dashboard')) {
      return ['Hôm nay có ai đi muộn không?', 'Tôi còn bao nhiêu ngày phép?', 'Thời tiết hôm nay thế nào?'];
    }
    if (pathname.includes('/attendance')) {
      return ['Tôi có quên chấm công ngày nào không?', 'Tháng này tôi đi muộn mấy lần?', 'Tạo đơn giải trình'];
    }
    if (pathname.includes('/leave')) {
      return ['Tôi còn bao nhiêu ngày phép?', 'Xin nghỉ phép ngày mai', 'Lịch sử nghỉ phép của tôi'];
    }
    if (pathname.includes('/payroll')) {
      return ['Lương tháng này của tôi', 'Quỹ lương tháng này là bao nhiêu?'];
    }
    if (pathname.includes('/events')) {
      return ['Tôi có cuộc họp nào sắp tới không?', 'Lên lịch họp vào 15:00 ngày mai'];
    }
    if (pathname.includes('/policies')) {
      return ['Tìm quy định về thưởng Tết', 'Chính sách thai sản'];
    }
    return ['Thời tiết hôm nay thế nào?', 'Đọc tin tức mới nhất', 'Tôi còn bao nhiêu ngày phép?'];
  };

  const suggestions = getSuggestions(location.pathname);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    sessionStorage.setItem('hrms_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const handleProactive = (e: any) => {
      setMessages(prev => [...prev, { senderId: 'ai-bot', content: e.detail.content }]);
      setIsOpen(true);
    };
    const handleAIResponse = (e: any) => {
      setMessages(prev => [...prev, { senderId: 'ai-bot', content: e.detail.content }]);
      setIsLoading(false);
    };

    window.addEventListener('ai_proactive_message', handleProactive);
    window.addEventListener('ai_response', handleAIResponse);
    return () => {
      window.removeEventListener('ai_proactive_message', handleProactive);
      window.removeEventListener('ai_response', handleAIResponse);
    };
  }, []);

  if (!isAuthenticated) return null;

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { senderId: 'me', content: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      // Gọi API, server sẽ đẩy vào Queue và trả về 202
      await api.post('/chat/send', {
        receiverId: 'ai-bot',
        content: userMsg,
        history: messages,
        currentPath: location.pathname
      });
      // Không tắt isLoading ở đây vì phải chờ Socket trả về (ai_response)
    } catch (error: any) {
      console.error(error);
      setIsLoading(false); // Lỗi HTTP thì tắt loading
      if (error.response?.status === 429) {
        const retryTime = error.response.data?.retryAfter || 36;
        setCooldown(retryTime);
        setMessages(prev => [...prev, { senderId: 'ai-bot', content: `Hệ thống AI đang quá tải (giới hạn miễn phí). Vui lòng đợi ${retryTime} giây trước khi gửi tiếp.` }]);
      } else {
        setMessages(prev => [...prev, { senderId: 'ai-bot', content: 'Xin lỗi, hệ thống AI hiện không khả dụng.' }]);
      }
    }
  };

  const startListening = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setIsListening(false);
      setInput(text);
      // Wait for React to update input state then send
      setTimeout(() => {
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) sendBtn.click();
      }, 100);
    };
    
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 h-[450px] bg-surface rounded-2xl shadow-2xl flex flex-col border border-border overflow-hidden animate-fade-in origin-bottom-right transition-transform">
          {/* Header */}
          <div className="p-4 bg-brand-600 text-white flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Trợ lý AI</h3>
                <p className="text-[10px] text-brand-100">Luôn sẵn sàng hỗ trợ</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Body */}
          <div className="flex-1 p-4 overflow-y-auto bg-surface-alt/30 flex flex-col gap-3">
            {messages.map((m, i) => {
              const isMe = m.senderId === 'me';
              return (
                <div key={i} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm prose prose-sm dark:prose-invert min-w-0 break-words overflow-x-auto ${
                    isMe 
                      ? 'bg-brand-500 text-white rounded-tr-sm' 
                      : 'bg-surface border border-border text-text-primary rounded-tl-sm'
                  }`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a({ node, href, children, ...props }) {
                          if (href && href.startsWith('/')) {
                            return <Link to={href} {...props} className="text-brand-600 hover:underline">{children}</Link>;
                          }
                          return <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline" {...props}>{children}</a>;
                        },
                        p({ children }) {
                          return <p className="m-0 leading-tight">{children}</p>;
                        },
                        pre({ node, children, ...props }: any) {
                          const codeNode = node?.children?.[0];
                          const className = codeNode?.properties?.className;
                          const isChatops = Array.isArray(className) 
                            ? className.includes('language-chatops') 
                            : className === 'language-chatops';
                            
                          if (isChatops) {
                            return <div className="not-prose w-full">{children}</div>;
                          }
                          return <pre {...props}>{children}</pre>;
                        },
                        code({ node, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          if (match && match[1] === 'chatops') {
                            try {
                              const data = JSON.parse(String(children));
                              if (data.type === 'leave_request') return <MiniLeaveForm data={data} />;
                              if (data.type === 'chart') return <ChatChart chartData={data.chartData} />;
                            } catch (e) {
                              console.error("Lỗi parse ChatOps:", e);
                            }
                          }
                          return <code className={className} {...props}>{children}</code>;
                        }
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="self-start px-4 py-2.5 rounded-2xl bg-surface border border-border text-text-muted text-sm flex items-center gap-2 rounded-tl-sm shadow-sm">
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce delay-200" />
              </div>
            )}
            
            {/* Contextual Suggestions */}
            {!isLoading && messages.length > 0 && messages[messages.length - 1].senderId === 'ai-bot' && (
              <div className="flex flex-wrap gap-2 mt-2 self-start animate-fade-in max-w-[90%]">
                <div className="w-full text-xs text-text-muted mb-1 ml-1 flex items-center gap-1">
                  ✨ Gợi ý cho màn hình này:
                </div>
                {suggestions.map((sug, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setInput(sug)}
                    className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 px-3 py-1.5 rounded-full transition-colors text-left"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-surface border-t border-border flex gap-2">
            {cooldown > 0 ? (
              <div className="flex-1 bg-red-50 text-red-500 border border-red-200 rounded-full px-4 text-sm flex items-center justify-center font-medium">
                Vui lòng đợi {cooldown}s để gửi tiếp...
              </div>
            ) : (
              <>
                <button
                  onClick={startListening}
                  disabled={isLoading || isListening}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isListening ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-surface-alt text-text-muted hover:text-brand-500'
                  }`}
                >
                  {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                </button>
                <input 
                  className="flex-1 bg-surface-alt border border-border rounded-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow" 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Hỏi tôi bất cứ điều gì..."
                  disabled={isLoading || isListening}
                />
                <button 
                  id="chat-send-btn"
                  onClick={sendMessage} 
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 group relative"
        >
          <Bot className="w-7 h-7 group-hover:hidden" />
          <MessageCircle className="w-7 h-7 hidden group-hover:block" />
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
        </button>
      )}
    </div>
  );
}
