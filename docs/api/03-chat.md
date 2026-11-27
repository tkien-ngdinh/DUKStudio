# Customer Chat & Conversation Management API Contract (03-chat.md)

Specification of customer inquiry channels, real-time consultation messages, administrator schedule proposals, and customer proposal accept/decline workflows for the DUKStudio platform (serving Steps G3, G4, G5, and G6).

Conversation lifecycle rules: a conversation has at most one booking. A new booking request reuses the customer's latest conversation only when it is not `Hoàn thành` and has no booking; otherwise it creates a new conversation. An ordinary customer question joins the latest conversation even when it already has a booking. A customer message to a completed conversation starts a new conversation. Cancelling a linked booking does not change conversation status. A conversation becomes `Hoàn thành` automatically only when its linked booking is completed through `POST /api/gallery/:id/receive`.

---

## 1. List Studio Conversations (GET /api/conversations)

Retrieves all studio inquiries and conversations for consultation management. Conversations are organized across 4 operational status states: *Waiting for Studio* (`Chưa trả lời`), *Studio Answered* (`Đang tư vấn`), *Schedule Confirmed* (`Đã chốt lịch`), and *Done* (`Hoàn thành`).

- **Endpoint**: `GET /api/conversations`
- **Permissions**: Studio Admin role (`admin`).
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

{"conversations": […]}
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
- **Permissions**: Customer role (`customer` - conversation owner), Studio Admin role (`admin`).
- **Required Header**: `Authorization: Bearer <token>`

### Success Example — Customer Access (200 OK)

Customer Linh retrieves her existing conversation history.

```http
GET /api/conversations/c-linh-01
Authorization: Bearer {{token:linh}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"conversation":{"id":"c-linh-01","customerId":"u-linh","customerName":"Nguyễn Thị Thúy Linh","status":"Đã chốt lịch","lastMessageAt":"2026-10-20T17:24:00Z","bookingId":"GS-1023","messages":[{"id":"m-01","sender":"customer","senderName":"Linh","text":"Gói tốt nghiệp có makeup còn lịch 17/10 lúc 13:00 không?","timestamp":"2026-10-12T01:00:00Z"},{"id":"m-02","sender":"admin","senderName":"DUKStudio","text":"Dạ, studio kiểm tra lịch ngày 17/10 và sẽ xác nhận với em ngay nhé.","timestamp":"2026-10-12T01:05:00Z"},{"id":"m-03","sender":"admin","senderName":"DUKStudio","text":"Studio đề xuất makeup 13:00–14:00 và chụp 14:00–16:00 ngày 17/10 tại Phòng B nhé!","timestamp":"2026-10-12T01:10:00Z","proposal":{"date":"2026-10-17","makeup":"13:00 - 14:00","shoot":"14:00 - 16:00","room":"Phòng B","status":"agreed"}},{"id":"m-04","sender":"customer","senderName":"Linh","text":"Dạ em đồng ý lịch 13:00 makeup và 14:00 chụp ngày 17/10 ạ!","timestamp":"2026-10-12T01:15:00Z"},{"id":"m-05","sender":"customer","senderName":"Linh","text":"Dạ em hỏi studio khi nào sẽ gửi ảnh xem trước để em chọn ạ?","timestamp":"2026-10-20T17:24:00Z"}]}}
```

### Success Example — Admin Access (200 OK)

Admin Thảo inspects the customer conversation.

