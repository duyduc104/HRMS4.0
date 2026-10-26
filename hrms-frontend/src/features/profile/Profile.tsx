import { useState, useEffect } from 'react';
import { Camera, Save, Shield, Key, ScanFace, MessageCircle } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Avatar } from '../../components/ui/Avatar/Avatar';
import { useAuthStore } from '../../stores/useAuthStore';
import { toast } from '../../stores/useToastStore';
import { useFaceRecognition } from '../../hooks/useFaceRecognition';
import api from '../../services/api';

export function Profile() {
  const { user, updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/employees/me/profile');
        const data = res.data;
        if (data) {
          setFullName(data.fullName || user?.fullName || user?.name || '');
          setEmail(data.email || user?.email || '');
          setDepartment(data.department || 'Chưa cập nhật');
          setPosition(data.position || 'Nhân viên');
          setEmployeeCode(data.code || `EMP${data.id || user?.id || '001'}`);
          if (data.onboarding?.phone) {
            setPhone(data.onboarding.phone);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải hồ sơ:', err);
      }
    };
    fetchProfile();
  }, [user]);
  const [isUpdatingFace, setIsUpdatingFace] = useState(false);
  const [faceOtp, setFaceOtp] = useState('');
  const [isFaceOtpSent, setIsFaceOtpSent] = useState(false);
  const [tempFaceVector, setTempFaceVector] = useState<any>(null);
  const { isModelsLoaded, isVideoReady, videoRef, startVideo, stopVideo, extractFaceVector } = useFaceRecognition();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpMethod, setOtpMethod] = useState<'email' | 'telegram'>('email');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleRequestOtp = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error('Vui lòng nhập đủ thông tin mật khẩu');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Mật khẩu mới không khớp');
    }
    setIsSendingOtp(true);
    try {
      const res = await api.post('/auth/request-otp-update-password', { method: otpMethod, currentPassword });
      toast.success(res.data.message || 'Đã gửi mã OTP');
      setIsOtpSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi gửi OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleChangePassword = async () => {
    if (!otp) return toast.error('Vui lòng nhập mã OTP');
    setIsChangingPassword(true);
    try {
      const res = await api.post('/auth/update-password', {
        currentPassword,
        newPassword,
        otp
      });
      toast.success(res.data.message || 'Đổi mật khẩu thành công');
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setIsOtpSent(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi đổi mật khẩu');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await api.put('/employees/me/profile', { fullName, email, phone });
      updateUser({ fullName, email });
      toast.success(res.data.message || 'Đã cập nhật hồ sơ cá nhân');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật hồ sơ cá nhân');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-h2 font-bold mb-1">Hồ sơ cá nhân</h1>
        <p className="text-text-sec">Quản lý thông tin và bảo mật tài khoản của bạn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardBody className="flex flex-col items-center text-center py-8">
              <div className="relative mb-4 group cursor-pointer">
                <Avatar size="xxl" alt={fullName || user?.fullName || user?.name || 'User'} fallback={(fullName || user?.fullName || user?.name)?.charAt(0)} />
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold">{fullName || user?.fullName || user?.name}</h2>
              <p className="text-text-sec mb-4">{user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</p>
              <div className="w-full flex justify-center gap-2">
                <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium">Đang hoạt động</span>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Họ và tên" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <Input label="Mã nhân viên" value={employeeCode} disabled className="bg-surface-alt opacity-70" />
                <Input label="Email công ty" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input label="Phòng ban" value={department} disabled className="bg-surface-alt opacity-70" />
                <Input label="Chức vụ" value={position} disabled className="bg-surface-alt opacity-70" />
                <Input label="Số điện thoại cá nhân" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nhập số điện thoại..." />
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} isLoading={isLoading}>
                  <Save className="w-4 h-4 mr-2" /> Lưu thông tin
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Cập nhật khuôn mặt */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanFace className="w-5 h-5 text-brand-500" />
                Dữ liệu khuôn mặt (Face ID)
              </CardTitle>
            </CardHeader>
            <CardBody>
              {isUpdatingFace ? (
                <div className="flex flex-col items-center py-6 bg-surface-alt rounded-lg">
                  <div className="w-full text-center mt-2 relative mb-4">
                    {!isModelsLoaded ? (
                      <p className="text-sm text-yellow-500 mb-2">Đang tải mô hình AI...</p>
                    ) : !isVideoReady ? (
                      <p className="text-sm text-yellow-500 mb-2 animate-pulse">Đang khởi tạo Camera...</p>
                    ) : (
                      <p className="text-sm text-green-500 mb-2 animate-pulse">✅ Đã sẵn sàng. Đưa mặt vào khung hình.</p>
                    )}
                    <div className="w-64 h-64 mx-auto bg-black rounded-full overflow-hidden border-4 border-brand-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] relative">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" 
                      />
                      {isModelsLoaded && (
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-400 shadow-[0_0_15px_3px_rgba(99,102,241,0.8)] opacity-70"
                            style={{ animation: 'scan 2s linear infinite' }}>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  
                  <div className="flex gap-3 mt-4">
                    <Button variant="outline" onClick={() => {
                      setIsUpdatingFace(false);
                      setIsFaceOtpSent(false);
                      setTempFaceVector(null);
                      stopVideo();
                    }}>
                      Hủy bỏ
                    </Button>
                    
                    {!isFaceOtpSent ? (
                      <Button 
                        className="bg-brand-600 hover:bg-brand-700 text-white" 
                        disabled={!isModelsLoaded || !isVideoReady || isLoading}
                        isLoading={isLoading}
                        onClick={async () => {
                          setIsLoading(true);
                          try {
                            const result = await extractFaceVector();
                            if (!result) {
                              toast.error('Không nhận diện được khuôn mặt. Vui lòng đưa mặt vào giữa khung hình.');
                              setIsLoading(false);
                              return;
                            }
                            
                            setTempFaceVector(result.vector);
                            
                            // Call API to request OTP via Telegram
                            const res = await api.post('/auth/request-face-otp');
                            toast.success(res.data.message || 'Mã OTP đã được gửi đến Telegram!');
                            setIsFaceOtpSent(true);
                            stopVideo();
                          } catch (err: any) {
                            toast.error(err.response?.data?.message || 'Không thể yêu cầu OTP. Bạn đã kết nối Telegram chưa?');
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                      >
                        <ScanFace className="w-4 h-4 mr-2" /> Tiếp tục (Lấy mã OTP)
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-2 w-full animate-fade-in">
                        <Input 
                          placeholder="Nhập mã OTP từ Telegram (6 số)" 
                          value={faceOtp}
                          onChange={(e) => setFaceOtp(e.target.value)}
                        />
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white" 
                          isLoading={isLoading}
                          onClick={async () => {
                            if (!faceOtp) return toast.error('Vui lòng nhập mã OTP');
                            setIsLoading(true);
                            try {
                              await api.post('/auth/register-face', {
                                employeeId: user?.id,
                                faceVector: tempFaceVector,
                                otp: faceOtp
                              });
  
                              toast.success('Cập nhật dữ liệu khuôn mặt thành công!');
                              setIsUpdatingFace(false);
                              setIsFaceOtpSent(false);
                              setTempFaceVector(null);
                              setFaceOtp('');
                            } catch (err: any) {
                              toast.error(err.response?.data?.message || 'Cập nhật thất bại');
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                        >
                          <Save className="w-4 h-4 mr-2" /> Xác nhận lưu Face ID
                        </Button>
                      </div>
                    )}
                  </div>
                  <style>{`
                    @keyframes scan {
                      0% { transform: translateY(0); }
                      50% { transform: translateY(256px); }
                      100% { transform: translateY(0); }
                    }
                  `}</style>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-surface-alt rounded-lg border border-border">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Dữ liệu nhận diện hiện tại</h4>
                    <p className="text-xs text-text-sec">Dùng để chấm công và đăng nhập Face ID.</p>
                  </div>
                  <Button variant="outline" onClick={() => {
                    setIsUpdatingFace(true);
                    startVideo();
                  }}>
                    Cập nhật lại khuôn mặt
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Cập nhật Telegram Bot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                Trợ lý ảo Telegram (Chatbot)
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg">
                <div className="flex-1 space-y-2 text-sm text-text-sec">
                  <p>Hệ thống hỗ trợ tra cứu lương, điểm danh và xin nghỉ phép tự động qua Telegram.</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Nhấn nút bên dưới để mở ứng dụng Telegram (Hoặc tìm kiếm Bot của công ty).</li>
                    <li>Trong khung chat với Bot, nhấn <strong>Start</strong>.</li>
                    <li>Gõ cú pháp: <code className="bg-surface px-1 py-0.5 rounded font-mono text-brand-600">/login [Username] [Mật khẩu]</code> để liên kết.</li>
                  </ol>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="primary" className="bg-[#0088cc] hover:bg-[#0077b3] text-white border-none" onClick={() => {
                  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
                  window.open(`https://t.me/${botUsername}`, '_blank');
                }}>
                  <MessageCircle className="w-4 h-4 mr-2" /> Mở Telegram
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-500" />
                Bảo mật
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input type="password" label="Mật khẩu hiện tại" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isOtpSent} />
              <div className="grid grid-cols-2 gap-4">
                <Input type="password" label="Mật khẩu mới" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isOtpSent} />
                <Input type="password" label="Xác nhận mật khẩu mới" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isOtpSent} />
              </div>
              
              {!isOtpSent ? (
                <div className="pt-4 border-t border-border mt-4">
                  <p className="text-sm font-medium mb-3">Chọn phương thức nhận mã OTP để xác nhận:</p>
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="otpMethod" value="email" checked={otpMethod === 'email'} onChange={() => setOtpMethod('email')} className="text-brand-600 focus:ring-brand-500" />
                      <span className="text-sm">Gửi qua Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="otpMethod" value="telegram" checked={otpMethod === 'telegram'} onChange={() => setOtpMethod('telegram')} className="text-brand-600 focus:ring-brand-500" />
                      <span className="text-sm">Gửi qua Telegram Bot</span>
                    </label>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-text-sec">Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.</p>
                    <Button variant="outline" onClick={handleRequestOtp} isLoading={isSendingOtp}>
                      <Key className="w-4 h-4 mr-2" /> Gửi mã OTP
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-border mt-4 space-y-4 animate-fade-in">
                  <div className="bg-brand-50 text-brand-700 p-3 rounded-md text-sm">
                    Mã OTP đã được gửi qua {otpMethod === 'email' ? 'Email' : 'Telegram'} của bạn. Vui lòng kiểm tra và nhập mã vào bên dưới.
                  </div>
                  <Input label="Nhập mã OTP (6 số)" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} />
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => setIsOtpSent(false)} disabled={isChangingPassword}>
                      Hủy bỏ
                    </Button>
                    <Button onClick={handleChangePassword} isLoading={isChangingPassword}>
                      <Shield className="w-4 h-4 mr-2" /> Xác nhận & Đổi mật khẩu
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
