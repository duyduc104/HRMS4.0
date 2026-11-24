import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapPin, Clock, CheckCircle, LogOut, ScanFace, X, Search, Download, TrendingUp, CalendarDays, Bell } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { Table } from '../../components/ui/Table/Table';
import { toast } from '../../stores/useToastStore';
import { useFaceRecognition, type LivenessChallenge } from '../../hooks/useFaceRecognition';
import { attendanceServices } from '../../services/attendance';
import api from '../../services/api';
import { AttendanceCalendar } from './AttendanceCalendar';
import { useAuthStore } from '../../stores/useAuthStore';

interface AttendanceRecord {
  id: number;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  employee?: {
    fullName: string;
    code: string;
    department?: string;
  };
}

export function Attendance() {
  const [time, setTime] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const gpsPromiseRef = useRef<Promise<{lat: number, lng: number} | null> | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'checkin' | 'checkout'>('checkin');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingToday, setIsLoadingToday] = useState(true);
  const [livenessStatus, setLivenessStatus] = useState<'idle' | LivenessChallenge>('idle');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingGPS, setIsGettingGPS] = useState(false);

  const { user } = useAuthStore();
  const userRole = (user?.role || '').toLowerCase().replace(/\s+/g, '_');
  const userRoles = (user?.roles || []).map((r: any) => 
    (typeof r === 'string' ? r : r.name || '').toLowerCase().replace(/\s+/g, '_')
  );
  const allRoles = [...new Set([userRole, ...userRoles])];
  const isAdmin = allRoles.includes('admin') || allRoles.includes('hr_manager');
  const isManager = isAdmin || allRoles.includes('department_manager');

  // States cho Lịch sử nhân viên (Admin)
  const currentYear = new Date().getFullYear();
  const [historyYear, setHistoryYear] = useState(currentYear);
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1);
  const [historyDays, setHistoryDays] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [myHistory, setMyHistory] = useState<AttendanceRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // States cho Cảnh báo (Admin)
  const [warnings, setWarnings] = useState<any[]>([]);
  const [isLoadingWarnings, setIsLoadingWarnings] = useState(false);

  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
  const months = Array.from({length: 12}, (_, i) => i + 1);

  const { isModelsLoaded, isVideoReady, videoRef, startVideo, stopVideo, extractFaceVector, verifyLivenessDynamic } = useFaceRecognition();

  // Đồng hồ realtime
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTodayAttendance = useCallback(async () => {
    setIsLoadingToday(true);
    try {
      const data = await attendanceServices.getToday();
      setTodayRecord(data.attendance);
    } catch (err) {
      console.error('Error loading today attendance:', err);
    } finally {
      setIsLoadingToday(false);
    }
  }, []);

  // Load trạng thái chấm công hôm nay khi mount
  useEffect(() => {
    loadTodayAttendance();
  }, [loadTodayAttendance]);

  const loadMyHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await attendanceServices.getEmployeeHistory(undefined, historyYear, historyMonth, historyDays);
      setMyHistory(data.records || []);
    } catch (err: any) {
      console.error('Error loading history:', err);
      toast.error(err.response?.data?.message || 'Lỗi khi tải lịch sử chấm công');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [historyYear, historyMonth, historyDays]);

  // Load history khi filter thay đổi
  useEffect(() => {
    loadMyHistory();
  }, [loadMyHistory]);

  // Load warnings nếu là Quản lý/Admin
  useEffect(() => {
    if (isManager) {
      const loadWarnings = async () => {
        setIsLoadingWarnings(true);
        try {
          const res = await api.get('/attendance/warnings');
          setWarnings(res.data.warnings || []);
        } catch (err) {
          console.error('Error loading warnings:', err);
        } finally {
          setIsLoadingWarnings(false);
        }
      };
      loadWarnings();
    }
  }, [isManager]);

  const handleSendWarning = async (employeeId: number) => {
    try {
      toast.loading('Đang gửi cảnh báo...', { id: `warn-${employeeId}` });
      await api.post(`/attendance/send-warning/${employeeId}`);
      toast.success('Đã gửi cảnh báo thành công', { id: `warn-${employeeId}` });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi gửi cảnh báo', { id: `warn-${employeeId}` });
    }
  };

  const filteredHistory = myHistory.filter((item: any) => 
    !searchEmployee || 
    item.employee?.fullName?.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    item.employee?.code?.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  const handleExportExcel = () => {
    if (filteredHistory.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    // Tiêu đề các cột
    const headers = ['Ngày', 'Mã Nhân Viên', 'Tên Nhân Viên', 'Phòng Ban', 'Giờ Vào', 'Giờ Ra', 'Trạng Thái'];
    
    const rows = filteredHistory.map((item: any) => {
      const date = new Date(item.date).toLocaleDateString('vi-VN');
      const code = item.employee?.code || '';
      const name = item.employee?.fullName || '';
      const dept = item.employee?.department || '';
      const checkIn = item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('vi-VN') : '';
      const checkOut = item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString('vi-VN') : '';
      
      let status = item.status;
      if (status === 'Present') status = 'Đúng giờ';
      else if (status === 'Late') status = 'Đi trễ';

      return [date, code, `"${name}"`, dept, checkIn, checkOut, status].join(',');
    });

    // Thêm BOM (\uFEFF) để hỗ trợ tiếng Việt trên Excel
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Lich_Su_Cham_Cong_Thang${historyMonth}_${historyYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Xuất dữ liệu thành công');
  };

  const handleStartScan = (mode: 'checkin' | 'checkout') => {
    setScanMode(mode);
    setIsScanning(true);
    startVideo(); // Bật camera lập tức

    // Chạy ngầm lấy GPS song song để tiết kiệm thời gian
    if (navigator.geolocation) {
      gpsPromiseRef.current = new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
            setCurrentLocation(loc);
            resolve(loc);
          },
          (geoErr) => {
            console.warn('[GPS] Không lấy được vị trí:', geoErr);
            setCurrentLocation(null);
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 10000, // Cho phép dùng cache 10s
          }
        );
      });
    } else {
      setCurrentLocation(null);
      gpsPromiseRef.current = Promise.resolve(null);
    }
  };

  const handleCancelScan = () => {
    setIsScanning(false);
    setIsProcessing(false);
    setLivenessStatus('idle');
    stopVideo();
  };

  const handleFaceCheckIn = async () => {
    if (!isModelsLoaded) {
      toast.error('Đang tải mô hình AI, vui lòng đợi');
      return;
    }

    setIsProcessing(true);
    
    try {
      let latitude = currentLocation?.lat;
      let longitude = currentLocation?.lng;

      // Nếu chưa có tọa độ (GPS vẫn đang lấy ngầm), chờ Promise hoàn thành
      if (!latitude || !longitude) {
        if (gpsPromiseRef.current) {
          const loc = await gpsPromiseRef.current;
          if (loc) {
            latitude = loc.lat;
            longitude = loc.lng;
          }
        }
      }

      const result = await extractFaceVector();

      if (!result) {
        toast.error('Không nhận diện được khuôn mặt. Hãy đưa mặt vào gần hơn và thử lại.');
        setIsProcessing(false);
        return;
      }

      const { vector, image } = result;

      // Bước 1: Xác minh Vector khuôn mặt (đảm bảo đúng người)
      let verifyToken = '';
      try {
        const verifyRes = await attendanceServices.verifyFace(vector);
        verifyToken = verifyRes.verifyToken;
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Khuôn mặt không khớp với dữ liệu đã đăng ký!');
        setIsProcessing(false);
        return;
      }

      // Bước 2: Thử thách người thật (Dynamic Challenge)
      const challenges: LivenessChallenge[] = ['turn_left', 'turn_right', 'look_up', 'smile'];
      const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
      setLivenessStatus(randomChallenge);
      
      const getChallengeInstruction = (c: LivenessChallenge) => {
        if (c === 'turn_left') return 'Hãy quay mặt sang TRÁI';
        if (c === 'turn_right') return 'Hãy quay mặt sang PHẢI';
        if (c === 'look_up') return 'Hãy ngước mặt lên TRÊN';
        return 'Hãy MỈM CƯỜI thật tươi';
      };

      toast.info(`Nhận diện thành công. ${getChallengeInstruction(randomChallenge)} để hoàn tất.`, { duration: 5000 });
      
      const isLivenessPassed = await verifyLivenessDynamic(randomChallenge, 15000);
      setLivenessStatus('idle');

      if (!isLivenessPassed) {
        toast.error('Không vượt qua thử thách người thật. Chấm công thất bại.');
        setIsProcessing(false);
        return;
      }

      // Bước 3: Hoàn thành chấm công
      if (scanMode === 'checkin') {
        const data = await attendanceServices.checkIn(verifyToken, image, latitude, longitude);
        toast.success(data.message, `Thời gian: ${new Date(data.attendance.checkInTime).toLocaleTimeString('vi-VN')}`);
        setTodayRecord(data.attendance);
      } else {
        const data = await attendanceServices.checkOut(verifyToken, image, latitude, longitude);
        toast.success(data.message, `Thời gian: ${new Date(data.attendance.checkOutTime).toLocaleTimeString('vi-VN')}`);
        setTodayRecord(data.attendance);
      }
      setIsScanning(false);
      stopVideo();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Chấm công thất bại');
    } finally {
      setIsProcessing(false);
    }
  };

  // Xác định trạng thái hiện tại
  const hasCheckedIn = todayRecord?.checkInTime != null;
  const hasCheckedOut = todayRecord?.checkOutTime != null;





  // ===================== FACE SCANNER UI (real) =====================
  const renderFaceScanner = () => (
    <div className="flex flex-col items-center gap-4 animate-fade-in w-full">
      {/* Video preview */}
      <div className="relative w-48 h-48 md:w-64 md:h-64 bg-black rounded-full overflow-hidden border-4 border-brand-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
        />
        {/* Scanning laser line */}
        {isModelsLoaded && (
          <div
            className="absolute top-0 left-0 w-full h-1.5 bg-brand-400 shadow-[0_0_15px_3px_rgba(99,102,241,0.8)]"
            style={{ animation: 'scan 2s linear infinite' }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <ScanFace className="w-16 h-16 md:w-20 md:h-20 text-brand-500/50" />
        </div>
      </div>

      {/* Status message */}
      <div className="text-center">
        {!isModelsLoaded ? (
          <p className="text-sm text-yellow-500 animate-pulse">⏳ Đang tải mô hình AI...</p>
        ) : !isVideoReady ? (
          <p className="text-sm text-yellow-500 animate-pulse">📷 Đang khởi tạo Camera...</p>
        ) : livenessStatus !== 'idle' ? (
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 mx-4 shadow-sm animate-bounce">
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
          <p className="text-sm text-green-500 animate-pulse flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
            Đã sẵn sàng. Đưa mặt vào khung hình.
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-2">
        <Button size="sm" variant="outline" onClick={handleCancelScan} disabled={livenessStatus !== 'idle' && isProcessing}>
          <X className="w-4 h-4 mr-1" /> Hủy
        </Button>
        <Button
          size="sm"
          variant="primary"
          className={scanMode === 'checkin' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
          onClick={handleFaceCheckIn}
          disabled={!isModelsLoaded || !isVideoReady || isProcessing}
          isLoading={isProcessing}
        >
          {scanMode === 'checkin' ? (
            <><Clock className="w-4 h-4 mr-1" /> Xác nhận Check-in</>
          ) : (
            <><LogOut className="w-4 h-4 mr-1" /> Xác nhận Check-out</>
          )}
        </Button>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(256px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  // ===================== TABS =====================
  const tabs = [
    {
      id: 'personal',
      label: 'Chấm công của tôi',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Check In Widget */}
          <Card className="text-center p-6 flex flex-col items-center justify-center min-h-[300px]">
            <h2 className="text-display font-mono font-bold tracking-tight text-brand-500 mb-2">
              {time.toLocaleTimeString()}
            </h2>
            <p className="text-text-sec mb-6">{time.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

            {isLoadingToday ? (
              <div className="flex items-center gap-2 text-text-muted">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                Đang tải...
              </div>
            ) : isGettingGPS ? (
              <div className="flex flex-col items-center gap-3 animate-fade-in">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-green-600 animate-pulse">📍 Đang lấy vị trí GPS...</p>
                <p className="text-xs text-text-muted">Vui lòng đợi, đang xác định tọa độ của bạn</p>
              </div>
            ) : isScanning ? (
              renderFaceScanner()
            ) : hasCheckedIn && hasCheckedOut ? (
              // Đã check-in VÀ check-out
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-green-600">Đã hoàn tất chấm công</h3>
                <div className="text-sm text-text-sec space-y-1">
                  <p>🟢 Check-in: <span className="font-mono font-medium">{new Date(todayRecord!.checkInTime!).toLocaleTimeString('vi-VN')}</span></p>
                  <p>🔴 Check-out: <span className="font-mono font-medium">{new Date(todayRecord!.checkOutTime!).toLocaleTimeString('vi-VN')}</span></p>
                </div>
                <Badge variant={todayRecord!.status === 'Present' ? 'active' : 'danger'}>
                  {todayRecord!.status === 'Present' ? '✅ Đúng giờ' : '⚠️ Đi trễ'}
                </Badge>
              </div>
            ) : hasCheckedIn ? (
              // Đã check-in, chưa check-out
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-green-600">
                  Đã chấm công vào ({new Date(todayRecord!.checkInTime!).toLocaleTimeString('vi-VN')})
                </h3>
                <Badge variant={todayRecord!.status === 'Present' ? 'active' : 'danger'}>
                  {todayRecord!.status === 'Present' ? '✅ Đúng giờ' : '⚠️ Đi trễ'}
                </Badge>
                <Button
                  variant="outline"
                  className="mt-4 border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={() => handleStartScan('checkout')}
                  disabled={isGettingGPS}
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Chấm công ra (Check-out)
                </Button>
              </div>
            ) : (
              // Chưa chấm công
              <Button size="lg" className="w-full max-w-xs" onClick={() => handleStartScan('checkin')} disabled={isGettingGPS}>
                <Clock className="w-5 h-5 mr-2" />
                Chấm công ngay
              </Button>
            )}
          </Card>

          {/* Card 1: Thống kê hôm nay */}
          <div className="flex flex-col gap-4">
            <Card className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-full"><TrendingUp className="w-5 h-5" /></div>
                <span className="font-semibold text-sm">Thống kê hôm nay</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-text-muted mb-1">Check-in</p>
                  <p className="font-mono font-bold text-green-600 text-sm">
                    {todayRecord?.checkInTime
                      ? new Date(todayRecord.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                      : '—:——'}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-text-muted mb-1">Check-out</p>
                  <p className="font-mono font-bold text-orange-600 text-sm">
                    {todayRecord?.checkOutTime
                      ? new Date(todayRecord.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                      : '—:——'}
                  </p>
                </div>
              </div>
              <div className="bg-surface-alt rounded-lg p-3 text-center">
                <p className="text-xs text-text-muted mb-1">Tổng giờ làm</p>
                <p className="font-mono font-bold text-brand-500 text-lg">
                  {todayRecord?.checkInTime && todayRecord?.checkOutTime
                    ? (() => {
                        const diff = new Date(todayRecord.checkOutTime).getTime() - new Date(todayRecord.checkInTime).getTime();
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        return `${h}h ${m}m`;
                      })()
                    : todayRecord?.checkInTime
                    ? (() => {
                        const diff = new Date().getTime() - new Date(todayRecord.checkInTime).getTime();
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        return `${h}h ${m}m …`;
                      })()
                    : 'Chưa chấm'}
                </p>
              </div>
              {todayRecord && (
                <div className="flex justify-center">
                  <Badge variant={todayRecord.status === 'Present' ? 'active' : 'danger'}>
                    {todayRecord.status === 'Present' ? '✅ Đúng giờ' : todayRecord.status === 'Late' ? '⚠️ Đi trễ' : todayRecord.status}
                  </Badge>
                </div>
              )}
            </Card>

            {/* Card 2: Mini Calendar */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-full"><CalendarDays className="w-5 h-5" /></div>
                <span className="font-semibold text-sm">Lịch tháng {new Date().getMonth() + 1}</span>
              </div>
              <MiniAttendanceCalendar records={myHistory} />
            </Card>

            {/* Card 3: GPS Status */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-green-50 text-green-600 rounded-full"><MapPin className="w-5 h-5" /></div>
                <span className="font-semibold text-sm">Trạng thái Vị trí (GPS)</span>
              </div>
              {isGettingGPS ? (
                <div className="flex items-center gap-2 text-sm text-green-600 animate-pulse">
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  Đang xác định vị trí...
                </div>
              ) : currentLocation ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"></span>
                    <span className="font-medium">GPS đã kết nối</span>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 space-y-1 text-xs font-mono text-text-muted">
                    <p>📍 Lat: <span className="text-green-700 font-semibold">{currentLocation.lat.toFixed(6)}</span></p>
                    <p>📍 Lng: <span className="text-green-700 font-semibold">{currentLocation.lng.toFixed(6)}</span></p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
                    <span>Chưa lấy vị trí</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-green-500 text-green-600 hover:bg-green-50"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        toast.error('Trình duyệt không hỗ trợ GPS!');
                        return;
                      }
                      toast.loading('Đang lấy vị trí...', { id: 'gps-manual' });
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          toast.dismiss('gps-manual');
                          setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                          toast.success('Đã xác định vị trí thành công!');
                        },
                        (err) => {
                          toast.dismiss('gps-manual');
                          if (err.code === err.PERMISSION_DENIED) {
                            toast.error('Bạn đã từ chối quyền GPS. Vui lòng bật lại trong cài đặt trình duyệt.');
                          } else {
                            toast.error('Không lấy được vị trí, thử lại.');
                          }
                        },
                        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
                      );
                    }}
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    Cấp quyền & Lấy GPS
                  </Button>
                  <p className="text-xs text-text-muted text-center">GPS được dùng để xác nhận bạn đang ở văn phòng khi chấm công.</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 'admin',
      label: isManager ? (isAdmin ? 'Quản lý chấm công (Admin)' : 'Quản lý chấm công (Phòng ban)') : 'Lịch sử chấm công',
      content: (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle>Tra cứu lịch sử chấm công</CardTitle>
            </CardHeader>
            <div className="p-6 pt-0 flex flex-wrap gap-4 items-end">
              {isManager && (
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-text-sec">Tìm nhân viên (Tên / Mã)</label>
                  <input 
                    type="text" 
                    placeholder="Nhập tên hoặc mã nhân viên..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-sec">Năm</label>
                <select 
                  value={historyYear}
                  onChange={(e) => setHistoryYear(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-sec">Tháng</label>
                <select 
                  value={historyMonth}
                  onChange={(e) => setHistoryMonth(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
                </select>
              </div>
              <div className="space-y-2 flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-text-sec">Lọc ngày cụ thể (VD: 1, 15, 30)</label>
                <input 
                  type="text" 
                  placeholder="Nhập các ngày cách nhau bằng dấu phẩy..."
                  value={historyDays}
                  onChange={(e) => setHistoryDays(e.target.value)}
                  onBlur={loadMyHistory}
                  onKeyDown={(e) => e.key === 'Enter' && loadMyHistory()}
                  className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={loadMyHistory} isLoading={isLoadingHistory}>
                  <Search className="w-4 h-4 mr-2" />
                  Tra cứu
                </Button>
                <Button variant="outline" onClick={handleExportExcel}>
                  <Download className="w-4 h-4 mr-2" />
                  Xuất Excel
                </Button>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex justify-between items-center p-6 pb-0">
              <div className="flex gap-2">
                <Button variant={viewMode === 'table' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('table')}>Dạng Bảng</Button>
                <Button variant={viewMode === 'calendar' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('calendar')}>Dạng Lịch</Button>
              </div>
            </div>
            {isLoadingHistory ? (
              <div className="p-8 text-center text-text-muted">Đang tải dữ liệu...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-text-muted">Không có dữ liệu chấm công.</div>
            ) : viewMode === 'calendar' ? (
              <div className="p-6">
                {!searchEmployee.trim() && isManager ? (
                  <div className="text-center py-12 flex flex-col items-center">
                    <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">Vui lòng tìm kiếm nhân viên</h3>
                    <p className="text-text-sec max-w-md">Chế độ Dạng Lịch chỉ hiển thị khi bạn nhập Tên hoặc Mã nhân viên cụ thể ở ô tìm kiếm phía trên.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 text-sm text-text-sec">
                      {filteredHistory.length > 0 && isManager && (
                        <div className="text-base">
                          <span className='font-bold text-brand-500'>Đang xem lịch của nhân viên: </span>
                          <span className="font-semibold text-text-primary">{filteredHistory[0].employee?.fullName || '—'}</span>
                          <span className="text-text-muted ml-1">({filteredHistory[0].employee?.code || '—'})</span>
                        </div>
                      )}
                    </div>
                    <AttendanceCalendar year={historyYear} month={historyMonth} records={filteredHistory} />
                  </>
                )}
              </div>
            ) : (
              <div className="p-0 overflow-x-auto mt-4">
                <Table 
                  columns={[
                    { accessor: 'date', label: 'Ngày', render: (item) => <span className="font-medium">{new Date(item.date).toLocaleDateString('vi-VN')}</span> },
                    { accessor: 'employee', label: 'Nhân viên', render: (item) => <span className="font-medium">{item.employee?.fullName || '—'} ({item.employee?.code || '—'})</span> },
                    { accessor: 'department', label: 'Phòng ban', render: (item) => <span>{item.employee?.department || '—'}</span> },
                    { accessor: 'checkInTime', label: 'Giờ vào', render: (item) => <span className="font-mono">{item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('vi-VN') : '—'}</span> },
                    { accessor: 'checkOutTime', label: 'Giờ ra', render: (item) => <span className="font-mono">{item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString('vi-VN') : '—'}</span> },
                    { accessor: 'status', label: 'Trạng thái', render: (item) => <Badge variant={item.status === 'Present' ? 'active' : item.status === 'Leave' ? 'default' : 'danger'}>{item.status === 'Present' ? 'Đúng giờ' : item.status === 'Late' ? 'Đi trễ' : item.status === 'Leave' ? 'Nghỉ phép' : item.status}</Badge> }
                  ]} 
                  data={filteredHistory} 
                  pagination pageSize={10}
                />
              </div>
            )}
          </Card>
        </div>
      )
    }
  ];

  if (isManager) {
    tabs.push({
      id: 'warnings',
      label: 'Cảnh báo vi phạm',
      content: (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle>Cảnh báo vi phạm tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</CardTitle>
            </CardHeader>
            <div className="p-0 overflow-x-auto mt-4">
              {isLoadingWarnings ? (
                <div className="p-8 text-center text-text-muted">Đang tải dữ liệu...</div>
              ) : warnings.length === 0 ? (
                <div className="p-8 text-center text-text-muted">Không có nhân viên nào vi phạm trong tháng này.</div>
              ) : (
                <Table 
                  columns={[
                    { accessor: 'employee', label: 'Nhân viên', render: (item) => <span className="font-medium">{item.employee?.fullName} ({item.employee?.code})</span> },
                    { accessor: 'department', label: 'Phòng ban', render: (item) => <span>{item.employee?.department || '—'}</span> },
                    { accessor: 'lateCount', label: 'Số lần đi trễ', render: (item) => <span className={item.lateCount >= 3 ? 'text-orange-600 font-bold' : ''}>{item.lateCount}</span> },
                    { accessor: 'absentCount', label: 'Số lần vắng mặt', render: (item) => <span className={item.absentCount >= 5 ? 'text-red-600 font-bold' : ''}>{item.absentCount}</span> },
                    { accessor: 'missingCheckoutCount', label: 'Số lần quên chấm công', render: (item) => <span className={item.missingCheckoutCount >= 3 ? 'text-red-600 font-bold' : ''}>{item.missingCheckoutCount || 0}</span> },
                    { accessor: 'status', label: 'Mức độ', render: () => <Badge variant="danger">Vi phạm kỷ luật</Badge> },
                    { accessor: 'action', label: 'Hành động', render: (item) => (
                      <Button size="xs" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => handleSendWarning(item.employee?.id)}>
                        <Bell className="w-3 h-3 mr-1" />
                        Gửi cảnh báo
                      </Button>
                    )}
                  ]}
                  data={warnings}
                  pagination pageSize={10}
                />
              )}
            </div>
          </Card>
        </div>
      )
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2 font-bold mb-1">Chấm công</h1>
        <p className="text-text-sec">Quản lý và theo dõi thời gian làm việc.</p>
      </div>
      <Tabs tabs={tabs} />
    </div>
  );
}

// ===================== MINI CALENDAR COMPONENT =====================
function MiniAttendanceCalendar({ records }: { records: AttendanceRecord[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map ngày -> trạng thái
  const statusMap = useMemo(() => {
    const map: Record<number, string> = {};
    records.forEach((r) => {
      const d = new Date(r.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        map[d.getDate()] = r.status;
      }
    });
    return map;
  }, [records, year, month]);

  const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getColor = (day: number) => {
    if (day === today.getDate()) return 'ring-2 ring-brand-500 bg-brand-50 text-brand-600 font-bold';
    const s = statusMap[day];
    if (!s) return 'text-text-muted';
    if (s === 'Present') return 'bg-green-100 text-green-700 font-semibold';
    if (s === 'Late') return 'bg-red-100 text-red-600 font-semibold';
    if (s === 'Leave') return 'bg-yellow-100 text-yellow-700 font-semibold';
    return 'text-text-muted';
  };

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((l) => (
          <div key={l} className="text-center text-xs text-text-muted font-medium py-1">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`text-center text-xs rounded-md py-1 ${day ? getColor(day) : ''}`}
          >
            {day ?? ''}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-text-muted flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block"></span>Đúng giờ</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span>Đi trễ</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block"></span>Nghỉ phép</span>
      </div>
    </div>
  );
}
