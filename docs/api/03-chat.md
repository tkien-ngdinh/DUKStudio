# Customer Chat & Conversation Management API Contract (03-chat.md)

Specification of customer inquiry channels, real-time consultation messages, administrator schedule proposals, and proposal acceptance/rejection workflows for the DUKStudio platform (serving Steps G3, G4, G5, and G6).

---

## 1. List Studio Conversations (GET /api/conversations)

Retrieves all studio inquiries and conversations for consultation management. Conversations are organized across 4 operational status states: *Waiting for Studio* (`Chưa trả lời`), *Studio Answered* (`Đang tư vấn`), *Deposit Pending* (`Đã chốt lịch`), and *Done* (`Hoàn thành`).

- **Endpoint**: `GET /api/conversations`
- **Permissions**: Studio Admin role (`admin`), Superadmin (`superadmin`).
- **Required Header**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `status` (string, optional): Filter conversations by state (e.g. `Đã chốt lịch`, `Chưa trả lời`).

### Success Example (200 OK)

Admin Thảo lists all inquiries across the studio.

```http
GET /api/conversations
Authorization: Bearer {{token:thao}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"conversations": [{"id": "c-linh-01", "customerId": "u-linh", "customerName": "Nguyễn Thị Thúy Linh", "status": "Đã chốt lịch", "lastMessageAt": "2026-10-20T17:21:00Z", "bookingId": "GS-1023", "messages": [{"id": "m-01", "sender": "customer", "senderName": "Linh", "text": "Gói tốt nghiệp có makeup còn lịch 24/10 lúc 09:00 không?", "timestamp": "2026-10-20T17:20:00Z"}, {"id": "m-02", "sender": "admin", "senderName": "DUKStudio", "text": "Để mình kiểm tra lịch cho bạn nhé.", "timestamp": "2026-10-20T17:21:00Z"}, {"id": "m-03", "sender": "admin", "senderName": "DUKStudio", "text": "Bạn ơi, khung 09:00 ngày 24/10 bị trùng vì thợ makeup Mai bận 08:00–12:00. Studio đề xuất dời sang makeup 13:00–14:00 (Mai) và chụp 14:00–16:00 (Tuấn, Phòng B) nhé!", "timestamp": "2026-10-20T17:23:00Z", "proposal": {"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "status": "agreed"}}, {"id": "m-04", "sender": "customer", "senderName": "Linh", "text": "Dạ em đồng ý lịch 13:00 makeup và 14:00 chụp ạ!", "timestamp": "2026-10-20T17:24:00Z"}]}]}
```

### Access Denied Example (403 Forbidden)

Returned when a non-admin account (e.g. customer Linh) attempts to list studio conversations.

```http
GET /api/conversations
Authorization: Bearer {{token:linh}}

```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. Admin role required"}}
```

### Unauthenticated Example (401 Unauthorized)

Returned when the request lacks a valid Bearer token.

```http
GET /api/conversations

```

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error": {"code": "UNAUTHORIZED", "message": "Missing or expired authentication token"}}
```

---

## 2. Retrieve Conversation Details (GET /api/conversations/:id)

Retrieves full message history, proposal status, and linked booking metadata for a specific conversation.

- **Endpoint**: `GET /api/conversations/:id`
- **Permissions**: Conversation owner (`customer`), Studio Admin (`admin`), Superadmin (`superadmin`).
- **Required Header**: `Authorization: Bearer <token>`

### Success Example (200 OK)

Customer Linh retrieves her existing conversation history.

```http
GET /api/conversations/c-linh-01
Authorization: Bearer {{token:linh}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"conversation": {"id": "c-linh-01", "customerId": "u-linh", "customerName": "Nguyễn Thị Thúy Linh", "status": "Đã chốt lịch", "lastMessageAt": "2026-10-20T17:21:00Z", "bookingId": "GS-1023", "messages": [{"id": "m-01", "sender": "customer", "senderName": "Linh", "text": "Gói tốt nghiệp có makeup còn lịch 24/10 lúc 09:00 không?", "timestamp": "2026-10-20T17:20:00Z"}, {"id": "m-02", "sender": "admin", "senderName": "DUKStudio", "text": "Để mình kiểm tra lịch cho bạn nhé.", "timestamp": "2026-10-20T17:21:00Z"}, {"id": "m-03", "sender": "admin", "senderName": "DUKStudio", "text": "Bạn ơi, khung 09:00 ngày 24/10 bị trùng vì thợ makeup Mai bận 08:00–12:00. Studio đề xuất dời sang makeup 13:00–14:00 (Mai) và chụp 14:00–16:00 (Tuấn, Phòng B) nhé!", "timestamp": "2026-10-20T17:23:00Z", "proposal": {"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "status": "agreed"}}, {"id": "m-04", "sender": "customer", "senderName": "Linh", "text": "Dạ em đồng ý lịch 13:00 makeup và 14:00 chụp ạ!", "timestamp": "2026-10-20T17:24:00Z"}]}}
```

### Conversation Not Found Example (404 Not Found)

