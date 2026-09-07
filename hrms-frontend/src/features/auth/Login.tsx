import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, User, Lock, ScanFace, KeyRound, Download, ShieldAlert, CheckCircle, ChevronRight, X } from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { FaceScanner } from '../../components/ui/FaceScanner/FaceScanner';
import { useAuthStore } from '../../stores/useAuthStore';
import { toast } from '../../stores/useToastStore';
import { authServices } from '../../services/auth';
import { useFaceRecognition, type LivenessChallenge } from '../../hooks/useFaceRecognition';
import { isExtensionActive } from '../../utils/checkExtension';
import api from '../../services/api';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'face'>('password');
  const [livenessStatus, setLivenessStatus] = useState<'idle' | LivenessChallenge>('idle');
  const { login } = useAuthStore();
  const { isModelsLoaded, isVideoReady, videoRef, startVideo, stopVideo, extractFaceVector, verifyLivenessDynamic } = useFaceRecognition();
  const navigate = useNavigate();

  const [showExtensionModal, setShowExtensionModal] = useState(false);

  const processLoginSuccess = async (data: any) => {
    stopVideo();
    login(data.token, data.user);
    toast.success(data.message || 'Đăng nhập thành công');
    
    if (data.user.role === 'admin') {
      navigate('/');
      return;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      navigate('/');
      return;
    }

    if (!data.user.requiresExtension) {
      // Cấu hình per-user không bắt buộc cài extension
      navigate('/');
      return;
    }

    const hasExtension = isExtensionActive();
    if (!hasExtension) {
      setShowExtensionModal(true);
    } else {
      navigate('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await authServices.login(username, password);
      await processLoginSuccess(data);
    } catch (err: any) {
      if (err.response?.data?.errorCode === 'EXTENSION_REQUIRED') {
        setShowExtensionModal(true);
      } else {
        toast.error(err.response?.data?.message || 'Đăng nhập thất bại');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaceLogin = async () => {

    if (!username) {
      toast.error('Vui lòng nhập Username trước khi quét khuôn mặt');
      return;
    }
    
    if (!isModelsLoaded) {
      toast.error('Đang tải mô hình AI, vui lòng đợi giây lát');
      return;
    }

    setIsLoading(true);

    // Thử thách Liveness trước khi lấy vector
    const challenges: LivenessChallenge[] = ['turn_left', 'turn_right', 'look_up', 'smile'];
    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    setLivenessStatus(randomChallenge);
    
    const getChallengeInstruction = (c: LivenessChallenge) => {
      if (c === 'turn_left') return 'Hãy quay mặt sang TRÁI';
      if (c === 'turn_right') return 'Hãy quay mặt sang PHẢI';
      if (c === 'look_up') return 'Hãy ngước mặt lên TRÊN';
      return 'Hãy MỈM CƯỜI thật tươi';
    };

    toast.info(`Bắt đầu. ${getChallengeInstruction(randomChallenge)} để tiếp tục.`, { duration: 5000 });
    
    const isLivenessPassed = await verifyLivenessDynamic(randomChallenge, 15000);
    setLivenessStatus('idle');

    if (!isLivenessPassed) {
      toast.error('Không vượt qua thử thách người thật. Đăng nhập thất bại.');
      setIsLoading(false);
      return;
    }

    const result = await extractFaceVector();
    
    if (!result) {
      toast.error('Không nhận diện được khuôn mặt. Hãy đưa mặt vào gần hơn.');
      setIsLoading(false);
      return;
    }

    const { vector, image } = result;

    try {
      const data = await authServices.loginFace(username, vector, image);
      await processLoginSuccess(data);
    } catch (err: any) {
      if (err.response?.data?.errorCode === 'EXTENSION_REQUIRED') {
        stopVideo();
        setShowExtensionModal(true);
      } else {
        toast.error(err.response?.data?.message || 'Lỗi server');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center text-white mb-4 shadow-lg">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-display font-bold tracking-tight text-text-primary">HRMS 4.0</h1>
          <p className="text-text-sec mt-2 text-center">
            Hệ thống quản trị nhân sự toàn diện
          </p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-center text-h3">Đăng nhập</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex bg-surface-alt p-1 rounded-lg mb-6">
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'password' ? 'bg-surface shadow-sm text-brand-600' : 'text-text-sec hover:text-text-primary'}`}
                onClick={() => {
                  setLoginMethod('password');
                  stopVideo();
                }}
              >
                <div className="flex items-center justify-center gap-2"><KeyRound className="w-4 h-4" /> Mật khẩu</div>
              </button>
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'face' ? 'bg-surface shadow-sm text-brand-600' : 'text-text-sec hover:text-text-primary'}`}
                onClick={() => {
                  setLoginMethod('face');
                  startVideo();
                }}
              >
                <div className="flex items-center justify-center gap-2"><ScanFace className="w-4 h-4" /> Khuôn mặt</div>
              </button>
            </div>

            {loginMethod === 'password' ? (
              <form className="space-y-4 animate-fade-in" onSubmit={handleLogin}>
              <Input
                type="text"
                placeholder="Tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
              <Input
                type="password"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-text-sec cursor-pointer">
                  <input type="checkbox" className="rounded border-border text-brand-500 focus:ring-brand-500" />
                  Ghi nhớ tôi
                </label>
                <a href="#" className="text-brand-500 hover:text-brand-600 font-medium">
                  Quên mật khẩu?
                </a>
              </div>
              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg" 
                  isLoading={isLoading}
                >
                  Đăng nhập
                </Button>
              </div>
            </form>
            ) : (
              <div className="py-6 flex flex-col items-center animate-fade-in space-y-4">
                <Input
                  type="text"
                  placeholder="Nhập tên đăng nhập trước khi quét"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />
                <div className="w-full text-center mt-2 relative">
                  {!isModelsLoaded ? (
                    <p className="text-sm text-yellow-500 mb-2">Đang tải mô hình AI...</p>
                  ) : !isVideoReady ? (
                    <p className="text-sm text-yellow-500 mb-2 animate-pulse">Đang khởi tạo Camera...</p>
                  ) : livenessStatus !== 'idle' ? (
                    <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 mb-2 shadow-sm animate-bounce">
                      <p className="text-sm text-brand-600 font-bold flex items-center justify-center gap-2">
                        <span className="text-xl">
                          {livenessStatus === 'turn_left' && '◀️'}
                          {livenessStatus === 'turn_right' && '▶️'}
                          {livenessStatus === 'look_up' && '🔼'}
                          {livenessStatus === 'smile' && '😊'}
                        </span> 
                        {livenessStatus === 'turn_left' && 'Vui lòng quay mặt sang TRÁI'}
                        {livenessStatus === 'turn_right' && 'Vui lòng quay mặt sang PHẢI'}
                        {livenessStatus === 'look_up' && 'Vui lòng ngước mặt lên TRÊN'}
                        {livenessStatus === 'smile' && 'Vui lòng MỈM CƯỜI'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-green-500 mb-2 animate-pulse">✅ Đã sẵn sàng. Đưa mặt vào khung hình.</p>
                  )}
                  <div className="w-full h-48 bg-black rounded-lg overflow-hidden border-2 border-brand-500 shadow-lg relative">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" 
                    />
                    {isModelsLoaded && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-brand-400 shadow-[0_0_15px_3px_rgba(99,102,241,0.8)] opacity-70"
                          style={{ animation: 'scan 2s linear infinite' }}>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  type="button" 
                  className="w-full bg-green-600 hover:bg-green-700 mt-4" 
                  size="lg" 
                  isLoading={isLoading}
                  onClick={handleFaceLogin}
                  disabled={!isModelsLoaded || !isVideoReady}
                >
                  Xác nhận Đăng nhập
                </Button>
                
                <style>{`
                  @keyframes scan {
                    0% { transform: translateY(0); }
                    50% { transform: translateY(190px); }
                    100% { transform: translateY(0); }
                  }
                `}</style>
              </div>
            )}
            
            <div className="text-center mt-6 pt-4 border-t border-border">
              <Button variant="ghost" size="sm" type="button" onClick={() => navigate('/register')}>
                Chưa có tài khoản? Đăng ký ngay
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {showExtensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-border">
            <div className="bg-brand-600 p-6 text-white text-center relative">
              <button 
                onClick={() => navigate('/')} 
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-brand-100" />
              <h2 className="text-2xl font-bold mb-2">Bảo Mật Web Filter</h2>
              <p className="text-brand-100 text-sm">Hệ thống phát hiện bạn chưa cài đặt tiện ích bảo mật của công ty.</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4">
                <h3 className="font-semibold text-brand-700 dark:text-brand-400 mb-2 flex items-center gap-2">
                  <Download className="w-5 h-5" /> Hướng dẫn cài đặt nhanh (30 giây)
                </h3>
                <ol className="text-sm space-y-3 text-text-sec mt-4">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs mt-0.5">1</span>
                    <div>Nhấn nút Tải xuống bên dưới để tải file <b className="text-text-primary">hrms-extension.zip</b> về máy.</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs mt-0.5">2</span>
                    <div>Giải nén file vừa tải. Mở thẻ mới trên Chrome/Cốc Cốc và truy cập: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-brand-600">chrome://extensions</code></div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs mt-0.5">3</span>
                    <div>Bật <b>"Chế độ dành cho nhà phát triển"</b> (Góc trên bên phải) và nhấn <b>"Tải tiện ích đã giải nén"</b> chọn tới thư mục bạn vừa giải nén.</div>
                  </li>
                </ol>
              </div>

              <div className="flex flex-col gap-3">
                <a 
                  href="/hrms-extension.zip" 
                  download="hrms-extension.zip"
                  className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  <Download className="w-5 h-5" />
                  Tải xuống Tiện ích (Extension)
                </a>
                <Button 
                  variant="outline" 
                  className="w-full py-3 rounded-xl font-medium"
                  onClick={() => {
                    if (isExtensionActive()) {
                      toast.success('Đã nhận diện Extension!');
                      navigate('/');
                    } else {
                      toast.error('Hệ thống vẫn chưa nhận diện được Extension. Bạn vui lòng kiểm tra lại thao tác!');
                    }
                  }}
                >
                  Tôi đã cài đặt xong <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
