# DUKStudio API Contract Documentation

Complete API specification for the **DUKStudio** (GradStudio) platform, supporting project milestones **PA#3** (React Front-end + Mock API) and **PA#4** (Express Back-end).

---

## 1. General Information

- **Base Path**: `/api` (All front-end requests use relative URLs `/api/...`).
- **Data Format**: `application/json` (for both request and response payloads, except multipart file uploads).
- **Encoding**: `UTF-8`.

---

## 2. Authentication & Authorization

The system utilizes token-based authentication via HTTP request headers:
```http
Authorization: Bearer <token>
```

In contract documentation and automated test suites (`contract-check`), token variables follow the established convention:
```http
Authorization: Bearer {{token:<account_name>}}
```
Where `<account_name>` corresponds to the identifier defined in the **Demo Accounts** table:
- `linh`: Customer — `linh@gradstudio.test`
- `thao`: Studio Admin — `thao@gradstudio.test`
- `mai`: Makeup Staff — `mai@gradstudio.test`
- `tuan`: Photographer Staff — `tuan@gradstudio.test`
- `superadmin`: Superadmin — `superadmin@gradstudio.test`

Tokens are granted via the sign-in endpoint `POST /api/auth/login`. During the Mock API stage (PA#3), tokens maintain the stable format `token-<account_name>` to ensure valid sessions persist across server restarts and testing modes.

Every endpoint except `POST /api/auth/login` and the public `GET /api/catalog` requires this header. A request with a missing, malformed or unknown token answers `401 Unauthorized`; a valid token whose role is not listed in the endpoint's **Roles** column answers `403 Forbidden`. Each resource file may omit these two examples when the answer is exactly this rule.

---

## 3. One Error Shape

Every error response returned by the system (HTTP status $\ge 400$) **must** adhere strictly to a single, standardized JSON structure:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request payload.",
    "fields": {
      "email": "Invalid email address format",
      "password": "Password must contain at least 6 characters"
    }
  }
}
```

### Detailed Rules:
1. `code` (string, required): Standard error identifier in SCREAMING_SNAKE_CASE (e.g., `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`).
2. `message` (string, required): Concise, user-friendly description of the error.
3. `fields` (object, optional):
   - **Mandatory for `400 Bad Request`**: An object mapping invalid field names directly to localized validation error messages, enabling the user interface to display error notices next to matching inputs.
   - For other status codes (`401`, `403`, `404`, `409`, `500`), `fields` may be omitted or empty `{}`.

---

## 4. Standard HTTP Status Codes

| Status Code | Standard Name | Usage in System |
|---|---|---|
| `200` | `OK` | Request succeeded; returned for standard GET queries and successful updates. |
| `201` | `Created` | Resource successfully created (conversation, booking, message, account). |
| `400` | `Bad Request` | Malformed payload, missing required parameters, or validation failure (includes `fields` object). |
| `401` | `Unauthorized` | Missing, invalid, or expired Bearer token. |
| `403` | `Forbidden` | Authenticated user lacks permission to perform this action (role mismatch or resource owner mismatch). |
| `404` | `Not Found` | Resource identifier (`:id`) was not found in the system. |
| `409` | `Conflict` | Business logic conflict (e.g. creating booking before customer agrees to proposed slot, staff/room schedule clash). |
| `500` | `Internal Server Error` | Server internal failure (used in test mode `MOCK_MODE=error`). |

---

## 5. Master Endpoint Table

This table enumerates all 30 endpoints across the 11 main-flow steps (G1–G11), mapped to 10 granular contract files in `docs/api/`.

| Method | Path | Roles | File Contract | Main Flow Step |
|---|---|---|---|---|
| POST | /api/auth/login | Visitor | `01-auth.md` | G2: Sign in to system |
| POST | /api/auth/logout | Authenticated | `01-auth.md` | G2: Sign out |
| GET | /api/auth/me | Authenticated | `01-auth.md` | G2: Current authenticated user profile |
| GET | /api/catalog | Visitor, Customer | `02-catalog.md` | G1: Packages, services, price list, accessories, feedback |
| GET | /api/conversations | Customer, Admin | `03-chat.md` | G3, G4: Admin gets all conversations by 4 status tabs; Customer gets only their own |
| POST | /api/conversations | Customer | `03-chat.md` | G3: Customer initiates inquiry / booking request |
| GET | /api/conversations/:id | Customer, Admin | `03-chat.md` | G3, G4: Conversation details and message history |
| POST | /api/conversations/:id/messages | Customer, Admin | `03-chat.md` | G3, G4: Send new message |
| POST | /api/conversations/:id/propose-time | Admin | `03-chat.md` | G5, G6: Admin posts proposed shoot schedule to chat |
| POST | /api/conversations/:id/respond-proposal | Customer | `03-chat.md` | G6: Customer accepts or rejects proposed shoot schedule |
| GET | /api/schedule | Admin | `04-schedule.md` | G5, G10: Staff, rooms and busy slots of one day (`?date=YYYY-MM-DD`) |
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
| POST | /api/gallery/:id/receive | Customer | `09-gallery.md` | G9: Customer presses Nhận ảnh -> booking becomes Hoàn thành |
| GET | /api/admin/accounts | Superadmin | `10-admin.md` | G11: List administrator accounts |
| POST | /api/admin/accounts | Superadmin | `10-admin.md` | G11: Create new administrator account |
| GET | /api/admin/settings | Superadmin | `10-admin.md` | G11: View studio opening hours and reminder configurations |
| PUT | /api/admin/settings | Superadmin | `10-admin.md` | G11: Update studio configurations |

---

## 6. Change History (## Changes)

- **2026-11-23** (Trung Kiên):
  - Initialized master API contract `docs/api/README.md` for milestone PA#3.
  - Standardized `/api` base path and `Bearer {{token:<name>}}` authentication header format.
  - Formalized `One Error Shape` schema with dedicated `fields` object for `400 Bad Request`.
  - Defined master table of 29 standard endpoints across 11 main-flow steps (G1–G11) and 4 user roles.

- **2026-11-25** (Hạ Uyên, agreed by the team in the endpoint review):
  - Added `GET /api/schedule` (Admin, `04-schedule.md`) so the clash check (G5) and reschedule (G10) forms load staff, rooms and busy slots from the API instead of hard-coding them. The table now lists 30 endpoints.
  - Opened `GET /api/conversations` to Customer (own conversations only) so `/chat` can find the signed-in customer's conversation when opened directly.
  - Stated the general 401/403 rule for authenticated endpoints in section 2.
