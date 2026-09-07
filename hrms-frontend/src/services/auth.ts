import api from "./api";
import { isExtensionActive } from "../utils/checkExtension";

export const authServices = {
    login: async (username, password) => {
        const response = await api.post('/auth/login', { username, password, extensionActive: isExtensionActive() });
        return response.data;
    },
    loginFace: async (username, faceVector, image) => {
        const response = await api.post('/auth/login-face', { username, faceVector, image, extensionActive: isExtensionActive() });
        return response.data;
    },
    register: async (data) => {
        // data bao gồm: username, password, email, code, fullName, faceVector (tuỳ chọn)
        const response = await api.post('/auth/register', data);
        return response.data;
    },
    logout: async () => {
        const response = await api.post('/auth/logout');
        return response.data;
    }
}