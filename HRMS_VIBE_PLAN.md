# 🚀 HRMS 4.0 — Complete Vibe Coding Plan
> Stack: Node.js (NestJS) + ReactJS + PostgreSQL + Redis
> Language: EN/VI | Theme: Light/Dark | Fully component-driven

---

## 1. DESIGN SYSTEM (Design Token — Single Source of Truth)

### 1.1 Color Palette

```js
// tokens/colors.ts
export const colors = {
  // Brand — Indigo-to-Violet gradient (professional + modern)
  brand: {
    50:  '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // PRIMARY
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },

  // Accent — Amber (alerts, warnings, badges)
  accent: {
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
  },

  // Success / Error / Warning
  green:  { 400: '#4ade80', 500: '#22c55e', 700: '#15803d' },
  red:    { 400: '#f87171', 500: '#ef4444', 700: '#b91c1c' },
  yellow: { 400: '#facc15', 500: '#eab308', 700: '#a16207' },

  // Neutrals (Light mode)
  light: {
    bg:         '#f8f9fc',   // page background
    surface:    '#ffffff',   // card / sidebar
    surfaceAlt: '#f1f3f9',   // hover, striped row
    border:     '#e2e8f0',
    textPrimary:'#0f172a',
    textSec:    '#475569',
    textMuted:  '#94a3b8',
  },

  // Neutrals (Dark mode)
  dark: {
    bg:         '#0d1117',
    surface:    '#161b22',
    surfaceAlt: '#1c2333',
    border:     '#30363d',
    textPrimary:'#e6edf3',
    textSec:    '#8b949e',
    textMuted:  '#484f58',
  },
}
```

### 1.2 Typography

```js
// tokens/typography.ts
// Font import (add to index.html or global CSS)
// @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');

export const fonts = {
  sans:  '"Be Vietnam Pro", "Inter", system-ui, sans-serif', // UI chính
  mono:  '"JetBrains Mono", "Fira Code", monospace',        // Code, ID, timestamps
}

export const typeScale = {
  // [fontSize, lineHeight, fontWeight]
  display:  ['2.25rem', '2.75rem', '700'],  // Hero titles
  h1:       ['1.875rem','2.25rem', '700'],
  h2:       ['1.5rem',  '2rem',   '600'],
  h3:       ['1.25rem', '1.75rem','600'],
  h4:       ['1.125rem','1.5rem', '600'],
  body:     ['0.9375rem','1.5rem','400'],   // 15px — main body
  bodyLg:   ['1rem',    '1.625rem','400'],
  bodySm:   ['0.875rem','1.375rem','400'],  // 14px
  caption:  ['0.75rem', '1.125rem','400'],  // 12px
  label:    ['0.6875rem','1rem',  '600'],   // 11px uppercase labels
}
```

### 1.3 Spacing, Radius, Shadow

```js
export const spacing = {
  // base unit = 4px
  1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px',
  6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px',
}

export const radius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  full: '9999px',
}

export const shadow = {
  sm:  '0 1px 3px rgba(0,0,0,.08)',
  md:  '0 4px 12px rgba(0,0,0,.10)',
  lg:  '0 12px 32px rgba(0,0,0,.12)',
  glow:'0 0 0 3px rgba(99,102,241,.25)', // focus ring
}
```

---

## 2. TAILWIND CONFIG (tailwind.config.js)

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // toggle via <html class="dark">
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand:   { ...brandTokens },   // from tokens above
        surface: 'var(--surface)',
        bg:      'var(--bg)',
        border:  'var(--border)',
        text:    { primary: 'var(--text-primary)', sec: 'var(--text-sec)', muted: 'var(--text-muted)' },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display': ['2.25rem', { lineHeight: '2.75rem', fontWeight: '700' }],
        'h1': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        // ... rest of scale
      },
      borderRadius: {
        sm: '6px', md: '10px', lg: '14px', xl: '20px',
      },
      boxShadow: {
        card:  '0 4px 12px rgba(0,0,0,.08)',
        modal: '0 12px 40px rgba(0,0,0,.18)',
        glow:  '0 0 0 3px rgba(99,102,241,.25)',
      },
      animation: {
        'fade-in':    'fadeIn .2s ease',
        'slide-up':   'slideUp .25s ease',
        'pulse-slow': 'pulse 3s cubic-bezier(.4,0,.6,1) infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('tailwindcss-animate')],
}
```

### CSS Variables (global.css)

```css
:root {
  --bg:           #f8f9fc;
  --surface:      #ffffff;
  --surface-alt:  #f1f3f9;
  --border:       #e2e8f0;
  --text-primary: #0f172a;
  --text-sec:     #475569;
  --text-muted:   #94a3b8;
  --brand:        #6366f1;
}

