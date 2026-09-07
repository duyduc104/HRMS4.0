import { useState } from 'react';
import { Bot, X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');

  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: 'Xin chào! Tôi là trợ lý AI nhân sự. Tôi có thể giúp bạn tra cứu thông tin nghỉ phép, chính sách công ty và nhiều hơn nữa.' }
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setChatHistory([...chatHistory, { sender: 'user', text: message }]);
    setMessage('');
    
    // Fake bot reply
    setTimeout(() => {
      setChatHistory(prev => [...prev, { 
        sender: 'bot', 
        text: 'Dựa trên dữ liệu hệ thống, bạn còn 8 ngày phép năm. Bạn muốn xem chi tiết hướng dẫn tạo đơn xin nghỉ không?' 
      }]);
    }, 1000);
  };

  const quickReplies = ["Ngày phép", "Bảng lương", "Chính sách", "Lịch & Sự kiện"];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-brand-600 hover:scale-105 transition-all z-50 animate-pulse-slow"
      >
        <Bot className="w-7 h-7" />
      </button>
    );
  }

  return (
    <div className={clsx(
      "fixed bottom-6 right-6 w-80 bg-surface border border-border rounded-xl shadow-modal z-50 flex flex-col transition-all duration-300",
      isMinimized ? "h-14" : "h-[450px]"
    )}>
      {/* Header */}
      <div className="bg-brand-500 text-white p-3 rounded-t-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-medium text-sm">Trợ lý nhân sự AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/20 rounded">
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat History */}
          <div className="flex-1 p-4 overflow-y-auto bg-bg/50 space-y-4">
            {chatHistory.map((msg, i) => (
              <div key={i} className={clsx("flex", msg.sender === 'user' ? "justify-end" : "justify-start")}>
                <div className={clsx(
                  "max-w-[80%] rounded-lg p-3 text-sm",
                  msg.sender === 'user' 
                    ? "bg-brand-500 text-white rounded-tr-none" 
                    : "bg-surface border border-border rounded-tl-none"
                )}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Replies */}
          <div className="px-3 pb-2 flex gap-2 overflow-x-auto scrollbar-hide bg-surface">
            {quickReplies.map(reply => (
              <button 
                key={reply}
                onClick={() => setMessage(reply)}
                className="whitespace-nowrap px-3 py-1.5 bg-surface-alt border border-border rounded-full text-xs hover:text-brand-500 transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-surface rounded-b-xl">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                placeholder="Hỏi gì đó..." 
                inputSize="sm" 
                className="flex-1"
              />
              <Button type="submit" size="sm" variant="primary" className="px-2 shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