```http
GET /api/conversations/c-linh-01
Authorization: Bearer {{token:thao}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"conversation":{"id":"c-linh-01","customerId":"u-linh","customerName":"Nguyễn Thị Thúy Linh","status":"Đã chốt lịch","lastMessageAt":"2026-10-20T17:24:00Z","bookingId":"GS-1023","messages":[{"id":"m-01","sender":"customer","senderName":"Linh","text":"Gói tốt nghiệp có makeup còn lịch 17/10 lúc 13:00 không?","timestamp":"2026-10-12T01:00:00Z"},{"id":"m-02","sender":"admin","senderName":"DUKStudio","text":"Dạ, studio kiểm tra lịch ngày 17/10 và sẽ xác nhận với em ngay nhé.","timestamp":"2026-10-12T01:05:00Z"},{"id":"m-03","sender":"admin","senderName":"DUKStudio","text":"Studio đề xuất makeup 13:00–14:00 và chụp 14:00–16:00 ngày 17/10 tại Phòng B nhé!","timestamp":"2026-10-12T01:10:00Z","proposal":{"date":"2026-10-17","makeup":"13:00 - 14:00","shoot":"14:00 - 16:00","room":"Phòng B","status":"agreed"}},{"id":"m-04","sender":"customer","senderName":"Linh","text":"Dạ em đồng ý lịch 13:00 makeup và 14:00 chụp ngày 17/10 ạ!","timestamp":"2026-10-12T01:15:00Z"},{"id":"m-05","sender":"customer","senderName":"Linh","text":"Dạ em hỏi studio khi nào sẽ gửi ảnh xem trước để em chọn ạ?","timestamp":"2026-10-20T17:24:00Z"}]}}
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

Returned when an unassigned staff member or unauthorized user attempts to read another customer's conversation.

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
  - `packageId` (string, required): Desired service package identifier (e.g. `pkg-tn-premium`).
  - `preferredDate` (string, required): Preferred shoot date in `YYYY-MM-DD` format (e.g. `2026-10-24`).
  - `message` (string, required): Customer's inquiry or question text.
  - `preferredTime` (string, optional): Desired start timeslot (e.g. `09:00`).
  - `extras` (array of strings, optional): Extra identifiers to record for studio coordination; extras do not add to the package price.
  - `participantCount` (integer, required for a package priced per person): Number of participants; the booking total is calculated by the server.
  - `notes` (string, optional): Additional customer requirements.

### Success Example (201 Created)

Customer Linh sends a new booking request. Her latest conversation `c-linh-01` already has booking GS-1023, so this request starts a new conversation. The seed also contains an older thread (`c-linh-05`) with a pending proposal but no booking; it is not reused because it is not the latest conversation.

```http
POST /api/conversations
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"packageId": "pkg-tn-premium", "preferredDate": "2026-10-24", "preferredTime": "09:00", "extras": ["ex-makeup"], "message": "Gói tốt nghiệp có makeup còn lịch 24/10 lúc 09:00 không?", "notes": "Cần hỗ trợ 1 bộ áo cử nhân"}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"conversation":{"id":"c-linh-06","customerId":"u-linh","customerName":"Linh","status":"Chưa trả lời","lastMessageAt":"2026-10-21T09:00:00Z","bookingId":null,"request":{"packageId":"pkg-tn-premium","preferredDate":"2026-10-24","preferredTime":"09:00","extras":["ex-makeup"],"notes":"Cần hỗ trợ 1 bộ áo cử nhân","participantCount":null},"messages":[{"id":"m-inquiry-01","sender":"customer","senderName":"Linh","text":"Gói tốt nghiệp có makeup còn lịch 24/10 lúc 09:00 không?","timestamp":"2026-10-21T09:00:00Z"}]}}
```

### Combined Validation Error Example (400 Bad Request)

Returned when all required inquiry fields (`packageId`, `preferredDate`, `message`) are missing or empty.

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

### Individual Field Validation — Missing Package (400 Bad Request)

```http
POST /api/conversations
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"packageId": "", "preferredDate": "2026-10-24", "message": "Gói tốt nghiệp có makeup còn lịch không ạ?"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid conversation payload", "fields": {"packageId": "Package ID is required"}}}
```

### Individual Field Validation — Missing Preferred Date (400 Bad Request)

```http
POST /api/conversations
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"packageId": "pkg-tn-premium", "preferredDate": "", "message": "Gói tốt nghiệp có makeup còn lịch không ạ?"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid conversation payload", "fields": {"preferredDate": "Preferred shoot date is required"}}}
```

### Individual Field Validation — Missing Inquiry Message (400 Bad Request)

```http
POST /api/conversations
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"packageId": "pkg-tn-premium", "preferredDate": "2026-10-24", "message": ""}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid conversation payload", "fields": {"message": "Inquiry message is required"}}}
```

### Access Denied Example (403 Forbidden)

Returned when non-customer accounts attempt to submit a customer inquiry.

```http
POST /api/conversations
Authorization: Bearer {{token:tuan}}
Content-Type: application/json

