import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Mail, Clock, Type, AlignLeft, Send, X, Calendar as CalendarIcon, Users, Building, User, Paperclip, CheckCircle2, Copy, ExternalLink, Info, Edit, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../stores/useToastStore';
import { useAuthStore } from '../../stores/useAuthStore';

export default function EventCalendar() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<'EMAIL' | 'MEETING'>('EMAIL');
  const [formData, setFormData] = useState({
    title: '',
    scheduledAt: '',
    to: [] as string[],
    subject: '',
    body: '',
    meetLink: ''
  });
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTo, setSearchTo] = useState('');
  const [showToDropdown, setShowToDropdown] = useState(false);

  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachments, setAttachments] = useState<any[]>([]);

  // Lọc options dựa vào searchTo
  const filteredDepts = departments.filter(d => d.name.toLowerCase().includes(searchTo.toLowerCase()));
  const filteredEmps = employees.filter(e => 
    e.fullName.toLowerCase().includes(searchTo.toLowerCase()) || 
    (e.email || '').toLowerCase().includes(searchTo.toLowerCase()) ||
    (e.username || '').toLowerCase().includes(searchTo.toLowerCase())
  );

  const fetchEvents = async () => {
    try {
      const isAdminOrHR = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'hr_manager' || user?.roles?.some((r: any) => r.name === 'admin');
      
      const [eventsRes, advanceRes, policyRes] = await Promise.all([
        api.get('/events'),
        api.get(isAdminOrHR ? '/advance-requests' : '/advance-requests/me').catch(() => ({ data: [] })),
        api.get('/policies').catch(() => ({ data: [] }))
      ]);

      const calendarEvents = eventsRes.data.map((e: any) => ({
        id: e.id,
        title: e.title,
        start: e.scheduledAt,
        end: e.endAt || e.scheduledAt,
        backgroundColor: e.type === 'EMAIL' ? '#3b82f6' : '#f97316',
        display: 'block',
        extendedProps: {
          status: e.status,
          type: e.type,
          meetLink: e.meetLink,
          payload: e.payload,
          creator: e.creator
        }
      }));

      const advanceEvents = (advanceRes.data || []).map((a: any) => ({
        id: `adv-${a.id}`,
        title: `Ứng lương: ${a.employee?.fullName || 'Nhân viên'}`,
        start: a.createdAt,
        end: a.createdAt,
        backgroundColor: '#10b981', // Màu xanh lục
        display: 'block',
        extendedProps: {
          status: a.status,
          type: 'ADVANCE_SALARY',
          payload: { reason: a.reason, amount: a.amount },
          creator: a.employee
        }
      }));

      const policyEvents = (policyRes.data || []).map((p: any) => ({
        id: `pol-${p.id}`,
        title: `📢 ${p.title}`,
        start: p.scheduledPublishAt || p.createdAt,
        end: p.scheduledPublishAt || p.createdAt,
        backgroundColor: '#8b5cf6', // Màu tím chính sách
        display: 'block',
        extendedProps: {
          status: p.status,
          type: 'POLICY_DOCUMENT',
          payload: { body: p.description, category: p.category },
          creator: p.createdBy
        }
      }));

      setEvents([...calendarEvents, ...advanceEvents, ...policyEvents]);
    } catch (error: any) {
      toast.error('Lỗi khi tải lịch', error.response?.data?.message);
    }
  };

  useEffect(() => {
    fetchEvents();
    api.get('/departments').then(res => setDepartments(res.data)).catch(console.error);
    api.get('/employees').then(res => setEmployees(res.data)).catch(console.error);
  }, []);

  const handleDateClick = (arg: any) => {
    // Tự động điền ngày giờ vào form
    const clickedDate = arg.date;
    const isoString = new Date(clickedDate.getTime() - clickedDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setFormData({ ...formData, scheduledAt: isoString });
    setIsModalOpen(true);
  };

  const handleEventClick = (arg: any) => {
    setSelectedEvent({
      id: arg.event.id,
      title: arg.event.title,
      start: arg.event.start,
      end: arg.event.end,
      ...arg.event.extendedProps
    });
  };

  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn huỷ lịch này không?')) {
      try {
        await api.delete(`/events/${id}`);
        toast.success('Thành công', 'Đã huỷ lịch');
        setSelectedEvent(null);
        fetchEvents();
      } catch (error: any) {
        toast.error('Lỗi', error.response?.data?.message || 'Không thể huỷ lịch');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const chunkSize = 2 * 1024 * 1024; // 2MB
      const totalChunks = Math.ceil(file.size / chunkSize);
      const fileId = crypto.randomUUID();

      // Bước 1: Upload từng mảnh
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formDataChunk = new FormData();
        formDataChunk.append('fileId', fileId);
        formDataChunk.append('chunkIndex', i.toString());
        formDataChunk.append('chunk', chunk);

        await api.post('/upload/chunk', formDataChunk, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        // Tính % dựa trên index hiện tại
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // Bước 2: Gọi lệnh Merge
      const mergeRes = await api.post('/upload/merge', {
        fileId,
        fileName: file.name,
        totalChunks
      });

      // Thêm file vào mảng attachments
      setAttachments([...attachments, mergeRes.data.file]);
      toast.success('Đã tải lên đính kèm', file.name);

    } catch (error: any) {
      toast.error('Lỗi tải file', error.response?.data?.message || 'Không thể upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      e.target.value = ''; // Reset input
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.to.length === 0) {
      return toast.error('Lỗi', 'Vui lòng chọn ít nhất một người nhận');
    }
    const apiPayload = { ...formData, to: formData.to.join(', ') };

    try {
      if (editEventId) {
        await api.put(`/events/${editEventId}`, apiPayload);
        toast.success('Thành công', 'Đã cập nhật sự kiện');
      } else {
        if (eventType === 'EMAIL') {
          const payload = {
            ...apiPayload,
            attachments // Gửi thêm mảng file đã up
          };
          await api.post('/events/email', payload);
          toast.success('Thành công', 'Đã hẹn giờ gửi email thành công');
        } else {
          await api.post('/events/meeting', apiPayload);
          toast.success('Thành công', 'Đã tạo lịch họp và mời tham gia');
        }
      }
      setIsModalOpen(false);
      setEditEventId(null);
      setFormData({ title: '', scheduledAt: '', to: [], subject: '', body: '', meetLink: '' });
      setAttachments([]);
      setEventType('EMAIL');
      fetchEvents();
    } catch (error: any) {
      if (error.response?.data?.message === 'GOOGLE_AUTH_REQUIRED') {
        toast.error('Cần cấp quyền', error.response.data.error || 'Vui lòng liên kết tài khoản Google Calendar');
        try {
          const res = await api.get('/events/google/auth-url');
          if (res.data.url) {
            window.open(res.data.url, '_blank', 'width=600,height=700');
          }
        } catch (authErr) {
          toast.error('Lỗi', 'Không thể lấy đường dẫn xác thực Google');
        }
      } else {
        toast.error('Thất bại', error.response?.data?.message || 'Có lỗi xảy ra');
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Lịch Sự Kiện & Tác Vụ</h1>
        <button 
          onClick={() => {
            setEditEventId(null);
            setFormData({ title: '', scheduledAt: '', to: [], subject: '', body: '', meetLink: '' });
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
        >
          + Tạo sự kiện
        </button>
      </div>

      {/* Chú thích màu sự kiện */}
      <div className="flex items-center gap-6 mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded shadow-sm bg-[#f97316]"></div>
          <span className="text-sm font-medium text-gray-700">Lịch họp</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded shadow-sm bg-[#3b82f6]"></div>
          <span className="text-sm font-medium text-gray-700">Email tác vụ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded shadow-sm bg-[#10b981]"></div>
          <span className="text-sm font-medium text-gray-700">Ứng lương</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded shadow-sm bg-[#8b5cf6]"></div>
          <span className="text-sm font-medium text-gray-700">Chính sách & Thông báo</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="75vh"
          buttonText={{
            today: 'Hôm nay',
            month: 'Tháng',
            week: 'Tuần',
            day: 'Ngày'
          }}
          locale="vi"
          eventContent={(eventInfo) => (
            <div 
              title={eventInfo.event.title} 
              className="p-1 whitespace-normal break-words text-xs leading-tight overflow-hidden"
            >
              {eventInfo.timeText && <div className="font-semibold mb-0.5">{eventInfo.timeText}</div>}
              <div>{eventInfo.event.title}</div>
            </div>
          )}
        />
      </div>

      {/* Modal Lên Lịch Gửi Mail */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-wide">{editEventId ? 'Chỉnh sửa Sự kiện' : 'Lên lịch gửi Email'}</h3>
                  <p className="text-blue-100 text-sm">Hệ thống sẽ tự động gửi email vào thời gian đã định</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Event Type Toggle */}
              {!editEventId && (
                <div className="flex gap-4 p-1 bg-gray-100 rounded-xl w-fit">
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${eventType === 'EMAIL' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setEventType('EMAIL')}
                  >
                    Gửi Email
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${eventType === 'MEETING' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setEventType('MEETING')}
                  >
                    Lịch Họp (Zoom/Meet)
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                {/* Tên sự kiện */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Type className="w-4 h-4 text-blue-500" /> Tên sự kiện / Ghi chú
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                    placeholder="VD: Nhắc nhở họp team..."
                  />
                </div>

                {/* Thời gian gửi */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" /> Thời gian gửi
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Người nhận */}
              <div className="relative space-y-1.5 z-20">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" /> Người nhận (To)
                </label>
                <div 
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 cursor-text flex items-center flex-wrap gap-2 transition-all shadow-sm"
                  onClick={() => setShowToDropdown(true)}
                >
                  {formData.to.map((item, idx) => (
                    <span key={idx} className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      {item.startsWith('DEPT:') ? `Phòng: ${item.substring(5)}` : item === 'ALL' ? 'Tất cả' : item}
                      <button 
                        type="button" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setFormData({...formData, to: formData.to.filter(i => i !== item)}); 
                        }}
                        className="hover:text-red-500 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    required={formData.to.length === 0}
                    value={searchTo}
                    onChange={(e) => {
                      setSearchTo(e.target.value);
                      setShowToDropdown(true);
                    }}
                    onFocus={() => setShowToDropdown(true)}
                    className="flex-1 min-w-[120px] outline-none bg-transparent border-0 focus:ring-0 p-0 text-sm"
                    placeholder={formData.to.length > 0 ? "Thêm người nhận..." : "Nhập tên phòng ban, username hoặc email..."}
                  />
                </div>

                {showToDropdown && (
                  <div className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-72 overflow-y-auto ring-1 ring-black/5">
                    <ul className="py-2 text-sm text-gray-700">
                      {/* Option ALL */}
                      <li 
                        className="px-5 py-3 hover:bg-blue-50 cursor-pointer font-bold text-blue-700 border-b border-gray-100 flex items-center gap-3 transition-colors"
                        onClick={() => { 
                          if (!formData.to.includes('ALL')) setFormData({...formData, to: [...formData.to, 'ALL']}); 
                          setSearchTo(''); 
                          setShowToDropdown(false); 
                        }}
                      >
                        <div className="p-1.5 bg-blue-100 rounded-lg"><Users className="w-4 h-4" /></div>
                        Gửi tất cả nhân viên (Send to All)
                      </li>

                      {/* Phân loại Phòng ban */}
                      {filteredDepts.length > 0 && (
                        <>
                          <li className="px-5 py-2 mt-2 bg-gray-50/80 font-bold text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Building className="w-3.5 h-3.5" /> Phòng ban
                          </li>
                          {filteredDepts.map(d => (
                            <li 
                              key={`dept-${d.id}`}
                              className="px-5 py-2.5 hover:bg-indigo-50 cursor-pointer text-gray-700 font-medium transition-colors"
                              onClick={() => { 
                                const val = `DEPT:${d.name}`;
                                if (!formData.to.includes(val)) setFormData({...formData, to: [...formData.to, val]}); 
                                setSearchTo(''); 
                                setShowToDropdown(false); 
                              }}
                            >
                              Gửi phòng {d.name}
                            </li>
                          ))}
                        </>
                      )}

                      {/* Phân loại Cá nhân */}
                      {filteredEmps.length > 0 && (
                        <>
                          <li className="px-5 py-2 mt-2 bg-gray-50/80 font-bold text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <User className="w-3.5 h-3.5" /> Cá nhân (Email)
                          </li>
                          {filteredEmps.map(emp => (
                            <li 
                              key={`emp-${emp.id}`}
                              className="px-5 py-2.5 hover:bg-blue-50 cursor-pointer flex flex-col transition-colors border-b border-gray-50 last:border-0"
                              onClick={() => { 
                                if(!emp.email) { toast.error('Lỗi', 'Nhân viên này chưa có email'); return; }
                                if (!formData.to.includes(emp.email)) setFormData({...formData, to: [...formData.to, emp.email]}); 
                                setSearchTo(''); 
                                setShowToDropdown(false); 
                              }}
                            >
                              <span className="font-semibold text-gray-800">{emp.fullName}</span>
                              <span className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {emp.email || 'Chưa có email'} <span className="text-gray-300">|</span> @{emp.username}
                              </span>
                            </li>
                          ))}
                        </>
                      )}

                      {filteredDepts.length === 0 && filteredEmps.length === 0 && (
                        <li className="px-5 py-6 text-gray-400 text-center flex flex-col items-center gap-2">
                          <Users className="w-8 h-8 opacity-20" />
                          <span className="italic text-sm">Không tìm thấy kết quả nào</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Chủ đề */}
              <div className="space-y-1.5 z-10">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Type className="w-4 h-4 text-blue-500" /> Chủ đề (Subject)
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all shadow-sm"
                  placeholder="Tiêu đề email..."
                />
              </div>

              {/* Nội dung */}
              <div className="space-y-1.5 z-0">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-blue-500" /> Nội dung (Body HTML)
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.body}
                  onChange={(e) => setFormData({...formData, body: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all shadow-sm resize-y"
                  placeholder="Nhập nội dung email. Có thể dùng thẻ <b>, <br>, <i>..."
                ></textarea>
              </div>

              {/* Meeting Link (Only for MEETING) */}
              {eventType === 'MEETING' && (
                <div className="space-y-1.5 z-10">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Type className="w-4 h-4 text-orange-500" /> Link họp (Zoom / Google Meet)
                    </label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setFormData({...formData, meetLink: ''});
                        toast.success('Đã chọn', 'Hệ thống sẽ dùng tài khoản Google của bạn để tạo tự động khi Lưu!');
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      Tạo tự động bằng Google Meet
                    </button>
                  </div>
                  <input
                    type="url"
                    value={formData.meetLink}
                    onChange={(e) => setFormData({...formData, meetLink: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all shadow-sm"
                    placeholder="Dán link thật vào đây (Hoặc ấn tạo tự động ở trên)"
                  />
                </div>
              )}

              {/* Đính kèm File (Only for EMAIL, Disable in Edit mode for simplicity or add later) */}
              {eventType === 'EMAIL' && !editEventId && (
                <div className="space-y-1.5 z-0">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-blue-500" /> Tệp đính kèm
                  </label>
                  
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm text-sm font-medium">
                      <Paperclip className="w-4 h-4" /> Chọn File
                      <input type="file" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                    </label>
                    
                    {isUploading && (
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-blue-600 min-w-[40px]">{uploadProgress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Danh sách file đính kèm */}
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-blue-800 font-medium overflow-hidden">
                            <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="truncate">{file.filename}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeAttachment(idx)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-gray-600 font-medium bg-gray-100/80 rounded-xl hover:bg-gray-200 transition-all duration-200"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-white font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-200 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Lưu & Hẹn Giờ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Sidebar Chi tiết Sự kiện */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-left">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" />
                Chi tiết Sự kiện
              </h2>
              <div className="flex items-center gap-2">
                {selectedEvent.status === 'PENDING' && (selectedEvent.creator?.id === user?.id || user?.role === 'admin' || user?.role === 'hr_manager' || (user?.roles || []).some((r: any) => r.name === 'admin' || r.name === 'hr_manager')) && selectedEvent.type !== 'ADVANCE_SALARY' && (
                  <>
                    <button 
                      onClick={() => {
                        setEditEventId(selectedEvent.id);
                        setEventType(selectedEvent.type);
                        setFormData({
                          title: selectedEvent.title,
                          scheduledAt: selectedEvent.start ? new Date(new Date(selectedEvent.start).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
                          to: selectedEvent.payload?.to ? selectedEvent.payload.to.split(',').map((s: string) => s.trim()) : [],
                          subject: selectedEvent.payload?.subject || '',
                          body: selectedEvent.payload?.body || '',
                          meetLink: selectedEvent.meetLink || ''
                        });
                        setSelectedEvent(null);
                        setIsModalOpen(true);
                      }}
                      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full transition-colors flex items-center gap-1"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition-colors flex items-center gap-1"
                      title="Huỷ lịch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedEvent.title}</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`px-2.5 py-1 rounded-full font-medium ${selectedEvent.type === 'MEETING' ? 'bg-orange-100 text-orange-700' : selectedEvent.type === 'ADVANCE_SALARY' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {selectedEvent.type === 'MEETING' ? 'Cuộc họp' : selectedEvent.type === 'ADVANCE_SALARY' ? 'Yêu cầu ứng lương' : 'Email tác vụ'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full font-medium ${selectedEvent.status === 'PENDING' || selectedEvent.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {selectedEvent.status}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Bắt đầu</p>
                    <p className="text-sm text-gray-600">{new Date(selectedEvent.start).toLocaleString('vi-VN')}</p>
                  </div>
                </div>

                {selectedEvent.creator && (
                  <div className="flex gap-3">
                    <User className="w-5 h-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Người tạo</p>
                      <p className="text-sm text-gray-600">{selectedEvent.creator.fullName}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.type === 'MEETING' && selectedEvent.meetLink && (
                  <div className="flex gap-3 bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <ExternalLink className="w-5 h-5 text-orange-500 shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-orange-800 mb-1">Link Tham Gia Họp</p>
                      <a href={selectedEvent.meetLink} target="_blank" rel="noreferrer" className="text-sm text-orange-600 hover:underline break-all block mb-3">
                        {selectedEvent.meetLink}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedEvent.meetLink);
                          toast.success('Đã sao chép link cuộc họp!');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-200 text-orange-700 text-xs font-semibold rounded hover:bg-orange-100 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </button>
                    </div>
                  </div>
                )}

                {selectedEvent.payload && selectedEvent.payload.body && (
                  <div className="flex gap-3">
                    <AlignLeft className="w-5 h-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">Nội dung</p>
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap border border-gray-100" dangerouslySetInnerHTML={{ __html: selectedEvent.payload.body }} />
                    </div>
                  </div>
                )}

                {selectedEvent.type === 'ADVANCE_SALARY' && (
                  <div className="flex gap-3 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <AlignLeft className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-900 mb-1">Chi tiết tạm ứng</p>
                      <p className="text-sm text-emerald-800 font-mono mb-1">
                        Số tiền: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedEvent.payload.amount)}
                      </p>
                      <p className="text-sm text-emerald-700">Lý do: {selectedEvent.payload.reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
