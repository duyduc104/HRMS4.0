import { useState, useEffect } from 'react';
import { Building, Clock, Globe, Rocket } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { toast } from '../../stores/useToastStore';
import api from '../../services/api';
import { DepartmentTab } from './DepartmentTab';
import { MenuManagementTab } from './MenuManagementTab';
import { useSettingsStore } from '../../stores/useSettingsStore';

export function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    OFFICE_LAT: '21.01595',
    OFFICE_LNG: '105.85526',
    ALLOWED_RADIUS: '1000',
    ENABLE_POLICIES: 'true',
    ENABLE_ONBOARDING: 'false',
    ENABLE_CHAT: 'true',
    ENABLE_EVENTS: 'true',
    ENABLE_EMPLOYEES: 'true',
    ENABLE_ATTENDANCE: 'true',
    ENABLE_LEAVE: 'true',
    ENABLE_PAYROLL: 'true'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data) {
          setSettingsForm(prev => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await api.post('/settings', settingsForm);
      toast.success('Cập nhật cài đặt hệ thống thành công');
      useSettingsStore.getState().fetchSettings();
    } catch (err) {
      toast.error('Có lỗi xảy ra khi lưu cài đặt');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    {
      id: 'general',
      label: 'Thông tin Công ty',
      content: (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5" /> Thông tin doanh nghiệp</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tên công ty" defaultValue="HRMS Vibe Corp" />
              <Input label="Mã số thuế" defaultValue="0101234567" />
              <div className="col-span-2">
                <Input label="Địa chỉ trụ sở chính" defaultValue="Tòa nhà Vibe Tower, Quận 1, TP.HCM" />
              </div>
              <Input label="Số điện thoại liên hệ" defaultValue="1900 1234" />
              <Input label="Email hỗ trợ" defaultValue="support@hrmsvibe.com" />
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} isLoading={isLoading}>Lưu thông tin</Button>
            </div>
          </CardBody>
        </Card>
      )
    },
    {
      id: 'attendance',
      label: 'Quy định Chấm công',
      content: (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Ca làm việc & Chấm công</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input type="time" label="Giờ bắt đầu làm việc" defaultValue="08:30" />
              <Input type="time" label="Giờ kết thúc làm việc" defaultValue="17:30" />
              <Input type="number" label="Thời gian du di đi trễ (phút)" defaultValue="15" />
              <Input 
                type="number" 
                label="Bán kính chấm công GPS (mét)" 
                value={settingsForm.ALLOWED_RADIUS}
                onChange={(e) => setSettingsForm({ ...settingsForm, ALLOWED_RADIUS: e.target.value })}
              />
              <Input 
                label="Vĩ độ (Latitude) Công ty" 
                value={settingsForm.OFFICE_LAT}
                onChange={(e) => setSettingsForm({ ...settingsForm, OFFICE_LAT: e.target.value })}
              />
              <Input 
                label="Kinh độ (Longitude) Công ty" 
                value={settingsForm.OFFICE_LNG}
                onChange={(e) => setSettingsForm({ ...settingsForm, OFFICE_LNG: e.target.value })}
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} isLoading={isLoading}>Cập nhật quy định</Button>
            </div>
          </CardBody>
        </Card>
      )
    },
    {
      id: 'localization',
      label: 'Khu vực & Ngôn ngữ',
      content: (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" /> Cài đặt hiển thị</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Múi giờ</label>
                <select className="w-full bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50">
                  <option>Asia/Ho_Chi_Minh (GMT+7)</option>
                  <option>Asia/Tokyo (GMT+9)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Định dạng ngày</label>
                <select className="w-full bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} isLoading={isLoading}>Lưu cài đặt</Button>
            </div>
          </CardBody>
        </Card>
      )
    },
    {
      id: 'departments',
      label: 'Phòng ban',
      content: <DepartmentTab />
    },
    {
      id: 'menus',
      label: 'Quản lý Menu Sidebar',
      content: <MenuManagementTab />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-h2 font-bold mb-1">Cài đặt hệ thống</h1>
          <p className="text-text-sec">Cấu hình thông số toàn cầu cho tổ chức.</p>
        </div>
      </div>
      
      <Tabs tabs={tabs} />
    </div>
  );
}
