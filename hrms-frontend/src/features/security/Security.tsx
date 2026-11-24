import { useState } from 'react';
import { Shield, Key, GlobeLock, Activity } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { Table, type ColumnDef } from '../../components/ui/Table/Table';
import { WebFilterTab } from './WebFilterTab';
import { RbactTab } from './RbactTab';
import { SecurityViolationTab } from './SecurityViolationTab';

export function Security() {
  const [activeTab] = useState('filter');

  const accessLogs = [
    { id: 1, time: '2026-06-25 08:30:12', user: 'Admin User', ip: '192.168.1.45', device: 'Chrome / Windows', action: 'Login', status: 'Success' },
    { id: 2, time: '2026-06-25 09:15:00', user: 'Nguyễn Văn A', ip: '14.162.3.4', device: 'Safari / MacOS', action: 'Download Payroll', status: 'Blocked (RBAC)' },
    { id: 3, time: '2026-06-25 10:05:44', user: 'Trần Thị B', ip: '113.190.2.1', device: 'Mobile App / iOS', action: 'Approve Leave', status: 'Success' },
  ];

  const logColumns: ColumnDef<any>[] = [
    { accessor: 'time', label: 'Thời gian', render: (item) => <span className="font-mono text-xs">{item.time}</span> },
    { accessor: 'user', label: 'Người dùng', render: (item) => <span className="font-medium">{item.user}</span> },
    { accessor: 'ip', label: 'IP', render: (item) => <span className="font-mono text-text-muted">{item.ip}</span> },
    { accessor: 'device', label: 'Thiết bị', render: (item) => <span className="text-text-sec">{item.device}</span> },
    { accessor: 'action', label: 'Hành động' },
    { accessor: 'status', label: 'Trạng thái', render: (item) => <Badge variant={item.status === 'Success' ? 'active' : 'danger'}>{item.status}</Badge> },
  ];

  const tabs = [
    {
      id: 'filter',
      label: 'Bảo mật Mạng (Web Filter)',
      content: <WebFilterTab />
    },
    {
      id: 'rbac',
      label: 'Phân quyền (RBAC)',
      content: <RbactTab />
    },
    {
      id: 'violations',
      label: 'Giải trình Vi phạm',
      content: <SecurityViolationTab />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-h2 font-bold mb-1">Bảo mật & Cấu hình</h1>
          <p className="text-text-sec">Quản lý phân quyền truy cập, theo dõi nhật ký hệ thống.</p>
        </div>
      </div>
      
      <Tabs tabs={tabs} defaultTab={activeTab} />
    </div>
  );
}
