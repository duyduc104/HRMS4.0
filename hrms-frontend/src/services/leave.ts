import api from './api';

// Service giao tiep API quan ly don xin nghi phep va don giai trinh cham cong di muon

export const leaveServices = {
  // Ham nay dung de lay danh sach cac don xin nghi phep cua chinh ban than dang dang nhap
  getMyLeaves: async () => {
    const response = await api.get('/leaves');
    return response.data;
  },
  // Ham nay dung de tao moi mot don xin nghi phep (loai phep, ngay bat dau, ngay ket thuc, ly do)
  createLeave: async (data: { leaveType: string; startDate: string; endDate: string; reason: string }) => {
    const response = await api.post('/leaves', data);
    return response.data;
  },
  // Ham nay dung de lay danh sach cac don xin nghi phep dang cho duyet (danh cho Manager/Admin)
  getPendingLeaves: async () => {
    const response = await api.get('/leaves/pending');
    return response.data;
  },
  // Ham nay dung de phe duyet don xin nghi phep va tu dong dong bo ngay nghi vao bang cham cong
  approveLeave: async (id: number) => {
    const response = await api.put(`/leaves/${id}/approve`);
    return response.data;
  },
  // Ham nay dung de tu choi don xin nghi phep
  rejectLeave: async (id: number) => {
    const response = await api.put(`/leaves/${id}/reject`);
    return response.data;
  },
  // Ham nay dung de nhan vien tu huy don xin nghi phep dang cho duyet
  cancelLeave: async (id: number) => {
    const response = await api.delete(`/leaves/${id}`);
    return response.data;
  },

  // Ham nay dung de lay danh sach cac don giai trinh cham cong (quen checkin/di muon) cua ban than
  getMyExplanations: async () => {
    const response = await api.get('/leaves/explanations');
    return response.data;
  },
  // Ham nay dung de tao don giai trinh cham cong cho mot ngay cu the (gioi han toi da 3 lan/thang)
  createExplanation: async (data: { date: string; type: string; reason: string }) => {
    const response = await api.post('/leaves/explanations', data);
    return response.data;
  },
  // Ham nay dung de lay danh sach cac don giai trinh dang cho duyet (danh cho Manager/Admin)
  getPendingExplanations: async () => {
    const response = await api.get('/leaves/explanations/pending');
    return response.data;
  },
  // Ham nay dung de phe duyet don giai trinh va tu dong sua gio checkin/checkout hop le
  approveExplanation: async (id: number, data?: { checkInTime?: string; checkOutTime?: string }) => {
    const response = await api.put(`/leaves/explanations/${id}/approve`, data);
    return response.data;
  },
  // Ham nay dung de tu choi don giai trinh cham cong
  rejectExplanation: async (id: number) => {
    const response = await api.put(`/leaves/explanations/${id}/reject`);
    return response.data;
  }
};