html.dark {
  --bg:           #0d1117;
  --surface:      #161b22;
  --surface-alt:  #1c2333;
  --border:       #30363d;
  --text-primary: #e6edf3;
  --text-sec:     #8b949e;
  --text-muted:   #484f58;
  --brand:        #818cf8;
}
```

---

## 3. PROJECT STRUCTURE

```
hrms-frontend/
├── public/
│   └── locales/
│       ├── vi/           # Vietnamese translations
│       └── en/           # English translations
├── src/
│   ├── app/              # App shell, router, providers
│   │   ├── App.tsx
│   │   ├── Router.tsx
│   │   └── Providers.tsx
│   ├── assets/           # Static icons, images, fonts
│   ├── components/       # 🔥 Shared UI components (design system)
│   │   ├── ui/           # Primitives
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Badge/
│   │   │   ├── Avatar/
│   │   │   ├── Card/
│   │   │   ├── Table/
│   │   │   ├── Modal/
│   │   │   ├── Drawer/
│   │   │   ├── Dropdown/
│   │   │   ├── Tooltip/
│   │   │   ├── Toast/
│   │   │   ├── Spinner/
│   │   │   ├── Tabs/
│   │   │   ├── Select/
│   │   │   ├── DatePicker/
│   │   │   ├── Progress/
│   │   │   └── Chart/     # Recharts wrappers
│   │   ├── layout/       # Layout primitives
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   └── AppShell.tsx
│   │   └── shared/       # Business components
│   │       ├── EmployeeCard.tsx
│   │       ├── KPIWidget.tsx
│   │       ├── AttendanceRow.tsx
│   │       ├── NotificationBell.tsx
│   │       ├── AIInsightCard.tsx
│   │       └── ApprovalFlow.tsx
│   ├── features/         # Feature modules (each = 1 page/domain)
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── attendance/
│   │   ├── leave/
│   │   ├── payroll/
│   │   ├── performance/
│   │   ├── recruitment/
│   │   ├── training/
│   │   ├── chatbot/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── security/
│   ├── hooks/            # Custom React hooks
│   ├── stores/           # Zustand global state
│   ├── services/         # API calls (axios instances)
│   ├── i18n/             # i18next config
│   ├── utils/            # Helpers
│   └── types/            # TypeScript global types

hrms-backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── employees/
│   │   ├── attendance/
│   │   ├── leave/
│   │   ├── payroll/
│   │   ├── performance/
│   │   ├── notifications/
│   │   ├── ai/           # Prediction endpoints (Python bridge)
│   │   ├── chatbot/      # LLM proxy
│   │   └── logging/
│   ├── common/           # Guards, Interceptors, Filters
│   ├── config/           # Env, DB, Redis config
│   └── main.ts
```

---

## 4. COMPONENT LIBRARY — Detailed Spec

### 4.1 Button

```tsx
// components/ui/Button/Button.tsx
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size    = 'xs' | 'sm' | 'md' | 'lg'

// Visual spec:
// primary:   bg-brand-500 text-white hover:bg-brand-600 shadow-sm
// secondary: bg-surface-alt text-text-primary hover:bg-border
// ghost:     text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20
// danger:    bg-red-500 text-white hover:bg-red-600
// outline:   border border-border text-text-primary hover:bg-surface-alt

// Sizes:
// xs: h-7  px-2.5 text-xs rounded-sm
// sm: h-8  px-3   text-sm rounded-md
// md: h-9  px-4   text-sm rounded-md  ← default
// lg: h-11 px-6   text-base rounded-lg

// States: loading (spinner replaces icon), disabled (opacity-50 cursor-not-allowed)
// Always: transition-all duration-150, focus:ring-2 focus:ring-brand-500/40
```

### 4.2 Input

```tsx
// Standard Input, Textarea, Search Input
// Height: h-9 (default), h-10 (lg)
// Border: border border-border rounded-md
// Focus:  ring-2 ring-brand-500/30 border-brand-500
// Error:  border-red-500 ring-red-500/20
// Addon:  left/right icon slot, prefix text slot
// Dark:   bg-surface-alt border-border text-text-primary
```

### 4.3 Card

```tsx
// Base card = bg-surface border border-border rounded-lg shadow-card p-6
// Variants:
//   plain     — no shadow, no border (used inside other containers)
//   elevated  — shadow-md, no border
//   glass     — backdrop-blur-md bg-white/60 dark:bg-black/30 (header widgets)
//   ai        — left-border: 3px solid brand-500, bg-brand-50/50

// Card sub-components:
//   <Card.Header> — pb-4 border-b border-border flex justify-between
//   <Card.Body>   — py-4
//   <Card.Footer> — pt-4 border-t border-border flex justify-end gap-2
```

### 4.4 Table

```tsx
// Shared DataTable component (handles all list views)
// Features:
//   - Column config (label, accessor, render fn, sortable, width)
//   - Server-side pagination (page, limit, total)
//   - Row selection (checkbox)
//   - Bulk actions bar (appears when rows selected)
//   - Row hover: bg-surface-alt
//   - Odd rows: bg-surface-alt/40 (striped)
//   - Sticky header
//   - Empty state slot (illustration + CTA)
//   - Loading skeleton (5 shimmer rows)
//   - Column resize (optional)
// Style:
//   thead th: text-label uppercase text-text-muted border-b border-border
//   tbody td: text-body text-text-primary py-3 px-4 border-b border-border/50
```

### 4.5 Badge / Status Chip

```tsx
// Semantic badges:
//   active:   bg-green-100  text-green-700 dark:bg-green-900/30 dark:text-green-400
//   inactive: bg-surface-alt text-text-muted
//   pending:  bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30
//   danger:   bg-red-100    text-red-700    dark:bg-red-900/30
//   info:     bg-brand-100  text-brand-700  dark:bg-brand-900/30
// Size: rounded-full px-2.5 py-0.5 text-xs font-semibold
```

### 4.6 Avatar

```tsx
// Sizes: xs(24) sm(32) md(40) lg(48) xl(64)
// Fallback: initials with bg color derived from name hash
// Status dot: bottom-right, green=online, yellow=away, gray=offline
// Group: overlapping avatars (<AvatarGroup max={4} />)
```

### 4.7 Modal / Drawer

```tsx
// Modal:  centered overlay, max-w-md/lg/xl/2xl/full
//   - Backdrop: bg-black/50 backdrop-blur-sm
//   - Enter: fade + scale(95→100)
//   - Exit:  fade + scale(100→95)
//   - Slots: title, description, body, footer
//   - Mobile: auto-converts to bottom sheet

