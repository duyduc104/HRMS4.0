import axios from "axios";
import { useAuthStore } from "../stores/useAuthStore";
import { toast } from "../stores/useToastStore";

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    },
})

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

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response) {
            // Handle 403 Forbidden specifically for RBAC permissions or deleted account
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