{"packageId": "pkg-tn-premium", "preferredDate": "2026-10-24", "message": "Staff inquiry test"}
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
- **Permissions**: Customer role (`customer` - conversation owner), Studio Admin role (`admin`).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `text` (string, required): Content of the chat message.

### Success Example — Customer Message (201 Created)

Customer Linh sends a follow-up inquiry question to conversation `c-linh-01`.

```http
POST /api/conversations/c-linh-01/messages
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"text":"Dạ em chọn ảnh trong thời hạn bao lâu ạ?"}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"message":{"id":"m-06","sender":"customer","senderName":"Linh","text":"Dạ em chọn ảnh trong thời hạn bao lâu ạ?","timestamp":"2026-10-20T17:25:00Z"}}
```

### Success Example — Admin Reply (201 Created)

Admin Thảo sends an advisory response to the customer.

```http
POST /api/conversations/c-linh-01/messages
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"text":"Sau khi gửi ảnh xem trước, em có thể chọn tối đa 30 ảnh theo gói Premium nhé!"}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"message":{"id":"m-07","sender":"admin","senderName":"DUKStudio","text":"Sau khi gửi ảnh xem trước, em có thể chọn tối đa 30 ảnh theo gói Premium nhé!","timestamp":"2026-10-20T17:26:00Z"}}
```

### Validation Error Example — Empty Message (400 Bad Request)

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

### Proposal Lifecycle & Active State

When an admin posts a proposal via `POST /api/conversations/:id/propose-time`, the newly submitted proposal supersedes any previous proposal on the conversation (including any previously `agreed` or `declined` proposal) and becomes the conversation's active proposal with status `pending`. The conversation status updates to *Studio Answered* (`Đang tư vấn`) awaiting the customer's response, and a new proposal message is appended to the message history.

### Success Example (200 OK)

Admin Thảo submits the first proposal on the new conversation `c-linh-06`, establishing its active proposal as `pending`.

```http
POST /api/conversations/c-linh-06/propose-time
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "text": "Studio đề xuất điều chỉnh lịch chụp: makeup 13:00–14:00 (Mai) và chụp 14:00–16:00 (Tuấn, Phòng B) ngày 24/10 nhé!"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"proposal": {"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "status": "pending"}, "message": {"id": "m-02", "sender": "admin", "senderName": "DUKStudio", "text": "Studio đề xuất điều chỉnh lịch chụp: makeup 13:00–14:00 (Mai) và chụp 14:00–16:00 (Tuấn, Phòng B) ngày 24/10 nhé!", "timestamp": "2026-10-21T09:01:00Z", "proposal": {"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "status": "pending"}}}
```

### Combined Validation Error Example (400 Bad Request)

Returned when mandatory schedule parameters (`date`, `makeup`, `shoot`, `room`) are empty or omitted.

```http
POST /api/conversations/c-linh-06/propose-time
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "", "makeup": "", "shoot": "", "room": ""}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid proposal payload", "fields": {"date": "Shoot date is required", "makeup": "Makeup timeslot is required", "shoot": "Shoot timeslot is required", "room": "Studio room is required"}}}
```

### Individual Field Validation — Missing Date (400 Bad Request)

```http
POST /api/conversations/c-linh-06/propose-time
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid proposal payload", "fields": {"date": "Shoot date is required"}}}
```