// Drawer: slides from right (default), w-80/96/[480px]
//   - Used for: employee detail, settings panel, chatbot
```

### 4.8 Toast / Notification

```tsx
// Position: top-right, stacked, max 5 visible
// Variants: success | error | warning | info
// Duration: 4000ms (error: stays until dismissed)
// Icon + title + optional description + dismiss X
// Progress bar at bottom showing time remaining
// Usage: toast.success('Đã lưu thành công') / toast.error('...')
```

---

## 5. LAYOUT SYSTEM

### 5.1 AppShell

```
┌─────────────────────────────────────────────────┐
│  TOPBAR (h-16 fixed)                            │
│  [Logo] [Search] [Lang] [Theme] [Notif] [User]  │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ SIDEBAR  │  PAGE CONTENT                        │
│ w-64     │  (scrollable, p-6)                   │
│ (fixed)  │                                      │
│          │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

### 5.2 Sidebar

```
[Logo + App name]
─────────────────
Nav Groups:
  OVERVIEW
    ○ Dashboard
  WORKFORCE
    ○ Employees
    ○ Recruitment
    ○ Onboarding
  TIME & LEAVE
    ○ Attendance
    ○ Leave Management
    ○ Shifts
  PERFORMANCE
    ○ KPI / OKR
    ○ Reviews (360°)
    ○ Training
  FINANCE
    ○ Payroll
    ○ Expenses
  AI TOOLS
    ○ AI Chatbot
    ○ Analytics
    ○ Predictions
  ADMIN
    ○ Settings
    ○ Security & Logs
─────────────────
[Avatar] [Name] [Role]
```

### 5.3 Topbar

```
Left:  [☰ collapse] [Breadcrumb / Page Title]
Right: [🔍 Search (Cmd+K)] [🌐 EN|VI] [☀️/🌙] [🔔 badge] [👤 avatar dropdown]
```

### 5.4 Page Layout Patterns

```
Pattern A — Stats Row + Table (Employee list, Attendance, Leave)
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Stat  │ │Stat  │ │Stat  │ │Stat  │
└──────┘ └──────┘ └──────┘ └──────┘
┌─────────────────────────────────────┐
│ [Search] [Filters] [+ Add] [Export] │
│ DataTable                           │
└─────────────────────────────────────┘

Pattern B — Chart Left + Feed Right (Dashboard)
┌─────────────────────┐ ┌─────────┐
│ Main Chart / Stats  │ │Activity │
│                     │ │Feed     │
│                     │ │         │
└─────────────────────┘ └─────────┘

Pattern C — Detail Page (Employee Profile)
┌─────────────────────────────────────┐
│ [← Back] Avatar Name Role Status   │
├──────────┬──────────────────────────┤
│ Info     │ Tabs: Profile|KPI|       │
│ Sidebar  │ Attendance|Payroll|Docs  │
│          │                          │
└──────────┴──────────────────────────┘
```

---

## 6. FEATURE PAGES — UI Specification

### MODULE 1: Dashboard (Admin/CEO)

**Stats Row (4 cards):**
- Total Employees | Active Today | On Leave | New This Month

**Grid 2-col:**
- Left: Attendance Heatmap (weekly, color intensity = check-in rate)
- Right: Turnover Risk donut chart + top 5 at-risk employees

**Grid 2-col:**
- Left: Department headcount bar chart
- Right: Activity feed (recent logins, approvals, leave requests)

**AI Insight Banner** (brand-500 gradient):
- "3 nhân viên có nguy cơ nghỉ việc cao. Xem chi tiết →"

---

### MODULE 2: Employees

**List View:**
- Stats: Total | Active | Probation | Resigned
- Table: Avatar+Name | Dept | Position | Contract | Status | Actions

**Employee Detail (Pattern C):**
- Tabs:
  - `Hồ sơ`: Personal info, emergency contact, documents
  - `Hợp đồng`: Contract history, renewal alerts
  - `Chấm công`: Monthly calendar view (green=present, red=absent)
  - `Lương`: Salary history chart + payslips
  - `KPI`: Current quarter metrics
  - `Lộ trình`: Career path timeline

---

### MODULE 3: Attendance

**Views:** Day | Week | Month toggle

**Check-in Dashboard:**
```
[Time: 08:42] [Status: Checked In ✓]
[Map: Employee location pin]
[Face capture preview]
[QR Code (refreshes 30s)]
```

**Admin View:**
- Heatmap calendar: department-level attendance
- Table: Employee | Date | Check-in | Check-out | Hours | Status

**Shift Management:**
- Drag-drop shift scheduler (week view)
- Conflict detection + AI suggestion

---

### MODULE 4: Leave Management

**Employee View:**
```
Leave Balance Card:
┌─────────────────────────────────┐
│ Annual: 12 days  Used: 4  Left: 8│
│ Sick:   5 days   Used: 1  Left: 4│
│ Personal: 2      Used: 0  Left: 2│
└─────────────────────────────────┘
[+ Request Leave] [Leave Calendar]
```

**Request Form:**
- Leave type select | Date range picker | Note | Attach file
- Submit → Workflow: `Trưởng phòng → HR → Giám đốc` (multi-step visual)

**Manager Approval:**
- Pending queue table
- Approve/Reject with comment
- Calendar conflict detection warning

---

### MODULE 5: Payroll

**Monthly Overview:**
- Total gross | Total net | Total deductions | Cost comparison vs last month

**Payroll Table:**
- Employee | Base | Allowance | OT | Deductions | Gross | Tax | Net

**Payslip Detail:**
- Modal with printable/PDF-export payslip
- Digital signature field

**Payroll Run Flow:**
1. Select period → 2. Preview calculations → 3. Approve → 4. Notify employees

---

### MODULE 6: KPI & Performance

**KPI Board (Kanban-like):**
```
Not Started │ In Progress │ At Risk │ Achieved
    [KPI]   │    [KPI]    │  [KPI] │  [KPI]
```

**360° Review:**
- Self-assessment form
- Peer review list
- Manager review
- AI Sentiment badge on text comments

**Career Pathing:**
```
Current: Sales Rep ──► Team Lead ──► Sales Manager
         (You)         [Skills needed: Leadership, CRM Advanced]
```

