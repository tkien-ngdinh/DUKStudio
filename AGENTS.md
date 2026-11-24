# DUKStudio PA#3 — Complete Project Context & Assistant Rules

Team project name: **DUKStudio**. Product name displayed on pages: **GradStudio**.  
Course: **CSC13008 Web Application Development**, HCMUS (HK1 2026–2027).  
Assignment: **PA#3 — Front end in React on a written API contract and a mock** (7% of course, 100 points).  
Teacher's brief: "GradStudio — final project brief" (screens in `docs/pa1/`, never edit that directory).

---

## 1. Project & Team Identity

| # | Student Name | Student ID | Responsibilities in PA#3 |
|:---:|---|:---:|---|
| 1 | Nguyễn Đình Trung Kiên | 24120195 | Architecture, Core Mock Server, Auth, Staff Jobs & Admin (G2, G8, G11) |
| 2 | Nguyễn Thanh Hạ Uyên | 24120243 | Conversations, Schedule Clash Check, Booking Administration (G4, G5, G6, G10) |
| 3 | Dương Thị Bích Diệp | 24120247 | Catalog/Home, Customer Chat, Booking/Deposit Checkout, Photo Gallery (G1, G3, G7, G9) |

---

## 2. System Architecture & Project Scope

The goal of PA#3 is to implement the complete 11-step main flow of GradStudio (steps G1–G11) as a Single Page Application (SPA) in `client/` using **React** and **Vite**, driven by a contract-first API and an independent mock server in `mock/server.mjs`. In PA#4, an Express backend will replace the mock server without any alterations to the React frontend.

- **Client (`client/`)**: Built with React 18+, Vite, and `react-router-dom` (`BrowserRouter`). All data requests use relative paths `/api/...` proxied to port 3001.
- **Contract-first API (`docs/api/`)**: Master specification in `docs/api/README.md` and 10 detailed contract files. Front-end code must NOT be written before its corresponding endpoint contract is documented.
- **Mock Server (`mock/server.mjs`)**: Built strictly with Node.js built-in modules (`node:http`, `node:fs`, `node:path`, `node:url`) with **zero `npm install`**. Supports 4 runtime modes (`normal`, `slow`, `error`, `empty`).
- **Contract Verification Tool (`tools/contract-check.mjs`)**: Automated verification runner that sends example requests from `docs/api/*.md` to the live API server and checks status codes and JSON response schemas.

---

## 3. Main User Flow (Steps G1–G11) & Business Rules

1. **G1: Discovery & Service Catalog (`/`, `GET /api/catalog`)**
   - Public view. Displays graduation photography packages, starting prices, service features, studio amenities, and customer feedback.