### Individual Field Validation — Missing Makeup Timeslot (400 Bad Request)

```http
POST /api/conversations/c-linh-06/propose-time
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "2026-10-24", "makeup": "", "shoot": "14:00 - 16:00", "room": "Phòng B"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid proposal payload", "fields": {"makeup": "Makeup timeslot is required"}}}
```

### Individual Field Validation — Missing Shoot Timeslot (400 Bad Request)

```http
POST /api/conversations/c-linh-06/propose-time
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "", "room": "Phòng B"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid proposal payload", "fields": {"shoot": "Shoot timeslot is required"}}}
```

### Individual Field Validation — Missing Studio Room (400 Bad Request)

```http
POST /api/conversations/c-linh-06/propose-time
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "2026-10-24", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": ""}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid proposal payload", "fields": {"room": "Studio room is required"}}}
```

### Access Denied Example (403 Forbidden)

Returned when a non-admin account attempts to propose a shoot schedule.

```http
POST /api/conversations/c-linh-06/propose-time
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
- If declined (`decline`), the active proposal status becomes `declined` and conversation status reverts to *Studio Answered* (`Đang tư vấn`) for scheduling adjustments.
- If accepted (`accept`), the active proposal status becomes `agreed` and conversation status transitions to *Schedule Confirmed* (`Đã chốt lịch`), unlocking confirmed booking creation (`POST /api/bookings`).

- **Endpoint**: `POST /api/conversations/:id/respond-proposal`
- **Permissions**: Customer role (`customer` - conversation owner).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `decision` (string, required): Customer decision, either `accept` or `decline`.

> [!NOTE]
> **Sequential execution and separate scenarios**:
> - The main booking flow follows PA2: Linh asks about 24/10 at 09:00; after the clash check, Admin proposes makeup 13:00-14:00 and shooting 14:00-16:00 in Phong B. Linh accepts this proposal, and GS-1024 is created from it.
> - The decline-and-reproposal example is a separate seeded conversation, c-linh-05. It has a pending proposal and no booking, so declining it leaves the conversation in Đang tư vấn; Admin can then propose another time in that same conversation.
> Each proposal may be answered only once. A new proposal supersedes the previous proposal and becomes pending. If running examples independently, ensure the target conversation contains an active pending proposal.

### Accept Proposal Example - PA2 Main Flow (200 OK)

Customer Linh accepts the 24/10 at 14:00 shoot proposal.

```http
POST /api/conversations/c-linh-06/respond-proposal
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"decision": "accept"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"status":"Đã chốt lịch","proposal":{"date":"2026-10-24","makeup":"13:00 - 14:00","shoot":"14:00 - 16:00","room":"Phòng B","status":"agreed"},"message":{"id":"m-03","sender":"customer","senderName":"Linh","text":"D\u1ea1 em \u0111\u1ed3ng \u00fd l\u1ecbch 13:00 makeup v\u00e0 14:00 ch\u1ee5p \u1ea1!","timestamp":"2026-10-21T09:02:00Z"}}
```

### Decline Proposal Example (200 OK)

Customer Linh declines the pending proposal in the separate seeded conversation c-linh-05.

```http
POST /api/conversations/c-linh-05/respond-proposal
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"decision": "decline"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"status": "Đang tư vấn", "proposal": {"date": "2026-10-25", "makeup": "14:00 - 15:00", "shoot": "15:00 - 17:00", "room": "Phòng B", "status": "declined"}, "message": {"id": "m-03", "sender": "customer", "senderName": "Linh", "text": "D\u1ea1 khung gi\u1edd n\u00e0y em b\u1eadn m\u1ea5t r\u1ed3i, studio c\u00f2n gi\u1edd n\u00e0o kh\u00e1c kh\u00f4ng \u1ea1?", "timestamp": "2026-10-20T10:30:00Z"}}
```

### Studio Proposes Alternative Slot (200 OK)

Following the decline, Admin Thao proposes another time in c-linh-05. The conversation remains available for further proposals until Linh agrees to one.

```http
POST /api/conversations/c-linh-05/propose-time
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "2026-10-26", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "text": "Studio proposes another slot on 26/10: makeup 13:00-14:00 and shoot 14:00-16:00 in Phòng B."}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"proposal": {"date": "2026-10-26", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "status": "pending"}, "message": {"id": "m-04", "sender": "admin", "senderName": "DUKStudio", "text": "Studio proposes another slot on 26/10: makeup 13:00-14:00 and shoot 14:00-16:00 in Phòng B.", "timestamp": "2026-10-20T10:31:00Z", "proposal": {"date": "2026-10-26", "makeup": "13:00 - 14:00", "shoot": "14:00 - 16:00", "room": "Phòng B", "status": "pending"}}}
```

### Accept Revised Proposal Example (200 OK)

Customer Linh accepts the alternative time in c-linh-05.

```http
POST /api/conversations/c-linh-05/respond-proposal
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"decision": "accept"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"status":"Đã chốt lịch","proposal":{"date":"2026-10-26","makeup":"13:00 - 14:00","shoot":"14:00 - 16:00","room":"Phòng B","status":"agreed"},"message":{"id":"m-05","sender":"customer","senderName":"Linh","text":"D\u1ea1 em \u0111\u1ed3ng \u00fd l\u1ecbch 13:00 makeup v\u00e0 14:00 ch\u1ee5p \u1ea1!","timestamp":"2026-10-20T10:32:00Z"}}
```

### Validation Error Example — Missing Decision (400 Bad Request)

Returned when the decision field is empty or omitted.

```http
POST /api/conversations/c-linh-06/respond-proposal
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"decision": ""}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid proposal response", "fields": {"decision": "Decision must be either 'accept' or 'decline'"}}}
```

### Validation Error Example — Invalid Decision Value (400 Bad Request)

Returned when the decision field contains an unsupported action.

```http
POST /api/conversations/c-linh-06/respond-proposal
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"decision": "invalid_choice"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid proposal response", "fields": {"decision": "Decision must be either 'accept' or 'decline'"}}}
```

### Access Denied Example (403 Forbidden)

Returned when a non-customer or unauthorized account attempts to respond to the proposal.

```http
POST /api/conversations/c-linh-06/respond-proposal
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
  - Aligned permissions strictly with master endpoint table in `README.md` (`Admin` for listing/proposals, `Customer` for inquiries/responses, `Customer/Admin` for details/messages; removed unauthorized superadmin role mentions).
  - Standardized customer proposal decisions to `accept` and `decline` across request schemas, validation error responses, and state transitions (replacing `reject`).
  - Defined proposal lifecycle rules where a new admin proposal supersedes any previous proposal (including seeded `agreed` proposal) to become the active `pending` proposal.
  - Sequenced proposal examples so that customer declines proposal 1, admin proposes revised slot, and customer accepts revised slot, with every proposal answered exactly once.
  - Added independent HTTP 400 validation examples for `makeup` and `room` on `POST /api/conversations/:id/propose-time` alongside `date`, `shoot`, and combined invalid-fields examples.
  - Formatted strictly increasing timestamps (`17:25:00Z` through `17:30:00Z`) and sequential message IDs (`m-05` through `m-10`) across all `c-linh-06` message and proposal interactions.

- **2026-11-27**:
  - Aligned the main G3-G6 booking path with the PA2 example (Linh agrees to 24/10 at 14:00); retained decline and re-proposal coverage in the separate seeded c-linh-05 conversation.
  - Documented the optional `extras` request field as coordination data only; extras have no separate booking price and do not alter the package price.
  - Removed legacy price and unit fields from seeded extras so their stored data cannot imply that they add charges to bookings.
  - Renamed the English label for `Đã chốt lịch` to *Schedule Confirmed* to distinguish conversation state from the booking's deposit state.
