import api from "./api";

// Service giao tiep API cham cong sinh trac hoc va dinh vi Geofencing
// Giai thich code khong thuan:
// - Quy trinh cham cong 2 buoc (2-step Attendance Verification):
//   + Buoc 1 (verifyFace): Nhan dien khuon mat tren trinh duyet va gui vector 128 chieu de lay verifyToken tam thoi (han 2 phut).
//   + Buoc 2 (checkIn/checkOut): Su dung verifyToken kem toa do GPS (latitude, longitude) va anh snapshot de may chu kiem tra ban kinh dia ly (Geofencing <= 500m).

export const attendanceServices = {
    // Ham nay dung de gui vector khuon mat 128 chieu len may chu de xac minh danh tinh va nhan verifyToken (Buoc 1)
    verifyFace: async (faceVector: number[]) => {
        const response = await api.post('/attendance/verify-face', { faceVector });
        return response.data;
    },

    // Ham nay dung de check-in cham cong vao ca bang verifyToken kem toa do GPS va anh chup (Buoc 2)
    checkIn: async (verifyToken: string, image: string, latitude?: number, longitude?: number) => {
        const response = await api.post('/attendance/check-in', { verifyToken, image, latitude, longitude });
        return response.data;
    },

    // Ham nay dung de check-out cham cong ra ca bang verifyToken kem toa do GPS va anh chup (Buoc 2)
    checkOut: async (verifyToken: string, image: string, latitude?: number, longitude?: number) => {
        const response = await api.post('/attendance/check-out', { verifyToken, image, latitude, longitude });
        return response.data;
    },

    // Ham nay dung de lay trang thai cham cong ngay hom nay cua ban than (gio vao, gio ra, so phut di tre)
    getToday: async () => {
        const response = await api.get('/attendance/today');
        return response.data;
    },

    // Ham nay dung de lay lich su cham cong cua toan bo nhan vien trong mot ngay (danh cho Admin)
    getHistory: async (date?: string) => {
        const response = await api.get('/attendance/history', { params: { date } });
        return response.data;
    },

    // Ham nay dung de lay chi tiet lich su cham cong theo thang/nam cua mot nhan vien cu the (danh cho Admin)
    getEmployeeHistory: async (employeeId: string | undefined, year: number, month: number, days?: string) => {
        const response = await api.get('/attendance/employee-history', { 
            params: { employeeId, year, month, days } 
        });
        return response.data;
    }
};