---

### MODULE 7: AI Chatbot

**UI:** Fixed bottom-right button (💬) → opens drawer/modal

```
┌─────────────────────────────┐
│ 🤖 HR Assistant             │[×]│
├─────────────────────────────┤
│                             │
│  [Bot] Xin chào! Tôi có    │
│  thể giúp bạn tra cứu      │
│  thông tin nhân sự.        │
│                             │
│  [User] Tôi còn mấy ngày   │
│  phép?                      │
│                             │
│  [Bot] Bạn còn 8 ngày phép │
│  năm và 4 ngày nghỉ ốm.    │
│  [Xem chi tiết →]           │
│                             │
├─────────────────────────────┤
│ [🎤] [Type a message...][➤] │
└─────────────────────────────┘
```

**Suggested quick replies:** ["Ngày phép", "Bảng lương", "Đơn xin nghỉ", "Chính sách"]

---

### MODULE 8: Analytics & AI Predictions

**Turnover Risk:**
- Score distribution histogram
- Risk list table: Employee | Score | Top factors | Action
- Score > 80 → red badge + auto-email trigger to HR

**Attendance Patterns:**
- Heatmap: Hour × Day (when is peak lateness?)
- Trend line: OT hours per department

**Sentiment Analysis:**
- Word cloud from survey responses
- Month-over-month sentiment score

---

### MODULE 9: Security & Logging

**Access Logs Table:**
- Timestamp | User | IP | Device | URL | Action | Status

**URL Filter (Web Filter):**
- Whitelist/Blacklist management
- Active hours configuration (e.g., 8am–6pm)
- Violation log

**RBAC Architecture (Role-Based Access Control):**

- **Database Models (Backend):**
  - Khởi tạo kiến trúc Nhiều-Nhiều (Many-to-Many) với bảng `Role` và `EmployeeRole`.
  - Hỗ trợ gán nhiều role cho một nhân viên.
  - Các roles mặc định: `admin`, `hr_manager`, `department_manager`, `employee`.
  
- **API Protection (Backend):**
  - Sử dụng `roleMiddleware(...allowedRoles)` để bảo vệ các route API.
  - Middleware kiểm tra roles từ token (trong `req.user`) và đối chiếu với quyền hạn. Trả về `403 Forbidden` nếu không có quyền.

- **Route Protection (Frontend):**
  - Xây dựng component `<RoleProtectedRoute allowedRoles={[...]} />` trên React Router (`Router.tsx`).
  - Phân luồng Route động và chặn truy cập trái phép bằng cách kiểm tra roles từ global state (`useAuthStore()`).
  - Phân luồng hiển thị giao diện: `AdminDashboard` cho quản lý và `EmployeeDashboard` cho nhân viên.

**Role Access Mapping:**
```text
  ┌────────────────────────────────────────────────────────┐
  │ 🔹 Admin: Toàn quyền (Security, Settings, Payroll...)  │
  │ 🔹 HR Manager: Employees, Leave, Payroll               │
  │ 🔹 Dept Manager: Employees, Leave duyệt đơn             │
  │ 🔹 Employee: Dashboard, Profile, Cá nhân hóa            │
  └────────────────────────────────────────────────────────┘
```

---

## 7. INTERNATIONALIZATION (i18n)

```ts
// i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Structure: locales/vi/translation.json + locales/en/translation.json

// Key naming convention:
// Module.Component.key
// e.g. employees.table.headers.name = "Họ tên" / "Full Name"
//      common.actions.save          = "Lưu"    / "Save"
//      common.status.active         = "Đang làm"/ "Active"
```

**Sample translation keys:**
```json
{
  "common": {
    "actions": { "save": "Lưu", "cancel": "Hủy", "delete": "Xóa", "edit": "Sửa", "export": "Xuất" },
    "status": { "active": "Đang làm", "inactive": "Đã nghỉ", "pending": "Chờ duyệt", "approved": "Đã duyệt", "rejected": "Từ chối" },
    "nav": { "dashboard": "Tổng quan", "employees": "Nhân viên", "attendance": "Chấm công" }
  },
  "dashboard": {
    "widgets": { "totalEmployees": "Tổng nhân viên", "activeToday": "Có mặt hôm nay" },
    "aiInsight": { "title": "Cảnh báo AI", "riskAlert": "{{count}} nhân viên nguy cơ nghỉ việc cao" }
  }
}
```

---

## 8. JWT AUTHENTICATION — Full Flow (Password + Face Login)

### 8.1 Token Architecture

```
┌─────────────────────────────────────────────────────┐
│                  TOKEN STRATEGY                     │
│                                                     │
│  Access Token  — JWT, expires 15 minutes            │
│  Refresh Token — JWT, expires 7 days (httpOnly cookie)│
│                                                     │
│  Payload:                                           │
│  { sub: userId, email, role, permissions[], iat, exp}│
│                                                     │
│  Storage:                                           │
│  Access  → memory (Zustand) only — never localStorage│
│  Refresh → httpOnly cookie (XSS safe)              │
└─────────────────────────────────────────────────────┘
```

### 8.2 Backend — Auth Module (NestJS)

**File structure:**
```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts        # validates access token
│   └── jwt-refresh.strategy.ts# validates refresh token
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── jwt-refresh.guard.ts
│   └── roles.guard.ts
├── decorators/
│   ├── roles.decorator.ts
│   └── current-user.decorator.ts
└── dto/
    ├── login.dto.ts
    ├── face-login.dto.ts
    └── token-response.dto.ts
```

