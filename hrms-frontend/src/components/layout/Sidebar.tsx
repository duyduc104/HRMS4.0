import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { 
  LayoutDashboard, 
  Users, 
  CalendarClock, 
  Target, 
  Wallet, 
  Settings,
  Shield,
  MessageSquare,
  Rocket,
  FileText,
  X,
  CalendarDays,
  BookOpen,
  HelpCircle,
  Bot
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useMenuStore } from '../../stores/useMenuStore';
import { useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Icon Map để chuyển từ Tên chuỗi (string) trong DB sang Icon Component Lucide
const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  Users,
  CalendarClock,
  Target,
  Wallet,
  Settings,
  Shield,
  MessageSquare,
  Rocket,
  FileText,
  CalendarDays,
  BookOpen,
  Bot
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { menuGroups, fetchMenus } = useMenuStore();

  useEffect(() => {
    fetchSettings();
    fetchMenus();
  }, [fetchSettings, fetchMenus]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={clsx(
        'fixed left-0 top-0 h-full bg-surface border-r border-border z-50 transition-all duration-300 flex flex-col',
        'w-64',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-text-primary text-sm">HRMS</span>
              <span className="block text-[10px] text-text-muted font-medium">
                {settings.APP_NAME || 'Human Resource'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-surface-alt text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {menuGroups.map(group => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const IconComp = ICON_MAP[item.icon] || HelpCircle;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={onClose}
                      className={({ isActive }) => clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                        isActive 
                          ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 font-semibold' 
                          : 'text-text-sec hover:bg-surface-alt hover:text-text-primary'
                      )}
                    >
                      <IconComp className="w-4 h-4 shrink-0" />
                      {item.title}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-border shrink-0">
          <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-alt transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
              {(user?.fullName || user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">
                {user?.fullName || user?.name || user?.email}
              </p>
              <p className="text-[10px] text-text-muted capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