```http
GET /api/conversations/c-999
Authorization: Bearer {{token:thao}}

```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error": {"code": "NOT_FOUND", "message": "Conversation c-999 not found"}}
```

### Access Denied Example (403 Forbidden)

Returned when an unassigned staff member or unrelated customer attempts to read another customer's conversation.

```http
GET /api/conversations/c-linh-01
Authorization: Bearer {{token:tuan}}

```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. You are not authorized to view this conversation"}}
```

---

## 3. Create Booking Inquiry (POST /api/conversations)

Initiates a new customer inquiry and consultation thread for a photography shoot (Step G3). Initial conversation status is set to *Waiting for Studio* (`Chưa trả lời`).

- **Endpoint**: `POST /api/conversations`
- **Permissions**: Customer role (`customer`).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `packageId` (string, required): Desired service package identifier (e.g. `pkg-tot-nghiep-premium`).
  - `preferredDate` (string, required): Preferred shoot date in `YYYY-MM-DD` format (e.g. `2026-10-24`).
  - `message` (string, required): Customer's inquiry or question text.
  - `preferredTime` (string, optional): Desired start timeslot (e.g. `09:00`).
  - `notes` (string, optional): Additional customer requirements.

### Success Example (201 Created)

Customer Linh creates a new consultation inquiry.

```http
POST /api/conversations
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"packageId": "pkg-tot-nghiep-premium", "preferredDate": "2026-10-24", "preferredTime": "09:00", "message": "Gói tốt nghiệp có makeup còn lịch 24/10 lúc 09:00 không?", "notes": "Cần hỗ trợ 1 bộ áo cử nhân"}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"conversation": {"id": "c-linh-02", "customerId": "u-linh", "customerName": "Nguyễn Thị Thúy Linh", "status": "Chưa trả lời", "lastMessageAt": "2026-10-20T17:20:00Z", "bookingId": null, "messages": [{"id": "m-inquiry-01", "sender": "customer", "senderName": "Linh", "text": "Gói tốt nghiệp có makeup còn lịch 24/10 lúc 09:00 không?", "timestamp": "2026-10-20T17:20:00Z"}]}}
```

### Validation Error Example (400 Bad Request)

Returned when required inquiry fields (`packageId`, `preferredDate`, `message`) are missing or empty.

```http
POST /api/conversations
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"packageId": "", "preferredDate": "", "message": ""}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid conversation payload", "fields": {"packageId": "Package ID is required", "preferredDate": "Preferred shoot date is required", "message": "Inquiry message is required"}}}
```

### Access Denied Example (403 Forbidden)

Returned when non-customer accounts attempt to submit a customer inquiry.

```http
POST /api/conversations
Authorization: Bearer {{token:tuan}}
Content-Type: application/json

{"packageId": "pkg-tot-nghiep-premium", "preferredDate": "2026-10-24", "message": "Staff inquiry test"}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. Customer role required to initiate inquiry"}}
```

---

## 4. Send Message (POST /api/conversations/:id/messages)

Appends a new consultation message to an active conversation thread. When an admin replies, the conversation state advances to *Studio Answered* (`Đang tư vấn`).

- **Endpoint**: `POST /api/conversations/:id/messages`
- **Permissions**: Conversation owner (`customer`), Studio Admin (`admin`).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `text` (string, required): Content of the chat message.

### Success Example (201 Created)

Customer Linh sends a follow-up inquiry question to conversation `c-linh-01`.

```http
POST /api/conversations/c-linh-01/messages
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"text": "Dạ em có cần chuẩn bị trang phục gì trước khi đến studio không ạ?"}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"message": {"id": "m-05", "sender": "customer", "senderName": "Linh", "text": "Dạ em có cần chuẩn bị trang phục gì trước khi đến studio không ạ?", "timestamp": "2026-10-20T17:25:00Z"}}
```

### Validation Error Example (400 Bad Request)

Returned when the message content is empty or omitted.

```http
POST /api/conversations/c-linh-01/messages
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"text": ""}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid message payload", "fields": {"text": "Message text is required"}}}
```

### Conversation Not Found Example (404 Not Found)

```http
POST /api/conversations/c-999/messages
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"text": "Hello"}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error": {"code": "NOT_FOUND", "message": "Conversation c-999 not found"}}
```

---

## 5. Propose Shoot Schedule (POST /api/conversations/:id/propose-time)

Admin posts a formal shoot timeslot proposal into the conversation thread (Steps G5, G6). Used when customer's requested slot clashes or requires scheduling adjustments.

- **Endpoint**: `POST /api/conversations/:id/propose-time`
- **Permissions**: Studio Admin role (`admin`).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `date` (string, required): Proposed shoot date in `YYYY-MM-DD` format (e.g. `2026-10-24`).
  - `makeup` (string, required): Makeup session timeslot (e.g. `13:00 - 14:00`).
  - `shoot` (string, required): Photography shoot timeslot (e.g. `14:00 - 16:00`).
  - `room` (string, required): Designated studio room (e.g. `Phòng B`).
  - `text` (string, optional): Explanatory message accompanying the proposal.