**auth.service.ts — Password Login:**
```ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private employeeRepo: EmployeeRepository,
    private redisService: RedisService,
  ) {}

  async loginWithPassword(email: string, password: string) {
    // 1. Find employee
    const employee = await this.employeeRepo.findByEmail(email)
    if (!employee) throw new UnauthorizedException('EMAIL_NOT_FOUND')

    // 2. Verify password
    const isMatch = await bcrypt.compare(password, employee.passwordHash)
    if (!isMatch) throw new UnauthorizedException('INVALID_PASSWORD')

    // 3. Check account status
    if (employee.status !== 'active') throw new UnauthorizedException('ACCOUNT_INACTIVE')

    // 4. Generate tokens
    return this.generateTokens(employee)
  }

  async loginWithFace(imageBase64: string, employeeId?: string) {
    // 1. Call AI service to verify face
    const faceResult = await this.aiService.verifyFace({
      imageBase64,
      employeeId, // optional: narrow search scope
    })

    // faceResult: { matched: boolean, employeeId: string, confidence: number, isLive: boolean }

    if (!faceResult.matched) throw new UnauthorizedException('FACE_NOT_RECOGNIZED')
    if (!faceResult.isLive)  throw new UnauthorizedException('LIVENESS_CHECK_FAILED')
    if (faceResult.confidence < 0.92) throw new UnauthorizedException('LOW_CONFIDENCE')

    // 2. Load employee from matched ID
    const employee = await this.employeeRepo.findById(faceResult.employeeId)
    if (!employee || employee.status !== 'active') throw new UnauthorizedException('ACCOUNT_INACTIVE')

    // 3. Generate tokens (same as password login)
    return this.generateTokens(employee, { loginMethod: 'face', confidence: faceResult.confidence })
  }

  private async generateTokens(employee: Employee, meta?: Record<string, any>) {
    const payload = {
      sub:         employee.id,
      email:       employee.email,
      role:        employee.role,           // 'admin' | 'hr_manager' | 'manager' | 'employee'
      permissions: employee.permissions,    // string[] from RBAC table
      department:  employee.departmentId,
      loginMethod: meta?.loginMethod ?? 'password',
      ...meta,
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:    this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync({ sub: employee.id }, {
        secret:    this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ])

    // Store refresh token hash in Redis (for invalidation)
    const tokenHash = await bcrypt.hash(refreshToken, 5)
    await this.redisService.set(
      `refresh:${employee.id}`,
      tokenHash,
      60 * 60 * 24 * 7, // 7 days in seconds
    )

    // Log login event
    await this.logService.create({
      userId:      employee.id,
      action:      'LOGIN',
      loginMethod: meta?.loginMethod ?? 'password',
      timestamp:   new Date(),
    })

    return {
      accessToken,
      refreshToken,       // sent as httpOnly cookie by controller
      expiresIn: 900,     // 15 min in seconds
      user: {
        id:          employee.id,
        name:        employee.fullName,
        email:       employee.email,
        role:        employee.role,
        permissions: employee.permissions,
        avatar:      employee.avatarUrl,
        department:  employee.department?.name,
      },
    }
  }

  async refreshTokens(userId: string, rawRefreshToken: string) {
    // Verify token is still in Redis (not revoked)
    const storedHash = await this.redisService.get(`refresh:${userId}`)
    if (!storedHash) throw new UnauthorizedException('REFRESH_TOKEN_REVOKED')

    const isValid = await bcrypt.compare(rawRefreshToken, storedHash)
    if (!isValid) throw new UnauthorizedException('INVALID_REFRESH_TOKEN')

    const employee = await this.employeeRepo.findById(userId)
    // Delete old token, issue new pair (rotation)
    await this.redisService.del(`refresh:${userId}`)
    return this.generateTokens(employee)
  }

  async logout(userId: string) {
    await this.redisService.del(`refresh:${userId}`)
    return { success: true }
  }
}
```

**auth.controller.ts:**
```ts
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginWithPassword(dto.email, dto.password)
    this.setRefreshCookie(res, result.refreshToken)
    return { success: true, data: { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user } }
  }

  @Post('login/face')
  async faceLogin(@Body() dto: FaceLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginWithFace(dto.imageBase64, dto.employeeId)
    this.setRefreshCookie(res, result.refreshToken)
    return { success: true, data: { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user } }
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(@CurrentUser() user: JwtPayload, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies['refresh_token']
    const result = await this.authService.refreshTokens(user.sub, rawToken)
    this.setRefreshCookie(res, result.refreshToken)
    return { success: true, data: { accessToken: result.accessToken, expiresIn: result.expiresIn } }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.sub)
    res.clearCookie('refresh_token')
    return { success: true }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: JwtPayload) {
    return { success: true, data: user }
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   60 * 60 * 24 * 7 * 1000, // 7 days ms
      path:     '/auth/refresh',
    })
  }
}
```

**jwt.strategy.ts:**
```ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    config.get('JWT_ACCESS_SECRET'),
      ignoreExpiration: false,
    })
  }

  async validate(payload: JwtPayload) {
    // payload is already verified; attach to req.user
    return {
      sub:         payload.sub,
      email:       payload.email,
      role:        payload.role,
      permissions: payload.permissions,
      department:  payload.department,
      loginMethod: payload.loginMethod,
    }
  }
}
```

**roles.guard.ts:**
```ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      ctx.getHandler(), ctx.getClass(),
    ])
    if (!requiredRoles) return true // public route

    const { user } = ctx.switchToHttp().getRequest()
    return requiredRoles.some(r => user.role === r || user.permissions.includes(r))
  }
}

// Usage on any route:
// @Roles('admin', 'hr_manager')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Get('employees')
```

**DTOs:**
```ts
// dto/login.dto.ts
export class LoginDto {
  @IsEmail()    email: string
  @MinLength(6) password: string
}

// dto/face-login.dto.ts
export class FaceLoginDto {
  @IsString()            imageBase64: string  // base64 encoded JPEG/PNG from webcam
  @IsOptional()
  @IsUUID()              employeeId?: string  // optional: speeds up face search
}
```

