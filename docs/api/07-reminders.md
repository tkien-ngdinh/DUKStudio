# Reminders API Contract (07-reminders.md)

Specification of customer appointment notification and reminder endpoints for the DUKStudio platform (serving Step G7). Automated reminders are scheduled according to system configuration (e.g. 24 hours prior to the earliest appointment milestone) and dispatched via email and in-app notifications.

---

## 1. List Customer Reminders (GET /api/reminders)

Retrieves all upcoming and dispatched appointment reminders for the authenticated customer. Each reminder item includes its scheduled delivery time, dispatch channel, system delivery status, and a human-readable status label.

- **Endpoint**: `GET /api/reminders`
- **Permissions**: Customer role (`customer`).
- **Required Header**: `Authorization: Bearer <token>`

### Success Example — Active Reminders (200 OK)

Customer Linh retrieves active reminder notifications linked to her seeded booking `GS-1023` scheduled for October 24, 2026. The reminder was triggered 24 hours in advance (per studio settings `reminderHoursBefore: 24`).

```http
GET /api/reminders
Authorization: Bearer {{token:linh}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"reminders": [{"id": "rem-1023", "bookingId": "GS-1023", "channel": "email", "scheduledAt": "2026-10-23T13:00:00Z", "deliveryStatus": "sent", "statusLabel": "Sent", "title": "Nhắc lịch chụp ảnh tốt nghiệp GS-1023", "message": "Nhắc nhở: Buổi chụp tốt nghiệp của bạn diễn ra vào 13:00 ngày 24/10/2026 tại Phòng B DUKStudio.", "sentAt": "2026-10-23T13:00:00Z"}]}
```

### Empty Mode Behavior (MOCK_MODE=empty)

Under testing mode `MOCK_MODE=empty`, or when an account has no active reminders, the mock server transforms reminder array entities into empty arrays `[]` to verify client-side empty-state UI rendering:

```json
{
  "reminders": []
}
```

*(Note: In automated sequential contract checking, this empty payload is not executed against normal-mode server instances where reminders for `GS-1023` are already seeded).*

### Access Denied Example (403 Forbidden)

Returned when a non-customer account (e.g. photographer Tuấn) attempts to access customer reminder notifications.

```http
GET /api/reminders
Authorization: Bearer {{token:tuan}}

```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. Customer role required"}}
```

### Unauthenticated Example (401 Unauthorized)

Returned when the request lacks a valid Bearer authentication token.

```http
GET /api/reminders

```

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error": {"code": "UNAUTHORIZED", "message": "Missing or expired authentication token"}}
```

---

## Changes

- **2026-11-26** (Bích Diệp):
  - Revised `docs/api/07-reminders.md` to prevent sequential state conflict during automated contract checks.
  - Retained the normal-mode success example with all required reminder fields (`scheduledAt`, `channel`, `deliveryStatus`, and standardized English label `Sent`).
  - Documented `MOCK_MODE=empty` response behavior in JSON specification prose rather than an incompatible sequential HTTP request against normal-mode server state.
