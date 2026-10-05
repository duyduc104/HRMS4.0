// content.js - Chạy ngầm trên web HRMS (http://localhost:5173) để đồng bộ trạng thái đăng nhập

// Tiêm thẻ meta để báo cho Frontend biết Extension đang hoạt động
const meta = document.createElement('meta');
meta.name = 'hrms-extension-active';
meta.content = 'true';
document.head.appendChild(meta);

// Lắng nghe sự kiện login/logout từ code React (qua window.postMessage)
window.addEventListener('message', (event) => {
  // Chỉ nhận thông báo từ cùng 1 trang (bảo mật)
  if (event.source !== window) return;

  if (event.data.type === 'HRMS_SYNC_LOGIN') {
    chrome.runtime.sendMessage({
      type: 'LOGIN',
      token: event.data.token,
      employeeId: event.data.employeeId
    }, () => {
      console.log('[HRMS Extension] Đã đồng bộ đăng nhập từ Web');
    });
  } else if (event.data.type === 'HRMS_SYNC_LOGOUT') {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
      console.log('[HRMS Extension] Đã đồng bộ đăng xuất từ Web');
    });
  }
});

// Khi trang web vừa tải xong, tự động lấy token từ LocalStorage để đưa vào Extension
try {
  const authDataStr = localStorage.getItem('hrms-auth-storage');
  if (authDataStr) {
    const authData = JSON.parse(authDataStr);
    if (authData && authData.state && authData.state.token && authData.state.user) {
      chrome.runtime.sendMessage({
        type: 'LOGIN',
        token: authData.state.token,
        employeeId: authData.state.user.id
      }, () => {
        console.log('[HRMS Extension] Đã tự động khôi phục phiên làm việc từ LocalStorage');
      });
    } else {
      chrome.runtime.sendMessage({ type: 'LOGOUT' });
    }
  }
} catch (e) {
  console.error("[HRMS Extension] Lỗi đồng bộ token:", e);
}
