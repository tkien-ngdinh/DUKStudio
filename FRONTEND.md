# FRONTEND.md — DUKStudio

Operational manual, demo accounts specification, and routing architecture for the React Front-end application of DUKStudio (GradStudio) — CSC13008 PA#3.

---

## 1. Team

| # | Student Name | Student ID | Assigned Tasks |
|:---:|---|:---:|---|
| 1 | Nguyễn Đình Trung Kiên | 24120195 | Architecture, Mock Server, Auth, Jobs (G2, G8, G11) |
| 2 | Nguyễn Thanh Hạ Uyên | 24120243 | Conversations, Clash check, Booking Admin (G4, G5, G6, G10) |
| 3 | Dương Thị Bích Diệp | 24120247 | Home, Customer Chat, Booking/Deposit, Gallery (G1, G3, G7, G9) |

---

## 2. How to run it

### Start Mock API Server:
```sh
# From repository root
node mock/server.mjs
```
By default, the Mock Server listens on `http://localhost:3001`. The four testing modes can be configured via environment variables:
- `MOCK_MODE=normal node mock/server.mjs` (standard latency ~150ms)
- `MOCK_MODE=slow node mock/server.mjs` (2s artificial delay to verify loading states)
- `MOCK_MODE=error node mock/server.mjs` (returns HTTP 500 to verify in-place retry behavior)
- `MOCK_MODE=empty node mock/server.mjs` (recursively converts arrays to `[]` to verify empty states)

### Start Client (Development):
```sh
cd client
npm ci
npm run dev
```
The browser opens at `http://localhost:5173`. All `/api` requests are proxied automatically to `http://localhost:3001`.

### Run Production Preview (Offline evaluation):
```sh
cd client
npm run build
npx vite preview
```
The preview server serves `client/dist/` at `http://localhost:4173` without requiring an internet connection.

---

## 3. Demo accounts

Demo accounts table parsed by automated verification suites (`contract-check`):

| Name in examples | Role | E-mail or User name | Password | Role notes |
|---|---|---|---|---|
| linh | customer | linh@gradstudio.test | linh-demo | Customer booking graduation shoot |
| thao | admin | thao@gradstudio.test | thao-demo | Studio Admin consulting and confirming bookings |
| mai | staff | mai@gradstudio.test | mai-demo | Makeup artist (busy 08:00–12:00 on Oct 24) |
| tuan | staff | tuan@gradstudio.test | tuan-demo | Photographer (assigned to GS-1024 / GS-1023) |
| superadmin | superadmin | superadmin@gradstudio.test | superadmin-demo | Superadmin (opening hours & reminder settings) |

---

## 4. Routes

List of client routes in the React SPA (using `BrowserRouter`):

| Path | Role | Step | API Endpoints Invoked | View Description |
|---|---|---|---|---|
| `/` | Visitor, Customer | G1 | `GET /api/catalog` | Home landing page, package catalog, pricing table, customer reviews |
| `/login` | Everyone | G2 | `POST /api/auth/login` | Unified authentication view across all 4 roles |
| `/chat` | Customer | G3, G6 | `GET /api/conversations/:id`, `POST /api/conversations/:id/messages`, `POST /api/conversations/:id/proposal/respond` | Real-time chat inquiry and shoot schedule proposal confirmation |
| `/admin/conversations` | Admin | G4 | `GET /api/conversations` | Studio conversation list grouped into 4 status tabs |
| `/admin/conversations/:id` | Admin | G4, G5, G6 | `GET /api/conversations/:id`, `POST /api/schedule/clash-check`, `POST /api/conversations/:id/propose-time`, `POST /api/bookings` | Admin chat view with clash check and booking creation |
| `/my-bookings` | Customer | G7 | `GET /api/bookings`, `GET /api/reminders` | Customer shoot schedule list and reminder notifications |
| `/bookings/GS-1023` | Customer | G7 | `GET /api/bookings/GS-1023`, `POST /api/payments/deposit` | Booking confirmation details and 30% deposit checkout |
| `/payment/test` | Customer | G7 | `POST /api/payments/test-result` | Test payment sandbox route (simulating gateway success/failure) |
| `/staff/jobs` | Staff | G8 | `GET /api/staff/jobs`, `PATCH /api/staff/jobs/:id`, `POST /api/staff/jobs/:id/previews` | Staff task assignment dashboard and preview photo upload |
| `/gallery/GS-1023` | Customer | G9 | `GET /api/bookings/GS-1023`, `POST /api/gallery/GS-1023/select`, `POST /api/payments/remaining`, `POST /api/gallery/GS-1023/receive` | Photo gallery to select up to 30 photos, settle 70% balance, mark received |
| `/admin/bookings` | Admin | G10 | `GET /api/bookings` | Studio master booking management dashboard |
| `/admin/bookings/GS-1023`| Admin | G10 | `GET /api/bookings/GS-1023`, `PATCH /api/bookings/GS-1023`, `POST /api/bookings/GS-1023/final-link` | Booking detail management, schedule alteration, cancel, final deliverables link |
| `/superadmin/settings` | Superadmin | G11 | `GET /api/admin/accounts`, `POST /api/admin/accounts`, `GET /api/admin/settings`, `PUT /api/admin/settings` | Administrator account provisioning and studio configuration |

---

## 5. Product owner decisions

Key architectural and product decisions agreed upon with the team:
1. **DUKStudio Brand Identity**: DUKStudio serves as the concrete reference brand operating on the GradStudio platform.
2. **Interactive Payment Sandbox**: The internal test payment view (`/payment/test`) provides explicit "Success" and "Failure" triggers to accurately simulate the third-party redirect flow required for PA#4.
3. **Descriptive Schedule Conflict Explanations**: Clash checks must return plain-text narrative explanations (e.g. *"09:00 clashes because Mai is busy 08:00–12:00"*), alongside recommending next available slots (e.g. 14:00).

---

## 6. Libraries

- `react` & `react-dom` (v18+): Core UI component architecture.
- `react-router-dom`: Client-side SPA navigation via `BrowserRouter`.
- `vite`: Fast frontend build tooling, development server, and `/api` proxying.
- *Zero extraneous UI frameworks or CSS libraries*: Styles inherit from the semantic design token architecture established in PA#2 (`style.css`).
