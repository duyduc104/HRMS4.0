import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authServices } from '../../services/auth';
import api from '../../services/api';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { toast } from '../../stores/useToastStore';
import { useFaceRecognition } from '../../hooks/useFaceRecognition';

export function Register() {
  const [formData, setFormData] = useState({ username: '', password: '', email: '', fullName: '' });
  const [useFace, setUseFace] = useState(false);
  const [faceVectorString, setFaceVectorString] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaValue, setCaptchaValue] = useState('');
  
  useEffect(() => {
    fetchCaptcha();
  }, []);

  const fetchCaptcha = async () => {
    try {
      const res = await api.get('/auth/captcha');
      setCaptchaSvg(res.data.svg);
      setCaptchaToken(res.data.token);
      setCaptchaValue('');
    } catch (err) {
      console.error('Lỗi khi lấy captcha', err);
    }
  };
  
  const navigate = useNavigate();
  const { isModelsLoaded, videoRef, startVideo, stopVideo, extractFaceVector } = useFaceRecognition();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let faceVector = null;

    if (useFace) {
      if (!isModelsLoaded) {
        toast.error('Đang tải mô hình AI, vui lòng đợi');
        setIsLoading(false);
        return;
      }
      const result = await extractFaceVector();
      if (!result) {
        toast.error("Không lấy được dữ liệu khuôn mặt, hãy thử lại!");
        setIsLoading(false);
        return;
      }
      faceVector = result.vector;
      stopVideo();
    }

    try {
      await authServices.register({ ...formData, faceVector, captchaToken, captchaValue });
      toast.success('Đăng ký thành công!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
      if (err.response?.data?.message?.includes('Captcha')) {
        fetchCaptcha();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaceToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUseFace(e.target.checked);
    if (e.target.checked) {
      startVideo();
    } else {
      stopVideo();
    }
  };



  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-center text-h3">Đăng ký Tài khoản</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Tên đăng nhập" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
                <Input placeholder="Mật khẩu" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                <Input placeholder="Họ và tên" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
                <Input placeholder="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              </div>
              
              <div className="flex items-center gap-2 mt-4 p-3 bg-surface-alt rounded border border-border">
                <input type="checkbox" id="useFace" checked={useFace} onChange={handleFaceToggle} className="rounded text-brand-500 w-4 h-4" />
                <label htmlFor="useFace" className="text-sm font-medium cursor-pointer">Bật camera để quét và tạo Vector khuôn mặt</label>
              </div>

              {useFace && (
                <div className="mt-2 text-center">
                  {!isModelsLoaded ? <p className="text-sm text-yellow-500">Đang tải mô hình AI...</p> : null}
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-48 bg-black rounded object-cover transform scale-x-[-1]" />
                </div>
              )}

              <div className="mt-4 p-4 border border-border rounded-lg bg-surface flex flex-col gap-3">
                <label className="text-sm font-medium">Mã xác nhận (Captcha)</label>
                <div className="flex items-center gap-3">
                  <div 
                    className="bg-white rounded overflow-hidden cursor-pointer border border-border min-w-[120px] h-[40px] flex items-center justify-center" 
                    dangerouslySetInnerHTML={{ __html: captchaSvg }} 
                    onClick={fetchCaptcha}
                    title="Bấm vào để đổi mã khác"
                  />
                  <Input 
                    placeholder="Nhập mã bên cạnh..." 
                    value={captchaValue} 
                    onChange={(e) => setCaptchaValue(e.target.value)} 
                    required 
                    className="flex-1"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-4" size="lg" isLoading={isLoading}>Đăng ký ngay</Button>
              <div className="text-center mt-4 border-t border-border pt-4">
                <Button variant="ghost" size="sm" type="button" onClick={() => {navigate('/login'); stopVideo();}}>
                  Đã có tài khoản? Quay lại đăng nhập
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