### Success Example (200 OK)

Admin Thảo submits a proposed shoot slot with makeup and room assignment.

```http
POST /api/conversations/c-linh-01/propose-time
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "text": "Bạn ơi, khung 09:00 ngày 24/10 bị trùng vì thợ makeup Mai bận 08:00–12:00. Studio đề xuất dời sang makeup 13:00–14:00 (Mai) và chụp 14:00–16:00 (Tuấn, Phòng B) nhé!"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"proposal": {"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "status": "pending"}, "message": {"id": "m-06", "sender": "admin", "senderName": "DUKStudio", "text": "Bạn ơi, khung 09:00 ngày 24/10 bị trùng vì thợ makeup Mai bận 08:00–12:00. Studio đề xuất dời sang makeup 13:00–14:00 (Mai) và chụp 14:00–16:00 (Tuấn, Phòng B) nhé!", "timestamp": "2026-10-20T17:23:00Z", "proposal": {"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "status": "pending"}}}
```

### Validation Error Example (400 Bad Request)

Returned when mandatory schedule parameters (`date`, `makeup`, `shoot`, `room`) are empty or omitted.

```http
POST /api/conversations/c-linh-01/propose-time
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "", "makeup": "", "shoot": "", "room": ""}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid proposal payload", "fields": {"date": "Shoot date is required", "makeup": "Makeup timeslot is required", "shoot": "Shoot timeslot is required", "room": "Studio room is required"}}}
```

### Access Denied Example (403 Forbidden)

Returned when a non-admin account attempts to propose a shoot schedule.

```http
POST /api/conversations/c-linh-01/propose-time
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B"}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. Admin role required"}}
```

### Conversation Not Found Example (404 Not Found)

```http
POST /api/conversations/c-999/propose-time
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B"}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error": {"code": "NOT_FOUND", "message": "Conversation c-999 not found"}}
```

---

## 6. Respond to Time Proposal (POST /api/conversations/:id/respond-proposal)

Customer accepts or declines the studio's proposed shoot schedule (Step G6).
- If accepted (`accept`), the proposal status becomes `agreed` and conversation status transitions to *Deposit Pending* (`Đã chốt lịch`), unlocking confirmed booking creation (`POST /api/bookings`).
- If rejected (`reject`), the proposal status becomes `rejected` and conversation status reverts to *Studio Answered* (`Đang tư vấn`) for further consultation.

- **Endpoint**: `POST /api/conversations/:id/respond-proposal`
- **Permissions**: Conversation owner (`customer`).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `decision` (string, required): Customer decision, either `accept` or `reject`.

### Accept Proposal Example (200 OK)

Customer Linh agrees to the proposed schedule.

```http
POST /api/conversations/c-linh-01/respond-proposal
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"decision": "accept"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"status": "Đã chốt lịch", "proposal": {"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "status": "agreed"}, "message": {"id": "m-07", "sender": "customer", "senderName": "Linh", "text": "Dạ em đồng ý lịch 13:00 makeup và 14:00 chụp ạ!", "timestamp": "2026-10-20T17:24:00Z"}}
```

### Reject Proposal Example (200 OK)

Customer Linh declines the proposed schedule.

```http
POST /api/conversations/c-linh-01/respond-proposal
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"decision": "reject"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"status": "Đang tư vấn", "proposal": {"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "status": "rejected"}, "message": {"id": "m-08", "sender": "customer", "senderName": "Linh", "text": "Dạ khung giờ này em bận mất rồi, studio còn giờ nào khác không ạ?", "timestamp": "2026-10-20T17:24:30Z"}}
```

### Validation Error Example (400 Bad Request)

Returned when the decision field is missing or contains an invalid value.

```http
POST /api/conversations/c-linh-01/respond-proposal
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"decision": "invalid_decision"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid proposal response", "fields": {"decision": "Decision must be either 'accept' or 'reject'"}}}
```

### Access Denied Example (403 Forbidden)

Returned when another account attempts to respond to the proposal.

```http
POST /api/conversations/c-linh-01/respond-proposal
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"decision": "accept"}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. Only the customer who owns this conversation can respond to the proposal"}}
```

### Conversation Not Found Example (404 Not Found)

```http
POST /api/conversations/c-999/respond-proposal
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"decision": "accept"}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error": {"code": "NOT_FOUND", "message": "Conversation c-999 not found"}}
```

---

## Changes

- **2026-11-26** (Bích Diệp):
  - Initialized customer chat and conversation management API contract specification in `docs/api/03-chat.md` (Steps G3, G4, G5, G6).
  - Defined 6 core endpoints: `GET /api/conversations`, `POST /api/conversations`, `GET /api/conversations/:id`, `POST /api/conversations/:id/messages`, `POST /api/conversations/:id/propose-time`, and `POST /api/conversations/:id/respond-proposal`.
  - Documented role permissions, request payload schemas, seeded data interactions (`c-linh-01`, `GS-1023`), success responses, field-level HTTP 400 validation errors, and HTTP 401/403/404 handling.
