const API_BASE = 'http://localhost:5000/api';

const loginForm = document.getElementById('login-form');
const loggedInView = document.getElementById('logged-in');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const errorMsg = document.getElementById('error-msg');
const infoText = document.getElementById('info-text');
const logoutMsg = document.getElementById('logout-msg');

// Check current status on popup open
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
  if (res && res.isLoggedIn) {
    showLoggedIn(res);
  } else {
    showLoginForm();
  }
});

function showLoginForm() {
  loginForm.style.display = 'block';
  loggedInView.style.display = 'none';
}

function showLoggedIn(statusData) {
  loginForm.style.display = 'none';
  loggedInView.style.display = 'block';
  infoText.textContent = `Đang giám sát ${statusData.rulesCount} quy tắc chặn.`;
  if (logoutMsg) logoutMsg.textContent = '';
}

// LOGIN
btnLogin.addEventListener('click', async () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  errorMsg.textContent = '';

  if (!username || !password) {
    errorMsg.textContent = 'Vui lòng nhập đầy đủ username và mật khẩu.';
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = 'Đang đăng nhập...';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      errorMsg.textContent = data.message || 'Đăng nhập thất bại.';
      btnLogin.disabled = false;
      btnLogin.textContent = 'Đăng nhập';
      return;
    }

    // API trả về { token, user: { id, username, ... } }
    chrome.runtime.sendMessage({
      type: 'LOGIN',
      token: data.token,
      employeeId: data.user.id
    }, (response) => {
      if (response && response.success) {
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (status) => {
          showLoggedIn(status);
        });
      }
    });

  } catch (err) {
    errorMsg.textContent = 'Không thể kết nối đến server HRMS.';
    btnLogin.disabled = false;
    btnLogin.textContent = 'Đăng nhập';
  }
});

// LOGOUT - Kiểm tra đã checkout chưa trước khi cho phép đăng xuất
btnLogout.addEventListener('click', async () => {
  if (logoutMsg) logoutMsg.textContent = '';
  btnLogout.disabled = true;
  btnLogout.textContent = 'Đang kiểm tra...';

  try {
    // Lấy token hiện tại từ storage
    const storage = await chrome.storage.local.get(['employeeToken']);
    const token = storage.employeeToken;

    if (!token) {
      // Không có token → cho phép logout
      doLogout();
      return;
    }

    // Hỏi server: nhân viên này đã checkout chưa?
    const res = await fetch(`${API_BASE}/attendance/check-status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (data.canLogout) {
      doLogout();
    } else {
      // CHƯA CHECKOUT → Không cho đăng xuất
      if (logoutMsg) {
        logoutMsg.textContent = data.reason || 'Bạn cần check-out trước khi đăng xuất!';
      }
      btnLogout.disabled = false;
      btnLogout.textContent = 'Đăng xuất';
    }
  } catch (err) {
    // Nếu server không phản hồi, vẫn hiện cảnh báo
    if (logoutMsg) {
      logoutMsg.textContent = 'Không thể kiểm tra trạng thái. Vui lòng thử lại!';
    }
    btnLogout.disabled = false;
    btnLogout.textContent = 'Đăng xuất';
  }
});

function doLogout() {
  chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
    showLoginForm();
    btnLogout.disabled = false;
    btnLogout.textContent = 'Đăng xuất';
  });
}
