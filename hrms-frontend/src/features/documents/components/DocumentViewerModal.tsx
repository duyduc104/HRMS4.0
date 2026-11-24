import React, { useState, useEffect, useRef } from 'react';
import type { Document } from '../api/documentApi';
import { useAskAIDocument, useViewDocument } from '../hooks/useDocuments';
import { X, Send, Bot, User, Download, FileText, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import api from '../../../services/api';

interface DocumentViewerModalProps {
  document: Document | null;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

import { documentApi } from '../api/documentApi';
import { toast } from '../../../stores/useToastStore';

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ document, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const askAIMutation = useAskAIDocument();
  const viewMutation = useViewDocument();

  useEffect(() => {
    if (document) {
      viewMutation.mutate(document.id);
      setMessages([{
        id: 'welcome',
        sender: 'ai',
        text: `Chào bạn, tôi là Trợ lý AI. Bạn có thể hỏi tôi bất kỳ thông tin nào có trong tài liệu "${document.title}" này.`
      }]);

      // Tải preview stream an toàn có Bearer Token
      const isPreviewable = document.mimeType?.includes('pdf') || document.mimeType?.includes('image') || document.fileName?.toLowerCase().endsWith('.pdf');
      if (isPreviewable) {
        api.get(`/documents/${document.id}/preview`, { responseType: 'blob' })
          .then(res => {
            const url = URL.createObjectURL(new Blob([res.data], { type: document.mimeType || 'application/pdf' }));
            setPreviewBlobUrl(url);
          })
          .catch(err => {
            console.error('Lỗi tải preview tài liệu:', err);
          });
      }
    }

    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [document?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!document) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || askAIMutation.isPending) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    const historyToBackend = messages.map(m => ({
      role: m.sender,
      text: m.text
    }));

    askAIMutation.mutate({ id: document.id, question: userMessage.text, history: historyToBackend }, {
      onSuccess: (data) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: data.answer }]);
      },
      onError: () => {
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: 'Xin lỗi, đã có lỗi xảy ra khi gọi AI. Vui lòng thử lại.' }]);
      }
    });
  };

  const handleDownload = async () => {
    try {
      await documentApi.downloadDocument(document.id, document.fileName);
      toast.success('Tải file thành công');
    } catch (err: any) {
      toast.error('Lỗi khi tải tài liệu', err.response?.data?.message || err.message);
    }
  };

  const handleClearChat = () => {
    if (document) {
      setMessages([{
        id: 'welcome',
        sender: 'ai',
        text: `Chào bạn, tôi là Trợ lý AI. Bạn có thể hỏi tôi bất kỳ thông tin nào có trong tài liệu "${document.title}" này.`
      }]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-6xl h-[85vh] flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Column: Document Details & Content Preview */}
        <div className="w-full md:w-1/2 h-full flex flex-col border-r dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-800 bg-white dark:bg-gray-900">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate pr-4">
              {document.title}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full md:hidden">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="p-4 flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 text-sm">
            <div className="flex flex-col text-gray-500 dark:text-gray-400">
              <span><strong>Người gửi:</strong> {document.sender?.fullName || 'Hệ thống'}</span>
              <span><strong>Định dạng:</strong> {document.fileName}</span>
            </div>
            <button 
              onClick={handleDownload}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Download className="w-4 h-4 mr-1.5" /> Tải Xuống
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-800/50">
            {document.mimeType?.includes('pdf') || document.mimeType?.includes('image') || document.fileName.toLowerCase().endsWith('.pdf') ? (
              previewBlobUrl ? (
                <iframe 
                  src={previewBlobUrl} 
                  className="w-full flex-1 border-0"
                  title="Document Preview"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400 italic">
                  Đang tải bản xem trước an toàn...
                </div>
              )
            ) : (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4 flex items-center text-gray-400">
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Văn bản được OCR bóc tách:</span>
                </div>
                <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm bg-white dark:bg-gray-900 border dark:border-gray-700 p-6 rounded-lg shadow-sm">
                  {document.content ? document.content : <span className="italic text-gray-400">Không có nội dung text nào được tìm thấy trong file này. Vui lòng tải xuống để xem.</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Chat */}
        <div className="w-full md:w-1/2 h-full flex flex-col bg-white dark:bg-gray-900">
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-800">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Bot className="w-5 h-5 mr-2 text-blue-500" /> Trợ lý AI Hỏi Đáp
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleClearChat}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                title="Xóa chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="hidden md:block p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.sender === 'user' ? 'bg-blue-100 text-blue-600 ml-2' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 mr-2'}`}>
                    {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className={`p-3 rounded-lg text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none leading-relaxed prose dark:prose-invert max-w-none prose-sm'
                  }`}>
                    {msg.sender === 'user' ? (
                      <span className="whitespace-pre-wrap">{msg.text}</span>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {askAIMutation.isPending && (
              <div className="flex justify-start">
                <div className="flex max-w-[80%] flex-row">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 mr-2 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="p-3 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-tl-none flex space-x-1 items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t dark:border-gray-800">
            <form onSubmit={handleSend} className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi AI về tài liệu này..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                disabled={askAIMutation.isPending}
              />
              <button
                type="submit"
                disabled={!input.trim() || askAIMutation.isPending}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
