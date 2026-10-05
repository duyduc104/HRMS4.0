// ============================================================
// HRMS Web Filter - Background Service Worker
// Chạy ngầm trên trình duyệt nhân viên, kiểm tra URL và gửi log
// ============================================================

const API_BASE = 'http://localhost:5000/api';
let blockedRules = [];
let employeeToken = '';
let employeeId = '';
let isLoggedIn = false;

// ---- SYNC RULES FROM BACKEND ----
async function syncRules() {
  if (!employeeToken) return;
  try {
    const res = await fetch(`${API_BASE}/web-filters/rules`, {
      headers: { 'Authorization': `Bearer ${employeeToken}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    blockedRules = data
      .filter(r => r.type === 'blacklist' && r.isActive)
      .map(r => ({
        id: r.id,
        // Convert wildcard pattern to regex: *facebook.com* -> .*facebook\.com.*
        regex: new RegExp(
          r.urlPattern
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape special chars INCLUDING *
            .replace(/\\\*/g, '.*'),                  // convert \* to .*
          'i'
        ),
        rawPattern: r.urlPattern,
        exemptedIds: (r.exemptedEmployees || []).map(e => e.id)
      }));

    console.log(`[HRMS Filter] Synced ${blockedRules.length} rules`);
  } catch (err) {
    console.error('[HRMS Filter] Failed to sync rules:', err);
  }
}

// ---- SEND LOG TO BACKEND ----
async function sendLog(url, action) {
  if (!employeeToken || !employeeId) return;
  try {
    // Parse user agent info
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';

    let os = 'Unknown';
    if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'MacOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    await fetch(`${API_BASE}/web-filters/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        employeeId: employeeId,
        url: url,
        action: action,
        device: 'Desktop',
        os: os,
        browser: browser,
        ipAddress: '' // IP sẽ được server ghi nhận từ req.ip
      })
    });
  } catch (err) {
    console.error('[HRMS Filter] Failed to send log:', err);
  }
}

// ---- CHECK URL AGAINST RULES ----
function checkUrl(url) {
  for (const rule of blockedRules) {
    if (rule.regex.test(url)) {
      // URL matches a blacklist rule
      // Check if this employee is exempted
      if (rule.exemptedIds.includes(employeeId)) {
        return { blocked: false, rule: rule };
      }
      return { blocked: true, rule: rule };
    }
  }
  return { blocked: false, rule: null };
}

