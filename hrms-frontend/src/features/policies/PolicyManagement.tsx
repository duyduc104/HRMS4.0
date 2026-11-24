import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Plus, Search, Calendar as CalendarIcon, Bot, MessageCircle, 
  Paperclip, Users, Clock, ShieldCheck, Download, ExternalLink, CheckCircle, 
  Trash2, Edit, AlertCircle, FileUp
} from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { Modal } from '../../components/ui/Modal/Modal';
import { Input } from '../../components/ui/Input/Input';
import { toast } from '../../stores/useToastStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { policyServices, type PolicyDocumentItem } from '../../services/policy';
import { PolicyAskAIModal } from './PolicyAskAIModal';
import { Pagination } from '../../components/ui/Pagination/Pagination';
import api from '../../services/api';

export function PolicyManagement() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [policies, setPolicies] = useState<PolicyDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // AI Modal State
  const [selectedPolicyForAI, setSelectedPolicyForAI] = useState<PolicyDocumentItem | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'POLICY' as 'POLICY' | 'ANNOUNCEMENT' | 'EVENT' | 'GUIDELINE',
    description: '',
    content: '',
    fileUrl: '',
    fileName: '',
    contactEmployeeId: '',
    targetRoles: ['ALL'] as string[],
    scheduledPublishAt: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backendBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

  const userRole = user?.role ? user.role.toLowerCase().replace(/\s+/g, '_') : 'employee';
  const isAdminOrHR = userRole === 'admin' || userRole === 'hr_manager' || user?.roles?.some((r: any) => r.name === 'admin' || r.name === 'hr_manager');

  useEffect(() => {
    fetchPolicies();
    if (isAdminOrHR) {
      api.get('/employees').then(res => setEmployees(res.data)).catch(console.error);
      api.get('/roles').then(res => setRoles(res.data)).catch(console.error);
    }
  }, [isAdminOrHR]);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await policyServices.getPolicies();
      setPolicies(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách chính sách:', err);
      toast.error('Lỗi', 'Không thể tải danh sách tài liệu chính sách');
    } finally {
      setLoading(false);
    }
  };

  // Upload file & extract basic text content
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    toast.loading('Đang tải và trích xuất chữ bằng AI...', { id: 'policy-upload' });

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const res = await api.post('/chat/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const fileUrl = res.data.url;
      let extractedText = '';

      // Nếu là ảnh (PNG, JPG, JPEG, WEBP) -> Gọi Gemini AI OCR để trích xuất văn bản
      if (file.type.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(file.name)) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        try {
          const ocrRes = await api.post('/policies/extract-text', {
            imageBase64: base64Data,
            mimeType: file.type,
            fileName: file.name
          });
          extractedText = ocrRes.data.extractedText || '';
          if (extractedText) {
            toast.success('Đã tự động đọc và trích xuất chữ từ ảnh bằng Gemini AI!', { id: 'policy-upload' });
          } else {
            toast.success('Đã tải ảnh lên thành công!', { id: 'policy-upload' });
          }
        } catch (ocrErr) {
          console.warn('Lỗi OCR ảnh:', ocrErr);
          toast.success('Đã tải ảnh lên thành công!', { id: 'policy-upload' });
        }
      } else if (file.type.includes('text') || file.name.endsWith('.txt')) {
        extractedText = await file.text();
        toast.success('Đã tải và đọc văn bản file TXT thành công!', { id: 'policy-upload' });
      } else {
        extractedText = `Tài liệu đính kèm: ${file.name}`;
        toast.success('Tải file thành công!', { id: 'policy-upload' });
      }

      setFormData(prev => ({
        ...prev,
        fileUrl,
        fileName: file.name,
        content: prev.content ? `${prev.content}\n\n${extractedText}` : extractedText
      }));
    } catch (err) {
      toast.error('Lỗi tải file', { id: 'policy-upload' });
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập tiêu đề tài liệu/chính sách');
      return;
    }

    try {
      await policyServices.createPolicy(formData);
      toast.success('Thành công', formData.scheduledPublishAt ? 'Đã lên lịch công bố chính sách thành công!' : 'Đã đăng chính sách mới thành công!');
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        category: 'POLICY',
        description: '',
        content: '',
        fileUrl: '',
        fileName: '',
        contactEmployeeId: '',
        targetRoles: ['ALL'],
        scheduledPublishAt: ''
      });
      fetchPolicies();
    } catch (err: any) {
      toast.error('Thất bại', err.response?.data?.message || 'Có lỗi xảy ra khi tạo chính sách');
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu chính sách này?')) return;
    try {
      await policyServices.deletePolicy(id);
      toast.success('Đã xóa chính sách thành công');
      fetchPolicies();
    } catch (err) {
      toast.error('Lỗi khi xóa chính sách');
    }
  };

  const openAskAI = (policy: PolicyDocumentItem) => {
    setSelectedPolicyForAI(policy);
    setIsAIModalOpen(true);
  };

  const handleChatWithContact = (contactId?: string) => {
    if (!contactId) {
      toast.info('Không có thông tin người phụ trách cụ thể.');
      return;
    }
    navigate(`/chat?userId=${contactId}`);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const filteredPolicies = policies.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const paginatedPolicies = filteredPolicies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'POLICY': return <Badge variant="info">Chính sách HR</Badge>;
      case 'ANNOUNCEMENT': return <Badge variant="danger">Thông báo chung</Badge>;
      case 'EVENT': return <Badge variant="warning">Sự kiện công ty</Badge>;
      case 'GUIDELINE': return <Badge variant="active">Hướng dẫn công việc</Badge>;
      default: return <Badge variant="default">{cat}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-h2 font-bold mb-1 flex items-center gap-2">
            <FileText className="w-7 h-7 text-brand-600" />
            Chính Sách & Tài Liệu Nội Bộ
          </h1>
          <p className="text-text-sec">Tra cứu chính sách, quy định công ty và hỏi đáp thông minh với Trợ lý AI.</p>
        </div>

        {isAdminOrHR && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Tạo chính sách / Thông báo mới
          </Button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <CardBody className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'POLICY', label: 'Chính sách HR' },
              { id: 'ANNOUNCEMENT', label: 'Thông báo chung' },
              { id: 'GUIDELINE', label: 'Hướng dẫn' },
              { id: 'EVENT', label: 'Sự kiện' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === tab.id 
                    ? 'bg-brand-500 text-white shadow-sm' 
                    : 'bg-surface-alt text-text-sec hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu chính sách..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-md bg-surface-alt border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

        </CardBody>
      </Card>

      {/* Policies Grid */}
      {loading ? (
        <div className="p-12 text-center text-text-muted animate-pulse">Đang tải danh sách chính sách...</div>
      ) : filteredPolicies.length === 0 ? (
        <Card className="p-12 text-center text-text-muted flex flex-col items-center">
          <FileText className="w-12 h-12 text-text-muted/30 mb-3" />
          Không tìm thấy tài liệu chính sách nào phù hợp.
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPolicies.map((p) => (
              <Card key={p.id} className="flex flex-col hover:shadow-lg transition-all duration-300 border-t-4 border-t-brand-500">
                <CardBody className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      {getCategoryBadge(p.category)}
                      {p.status === 'SCHEDULED' && (
                        <Badge variant="pending" className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Đã hẹn giờ
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-text-primary mb-2 line-clamp-2">{p.title}</h3>
                    <p className="text-sm text-text-sec line-clamp-3 leading-relaxed mb-4">
                      {p.description || 'Không có mô tả tóm tắt.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border/60">
                    
                    {/* Người phụ trách giải đáp */}
                    <div className="flex items-center justify-between bg-surface-alt p-2.5 rounded-lg text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
                        <div className="truncate">
                          <p className="text-text-muted font-medium">Hỏi đáp chính sách:</p>
                          <p className="font-semibold text-text-primary truncate">
                            {p.contactPerson ? p.contactPerson.fullName : 'Phòng Nhân sự'}
                          </p>
                        </div>
                      </div>
                      {p.contactPerson && (
                        <Button 
                          size="xs" 
                          variant="outline" 
                          className="text-brand-600 border-brand-200 hover:bg-brand-50 shrink-0"
                          onClick={() => handleChatWithContact(p.contactPerson?.id)}
                        >
                          <MessageCircle className="w-3 h-3 mr-1" /> Chat HR
                        </Button>
                      )}
                    </div>

                    {/* Role Permission Badge */}
                    <div className="flex items-center gap-1 text-[11px] text-text-muted">
                      <Users className="w-3 h-3 shrink-0" />
                      <span>Phạm vi: </span>
                      <span className="font-medium text-text-sec">
                        {p.targetRoles.includes('ALL') ? 'Toàn bộ công ty' : p.targetRoles.join(', ')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="primary" 
                        className="flex-1 bg-brand-600 hover:bg-brand-700" 
                        onClick={() => openAskAI(p)}
                      >
                        <Bot className="w-4 h-4 mr-1.5" /> Hỏi AI
                      </Button>

                      {p.fileUrl ? (
                        <a 
                          href={p.fileUrl.startsWith('http') ? p.fileUrl : `${backendBase}${p.fileUrl}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-surface hover:bg-surface-alt text-text-primary transition-colors shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> Xem
                        </a>
                      ) : null}

                      {isAdminOrHR && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:bg-red-50 px-2"
                          onClick={() => handleDeletePolicy(p.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                  </div>

                </CardBody>
              </Card>
            ))}
          </div>

          {filteredPolicies.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden bg-surface shadow-sm">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredPolicies.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[6, 12, 24, 48]}
                itemLabel="chính sách"
              />
            </div>
          )}
        </div>
      )}

      {/* Modal Tạo chính sách mới */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Tạo Chính Sách / Thông Báo Mới" size="lg">
        <form onSubmit={handleCreatePolicy} className="space-y-4">
          
          <Input 
            label="Tiêu đề chính sách / sự kiện" 
            placeholder="VD: Quy định về làm việc từ xa (Remote Work Policy 2026)" 
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required 
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-text-sec">Danh mục</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                value={formData.category}
                onChange={(e: any) => setFormData({...formData, category: e.target.value})}
              >
                <option value="POLICY">Chính sách HR</option>
                <option value="ANNOUNCEMENT">Thông báo chung</option>
                <option value="GUIDELINE">Hướng dẫn công việc</option>
                <option value="EVENT">Sự kiện công ty</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-text-sec">Người phụ trách giải đáp (Hỏi ai?)</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                value={formData.contactEmployeeId}
                onChange={(e) => setFormData({...formData, contactEmployeeId: e.target.value})}
              >
                <option value="">-- Mặc định (Phòng HR) --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.email || emp.username})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-text-sec">Mô tả tóm tắt</label>
            <textarea
              className="w-full p-3 rounded-md border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500 h-20 outline-none"
              placeholder="Tóm tắt ngắn gọn quy định..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-text-sec">Phân quyền xem theo Role (Ai được xem & hỏi AI?)</label>
            <div className="flex flex-wrap gap-3 bg-surface-alt p-3 rounded-md border border-border">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.targetRoles.includes('ALL')}
                  onChange={(e) => {
                    if (e.target.checked) setFormData({...formData, targetRoles: ['ALL']});
                  }}
                  className="rounded text-brand-600"
                />
                Tất cả mọi người (ALL)
              </label>

              {['admin', 'hr_manager', 'department_manager', 'employee'].map(r => (
                <label key={r} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.targetRoles.includes(r)}
                    onChange={(e) => {
                      let nextRoles = formData.targetRoles.filter(item => item !== 'ALL');
                      if (e.target.checked) nextRoles.push(r);
                      else nextRoles = nextRoles.filter(item => item !== r);
                      if (nextRoles.length === 0) nextRoles = ['ALL'];
                      setFormData({...formData, targetRoles: nextRoles});
                    }}
                    className="rounded text-brand-600"
                  />
                  {r === 'admin' ? 'Admin' : r === 'hr_manager' ? 'Quản lý HR' : r === 'department_manager' ? 'Trưởng phòng' : 'Nhân viên'}
                </label>
              ))}
            </div>
          </div>

          {/* Upload File & Hẹn giờ */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-text-sec">Tệp / Ảnh đính kèm (PDF, DOCX, TXT, PNG, JPG)</label>
              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingFile}>
                  <FileUp className="w-4 h-4 mr-1" /> {formData.fileName ? 'Đổi File / Ảnh' : 'Chọn File / Ảnh'}
                </Button>
                {formData.fileName && <span className="text-xs text-brand-600 font-medium truncate max-w-[150px]">{formData.fileName}</span>}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-text-sec">Hẹn giờ phát hành (Tùy chọn)</label>
              <input
                type="datetime-local"
                className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                value={formData.scheduledPublishAt}
                onChange={(e) => setFormData({...formData, scheduledPublishAt: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-text-sec">Nội dung văn bản chi tiết (cho AI học & đọc)</label>
            <textarea
              className="w-full p-3 rounded-md border border-border bg-surface text-sm font-mono focus:ring-2 focus:ring-brand-500 h-28 outline-none"
              placeholder="Dán nội dung văn bản chi tiết vào đây để AI trả lời chính xác..."
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Hủy</Button>
            <Button type="submit">Xác nhận Đăng / Hẹn giờ</Button>
          </div>

        </form>
      </Modal>

      {/* AI Ask Modal */}
      <PolicyAskAIModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        policy={selectedPolicyForAI}
      />

    </div>
  );
}