**Environment variables (.env):**
```env
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-different-from-access
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
```

---

### 8.3 Frontend — Auth Flow

**stores/useAuthStore.ts:**
```ts
import { create } from 'zustand'

interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'hr_manager' | 'manager' | 'employee'
  permissions: string[]
  avatar?: string
  department?: string
}

interface AuthStore {
  user: AuthUser | null
  accessToken: string | null        // in memory only
  isAuthenticated: boolean

  loginPassword: (email: string, password: string) => Promise<void>
  loginFace:     (imageBase64: string, employeeId?: string) => Promise<void>
  refreshToken:  () => Promise<void>
  logout:        () => Promise<void>
  hasPermission: (permission: string) => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user:            null,
  accessToken:     null,
  isAuthenticated: false,

  loginPassword: async (email, password) => {
    const res = await authService.loginPassword({ email, password })
    set({ user: res.user, accessToken: res.accessToken, isAuthenticated: true })
    // Schedule silent refresh before expiry
    scheduleTokenRefresh(res.expiresIn)
  },

  loginFace: async (imageBase64, employeeId) => {
    const res = await authService.loginFace({ imageBase64, employeeId })
    set({ user: res.user, accessToken: res.accessToken, isAuthenticated: true })
    scheduleTokenRefresh(res.expiresIn)
  },

  refreshToken: async () => {
    try {
      // Refresh cookie is sent automatically (httpOnly)
      const res = await authService.refresh()
      set({ accessToken: res.accessToken })
      scheduleTokenRefresh(res.expiresIn)
    } catch {
      get().logout()
    }
  },

  logout: async () => {
    await authService.logout().catch(() => {})
    clearTokenRefreshTimer()
    set({ user: null, accessToken: null, isAuthenticated: false })
  },

  hasPermission: (permission) => {
    const { user } = get()
    return !!(user?.role === 'admin' || user?.permissions.includes(permission))
  },
}))

// Silent refresh timer
let refreshTimer: ReturnType<typeof setTimeout>
function scheduleTokenRefresh(expiresInSec: number) {
  clearTokenRefreshTimer()
  // Refresh 1 minute before expiry
  const delay = (expiresInSec - 60) * 1000
  refreshTimer = setTimeout(() => useAuthStore.getState().refreshToken(), delay)
}
function clearTokenRefreshTimer() { clearTimeout(refreshTimer) }
```

**pages/LoginPage.tsx — Dual login UI:**
```tsx
export function LoginPage() {
  const [mode, setMode] = useState<'password' | 'face'>('password')

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.svg" className="h-10 mx-auto mb-3" />
          <h1 className="text-h2 text-text-primary">HRMS 4.0</h1>
          <p className="text-body text-text-sec mt-1">
            {t('auth.login.subtitle')}
          </p>
        </div>

        <Card className="p-8">
          {/* Toggle tabs */}
          <Tabs value={mode} onChange={setMode} className="mb-6">
            <Tabs.Tab value="password" icon={<KeyIcon />}>
              {t('auth.login.tabs.password')}
            </Tabs.Tab>
            <Tabs.Tab value="face" icon={<FaceIcon />}>
              {t('auth.login.tabs.face')}
            </Tabs.Tab>
          </Tabs>

          {mode === 'password' ? <PasswordLoginForm /> : <FaceLoginForm />}
        </Card>
      </div>
    </div>
  )
}

function PasswordLoginForm() {
  const { loginPassword } = useAuthStore()
  const { register, handleSubmit, formState } = useForm<LoginDto>()

  const onSubmit = async (data: LoginDto) => {
    await loginPassword(data.email, data.password)
    navigate('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label={t('auth.login.email')}
        type="email"
        {...register('email', { required: true })}
        error={formState.errors.email?.message}
      />
      <Input
        label={t('auth.login.password')}
        type="password"
        showToggle
        {...register('password', { required: true, minLength: 6 })}
        error={formState.errors.password?.message}
      />
      <Button type="submit" className="w-full" loading={formState.isSubmitting}>
        {t('auth.login.submit')}
      </Button>
    </form>
  )
}

function FaceLoginForm() {
  const { loginFace } = useAuthStore()
  const [status, setStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle')
  const videoRef = useRef<HTMLVideoElement>(null)

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    videoRef.current!.srcObject = stream
    setStatus('scanning')
  }

  const capture = async () => {
    setStatus('verifying')
    // Draw frame to canvas, convert to base64
    const canvas = document.createElement('canvas')
    canvas.width  = videoRef.current!.videoWidth
    canvas.height = videoRef.current!.videoHeight
    canvas.getContext('2d')!.drawImage(videoRef.current!, 0, 0)
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1]

    try {
      await loginFace(imageBase64)
      setStatus('success')
      navigate('/dashboard')
    } catch (err) {
      setStatus('error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Camera viewport */}
      <div className="relative rounded-lg overflow-hidden bg-surface-alt aspect-[4/3]">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

        {/* Face outline guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={cn(
            'w-40 h-52 rounded-full border-2 border-dashed transition-colors',
            status === 'scanning'  && 'border-brand-400 animate-pulse',
            status === 'verifying' && 'border-yellow-400',
            status === 'success'   && 'border-green-400',
            status === 'error'     && 'border-red-400',
            status === 'idle'      && 'border-border',
          )} />
        </div>

        {/* Status badge */}
        {status !== 'idle' && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <Badge variant={
              status === 'scanning'  ? 'info'    :
              status === 'verifying' ? 'warning' :
              status === 'success'   ? 'active'  : 'danger'
            }>
              {t(`auth.login.face.status.${status}`)}
            </Badge>
          </div>
        )}
      </div>

      {/* Instructions */}
      <p className="text-bodySm text-text-muted text-center">
        {t('auth.login.face.instruction')}
      </p>

      {/* Action buttons */}
      {status === 'idle' ? (
        <Button className="w-full" onClick={startCamera} variant="outline">
          {t('auth.login.face.startCamera')}
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={capture}
            loading={status === 'verifying'}
            disabled={status !== 'scanning'}
          >
            {t('auth.login.face.capture')}
          </Button>
          <Button variant="ghost" onClick={() => setStatus('idle')}>
            {t('common.actions.cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}
```

