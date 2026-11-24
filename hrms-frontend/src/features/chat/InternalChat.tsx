import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Send, User, MessageCircle, Search, Paperclip, X, Reply, Code } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';

SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('bash', bash);

interface Message {
  id?: number;
  senderId: string;
  receiverId: string;
  content: string;
  type?: string;
  fileUrl?: string;
  replyTo?: Message | null;
  createdAt: string;
}

export function InternalChat() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // Mới: State cho Reply và File
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, token } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  
  const currentUserId = user?.id?.toString() || '';
  const activeChatIdRef = useRef(activeChatId);
  const currentUserIdRef = useRef(currentUserId);
  const backendUrl = '/';

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const userIdFromUrl = searchParams.get('userId');
    if (userIdFromUrl && userIdFromUrl !== activeChatId) {
      setActiveChatId(userIdFromUrl);
      window.history.replaceState({}, '', '/chat');
    }
  }, [location.search, activeChatId]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Initialize Socket and Fetch Employees
  useEffect(() => {
    if (!token || !user) return;
    
    const newSocket = io(backendUrl, {
      auth: { token },
      extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
      transports: ['websocket']
    });

    newSocket.on('receive_message', (data: Message) => {
      setMessages(prev => [...prev, data]);
      if (data.senderId !== activeChatIdRef.current && data.senderId !== currentUserIdRef.current) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1
        }));
      }
    });

    setSocket(newSocket);
    api.get('/employees').then(res => setEmployees(res.data)).catch(console.error);

    return () => { newSocket.disconnect(); };
  }, [user]);

  // Load chat history when switching active chat
  useEffect(() => {
    if (!activeChatId || !user) return;
    
    setMessages([]);
    api.get(`/chat/history/${activeChatId}`)
      .then(res => {
        setMessages(res.data);
      })
      .catch(console.error);
  }, [activeChatId, user]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, previewUrl, replyingTo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFormatCode = () => {
    if (!input.trim()) {
      setInput('```\n\n```');
    } else if (!input.startsWith('```')) {
      setInput('```\n' + input + '\n```');
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedFile) || !user) return;
    
    setIsUploading(true);
    let uploadedUrl = '';
    let msgType = 'text';

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        const uploadRes = await api.post('/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedUrl = uploadRes.data.url;
        msgType = 'image';
      }
      
      const msgData = {
        receiverId: activeChatId,
        content: input,
        type: msgType,
        fileUrl: uploadedUrl,
        replyToId: replyingTo?.id || null
      };
      
      const currentInput = input;
      setInput('');
      removeFile();
      setReplyingTo(null);

      const res = await api.post('/chat/send', msgData);
      
      setMessages(prev => [...prev, res.data.sentMessage]);
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn qua API:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const currentChatMessages = messages.filter(m => 
    (m.senderId === currentUserId && m.receiverId === activeChatId) || 
    (m.senderId === activeChatId && m.receiverId === currentUserId)
  );

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    setUnreadCounts(prev => ({ ...prev, [id]: 0 }));
  };

  const filteredEmployees = employees.filter(emp => 
    emp.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMessageContent = (msg: Message, isMe: boolean) => {
    return (
      <div className="w-full">
        {msg.replyTo && (
          <div className={`text-[11px] mb-1.5 p-1.5 rounded border-l-2 opacity-80 truncate max-w-[200px] sm:max-w-[300px] cursor-pointer hover:opacity-100 transition-opacity ${
            isMe ? 'bg-white/20 border-white text-white' : 'bg-gray-200 dark:bg-gray-700 border-gray-400 text-gray-700 dark:text-gray-300'
          }`}>
            <Reply className="inline-block w-3 h-3 mr-1" />
            <span className="font-semibold">{msg.replyTo.senderId === currentUserId ? 'Bạn' : 'Đồng nghiệp'}:</span> {msg.replyTo.type === 'image' ? '[Hình ảnh]' : msg.replyTo.content}
          </div>
        )}
        
        {msg.type === 'image' && msg.fileUrl && (
          <img src={backendUrl + msg.fileUrl} alt="attachment" className="max-w-full h-auto rounded-lg mb-2 max-h-[250px] object-cover" />
        )}
        
        {msg.content && (
          <div className="prose prose-sm dark:prose-invert max-w-full w-full min-w-0 overflow-x-auto text-current">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({node, inline, className, children, ...props}: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  // Nếu là block code (không phải inline)
                  if (!inline) {
                    return (
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match ? match[1] : 'text'}
                        PreTag="div"
                        className="rounded-md mt-2 mb-2 text-[13px] max-w-full overflow-x-auto"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    );
                  }
                  // Inline code
                  return (
                    <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[13px] break-words font-mono text-brand-600 dark:text-brand-400" {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
      
      {/* LEFT COLUMN: CONTACTS */}
      <div className="w-full md:w-1/3 lg:w-1/4 border-r border-border flex flex-col bg-surface-alt">
        <div className="p-4 border-b border-border bg-surface flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-brand-500" />
            <h2 className="font-bold text-lg">Mạng Nội Bộ</h2>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Tìm kiếm đồng nghiệp..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-md bg-surface-alt border border-border text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Employees List */}
          {filteredEmployees.map(emp => {
            const empIdStr = emp.id.toString();
            const unread = unreadCounts[empIdStr] || 0;
            const isSelected = activeChatId === empIdStr;
            
            return empIdStr !== currentUserId && (
              <div 
                key={emp.id} 
                className={`p-4 flex items-center justify-between cursor-pointer border-b border-border transition-colors ${isSelected ? 'bg-gray-100 dark:bg-gray-800 border-l-4 border-l-gray-600' : 'hover:bg-surface'}`}
                onClick={() => handleSelectChat(empIdStr)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className={`truncate ${unread > 0 ? 'font-bold text-brand-600 dark:text-brand-400' : 'font-semibold'}`}>
                      {emp.fullName}
                    </p>
                    <p className={`text-xs truncate ${unread > 0 ? 'font-semibold text-text-primary' : 'text-text-muted'}`}>
                      {emp.department || (emp.role === 'admin' || emp.roles?.some((r: any) => r.name === 'admin') ? 'Quản trị viên' : 'Nhân viên')}
                    </p>
                  </div>
                </div>
                {unread > 0 && (
                  <div className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shrink-0 shadow-sm animate-pulse">
                    {unread > 9 ? '9+' : unread}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: CHAT BOX */}
      <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col relative bg-surface">
        {activeChatId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border font-bold bg-surface z-10 flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <span>{employees.find(e => e.id.toString() === activeChatId)?.fullName || 'Đồng nghiệp'}</span>
            </div>
            
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
              {currentChatMessages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
                  Chưa có tin nhắn nào. Hãy gửi lời chào!
                </div>
              ) : (
                currentChatMessages.map((m, i) => {
                  const isMe = m.senderId === currentUserId;
                  return (
                    <div key={i} className={`flex flex-col max-w-[85%] lg:max-w-[70%] group ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className="flex items-center gap-2 mb-1 max-w-full">
                        <button 
                          onClick={() => setReplyingTo(m)}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-text-muted transition-opacity shrink-0 ${isMe ? 'order-first' : 'order-last'}`}
                          title="Trả lời"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                        <div className={`px-4 py-2.5 rounded-2xl text-[14px] shadow-sm flex flex-col break-words min-w-0 max-w-full overflow-x-auto ${
                          isMe 
                            ? 'bg-brand-500 text-white rounded-tr-sm' 
                            : 'bg-gray-100 dark:bg-gray-800 text-text-primary rounded-tl-sm border border-border'
                        }`}>
                          {renderMessageContent(m, isMe)}
                        </div>
                      </div>
                      <span className="text-[10px] text-text-muted mt-0.5 px-1">
                        {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Replying Indicator & File Preview */}
            <div className="px-4">
              {replyingTo && (
                <div className="flex items-center justify-between p-3 bg-brand-50 dark:bg-brand-500/10 border-l-4 border-brand-500 rounded-tr-md rounded-br-md text-sm mb-2 shadow-sm">
                  <div className="flex flex-col overflow-hidden mr-2">
                    <span className="font-bold text-brand-700 dark:text-brand-400 text-xs flex items-center gap-1">
                      <Reply className="w-3 h-3" /> Đang trả lời {replyingTo.senderId === currentUserId ? 'chính bạn' : 'đồng nghiệp'}
                    </span>
                    <span className="text-text-sec truncate text-[13px] mt-0.5">{replyingTo.type === 'image' ? '[Hình ảnh]' : replyingTo.content}</span>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors shrink-0">
                    <X className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              )}
              {previewUrl && (
                <div className="flex items-start gap-3 p-3 bg-surface-alt rounded-lg border border-border mb-2 relative w-fit shadow-sm">
                  <img src={previewUrl} alt="Preview" className="h-24 w-auto rounded object-contain border border-border bg-black/5" />
                  <button onClick={removeFile} className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-surface border-t border-border flex gap-2 sm:gap-3 items-end">
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 sm:w-12 sm:h-12 hover:bg-surface-alt text-text-muted hover:text-brand-500 rounded-full flex items-center justify-center transition-colors shrink-0 mb-0.5"
                title="Đính kèm ảnh"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button 
                onClick={handleFormatCode}
                className="w-10 h-10 sm:w-12 sm:h-12 hover:bg-surface-alt text-text-muted hover:text-brand-500 rounded-full flex items-center justify-center transition-colors shrink-0 mb-0.5"
                title="Định dạng thành Code"
              >
                <Code className="w-5 h-5" />
              </button>
              <textarea 
                className="flex-1 border border-border bg-surface-alt rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow min-h-[48px] max-h-[120px] resize-none overflow-y-auto scrollbar-thin"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Nhập tin nhắn... (Hỗ trợ Markdown, Code block)"
                rows={1}
                disabled={isUploading}
              />
              <button 
                onClick={sendMessage} 
                disabled={(!input.trim() && !selectedFile) || isUploading}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-all shrink-0 shadow-md mb-0.5"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted bg-surface-alt/30">
            <MessageCircle className="w-16 h-16 mb-4 text-border opacity-50" />
            <p className="text-lg font-medium text-text-sec">Chọn một người để bắt đầu trò chuyện</p>
          </div>
        )}
      </div>
    </div>
  );
}
