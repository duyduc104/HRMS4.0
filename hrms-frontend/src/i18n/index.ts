import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      common: {
        actions: { save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", export: "Export" },
        status: { active: "Active", inactive: "Inactive", pending: "Pending", approved: "Approved", rejected: "Rejected" },
        nav: { dashboard: "Dashboard", employees: "Employees", attendance: "Attendance" }
      },
      dashboard: {
        widgets: { totalEmployees: "Total Employees", activeToday: "Active Today" },
        aiInsight: { title: "AI Alert", riskAlert: "{{count}} employees at high risk of leaving" }
      }
    }
  },
  vi: {
    translation: {
      common: {
        actions: { save: "Lưu", cancel: "Hủy", delete: "Xóa", edit: "Sửa", export: "Xuất" },
        status: { active: "Đang làm", inactive: "Đã nghỉ", pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối" },
        nav: { dashboard: "Tổng quan", employees: "Nhân viên", attendance: "Chấm công" }
      },
      dashboard: {
        widgets: { totalEmployees: "Tổng nhân viên", activeToday: "Có mặt hôm nay" },
        aiInsight: { title: "Cảnh báo AI", riskAlert: "{{count}} nhân viên nguy cơ nghỉ việc cao" }
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