**Route protection:**
```tsx
// components/layout/ProtectedRoute.tsx
export function ProtectedRoute({ children, requiredRole }: Props) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}

// app/Router.tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
    <Route path="/dashboard"  element={<Dashboard />} />
    <Route path="/employees"  element={<ProtectedRoute requiredRole="hr_manager"><Employees /></ProtectedRoute>} />
    <Route path="/settings"   element={<ProtectedRoute requiredRole="admin"><Settings /></ProtectedRoute>} />
    {/* ... */}
  </Route>
</Routes>
```

**Axios interceptor with auto-refresh:**
```ts
// services/api.ts
let isRefreshing = false
let failQueue: Array<{ resolve: Function; reject: Function }> = []

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config

    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failQueue.push({ resolve, reject }))
          .then(token => { original.headers.Authorization = `Bearer ${token}`; return api(original) })
      }

      original._retry = true
      isRefreshing = true

      try {
        await useAuthStore.getState().refreshToken()
        const newToken = useAuthStore.getState().accessToken
        failQueue.forEach(p => p.resolve(newToken))
        failQueue = []
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        failQueue.forEach(p => p.reject(err))
        failQueue = []
        useAuthStore.getState().logout()
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)
```

---

## 9. NODEMON SETUP — NestJS Dev Server

### 9.1 Install

```bash
# In hrms-backend/
npm install --save-dev nodemon ts-node

# Or if using pnpm
pnpm add -D nodemon ts-node
```

