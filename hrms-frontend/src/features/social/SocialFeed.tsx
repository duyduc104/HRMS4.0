import { useState, useRef } from 'react';
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, MoreHorizontal, X } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Avatar } from '../../components/ui/Avatar/Avatar';
import { useAuthStore } from '../../stores/useAuthStore';
import { toast } from '../../stores/useToastStore';

interface CommentItem {
  id: number;
  author: string;
  avatar?: string;
  text: string;
  time: string;
}

interface PostItem {
  id: number;
  author: string;
  role: string;
  avatar?: string;
  time: string;
  content: string;
  imageUrl?: string;
  likes: number;
  isLiked: boolean;
  comments: CommentItem[];
  showComments?: boolean;
}

export function SocialFeed() {
  const { user } = useAuthStore();
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<PostItem[]>([
    {
      id: 1,
      author: 'Phòng Nhân sự (HR)',
      role: 'Thông báo chung',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100&h=100',
      time: '2 giờ trước',
      content: '🎉 Chúc mừng công ty chúng ta đã ra mắt thành công tính năng Quản lý Chính sách & Tài liệu tích hợp AI Chatbot!\n\nTất cả tài liệu nhân sự hiện đã được công bố trên hệ thống, mọi người có thể vào tra cứu và hỏi AI trực tiếp!',
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800&h=400',
      likes: 24,
      isLiked: false,
      comments: [
        { id: 101, author: 'Nguyễn Văn A', text: 'Tính năng hỏi AI chính sách quá đỉnh!', time: '1 giờ trước' },
        { id: 102, author: 'Trần Thị B', text: 'Rất tiện lợi khi tra cứu ngày nghỉ phép và lương thưởng.', time: '30 phút trước' }
      ],
      showComments: false
    },
    {
      id: 2,
      author: 'Trần Văn Tech Lead',
      role: 'Phòng Kỹ thuật',
      time: 'Hôm qua lúc 15:30',
      content: 'Đã hoàn tất nâng cấp kiến trúc hệ thống và tích hợp Cron Job xử lý thông báo tự động! Cảm ơn anh em team Backend & AI đã OT cả tuần qua nhé! 🚀💻',
      likes: 12,
      isLiked: true,
      comments: [],
      showComments: false
    }
  ]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePost = () => {
    if (!postContent.trim() && !selectedImage) return;

    const newPostItem: PostItem = {
      id: Date.now(),
      author: user?.fullName || user?.name || 'Tôi',
      role: (user as any)?.department || 'Thành viên công ty',
      time: 'Vừa xong',
      content: postContent,
      imageUrl: selectedImage || undefined,
      likes: 0,
      isLiked: false,
      comments: [],
      showComments: true
    };

    setPosts([newPostItem, ...posts]);
    setPostContent('');
    setSelectedImage(null);
    toast.success('Đã đăng bài viết mới thành công!');
  };

  const toggleLike = (postId: number) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: !p.isLiked,
          likes: p.isLiked ? p.likes - 1 : p.likes + 1
        };
      }
      return p;
    }));
  };

  const toggleComments = (postId: number) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, showComments: !p.showComments } : p));
  };

  const handleAddComment = (postId: number) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [
            ...p.comments,
            {
              id: Date.now(),
              author: user?.fullName || 'Tôi',
              text: text.trim(),
              time: 'Vừa xong'
            }
          ]
        };
      }
      return p;
    }));

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-h2 font-bold mb-1">Mạng nội bộ</h1>
        <p className="text-text-sec">Cập nhật tin tức, thông báo và chia sẻ khoảnh khắc cùng đồng nghiệp.</p>
      </div>

      {/* Create Post Card */}
      <Card className="overflow-visible shadow-sm">
        <CardBody className="p-4 sm:p-6">
          <div className="flex gap-4">
            <Avatar size="md" alt={user?.fullName || user?.name || 'User'} fallback={(user?.fullName || user?.name)?.charAt(0)} />
            <div className="flex-1 space-y-3">
              <textarea 
                placeholder="Bạn đang nghĩ gì? Hãy chia sẻ tin tức hoặc thông báo với mọi người..."
                className="w-full bg-surface-alt border-none focus:ring-2 focus:ring-brand-500/20 resize-none rounded-xl p-3 text-sm h-24 outline-none placeholder:text-text-muted transition-all"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />

              {/* Image Preview */}
              {selectedImage && (
                <div className="relative rounded-xl overflow-hidden border border-border w-fit max-h-48">
                  <img src={selectedImage} alt="Preview" className="h-48 w-auto object-cover" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="text-brand-600 hover:bg-brand-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-4 h-4 mr-2" /> Thêm ảnh
                </Button>
                <Button onClick={handlePost} disabled={!postContent.trim() && !selectedImage}>
                  <Send className="w-4 h-4 mr-2" /> Đăng bài
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Feed Posts */}
      <div className="space-y-6 animate-fade-in">
        {posts.map((post) => (
          <Card key={post.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardBody className="p-4 sm:p-6">
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-center">
                  <Avatar size="md" alt={post.author} src={post.avatar} fallback={post.author.charAt(0)} />
                  <div>
                    <h3 className="font-semibold text-sm">{post.author}</h3>
                    <p className="text-xs text-text-sec">{post.time} • {post.role}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="px-2 text-text-muted"><MoreHorizontal className="w-4 h-4" /></Button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm leading-relaxed whitespace-pre-line text-text-primary">
                  {post.content}
                </p>
                
                {post.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <img src={post.imageUrl} alt="Post content" className="w-full h-auto object-cover max-h-96" />
                  </div>
                )}
              </div>

              {/* Reaction Bar */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
                <button 
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-2 text-sm transition-colors group ${post.isLiked ? 'text-red-500 font-semibold' : 'text-text-sec hover:text-red-500'}`}
                >
                  <Heart className={`w-5 h-5 transition-transform group-hover:scale-110 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} /> 
                  <span>{post.likes}</span>
                </button>

                <button 
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-2 text-sm text-text-sec hover:text-brand-500 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" /> 
                  <span className="font-medium">{post.comments.length}</span>
                </button>

                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Đã sao chép liên kết bài viết');
                  }}
                  className="flex items-center gap-2 text-sm text-text-sec hover:text-brand-500 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {/* Comment Section */}
              {post.showComments && (
                <div className="mt-4 pt-4 border-t border-border/60 space-y-3 animate-fade-in">
                  
                  {/* Comments List */}
                  {post.comments.map(c => (
                    <div key={c.id} className="flex gap-2 text-xs items-start">
                      <Avatar size="xs" alt={c.author} fallback={c.author.charAt(0)} />
                      <div className="bg-surface-alt p-2.5 rounded-xl flex-1 border border-border/40">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-text-primary">{c.author}</span>
                          <span className="text-[10px] text-text-muted">{c.time}</span>
                        </div>
                        <p className="text-text-sec">{c.text}</p>
                      </div>
                    </div>
                  ))}

                  {/* Add Comment Input */}
                  <div className="flex gap-2 pt-2 items-center">
                    <Avatar size="xs" alt={user?.fullName || 'User'} fallback={(user?.fullName || 'U')?.charAt(0)} />
                    <input
                      type="text"
                      placeholder="Viết bình luận..."
                      className="flex-1 h-8 px-3 rounded-full bg-surface-alt border border-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                    />
                    <Button size="xs" variant="ghost" className="text-brand-600 font-semibold" onClick={() => handleAddComment(post.id)}>
                      Gửi
                    </Button>
                  </div>

                </div>
              )}

            </CardBody>
          </Card>
        ))}
      </div>

    </div>
  );
}