2. **G2: Authentication (`/login`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`)**
   - Single sign-in portal for all 4 roles. Issues stable tokens (`token-<account_name>`).
3. **G3: Customer Chat & Booking Request (`/chat`, `POST /api/conversations`)**
   - Customer initiates inquiry, specifies preferred shoot date, package, and questions.
4. **G4: Studio Conversation Management (`/admin/conversations`, `GET /api/conversations`)**
   - Admin manages customer inquiries organized across 4 status tabs: *Waiting for Studio*, *Studio Answered*, *Deposit Pending*, *Done*.
5. **G5: Schedule Clash Check (`POST /api/schedule/clash-check`)**
   - Admin checks photographer, makeup artist, and studio room availability for requested timeslots.
   - **Mandatory narrative explanation**: Clash checks must return plain-text narrative explanations (e.g., *"09:00 clashes because Mai is busy 08:00–12:00"*) and propose alternative open slots (e.g., 14:00).
6. **G6: Slot Proposal & Booking Creation (`POST /api/conversations/:id/propose-time`, `POST /api/conversations/:id/respond-proposal`, `POST /api/bookings`)**
   - Admin posts proposed shoot timeslot to chat. Customer accepts or declines.
   - **Conflict guard (409 Conflict)**: `POST /api/bookings` MUST return `409 Conflict` if the admin attempts to create a confirmed booking before the customer has explicitly agreed to the proposed slot.
7. **G7: Booking Details, Reminders & Deposit (`/my-bookings`, `/bookings/:id`, `GET /api/reminders`, `POST /api/payments/deposit`, `/payment/test`)**
   - Customer views shoot itinerary and automated reminders.
   - Customer checks out with 30% deposit payment. Interactive payment sandbox at `/payment/test` provides "Success" and "Failure" outcomes simulating third-party payment gateway redirects.
8. **G8: Staff Job Dashboard & Previews Upload (`/staff/jobs`, `GET /api/staff/jobs`, `PATCH /api/staff/jobs/:id`, `POST /api/staff/jobs/:id/previews`)**
   - Staff (photographer/makeup artist) reviews assigned shoots. Staff updates task status and uploads watermarked preview photos.
9. **G9: Photo Selection, Final Balance & Completion (`/gallery/:id`, `POST /api/gallery/:id/select`, `POST /api/payments/remaining`, `POST /api/gallery/:id/receive`)**
   - Customer selects up to **30 photos** for retouching.
   - Customer settles the remaining 70% balance.
   - Customer clicks "Receive photos" to finalize delivery and mark the booking *Completed*.
10. **G10: Master Booking Management & Final Links (`/admin/bookings`, `GET /api/bookings`, `PATCH /api/bookings/:id`, `POST /api/bookings/:id/final-link`)**
    - Admin monitors all studio bookings, reschedules appointments (subject to clash check), handles cancellations, and attaches the final downloadable photo archive link.
11. **G11: Superadmin Administration & Settings (`/superadmin/settings`, `GET /api/admin/accounts`, `POST /api/admin/accounts`, `GET /api/admin/settings`, `PUT /api/admin/settings`)**
    - Superadmin provisions and manages Admin accounts, configures studio operating hours and automated reminder schedules. Non-superadmin requests return `403 Forbidden`.

---

## 4. Demo Accounts & Authentication Tokens

The application maintains 5 permanent demo accounts covering all 4 roles. In automated contract checking (`contract-check`), token placeholders follow the syntax `{{token:<Name in examples>}}`:

| Name in examples | Role | E-mail or User name | Password | Stable Token | Description |
|---|---|---|---|---|---|
| `linh` | customer | `linh@gradstudio.test` | `linh-demo` | `token-linh` | Customer booking graduation shoot |
| `thao` | admin | `thao@gradstudio.test` | `thao-demo` | `token-thao` | Studio Admin managing chat, clash check & bookings |
| `mai` | staff | `mai@gradstudio.test` | `mai-demo` | `token-mai` | Makeup artist (busy 08:00–12:00 on Oct 24) |
| `tuan` | staff | `tuan@gradstudio.test` | `tuan-demo` | `token-tuan` | Photographer (assigned to GS-1024 / GS-1023) |
| `superadmin` | superadmin | `superadmin@gradstudio.test` | `superadmin-demo` | `token-superadmin` | Superadmin (opening hours & reminder settings) |

---

## 5. Master Endpoint Catalog (29 Endpoints)

| Method | Path | Roles | File Contract | Main Flow Step |
|---|---|---|---|---|
| POST | /api/auth/login | Visitor | `01-auth.md` | G2: Sign in to system |
| POST | /api/auth/logout | Authenticated | `01-auth.md` | G2: Sign out |
| GET | /api/auth/me | Authenticated | `01-auth.md` | G2: Current authenticated user profile |
| GET | /api/catalog | Visitor, Customer | `02-catalog.md` | G1: Packages, services, price list, accessories, feedback |
| GET | /api/conversations | Admin | `03-chat.md` | G4: Conversation list grouped by 4 status tabs |
| POST | /api/conversations | Customer | `03-chat.md` | G3: Customer initiates inquiry / booking request |
| GET | /api/conversations/:id | Customer, Admin | `03-chat.md` | G3, G4: Conversation details and message history |
| POST | /api/conversations/:id/messages | Customer, Admin | `03-chat.md` | G3, G4: Send new message |
| POST | /api/conversations/:id/propose-time | Admin | `03-chat.md` | G5, G6: Admin posts proposed shoot schedule to chat |
| POST | /api/conversations/:id/respond-proposal | Customer | `03-chat.md` | G6: Customer accepts or rejects proposed shoot schedule |
| POST | /api/schedule/clash-check | Admin | `04-schedule.md` | G5: Check staff/room availability & suggest free slots |
| POST | /api/bookings | Admin | `05-bookings.md` | G6: Create confirmed booking from chat (409 if not agreed) |
| GET | /api/bookings | Customer, Admin | `05-bookings.md` | G7, G10: List my bookings / list all studio bookings |
| GET | /api/bookings/:id | Customer, Admin, Staff | `05-bookings.md` | G7, G10: Booking details |
| PATCH | /api/bookings/:id | Admin | `05-bookings.md` | G10: Modify booking schedule (with clash check) or cancel |
| POST | /api/bookings/:id/final-link | Admin | `05-bookings.md` | G10: Attach final downloadable photos link |
| POST | /api/payments/deposit | Customer | `06-payments.md` | G7: Initiate 30% deposit payment |
| POST | /api/payments/test-result | Customer | `06-payments.md` | G7: Handle test payment gateway outcome (Success/Fail) |
| POST | /api/payments/remaining | Customer | `06-payments.md` | G9: Initiate 70% remaining balance payment |
| GET | /api/reminders | Customer | `07-reminders.md` | G7: List upcoming reminders and notification status |
| GET | /api/staff/jobs | Staff | `08-jobs.md` | G8: Assigned staff tasks and shoot sessions |
| PATCH | /api/staff/jobs/:id | Staff | `08-jobs.md` | G8: Update staff job status |
| POST | /api/staff/jobs/:id/previews | Staff | `08-jobs.md` | G8: Upload watermarked preview photos |
| POST | /api/gallery/:id/select | Customer | `09-gallery.md` | G9: Customer submits up to 30 selected photos for retouch |
| POST | /api/gallery/:id/receive | Customer | `09-gallery.md` | G9: Customer confirms photo receipt -> Marks booking Done |
| GET | /api/admin/accounts | Superadmin | `10-admin.md` | G11: List administrator accounts |
| POST | /api/admin/accounts | Superadmin | `10-admin.md` | G11: Create new administrator account |
| GET | /api/admin/settings | Superadmin | `10-admin.md` | G11: View studio opening hours and reminder configurations |
| PUT | /api/admin/settings | Superadmin | `10-admin.md` | G11: Update studio configurations |

---

## 6. One Error Shape Standard

Every error response returned by the system (HTTP $\ge 400$) MUST conform strictly to this JSON format:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request payload.",
    "fields": {
      "email": "Email or username is required",
      "password": "Password is required"
    }
  }
}
```
- `code` (string, required): SCREAMING_SNAKE_CASE identifier (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`).
- `message` (string, required): Human-readable error message.
- `fields` (object, required for 400 Bad Request): Maps invalid field names to error messages for direct inline form feedback.

---

## 7. Mock Server & Testing Modes

The mock server in `mock/server.mjs` runs on Node.js built-ins only (`node mock/server.mjs`, port 3001). It responds with clean single-line logs (`<METHOD> <PATH> <STATUS>`). It supports 4 modes via the `MOCK_MODE` environment variable:
1. `MOCK_MODE=normal`: Standard response time (~150ms).
2. `MOCK_MODE=slow`: 2000ms delay on every response. Used to test visual loading indicators.
3. `MOCK_MODE=error`: Returns HTTP 500 on all endpoints except `/api/auth/login`. Used to test in-place retry mechanisms.
4. `MOCK_MODE=empty`: Recursively transforms all array entities to `[]`. Used to test friendly empty-state views.

---

## 8. Frontend UX & Responsive Standards

- **Three Essential UX States for Every Data-Fetching Screen**:
  1. **Loading State**: Clear visual indication while data is in flight (skeleton or spinner).
  2. **Error State with Retry**: Informative error message accompanied by an in-place **"Retry"** button that re-fetches the data **without a full page refresh**.
  3. **Empty State**: Friendly UI when arrays are empty `[]` (never a blank white container or crash).
- **Request Efficiency**: Exactly **one request** per entity loaded. No infinite polling or redundant network waterfalls.
- **Form Semantics & Accessibility**:
  - Every form control (`input`, `select`, `textarea`) must have a visible `<label for="...">` linked to a unique `id`. Placeholders do not replace labels.
  - Client-side validation before sending; inline field-by-field server error display for HTTP 400 `fields`.
  - Disable submit buttons during in-flight requests. Never wipe user-entered inputs on submission failure.
- **Mobile-first Responsive**:
  - Full usability at **360px**, **768px**, and **1280px**.
  - **Zero horizontal scroll** across all widths. NEVER use `overflow-x: hidden` to mask layout overflow.
  - Standalone touch targets must be at least **44px $\times$ 44px** at 360px.
- **Offline Capable**:
  - The production build in `client/dist/` must function without an internet connection (`npx vite preview`). No CDN scripts or web font dependencies.

---

## 9. THE NEVER LIST (Absolute Project Constraints)

1. **NEVER call an endpoint not defined in `docs/api/`**. If an endpoint is missing, define it in the contract first.
2. **NEVER edit `docs/api/` or `mock/` to fix a client-side discrepancy** without explicit instruction. The contract is the source of truth.
3. **NEVER use absolute URLs** like `http://localhost:3001/api/...`. Always use relative paths `/api/...`.
4. **NEVER hardcode mock data in React components**. All dynamic content must be fetched from the API.
5. **NEVER omit Loading, Error (with in-place Retry), or Empty state** on any data-fetching view.
6. **NEVER add npm dependencies** without explicit approval from the team.
7. **NEVER use `overflow-x: hidden`** on `html`, `body`, or container wrappers to conceal layout bugs.
8. **NEVER use placeholders instead of visible `<label>` elements**.
9. **NEVER create floating popups that cover page content** on mobile (360px).
10. **NEVER commit or push internal files** (`brief.md`, `AI-LOG.md`, `PLAN*.md`, `.env`, secrets, course PDFs) to the Git repository. Keep them strictly local.
11. **NEVER use any language other than English** across all documentation, API contracts, rules, code comments, commit messages, and assistant responses.

---

## 10. Definition of Done & Handover Verification

Before declaring any feature or step complete:
1. **Mock Modes Verification**: Verify the view under `MOCK_MODE=normal`, `slow`, `error`, and `empty`. Confirm loading indicator, in-place retry, and empty state.
2. **Direct Route & Refresh Check**: Direct navigation via URL bar and browser refresh (`F5`) must load cleanly without state crash.
3. **Responsive Verification**: Verify at 360px, 768px, and 1280px in DevTools. Ensure zero horizontal scroll and tap targets $\ge 44\text{px}$.
4. **Contract Check Run**: Run `node tools/contract-check.mjs --base http://localhost:3001` against a freshly started mock server. Must pass with 0 FAIL lines.
5. **W3C Validation Check**: Copy rendered HTML from DevTools into W3C validator to guarantee 0 errors.