### 9.2 nodemon.json

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.spec.ts", "dist/**"],
  "exec": "ts-node -r tsconfig-paths/register src/main.ts",
  "delay": 300,
  "env": {
    "NODE_ENV": "development"
  }
}
```

### 9.3 package.json scripts

```json
{
  "scripts": {
    "start":         "node dist/main",
    "start:dev":     "nodemon",
    "start:debug":   "nodemon --inspect",
    "start:prod":    "node dist/main",
    "build":         "nest build",
    "prebuild":      "rimraf dist",
    "lint":          "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test":          "jest",
    "test:watch":    "jest --watch",
    "db:migrate":    "npx prisma migrate dev",
    "db:seed":       "ts-node prisma/seed.ts",
    "db:studio":     "npx prisma studio"
  }
}
```

### 9.4 tsconfig.json (backend)

```json
{
  "compilerOptions": {
    "module":          "commonjs",
    "declaration":     true,
    "removeComments":  true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target":          "ES2021",
    "sourceMap":       true,
    "outDir":          "./dist",
    "baseUrl":         "./",
    "incremental":     true,
    "skipLibCheck":    true,
    "strictNullChecks":false,
    "noImplicitAny":   false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### 9.5 Full NestJS bootstrap (main.ts)

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import * as cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'], // full logging in dev
  })

  // Security
  app.use(helmet())
  app.use(cookieParser())

  // CORS — allow frontend dev server
  app.enableCors({
    origin:      process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,  // required for httpOnly cookie
    methods:     ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })

  // Global prefix
  app.setGlobalPrefix('api/v1')

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist:            true,
    forbidNonWhitelisted: true,
    transform:            true,
  }))

  // Swagger (dev only)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('HRMS 4.0 API')
      .setDescription('HR Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
    console.log(`📚 Swagger: http://localhost:${process.env.PORT}/api/docs`)
  }

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  console.log(`🚀 HRMS API running: http://localhost:${port}/api/v1`)
  console.log(`🔄 Nodemon watching src/ for changes...`)
}
bootstrap()
```

### 9.6 Docker Compose (dev environment)

```yaml
# docker-compose.dev.yml
version: '3.9'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB:       hrms_db
      POSTGRES_USER:     hrms_user
      POSTGRES_PASSWORD: hrms_pass
    ports: ['5432:5432']
    volumes: ['postgres_data:/var/lib/postgresql/data']

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    command: redis-server --appendonly yes
    volumes: ['redis_data:/data']

  backend:
    build:
      context: ./hrms-backend
      dockerfile: Dockerfile.dev
    volumes:
      - ./hrms-backend/src:/app/src   # hot reload via nodemon
    ports: ['3000:3000', '9229:9229'] # 9229 = debug port
    env_file: ./hrms-backend/.env
    depends_on: [db, redis]
    command: npm run start:dev

  frontend:
    build:
      context: ./hrms-frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./hrms-frontend/src:/app/src  # Vite HMR
    ports: ['5173:5173']
    env_file: ./hrms-frontend/.env

volumes:
  postgres_data:
  redis_data:
```

```dockerfile
# hrms-backend/Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000 9229
CMD ["npm", "run", "start:dev"]
```

**Start everything:**
```bash
docker-compose -f docker-compose.dev.yml up
# Backend auto-reloads on src/ changes via nodemon
# Frontend auto-reloads via Vite HMR
```

---

## 10. STATE MANAGEMENT

```ts
// stores/useThemeStore.ts (Zustand)
interface ThemeStore {
  theme: 'light' | 'dark' | 'system'
  lang: 'vi' | 'en'
  setTheme: (t: ThemeStore['theme']) => void
  setLang:  (l: ThemeStore['lang'])  => void
}
// Persisted to localStorage

// stores/useAuthStore.ts
interface AuthStore {
  user: User | null
  token: string | null
  permissions: string[]
  login: (credentials) => Promise<void>
  logout: () => void
}

// stores/useNotificationStore.ts
interface NotificationStore {
  unread: number
  notifications: Notification[]
  markRead: (id: string) => void
  markAllRead: () => void
}
```

---

## 11. API LAYER

```ts
// services/api.ts — Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
})

// Interceptors:
// Request:  attach JWT token
// Response: handle 401 (refresh or logout), normalize errors

// services/employees.service.ts
export const employeeService = {
  list:   (params) => api.get('/employees', { params }),
  get:    (id)     => api.get(`/employees/${id}`),
  create: (data)   => api.post('/employees', data),
  update: (id, d)  => api.patch(`/employees/${id}`, d),
  delete: (id)     => api.delete(`/employees/${id}`),
}

// React Query hooks:
// useEmployees(params) — list with cache
// useEmployee(id) — single with cache
// useUpdateEmployee() — mutation + optimistic update
```

---

## 12. BACKEND — NestJS Module Template

```ts
// Each feature module follows:
// module.ts | controller.ts | service.ts | dto/ | entities/ | guards/

// Standard response format:
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 150 },
  "message": "Success"
}

// Error format:
{
  "success": false,
  "error": { "code": "EMPLOYEE_NOT_FOUND", "message": "...", "details": null },
  "statusCode": 404
}

// JWT + RBAC Guard on every route
// @Roles('admin', 'hr_manager')
// @UseGuards(JwtAuthGuard, RolesGuard)
```

---

## 13. AI SERVICE INTEGRATION

```ts
// Backend: ai.module.ts → proxies to Python FastAPI AI service

// Endpoints:
// POST /ai/predict/turnover    { employeeId } → { score, factors, recommendation }
// POST /ai/chat                { message, context, lang } → { reply, suggestions }
// POST /ai/face/verify         { imageBase64 } → { match, confidence, livenessScore }
// POST /ai/sentiment           { text } → { label, score, keywords }
// GET  /ai/insights/dashboard  → { alerts, trends, recommendations[] }

// LLM Chatbot context:
{
  systemPrompt: "You are an HR assistant for {companyName}. Answer in {lang}.",
  employeeContext: { name, department, leaveBalance, latestKPI },
  policyDocs: ["..." ] // RAG from company docs
}
```

---

## 14. VIBE CODING AGENT PROMPT

Copy the following prompt into your AI coding agent to start:

```
You are an expert fullstack developer building an HR Management System (HRMS 4.0).

PROJECT SPEC:
- Frontend: ReactJS + TypeScript + TailwindCSS + Zustand + React Query + i18next
- Backend: NestJS + TypeScript + PostgreSQL + Redis + Prisma
- Design: Component-driven, single design token file, light/dark mode, EN/VI bilingual

DESIGN TOKENS:
- Primary color: #6366f1 (brand-500)
- Font: "Be Vietnam Pro" (main) + "Inter" (fallback)
- Border radius: 6px/10px/14px/20px
- Dark bg: #0d1117, surface: #161b22
- Light bg: #f8f9fc, surface: #ffffff

COMPONENT RULES:
1. ALL components read color from CSS variables (--bg, --surface, --border, --text-primary)
2. Never hardcode hex colors inside components — always use Tailwind utility classes that map to tokens
3. Every component has: className prop, light/dark variants, loading state, empty state
4. Button always shows spinner when loading, disabled when submitting

AUTH RULES:
- Password login: POST /auth/login → { accessToken, expiresIn, user }
- Face login:     POST /auth/login/face → same response shape
- Both return accessToken in JSON body (store in Zustand memory only, NEVER localStorage)
- Refresh token in httpOnly cookie, auto-rotated on each refresh call
- Axios interceptor auto-calls /auth/refresh on 401, queues failed requests
- Silent refresh scheduled (expiresIn - 60s) via setTimeout in Zustand store
- ProtectedRoute wraps all authenticated pages, redirects /login on missing token
- @Roles() + RolesGuard on every NestJS endpoint

NODEMON:
- Config in nodemon.json, watches src/, exec via ts-node
- npm run start:dev → nodemon
- docker-compose.dev.yml mounts src/ as volume for container hot reload

CURRENT TASK: [DESCRIBE WHAT YOU WANT TO BUILD]

Start by creating the file structure, then implement [specific component/page].
Always follow the design system. Never deviate from the color palette.
Use Vietnamese labels by default but wrap all strings in t('key') for i18n.
```

---

## 15. DEVELOPMENT PHASES

### Phase 1 — Foundation (Week 1-2)
- [ ] Project scaffold (Vite + NestJS)
- [ ] Design token setup (CSS vars + Tailwind config)
- [ ] Core UI components: Button, Input, Card, Table, Badge, Avatar, Toast
- [ ] AppShell: Topbar + Sidebar + Layout
- [ ] Auth: Login page + JWT + RBAC
- [ ] Dark mode toggle + Language toggle

### Phase 2 — Core HR (Week 3-5)
- [ ] Employee CRUD (list + detail + form)
- [ ] Attendance (check-in UI + admin view)
- [ ] Leave (request + approval workflow)
- [ ] Payroll (view + payslip)

### Phase 3 — Smart Features (Week 6-8)
- [ ] KPI + 360° review
- [ ] AI Chatbot integration
- [ ] Predictive analytics dashboard
- [ ] Notification system (real-time via WebSocket)

### Phase 4 — Advanced (Week 9-11)
- [ ] Face recognition check-in
- [ ] GPS/Geofencing
- [ ] Security logs + URL filter
- [ ] Onboarding flow
- [ ] Social feed

### Phase 5 — Polish (Week 12)
- [ ] Mobile responsive QA
- [ ] Performance optimization
- [ ] Error boundaries + empty states
- [ ] Full EN/VI QA
- [ ] Docker compose production setup

---

*HRMS 4.0 Vibe Plan — Ready to build 🚀*
