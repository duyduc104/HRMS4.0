import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Upload, ArrowRight, ArrowLeft, Rocket, Loader2, ScanFace } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { toast } from '../../stores/useToastStore';
import api from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import jsQR from 'jsqr';

export function Onboarding() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const fileInputFrontRef = useRef<HTMLInputElement>(null);
  const fileInputBackRef = useRef<HTMLInputElement>(null);
  
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();

  const [formData, setFormData] = useState({
    dob: '',
    phone: '',
    idCardNumber: '',
    address: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = (type: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    toast.loading('Đang xử lý ảnh...', { id: 'scan-ocr' });

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === 'front') setFrontImage(dataUrl);
      else setBackImage(dataUrl);

      if (type === 'front') {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) return;
          
          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0, img.width, img.height);
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            toast.dismiss('scan-ocr');
            
            // Format QR CCCD: 040098012345|123456789|NGUYEN VAN A|25101995|Nam|Hà Nội|15052021
            const parts = code.data.split('|');
            if (parts.length >= 6) {
              const idCardNumber = parts[0];
              const extractedName = parts[2];
              const rawDob = parts[3]; // ddmmyyyy

              // Chuẩn hóa chuỗi: bỏ dấu tiếng Việt, xử lý chữ Đ, bỏ khoảng trắng và chuyển chữ thường
              const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").replace(/\s+/g, "").toLowerCase();
              
              if (normalize(extractedName) !== normalize(user?.fullName || '')) {
                toast.error(`Tên CCCD (${extractedName}) không khớp với tên tài khoản (${user?.fullName}).`);
                setFrontImage(null); // Xoá ảnh vừa tải lên vì không hợp lệ
                setIsScanning(false);
                return;
              }
              
              toast.success('Trích xuất dữ liệu QR CCCD thành công!');

              const dob = rawDob.length === 8 ? `${rawDob.substring(4, 8)}-${rawDob.substring(2, 4)}-${rawDob.substring(0, 2)}` : '';
              const address = parts[5];
              
              setFormData(prev => ({
                ...prev,
                dob,
                idCardNumber,
                address
              }));
            } else {
              toast.error('Dữ liệu QR không hợp lệ. Vui lòng chụp đúng mặt trước thẻ CCCD.');
              setFrontImage(null);
            }
          } else {
            toast.dismiss('scan-ocr');
            toast.error('Không tìm thấy mã QR trên ảnh. Vui lòng chụp rõ mã QR mặt trước.');
            setFrontImage(null);
          }
          setIsScanning(false);
        };
        img.src = dataUrl;
      } else {
        toast.dismiss('scan-ocr');
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!frontImage || !backImage) {
        toast.error('Vui lòng tải lên đầy đủ mặt trước và mặt sau CCCD để tiếp tục');
        return;
      }
    }
    
    if (step === 2) {
      if (!formData.dob || !formData.phone || !formData.idCardNumber || !formData.address || !formData.bankName || !formData.bankAccountNumber || !formData.bankAccountName) {
        toast.error('Vui lòng điền đầy đủ thông tin cá nhân và tài khoản ngân hàng');
        return;
      }
    }

    setStep(step + 1);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await api.post('/onboarding', {
        ...formData,
        idCardFrontUrl: frontImage || '',
        idCardBackUrl: backImage || ''
      });
      toast.success('Chúc mừng bạn đã hoàn thành Onboarding!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi nộp hồ sơ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-8 h-8" />
        </div>
        <h1 className="text-h2 font-bold mb-2">Chào mừng bạn gia nhập HRMS Vibe!</h1>
        <p className="text-text-sec">Hãy hoàn thành một số bước nhỏ để bắt đầu hành trình của bạn.</p>
      </div>

      {/* Progress Bar */}
      <div className="relative pt-8">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-surface-alt -translate-y-1/2 rounded-full"></div>
        <div 
          className="absolute top-1/2 left-0 h-1 bg-brand-500 -translate-y-1/2 rounded-full transition-all duration-500" 
          style={{ width: `${((step - 1) / 2) * 100}%` }}
        ></div>
        
        <div className="relative flex justify-between z-10">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300
                ${step > s ? 'bg-brand-500 text-white' : step === s ? 'bg-surface border-2 border-brand-500 text-brand-600' : 'bg-surface-alt text-text-muted border-2 border-transparent'}`}
            >
              {step > s ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
          ))}
        </div>
      </div>

      <Card className="mt-8 shadow-xl">
        <CardBody className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-slide-up">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold">Tải lên CCCD để xác thực</h2>
                <p className="text-sm text-text-sec">Hệ thống sẽ tự động quét (OCR) để lấy dữ liệu từ giấy tờ của bạn.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Upload Mặt trước */}
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[200px] relative overflow-hidden ${frontImage ? 'border-brand-500 bg-brand-50/10' : 'border-border hover:bg-surface-alt'}`}
                  onClick={() => fileInputFrontRef.current?.click()}
                >
                  <input type="file" className="hidden" accept="image/*" ref={fileInputFrontRef} onChange={(e) => handleFileUpload('front', e)} />
                  
                  {frontImage ? (
                    <>
                      <img src={frontImage} alt="Mặt trước CCCD" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      {isScanning && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-brand-500 shadow-[0_0_15px_rgba(99,102,241,1)]" style={{ animation: 'scan 2s linear infinite' }} />
                      )}
                      <div className="z-10 bg-black/60 text-white px-3 py-1 rounded-full text-xs flex items-center mt-auto mb-2">
                        <CheckCircle className="w-3 h-3 mr-1" /> Đã tải lên mặt trước
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-brand-500 mb-3" />
                      <p className="font-medium text-sm">Mặt trước CMND/CCCD</p>
                      <p className="text-xs text-text-muted mt-1">Kéo thả hoặc click để chọn file</p>
                    </>
                  )}
                </div>

                {/* Upload Mặt sau */}
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[200px] relative overflow-hidden ${backImage ? 'border-brand-500 bg-brand-50/10' : 'border-border hover:bg-surface-alt'}`}
                  onClick={() => fileInputBackRef.current?.click()}
                >
                  <input type="file" className="hidden" accept="image/*" ref={fileInputBackRef} onChange={(e) => handleFileUpload('back', e)} />
                  
                  {backImage ? (
                    <>
                      <img src={backImage} alt="Mặt sau CCCD" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      {isScanning && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-brand-500 shadow-[0_0_15px_rgba(99,102,241,1)]" style={{ animation: 'scan 2s linear infinite' }} />
                      )}
                      <div className="z-10 bg-black/60 text-white px-3 py-1 rounded-full text-xs flex items-center mt-auto mb-2">
                        <CheckCircle className="w-3 h-3 mr-1" /> Đã tải lên mặt sau
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-brand-500 mb-3" />
                      <p className="font-medium text-sm">Mặt sau CMND/CCCD</p>
                      <p className="text-xs text-text-muted mt-1">Kéo thả hoặc click để chọn file</p>
                    </>
                  )}
                </div>

              </div>
              <style>{`
                @keyframes scan {
                  0% { transform: translateY(0); }
                  50% { transform: translateY(190px); }
                  100% { transform: translateY(0); }
                }
              `}</style>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-slide-up">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold">Xác nhận thông tin cá nhân</h2>
                <p className="text-sm text-text-sec">Hệ thống đã tự động trích xuất dữ liệu. Vui lòng kiểm tra và bổ sung.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-surface-alt p-6 rounded-xl border border-border">
                <Input label="Họ và tên" value={user?.fullName || ''} disabled />
                <Input type="date" label="Ngày sinh" name="dob" value={formData.dob} onChange={handleChange} required />
                <Input label="Số điện thoại" name="phone" value={formData.phone} onChange={handleChange} placeholder="Nhập SĐT của bạn" required />
                <Input label="CMND / CCCD" name="idCardNumber" value={formData.idCardNumber} onChange={handleChange} required />
                <div className="col-span-2">
                  <Input label="Địa chỉ thường trú" name="address" value={formData.address} onChange={handleChange} required />
                </div>
                <div className="col-span-2 pt-4 border-t border-border mt-2">
                  <h3 className="font-semibold mb-4">Thông tin Tài khoản Ngân hàng (Nhận lương)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Ngân hàng" name="bankName" value={formData.bankName} onChange={handleChange} placeholder="VD: Vietcombank, Techcombank..." required />
                    <Input label="Số tài khoản" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} placeholder="Nhập số tài khoản" required />
                    <div className="col-span-2">
                      <Input label="Tên chủ tài khoản" name="bankAccountName" value={formData.bankAccountName} onChange={handleChange} placeholder="VD: NGUYEN VAN A" required />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-slide-up">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold">Đọc kỹ Nội quy & Chính sách</h2>
                <p className="text-sm text-text-sec">Hãy xác nhận bạn đã hiểu rõ văn hóa công ty.</p>
              </div>
              <div className="bg-surface-alt p-6 rounded-lg text-sm space-y-4 max-h-64 overflow-y-auto border border-border text-text-sec leading-relaxed">
                <h4 className="font-bold text-text-primary">1. Thời gian làm việc:</h4>
                <p>- Sáng: 08:30 - 12:00</p>
                <p>- Chiều: 13:30 - 17:30</p>
                <p>- Làm việc từ thứ 2 đến thứ 6 hàng tuần.</p>
                
                <h4 className="font-bold text-text-primary mt-4">2. Quy định bảo mật:</h4>
                <p>- Tuyệt đối không chia sẻ mã nguồn, tài liệu công ty ra bên ngoài.</p>
                <p>- Tuân thủ quy định Clean Desk Policy.</p>
              </div>
              <label className="flex items-start gap-3 mt-4 cursor-pointer p-2 hover:bg-surface-alt rounded-md transition-colors">
                <input type="checkbox" className="mt-1 w-4 h-4 text-brand-600 rounded border-border focus:ring-brand-500" />
                <span className="text-sm font-medium">Tôi đã đọc, hiểu và cam kết tuân thủ nội quy công ty.</span>
              </label>
            </div>
          )}

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
            <Button 
              variant="outline" 
              onClick={() => setStep(step - 1)} 
              disabled={step === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
            </Button>
            
            {step < 3 ? (
              <Button onClick={handleNextStep} disabled={isScanning}>
                Tiếp tục <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Hoàn tất <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
