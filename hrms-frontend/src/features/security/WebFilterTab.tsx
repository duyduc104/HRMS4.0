import { useState, useEffect } from 'react';
import { GlobeLock, Activity, ShieldAlert, CheckCircle, Wifi, WifiOff, MonitorX } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../../stores/useAuthStore';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { Table, type ColumnDef } from '../../components/ui/Table/Table';
import { Input } from '../../components/ui/Input/Input';
import { Modal } from '../../components/ui/Modal/Modal';
import { toast } from '../../stores/useToastStore';
import api from '../../services/api';

export function WebFilterTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [extensionStatuses, setExtensionStatuses] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalBlocked: 0, totalAllowed: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRule, setNewRule] = useState<any>({ 
    id: null, urlPattern: '', type: 'blacklist', description: '', exemptedEmployeeIds: [] 
  });
  
  // States for filtering logs
  const [logFilterDate, setLogFilterDate] = useState<string>('');
  const [logFilterUser, setLogFilterUser] = useState<string>('');
  const [logAllUrls, setLogAllUrls] = useState<boolean>(true);

  const { token } = useAuthStore();
  const backendUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

  useEffect(() => {
    if (!token) return;
    
    const socket = io(backendUrl, {
      auth: { token }
    });

    socket.on('new_access_log', (newLog: any) => {
      setLogs(prev => [newLog, ...prev].slice(0, 1000));
      setStats(prev => ({
        ...prev,
        totalBlocked: newLog.action === 'blocked' ? prev.totalBlocked + 1 : prev.totalBlocked,
        totalAllowed: newLog.action === 'allowed' ? prev.totalAllowed + 1 : prev.totalAllowed
      }));

      if (newLog.action === 'blocked') {
        toast.error('Cảnh báo', `Nhân viên ${newLog.Employee?.fullName || 'Unknown'} vừa cố truy cập trang bị cấm!`);
      }
    });

    socket.on('extension_status_update', (data: any) => {
      setExtensionStatuses(prev => {
        const index = prev.findIndex(e => e.id === data.employeeId);
        if (index === -1) return prev;
        
        const newStatuses = [...prev];
        newStatuses[index] = {
          ...newStatuses[index],
          extensionStatus: data.status,
          lastPing: data.lastPing,
          browser: data.browser || newStatuses[index].browser,
          os: data.os || newStatuses[index].os,
          extensionVersion: data.extensionVersion || newStatuses[index].extensionVersion
        };
        
        const order: Record<string, number> = { offline: 0, not_installed: 1, active: 2 };
        return newStatuses.sort((a, b) => order[a.extensionStatus] - order[b.extensionStatus]);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token, backendUrl]);

  useEffect(() => {
    fetchRules();
    fetchLogs();
    fetchEmployees();
    fetchExtensionStatus();
    fetchLogSettings();

    // Auto-refresh extension status mỗi 30 giây
    const interval = setInterval(fetchExtensionStatus, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchRules = async () => {
    try {
      const res = await api.get('/web-filters/rules');
      setRules(res.data);
    } catch (error) {
      console.error('Failed to fetch rules', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/web-filters/logs');
      setLogs(res.data.logs);
      setStats(res.data.stats);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data.data || res.data);
    } catch (error) {
      console.error('Failed to fetch employees', error);
    }
  };

  const fetchExtensionStatus = async () => {
    try {
      const res = await api.get('/web-filters/extension-status');
      setExtensionStatuses(res.data);
    } catch (error) {
      console.error('Failed to fetch extension status', error);
    }
  };

  const fetchLogSettings = async () => {
    try {
      const res = await api.get('/web-filters/log-settings');
      setLogAllUrls(res.data.logAllUrls);
    } catch (error) {
      console.error('Failed to fetch log settings', error);
    }
  };

  const toggleLogSettings = async () => {
    const newValue = !logAllUrls;
    setLogAllUrls(newValue);
    try {
      await api.post('/web-filters/log-settings', { logAllUrls: newValue });
      toast.success('Đã cập nhật chế độ ghi log');
    } catch (error) {
      toast.error('Lỗi khi cập nhật cấu hình');
      setLogAllUrls(!newValue);
    }
  };

  const toggleEmployeeRequirement = async (employeeId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
      setExtensionStatuses(prev => prev.map(e => e.id === employeeId ? { ...e, isRequired: newStatus } : e));
      await api.post(`/web-filters/extension-status/${employeeId}/toggle`, { isRequired: newStatus });
      toast.success(newStatus ? 'Đã BẬT yêu cầu cài Extension cho nhân viên' : 'Đã TẮT yêu cầu cài Extension cho nhân viên');
    } catch (error) {
      toast.error('Lỗi khi lưu cấu hình');
      setExtensionStatuses(prev => prev.map(e => e.id === employeeId ? { ...e, isRequired: currentStatus } : e));
    }
  };

  const handleCheckboxChange = (empId: string) => {
    setNewRule((prev: any) => {
      const isChecked = prev.exemptedEmployeeIds.includes(empId);
      return {
        ...prev,
        exemptedEmployeeIds: isChecked 
          ? prev.exemptedEmployeeIds.filter((id: string) => id !== empId) 
          : [...prev.exemptedEmployeeIds, empId]
      };
    });
  };

  const handleSaveRule = async () => {
    if (!newRule.urlPattern) {
      toast.error('Lỗi', 'Vui lòng nhập URL Pattern');
      return;
    }
    try {
      if (newRule.id) {
        await api.put(`/web-filters/rules/${newRule.id}`, newRule);
        toast.success('Thành công', 'Đã cập nhật luật');
      } else {
        await api.post('/web-filters/rules', newRule);
        toast.success('Thành công', 'Đã thêm luật bộ lọc mới');
      }
      setIsModalOpen(false);
      fetchRules();
    } catch (error) {
      console.error('Failed to save rule', error);
      toast.error('Thất bại', 'Không thể lưu luật mới');
    }
  };

  const deleteRule = async (id: number) => {
    try {
      await api.delete(`/web-filters/rules/${id}`);
      toast.success('Thành công', 'Đã xóa luật');
      fetchRules();
    } catch (error) {
      toast.error('Thất bại', 'Không thể xóa luật');
    }
  };

  const handleSendWarning = async (log: any) => {
    try {
      if (!log.employeeId && !log.Employee?.id) {
        toast.error('Lỗi', 'Không xác định được ID nhân viên để cảnh báo');
        return;
      }
      
      await api.post('/web-filters/logs/warning', {
        employeeId: log.employeeId || log.Employee?.id,
        message: `Bạn đang bị ghi nhận vi phạm bảo mật lúc ${new Date(log.timestamp).toLocaleTimeString()}: Cố tình truy cập ${log.url}. Vui lòng tuân thủ quy định!`
      });
      toast.success('Đã gửi cảnh báo', `Đã bắn thông báo cho ${log.Employee?.fullName}`);
    } catch (error) {
      toast.error('Lỗi', 'Không thể gửi cảnh báo');
    }
  };

  const ruleColumns: ColumnDef<any>[] = [
    { accessor: 'urlPattern', label: 'URL Pattern', render: (item) => <code className="text-sm bg-surface-alt px-1 py-0.5 rounded">{item.urlPattern}</code> },
    { accessor: 'exemptions', label: 'Ngoại lệ (Được phép truy cập)', render: (item) => (
       <div className="flex flex-wrap gap-1 max-w-[250px]">
         {item.exemptedEmployees?.map((emp: any) => (
           <Badge key={emp.id} variant="info">{emp.fullName}</Badge>
         ))}
         {(!item.exemptedEmployees || item.exemptedEmployees.length === 0) && (
           <span className="text-xs font-semibold text-red-500">Chặn tất cả nhân viên</span>
         )}
       </div>
    )},
    { accessor: 'description', label: 'Mô tả', render: (item) => <span className="text-sm text-text-sec">{item.description}</span> },
    { accessor: 'actions', label: 'Thao tác', render: (item) => (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { 
          setNewRule({ 
            id: item.id, urlPattern: item.urlPattern, 
            type: item.type, description: item.description, 
            exemptedEmployeeIds: (item.exemptedEmployees || []).map((e: any) => e.id) 
          }); 
          setIsModalOpen(true); 
        }}>Sửa</Button>
        <Button variant="danger" size="sm" onClick={() => deleteRule(item.id)}>Xóa</Button>
      </div>
    )},
  ];

  const logColumns: ColumnDef<any>[] = [
    { accessor: 'timestamp', label: 'Thời gian', render: (item) => <span className="text-sm text-text-sec">{new Date(item.timestamp).toLocaleString()}</span> },
    { accessor: 'employee', label: 'Nhân viên', render: (item) => <span className="font-medium">{item.Employee?.fullName || 'Unknown'}</span> },
    { accessor: 'url', label: 'URL', render: (item) => (
      <a 
        href={item.url.startsWith('http') ? item.url : `http://${item.url}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-brand-500 hover:text-brand-600 hover:underline font-mono text-xs truncate max-w-[200px] block" 
        title={item.url}
      >
        {item.url}
      </a>
    )},
    { accessor: 'system', label: 'Thiết bị & Trình duyệt', render: (item) => <span className="text-xs text-text-sec">{item.os || 'N/A'} - {item.browser || 'N/A'} <br/>IP: {item.ipAddress || 'N/A'}</span> },
    { accessor: 'action', label: 'Kết quả', render: (item) => (
      <div className="flex items-center gap-2">
        <Badge variant={item.action === 'blocked' ? 'danger' : 'active'}>{item.action === 'blocked' ? 'Bị chặn' : 'Hợp lệ'}</Badge>
        {item.action === 'blocked' && (
          <Button variant="ghost" size="sm" onClick={() => handleSendWarning(item)} className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 text-xs">
            Cảnh báo
          </Button>
        )}
      </div>
    )},
  ];

  // Extension status helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="active"><Wifi className="w-3 h-3 mr-1 inline" />Đang hoạt động</Badge>;
      case 'offline': return <Badge variant="danger"><WifiOff className="w-3 h-3 mr-1 inline" />Đã ngắt / Gỡ Extension</Badge>;
      default: return <Badge variant="pending"><MonitorX className="w-3 h-3 mr-1 inline" />Chưa cài</Badge>;
    }
  };

  const extensionColumns: ColumnDef<any>[] = [
    { accessor: 'fullName', label: 'Nhân viên', render: (item) => <span className="font-medium">{item.fullName}</span> },
    { accessor: 'username', label: 'Username', render: (item) => <span className="text-sm text-text-sec">{item.username}</span> },
    { accessor: 'extensionStatus', label: 'Trạng thái Extension', render: (item) => getStatusBadge(item.extensionStatus) },
    { accessor: 'os', label: 'Hệ điều hành', render: (item) => <span className="text-sm">{item.os || '—'}</span> },
    { accessor: 'browser', label: 'Trình duyệt', render: (item) => <span className="text-sm">{item.browser || '—'}</span> },
    { accessor: 'lastPing', label: 'Lần ping cuối', render: (item) => <span className="text-xs text-text-muted">{item.lastPing ? new Date(item.lastPing).toLocaleString() : 'Chưa từng'}</span> },
    { accessor: 'isRequired', label: 'Bắt buộc cài', render: (item) => (
      <div className="flex justify-center">
        <label className="cursor-pointer">
          <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${item.isRequired ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${item.isRequired ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <input type="checkbox" className="hidden" checked={item.isRequired} onChange={() => toggleEmployeeRequirement(item.id, item.isRequired)} />
        </label>
      </div>
    )},
  ];

  const offlineCount = extensionStatuses.filter(e => e.extensionStatus === 'offline').length;
  const notInstalledCount = extensionStatuses.filter(e => e.extensionStatus === 'not_installed').length;

  const filteredLogs = logs.filter(log => {
    let matchDate = true;
    let matchUser = true;

    if (logFilterDate) {
      try {
        // Adjust timestamp to local date string yyyy-mm-dd
        const dateObj = new Date(log.timestamp);
        // format as YYYY-MM-DD in local time
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const logDate = `${year}-${month}-${day}`;
        
        if (logDate !== logFilterDate) matchDate = false;
      } catch (e) {
        matchDate = false;
      }
    }

    if (logFilterUser) {
      const search = logFilterUser.toLowerCase();
      const empName = log.Employee?.fullName?.toLowerCase() || '';
      const empEmail = log.Employee?.email?.toLowerCase() || '';
      if (!empName.includes(search) && !empEmail.includes(search)) {
        matchUser = false;
      }
    }

    return matchDate && matchUser;
  });

  const subTabs = [
    {
      id: 'stats',
      label: 'Thống kê',
      content: (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-red-50 border-red-200">
              <CardBody>
                <div className="flex gap-2 text-red-600 font-bold items-center text-sm"><ShieldAlert className="w-4 h-4"/> Lượt BỊ CHẶN</div>
                <p className="text-2xl mt-1 text-red-700 font-bold">{stats.totalBlocked}</p>
              </CardBody>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardBody>
                <div className="flex gap-2 text-green-600 font-bold items-center text-sm"><CheckCircle className="w-4 h-4"/> Lượt HỢP LỆ</div>
                <p className="text-2xl mt-1 text-green-700 font-bold">{stats.totalAllowed}</p>
              </CardBody>
            </Card>
            {offlineCount > 0 && (
              <Card className="bg-orange-50 border-orange-300 animate-pulse">
                <CardBody>
                  <div className="flex gap-2 text-orange-600 font-bold items-center text-sm"><WifiOff className="w-4 h-4"/> Extension Offline</div>
                  <p className="text-2xl mt-1 text-orange-700 font-bold">{offlineCount} nhân viên</p>
                </CardBody>
              </Card>
            )}
            {notInstalledCount > 0 && (
              <Card className="bg-yellow-50 border-yellow-300">
                <CardBody>
                  <div className="flex gap-2 text-yellow-600 font-bold items-center text-sm"><MonitorX className="w-4 h-4"/> Chưa cài</div>
                  <p className="text-2xl mt-1 text-yellow-700 font-bold">{notInstalledCount} nhân viên</p>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'rules',
      label: 'Quy tắc Blacklist',
      content: (
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <GlobeLock className="w-5 h-5 text-brand-500" />
              <CardTitle>Quy tắc Blacklist</CardTitle>
            </div>
            <Button size="sm" onClick={() => {
              setNewRule({ id: null, urlPattern: '', type: 'blacklist', description: '', exemptedEmployeeIds: [] });
              setIsModalOpen(true);
            }}>+ Thêm Luật</Button>
          </CardHeader>
          <div className="p-0">
            <Table columns={ruleColumns} data={rules} pagination pageSize={5} />
          </div>
        </Card>
      )
    },
    {
      id: 'extension',
      label: 'Trạng thái Extension',
      content: (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Wifi className="w-5 h-5 text-brand-500" />
                <CardTitle>Trạng thái Extension nhân viên</CardTitle>
              </div>
            </div>
          </CardHeader>
          <div className="p-0">
            <Table columns={extensionColumns} data={extensionStatuses} pagination pageSize={10} />
          </div>
        </Card>
      )
    },
    {
      id: 'logs',
      label: 'Nhật ký truy cập',
      content: (
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-brand-500" />
              <div>
                <CardTitle>Nhật ký truy cập (Access Logs)</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <label className="text-xs text-text-sec">Chế độ ghi log:</label>
                  <label className="cursor-pointer flex items-center gap-2">
                    <div className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors ${logAllUrls ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                      <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transform transition-transform ${logAllUrls ? 'translate-x-3.5' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-xs font-medium text-text-primary">
                      {logAllUrls ? 'Ghi toàn bộ URL' : 'Chỉ ghi URL bị chặn'}
                    </span>
                    <input type="checkbox" className="hidden" checked={logAllUrls} onChange={toggleLogSettings} />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input 
                type="date"
                className="h-9 px-3 border border-border bg-surface rounded-md text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                value={logFilterDate}
                onChange={(e) => setLogFilterDate(e.target.value)}
                title="Lọc theo ngày"
              />
              <input 
                type="text"
                placeholder="Tìm nhân viên..."
                className="h-9 px-3 border border-border bg-surface rounded-md text-sm focus:ring-2 focus:ring-brand-500 outline-none min-w-[200px]"
                value={logFilterUser}
                onChange={(e) => setLogFilterUser(e.target.value)}
              />
              {(logFilterDate || logFilterUser) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setLogFilterDate(''); setLogFilterUser(''); }}
                >
                  Xóa lọc
                </Button>
              )}
            </div>
          </CardHeader>
          <div className="p-0">
            <Table columns={logColumns} data={filteredLogs} pagination pageSize={15} />
          </div>
        </Card>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Tabs tabs={subTabs} defaultTab="stats" />

      {/* Modal thêm/sửa Rule */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={newRule.id ? "Sửa Luật Lọc Web" : "Thêm Luật Lọc Web mới"}>
        <div className="space-y-4">
          <Input 
            label="URL Pattern (*facebook.com*)" 
            placeholder="Ví dụ: *facebook.com*" 
            value={newRule.urlPattern} 
            onChange={e => setNewRule({...newRule, urlPattern: e.target.value})} 
          />
          <Input 
            label="Mô tả" 
            placeholder="Nguyên nhân chặn..." 
            value={newRule.description} 
            onChange={e => setNewRule({...newRule, description: e.target.value})} 
          />
          
          <div className="border border-border p-3 rounded-md bg-surface-alt">
            <label className="font-semibold text-sm mb-2 block text-text-primary">Ngoại lệ (Chọn nhân viên ĐƯỢC PHÉP truy cập)</label>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {employees.length === 0 && <span className="text-xs text-text-muted">Không tìm thấy nhân viên...</span>}
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-2 cursor-pointer text-sm text-text-primary hover:bg-surface p-1.5 rounded transition-colors">
                  <input 
                    type="checkbox" 
                    className="rounded border-border text-brand-500 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                    checked={newRule.exemptedEmployeeIds.includes(emp.id)}
                    onChange={() => handleCheckboxChange(emp.id)}
                  />
                  {emp.fullName}
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveRule}>Lưu Luật</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