// ---- LISTEN TO WEB NAVIGATION ----
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only check main frame (not iframes, images, etc.)
  if (details.frameId !== 0) return;
  if (!isLoggedIn) return;

  const url = details.url;

  // Skip internal URLs
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) return;

  const result = checkUrl(url);

  if (result.blocked) {
    // BLOCK: Redirect to warning page
    sendLog(url, 'blocked');

    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(url)}&rule=${encodeURIComponent(result.rule.rawPattern)}`)
    });
  } else {
    // ALLOW: Just log it
    sendLog(url, 'allowed');
  }
});

// ---- LOAD STORED CREDENTIALS ON STARTUP ----
chrome.storage.local.get(['employeeToken', 'employeeId'], (data) => {
  if (data.employeeToken && data.employeeId) {
    employeeToken = data.employeeToken;
    employeeId = data.employeeId;
    isLoggedIn = true;
    syncRules();
  }
});

// ---- LISTEN FOR LOGIN/LOGOUT FROM POPUP ----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LOGIN') {
    employeeToken = message.token;
    employeeId = message.employeeId;
    isLoggedIn = true;
    chrome.storage.local.set({ employeeToken: message.token, employeeId: message.employeeId });
    syncRules();
    sendHeartbeat(); // Gửi heartbeat ngay khi đăng nhập
    closeAllIncognitoTabs(); // Quét và đóng toàn bộ tab ẩn danh đang mở
    sendResponse({ success: true });
  } else if (message.type === 'LOGOUT') {
    employeeToken = '';
    employeeId = '';
    isLoggedIn = false;
    blockedRules = [];
    chrome.storage.local.remove(['employeeToken', 'employeeId']);
    sendResponse({ success: true });
  } else if (message.type === 'GET_STATUS') {
    sendResponse({ isLoggedIn, rulesCount: blockedRules.length, employeeId });
  }
  return true; // Keep channel open for async response
});

// ---- HEARTBEAT: Gửi tín hiệu "còn sống" mỗi 2 phút ----
async function sendHeartbeat() {
  if (!employeeToken || !isLoggedIn) return;
  try {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';

    let os = 'Unknown';
    if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'MacOS';
    else if (ua.includes('Linux')) os = 'Linux';

    await fetch(`${API_BASE}/web-filters/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employeeToken}`
      },
      body: JSON.stringify({ browser, os, extensionVersion: '1.0.0' })
    });
    console.log('[HRMS Filter] Heartbeat sent');
  } catch (err) {
    console.error('[HRMS Filter] Heartbeat failed:', err);
  }
}

// ---- CHECK LOCKED STATUS ----
async function checkIfLocked() {
  if (!employeeToken || !isLoggedIn) return;
  try {
    const res = await fetch(`${API_BASE}/web-filters/check-locked`, {
      headers: { 'Authorization': `Bearer ${employeeToken}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.locked) {
      console.log('[HRMS Filter] 🔒 Tài khoản bị khóa do vi phạm bảo mật!');
      // Auto-logout extension
      employeeToken = '';
      employeeId = '';
      isLoggedIn = false;
      blockedRules = [];
      chrome.storage.local.remove(['employeeToken', 'employeeId']);
    }
  } catch (err) {
    console.error('[HRMS Filter] Check locked error:', err);
  }
}

// ---- ALARMS: Thay thế setInterval bằng chrome.alarms (Bắt buộc cho Manifest V3) ----
chrome.alarms.create("syncRulesAlarm", { periodInMinutes: 5 });
chrome.alarms.create("heartbeatAlarm", { periodInMinutes: 2 }); // Gửi heartbeat mỗi 2 phút

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncRulesAlarm") {
    syncRules();
  } else if (alarm.name === "heartbeatAlarm") {
    sendHeartbeat();
    checkIfLocked();
  }
});

// ---- BLOCK INCOGNITO MODE ----
// Đóng tất cả cửa sổ ẩn danh đang mở
function closeAllIncognitoTabs() {
  chrome.storage.local.get(['employeeToken'], (data) => {
    if (!data.employeeToken) return;
    
    chrome.windows.getAll({ populate: false }, (windows) => {
      for (const win of windows) {
        if (win.incognito && win.id) {
          chrome.windows.remove(win.id);
          console.log('[HRMS Filter] Đã đóng 1 cửa sổ ẩn danh');
        }
      }
    });
  });
}

// Lắng nghe khi có tab mới được tạo, nếu là tab ẩn danh thì đóng ngay cả cửa sổ
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.incognito && tab.windowId) {
    chrome.storage.local.get(['employeeToken', 'employeeId'], (data) => {
      if (data.employeeToken && data.employeeId) {
        chrome.windows.remove(tab.windowId);
        console.log('[HRMS Filter] Vừa chặn mở cửa sổ ẩn danh mới');
        
        // Gửi log về backend báo cáo hành vi này
        fetch(`${API_BASE}/web-filters/logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.employeeToken}`
          },
          body: JSON.stringify({
            employeeId: data.employeeId,
            url: 'chrome://incognito (Cố tình mở Ẩn danh)',
            action: 'blocked',
            device: 'Desktop',
            os: navigator.userAgent.includes('Windows') ? 'Windows' : 'Other',
            browser: 'Chrome/Edge',
            ipAddress: ''
          })
        }).catch(err => console.error('[HRMS Filter] Failed to log incognito attempt:', err));
      }
    });
  }
});
