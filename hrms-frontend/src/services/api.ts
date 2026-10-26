import axios from "axios";
import { useAuthStore } from "../stores/useAuthStore";
import { toast } from "../stores/useToastStore";

// Cau hinh Axios Instance trung tam va co che Request/Response Interceptors toan Frontend
// Giai thich code khong thuan:
// - Request Interceptor: Tu dong lay Bearer JWT Token truc tiep tu Zustand Store (useAuthStore.getState()) ma khong can thong qua React Hook.
// - Response Interceptor: Tu dong bat loi 403 va 401 de hien thi thong bao loi (Toast) va tu dong Force-Logout chuyen huong ve trang /login neu tai khoan bi khoa hoac het han phien.

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    },
})

// Interceptor can thiep truoc khi gui request: tu dong dinh kem JWT vao Header Authorization
api.interceptors.request.use(
    config => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// Interceptor can thiep sau khi nhan response: xu ly tap trung loi phan quyen 403 va het han phien 401
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response) {
            // Xu ly loi 403 Forbidden cho phan quyen RBAC hoac tai khoan bi xoa
            if (error.response.status === 403) {
                if (error.response.data?.isDeleted) {
                    toast.error('Tài khoản đã bị khóa', error.response.data?.message || 'Tài khoản của bạn đã bị xóa khỏi hệ thống.');
                    useAuthStore.getState().logout();
                    window.location.href = '/login';
                } else {
                    toast.error('Lỗi phân quyền', error.response.data?.message || 'Bạn không có quyền thực hiện chức năng này!');
                }
            }
            else if (error.response.status === 401) {
                useAuthStore.getState().logout();
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    toast.error('Lỗi xác thực', error.response.data?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                    window.location.href = '/login';
                }
            }
        } else {
            toast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.');
        }
        return Promise.reject(error);
    }
);

export default api;