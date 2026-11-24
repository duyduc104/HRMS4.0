import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, X, AlertCircle, Trash2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal/Modal';
import { Button } from '../../components/ui/Button/Button';
import { policyServices, type PolicyDocumentItem } from '../../services/policy';
import { toast } from '../../stores/useToastStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PolicyAskAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: PolicyDocumentItem | null;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  contactPerson?: any;
}

export function PolicyAskAIModal({ isOpen, onClose, policy }: PolicyAskAIModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (policy) {
      setMessages([
        {
          sender: 'ai',
          text: `👋 Xin chào! Tôi là **Trợ lý AI Chính Sách HRMS**.\n\nBạn có thắc mắc gì về tài liệu **"${policy.title}"**? Hãy đặt câu hỏi bên dưới, tôi sẽ giải đáp chi tiết cho bạn dựa trên nội dung chính thức của tài liệu này!`
        }
      ]);
    }
  }, [policy]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!policy) return null;

  const handleSend = async () => {
    if (!inputQuestion.trim() || isLoading) return;

    const q = inputQuestion;
    setInputQuestion('');

    setMessages(prev => [...prev, { sender: 'user', text: q }]);
    setIsLoading(true);

    try {
      const historyToBackend = messages.map(m => ({
        role: m.sender,
        text: m.text
      }));
      const res = await policyServices.askAIPolicy(policy.id, q, historyToBackend);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: res.answer,
        contactPerson: res.contactPerson
      }]);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi hỏi AI';
      toast.error('Lỗi', errMsg);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: `⚠️ **Không thể lấy câu trả lời:** ${errMsg}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (policy) {
      setMessages([
        {
          sender: 'ai',
          text: `👋 Xin chào! Tôi là **Trợ lý AI Chính Sách HRMS**.\n\nBạn có thắc mắc gì về tài liệu **"${policy.title}"**? Hãy đặt câu hỏi bên dưới, tôi sẽ giải đáp chi tiết cho bạn dựa trên nội dung chính thức của tài liệu này!`
        }
      ]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`🤖 Hỏi AI về: ${policy.title}`} size="lg">
      <div className="flex flex-col h-[500px]">
        
        {/* Policy Header Banner */}
        <div className="bg-brand-50 dark:bg-brand-900/20 p-3 rounded-lg border border-brand-100 dark:border-brand-800 mb-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-semibold text-brand-700 dark:text-brand-300">Danh mục: </span>
              <span className="text-text-sec">{policy.category}</span>
            </div>
            {policy.contactPerson && (
              <div className="text-text-sec">
                <span className="font-semibold text-text-primary">Người phụ trách: </span>
                {policy.contactPerson.fullName} ({policy.contactPerson.email})
              </div>
            )}
          </div>
          <button 
            onClick={handleClearChat}
            className="text-text-muted hover:text-red-500 flex items-center gap-1 transition-colors"
            title="Xóa lịch sử chat"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Xóa chat</span>
          </button>
        </div>

        {/* Chat Message List */}
        <div className="flex-1 overflow-y-auto space-y-4 p-2">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0 shadow">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm ${
                m.sender === 'user' 
                  ? 'bg-brand-600 text-white rounded-tr-none' 
                  : 'bg-surface-alt border border-border text-text-primary rounded-tl-none'
              }`}>
                {m.sender === 'user' ? (
                  <p>{m.text}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-surface-alt border border-border rounded-2xl p-4 text-sm text-text-muted flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-brand-500" />
                AI đang suy nghĩ và đối chiếu tài liệu...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="pt-3 border-t border-border flex gap-2">
          <input
            type="text"
            className="flex-1 h-10 px-4 rounded-full border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Nhập câu hỏi của bạn về chính sách này..."
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <Button rounded className="px-5" onClick={handleSend} disabled={!inputQuestion.trim() || isLoading}>
            <Send className="w-4 h-4 mr-1" /> Hỏi
          </Button>
        </div>

      </div>
    </Modal>
  );
}
