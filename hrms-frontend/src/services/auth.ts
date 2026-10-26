import api from "./api";
import { isExtensionActive } from "../utils/checkExtension";

// Service giao tiep API xac thuc nguoi dung va dang nhap bang khuon mat
// Giai thich code khong thuan:
// - Gui kem trang thai isExtensionActive() de may chu xac nhan trinh duyet da cai dat Chrome Extension an toan mang HRMS Web Filter.
// - loginFace gui vector 128 chieu (va anh base64) len may chu de doi soat sinh trac hoc.

export const authServices = {
    // Ham nay dung de gui thong tin dang nhap truyen thong bang username va password kem trang thai Extension
    login: async (username: string, password: string) => {
        const response = await api.post('/auth/login', { username, password, extensionActive: isExtensionActive() });
        return response.data;
    },
    // Ham nay dung de dang nhap bang sinh trac hoc khuon mat (faceVector 128 phan tu va anh chup)
    loginFace: async (username: string, faceVector: any, image?: string) => {
        const response = await api.post('/auth/login-face', { username, faceVector, image, extensionActive: isExtensionActive() });
        return response.data;
    },
    // Ham nay dung de dang ky tai khoan nhan vien moi kem ma nhan vien va vector khuon mat
    register: async (data: any) => {
        // data bao gom: username, password, email, code, fullName, faceVector
        const response = await api.post('/auth/register', data);
        return response.data;
    },
    // Ham nay dung de dang xuat phien lam viec khoi may chu
    logout: async () => {
        const response = await api.post('/auth/logout');
        return response.data;
    }
};