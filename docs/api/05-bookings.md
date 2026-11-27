# Bookings API Contract (05-bookings.md)

Specification of booking creation from an agreed chat proposal, booking lists and details, rescheduling (with the clash check of `04-schedule.md`), cancellation and the final photo link (serving Steps G6, G7 and G10).

---

## 0. Booking Object

Every endpoint in this file answers with this object (or a list of it).

| Field | Type | Notes |
|---|---|---|
| `id` | string | `GS-<number>`. A new booking takes the highest existing number + 1. |
| `conversationId` | string or null | The chat the booking was created from; `null` for bookings made outside the chat. |
| `customerId`, `customerName` | string | `customerName` is the short name (`Linh`). |
| `serviceId`, `serviceName`, `packageId`, `packageName` | string | From the catalog (`02-catalog.md`). |
| `extras` | array | `{id, name}` coordination notes; extras do not add to package price. |
| `date` | string | Shoot day, `YYYY-MM-DD`. |
| `makeup` | object or null | `{start, end, staffId, staffName}`; `null` when the package has no make-up. |
| `shoot` | object | `{start, end, staffId, staffName, roomId, roomName}`. |
| `price` | object | `{total, deposit, remaining}` in whole đồng (deposit 30%, remaining 70%). |
| `status` | string | One of `Chờ cọc 30%`, `Đã đặt lịch`, `Hoàn thành`, `Đã hủy`. |
| `paymentStatus` | string | One of `Chưa cọc`, `Đã cọc 30%`, `Đã thanh toán đủ`. |
| `photoStatus` | string | One of `Chưa có ảnh`, `Chờ chọn ảnh`, `Đã chọn ảnh`, `Đã có link ảnh cuối`, `Đã nhận ảnh`. |
| `maxSelect` | number | How many photos the customer may choose for retouching. |
| `previews` | array | `{id, url, alt}` watermarked previews (added by `08-jobs.md` uploads). |
| `selectedPhotoIds` | array | Preview ids chosen in G9 (`09-gallery.md`). |
| `finalLink` | string or null | `null` until the admin adds it in G10. |
| `cancelReason` | string or null | `null` unless `status` is `Đã hủy`. |
| `createdAt` | string | ISO 8601 UTC. |

**List items** (`GET /api/bookings`) carry every field except `previews` and `selectedPhotoIds`; the full object comes from `GET /api/bookings/:id`.

---

## 1. Create Booking (POST /api/bookings)

Creates a booking from a conversation whose latest proposal the customer has accepted. The date, times, staff and room are copied from that accepted proposal; the package, extras and price from the conversation's request. A new booking starts at `Chờ cọc 30%` / `Chưa cọc` / `Chưa có ảnh`. The slot is not held until the deposit succeeds (`06-payments.md`).

For packages priced per person, the inquiry includes `participantCount`; the server calculates `price.total = package.price × participantCount`, then calculates the 30% deposit and 70% remainder. Other packages use the fixed package price. Extras are stored for coordination and do not change the price.

- **Endpoint**: `POST /api/bookings`
- **Permissions**: Admin role (`admin`).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `conversationId` (string, required): The conversation to book from.
- **Effect**: The conversation gets `bookingId` and a system message; the staff get their jobs (`08-jobs.md`, `job-108` and `job-109` for GS-1024, after GS-1021's `job-106` and `job-107`).
- **Errors**: `409 CONFLICT` when the conversation has no accepted proposal (the **Tạo booking** button stays disabled in the UI for the same reason) or already has a booking; `404 NOT_FOUND` for an unknown conversation.

### Proposal Not Accepted Example (409 Conflict)

c-1003 (Đỗ Minh Châu) has a proposal for 31/10 10:00 that is still `pending`.

```http
POST /api/bookings
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"conversationId":"c-1003"}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error":{"code":"CONFLICT","message":"The customer has not accepted the proposed time yet"}}
```

### Success Example (201 Created)

`03-chat.md` leaves c-linh-06 with Linh's accepted proposal for 24/10 (makeup 13:00–14:00, shoot 14:00–16:00).

```http
POST /api/bookings
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"conversationId":"c-linh-06"}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"booking":{"id":"GS-1024","conversationId":"c-linh-06","customerId":"u-linh","customerName":"Linh","serviceId":"svc-tot-nghiep","serviceName":"Chụp tốt nghiệp","packageId":"pkg-tn-premium","packageName":"Gói Tốt nghiệp Premium","extras":[{"id":"ex-makeup","name":"Trang điểm"}],"date":"2026-10-24","makeup":{"start":"13:00","end":"14:00","staffId":"u-mai","staffName":"Mai"},"shoot":{"start":"14:00","end":"16:00","staffId":"u-tuan","staffName":"Tuấn","roomId":"room-b","roomName":"Phòng B"},"price":{"total":1800000,"deposit":540000,"remaining":1260000},"status":"Chờ cọc 30%","paymentStatus":"Chưa cọc","photoStatus":"Chưa có ảnh","maxSelect":30,"previews":[],"selectedPhotoIds":[],"finalLink":null,"cancelReason":null,"createdAt":"2026-10-21T09:02:00Z"}}
```

### Missing Conversation Example (400 Bad Request)

```http
POST /api/bookings
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error":{"code":"BAD_REQUEST","message":"Invalid booking payload","fields":{"conversationId":"Conversation id is required"}}}
```

### Access Denied Example (403 Forbidden)

```http
POST /api/bookings
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"conversationId":"c-linh-06"}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error":{"code":"FORBIDDEN","message":"Access denied. Admin role required"}}
```

---

## 2. List Bookings (GET /api/bookings)

A customer gets only their own bookings (G7, `/my-bookings`); an admin gets every studio booking (G10, `/admin/bookings`). Sorted by `id`.

- **Endpoint**: `GET /api/bookings`
- **Permissions**: Customer (own only), Admin (all).
- **Required Header**: `Authorization: Bearer <token>`

### Customer Example (200 OK)

```http
GET /api/bookings
Authorization: Bearer {{token:linh}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"bookings":[{"id":"GS-1023","conversationId":"c-linh-01","customerId":"u-linh","customerName":"Linh","serviceId":"svc-tot-nghiep","serviceName":"Chụp tốt nghiệp","packageId":"pkg-tn-premium","packageName":"Gói Tốt nghiệp Premium","extras":[],"date":"2026-10-17","makeup":{"start":"13:00","end":"14:00","staffId":"u-mai","staffName":"Mai"},"shoot":{"start":"14:00","end":"16:00","staffId":"u-tuan","staffName":"Tuấn","roomId":"room-b","roomName":"Phòng B"},"price":{"total":1800000,"deposit":540000,"remaining":1260000},"status":"Đã đặt lịch","paymentStatus":"Đã cọc 30%","photoStatus":"Chờ chọn ảnh","maxSelect":30,"finalLink":null,"cancelReason":null,"createdAt":"2026-10-12T01:30:00Z"},{"id":"GS-1024","conversationId":"c-linh-06","customerId":"u-linh","customerName":"Linh","serviceId":"svc-tot-nghiep","serviceName":"Chụp tốt nghiệp","packageId":"pkg-tn-premium","packageName":"Gói Tốt nghiệp Premium","extras":[{"id":"ex-makeup","name":"Trang điểm"}],"date":"2026-10-24","makeup":{"start":"13:00","end":"14:00","staffId":"u-mai","staffName":"Mai"},"shoot":{"start":"14:00","end":"16:00","staffId":"u-tuan","staffName":"Tuấn","roomId":"room-b","roomName":"Phòng B"},"price":{"total":1800000,"deposit":540000,"remaining":1260000},"status":"Chờ cọc 30%","paymentStatus":"Chưa cọc","photoStatus":"Chưa có ảnh","maxSelect":30,"finalLink":null,"cancelReason":null,"createdAt":"2026-10-21T09:02:00Z"}]}
```

### Admin Example (200 OK)

```http
GET /api/bookings
Authorization: Bearer {{token:thao}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"bookings":[{"id":"GS-1017","conversationId":null,"customerId":"cus-anh","customerName":"Phan Ngọc Anh","serviceId":"svc-tot-nghiep","serviceName":"Chụp tốt nghiệp","packageId":"pkg-tn-nhom","packageName":"Gói Tốt nghiệp Nhóm (tối đa 5 người)","extras":[],"date":"2026-10-24","makeup":{"start":"08:00","end":"12:00","staffId":"u-mai","staffName":"Mai"},"shoot":{"start":"09:30","end":"12:30","staffId":"st-khoa","staffName":"Khoa","roomId":"room-a","roomName":"Phòng A"},"price":{"total":4500000,"deposit":1350000,"remaining":3150000},"status":"Đã đặt lịch","paymentStatus":"Đã cọc 30%","photoStatus":"Chưa có ảnh","maxSelect":30,"finalLink":null,"cancelReason":null,"createdAt":"2026-10-15T02:30:00Z"},{"id":"GS-1018","conversationId":null,"customerId":"cus-thinh","customerName":"Lương Đức Thịnh","serviceId":"svc-chan-dung","serviceName":"Chân dung / Profile CV","packageId":"pkg-chan-dung","packageName":"Gói Chân dung Profile","extras":[],"date":"2026-10-24","makeup":null,"shoot":{"start":"16:30","end":"17:30","staffId":"u-tuan","staffName":"Tuấn","roomId":"room-a","roomName":"Phòng A"},"price":{"total":690000,"deposit":207000,"remaining":483000},"status":"Đã đặt lịch","paymentStatus":"Đã cọc 30%","photoStatus":"Chưa có ảnh","maxSelect":10,"finalLink":null,"cancelReason":null,"createdAt":"2026-10-18T13:00:00Z"},{"id":"GS-1019","conversationId":"c-1004","customerId":"cus-ha","customerName":"Huỳnh Thu Hà","serviceId":"svc-tot-nghiep","serviceName":"Chụp tốt nghiệp","packageId":"pkg-tn-premium","packageName":"Gói Tốt nghiệp Premium","extras":[],"date":"2026-10-10","makeup":{"start":"13:00","end":"14:00","staffId":"u-mai","staffName":"Mai"},"shoot":{"start":"14:00","end":"16:00","staffId":"u-tuan","staffName":"Tuấn","roomId":"room-b","roomName":"Phòng B"},"price":{"total":1800000,"deposit":540000,"remaining":1260000},"status":"Hoàn thành","paymentStatus":"Đã thanh toán đủ","photoStatus":"Đã nhận ảnh","maxSelect":30,"finalLink":"https://files.gradstudio.test/final/GS-1019.zip","cancelReason":null,"createdAt":"2026-10-03T02:00:00Z"},{"id":"GS-1020","conversationId":null,"customerId":"cus-bao","customerName":"Võ Gia Bảo","serviceId":"svc-chan-dung","serviceName":"Chân dung / Profile CV","packageId":"pkg-chan-dung","packageName":"Gói Chân dung Profile","extras":[],"date":"2026-10-31","makeup":null,"shoot":{"start":"15:00","end":"16:00","staffId":"u-tuan","staffName":"Tuấn","roomId":"room-a","roomName":"Phòng A"},"price":{"total":690000,"deposit":207000,"remaining":483000},"status":"Chờ cọc 30%","paymentStatus":"Chưa cọc","photoStatus":"Chưa có ảnh","maxSelect":10,"finalLink":null,"cancelReason":null,"createdAt":"2026-10-22T14:30:00Z"},{"id":"GS-1021","conversationId":null,"customerId":"cus-nhi","customerName":"Lê Bảo Nhi","serviceId":"svc-tot-nghiep","serviceName":"Chụp tốt nghiệp","packageId":"pkg-tn-premium","packageName":"Gói Tốt nghiệp Premium","extras":[],"date":"2026-10-14","makeup":{"start":"13:00","end":"14:00","staffId":"u-mai","staffName":"Mai"},"shoot":{"start":"14:00","end":"16:00","staffId":"u-tuan","staffName":"Tuấn","roomId":"room-b","roomName":"Phòng B"},"price":{"total":1800000,"deposit":540000,"remaining":1260000},"status":"Đã đặt lịch","paymentStatus":"Đã cọc 30%","photoStatus":"Đã chọn ảnh","maxSelect":30,"finalLink":null,"cancelReason":null,"createdAt":"2026-10-05T02:00:00Z"},{"id":"GS-1023","conversationId":"c-linh-01","customerId":"u-linh","customerName":"Linh","serviceId":"svc-tot-nghiep","serviceName":"Chụp tốt nghiệp","packageId":"pkg-tn-premium","packageName":"Gói Tốt nghiệp Premium","extras":[],"date":"2026-10-17","makeup":{"start":"13:00","end":"14:00","staffId":"u-mai","staffName":"Mai"},"shoot":{"start":"14:00","end":"16:00","staffId":"u-tuan","staffName":"Tuấn","roomId":"room-b","roomName":"Phòng B"},"price":{"total":1800000,"deposit":540000,"remaining":1260000},"status":"Đã đặt lịch","paymentStatus":"Đã cọc 30%","photoStatus":"Chờ chọn ảnh","maxSelect":30,"finalLink":null,"cancelReason":null,"createdAt":"2026-10-12T01:30:00Z"},{"id":"GS-1024","conversationId":"c-linh-06","customerId":"u-linh","customerName":"Linh","serviceId":"svc-tot-nghiep","serviceName":"Chụp tốt nghiệp","packageId":"pkg-tn-premium","packageName":"Gói Tốt nghiệp Premium","extras":[{"id":"ex-makeup","name":"Trang điểm"}],"date":"2026-10-24","makeup":{"start":"13:00","end":"14:00","staffId":"u-mai","staffName":"Mai"},"shoot":{"start":"14:00","end":"16:00","staffId":"u-tuan","staffName":"Tuấn","roomId":"room-b","roomName":"Phòng B"},"price":{"total":1800000,"deposit":540000,"remaining":1260000},"status":"Chờ cọc 30%","paymentStatus":"Chưa cọc","photoStatus":"Chưa có ảnh","maxSelect":30,"finalLink":null,"cancelReason":null,"createdAt":"2026-10-21T09:02:00Z"}]}
```

---

## 3. Booking Details (GET /api/bookings/:id)

Returns the full booking object, including `previews` and `selectedPhotoIds`.

- **Endpoint**: `GET /api/bookings/:id`
- **Permissions**: Customer who owns the booking, Admin, or Staff assigned to it (`makeup.staffId` or `shoot.staffId`). Anyone else gets `403`.
- **Required Header**: `Authorization: Bearer <token>`

### Success Example (200 OK)

```http
GET /api/bookings/GS-1024
Authorization: Bearer {{token:linh}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"booking":{"id":"GS-1024","conversationId":"c-linh-06","customerId":"u-linh","customerName":"Linh","serviceId":"svc-tot-nghiep","serviceName":"Chụp tốt nghiệp","packageId":"pkg-tn-premium","packageName":"Gói Tốt nghiệp Premium","extras":[{"id":"ex-makeup","name":"Trang điểm"}],"date":"2026-10-24","makeup":{"start":"13:00","end":"14:00","staffId":"u-mai","staffName":"Mai"},"shoot":{"start":"14:00","end":"16:00","staffId":"u-tuan","staffName":"Tuấn","roomId":"room-b","roomName":"Phòng B"},"price":{"total":1800000,"deposit":540000,"remaining":1260000},"status":"Chờ cọc 30%","paymentStatus":"Chưa cọc","photoStatus":"Chưa có ảnh","maxSelect":30,"previews":[],"selectedPhotoIds":[],"finalLink":null,"cancelReason":null,"createdAt":"2026-10-21T09:02:00Z"}}
```

### Another Customer's Booking Example (403 Forbidden)

```http
GET /api/bookings/GS-1017
Authorization: Bearer {{token:linh}}

```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error":{"code":"FORBIDDEN","message":"Access denied. This booking belongs to another customer"}}
```

### Booking Not Found Example (404 Not Found)

```http
GET /api/bookings/GS-9999
Authorization: Bearer {{token:thao}}

```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error":{"code":"NOT_FOUND","message":"Booking GS-9999 not found"}}
```

---

## 4. Reschedule or Cancel (PATCH /api/bookings/:id)

The body is one of two shapes:

- **Reschedule** `{date, time}`: `time` is the new shoot start. The server runs the same clash check as `POST /api/schedule/clash-check` (`04-schedule.md`) with the booking's own package, staff and room, ignoring the booking's own busy blocks. On a clash it answers `409 CONFLICT` with the clash explanation as `error.message`, and nothing changes. Otherwise `date`, `makeup` and `shoot` move, and so do the booking's staff jobs (`08-jobs.md`). Booking status is unchanged; reminder scheduling is recalculated from the earliest new appointment milestone. The system does not require new customer approval.
- **Cancel** `{status: "Đã hủy", cancelReason}`: `cancelReason` is required. The booking keeps its other fields.

- **Endpoint**: `PATCH /api/bookings/:id`
- **Permissions**: Admin role (`admin`).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `date` (string, `YYYY-MM-DD`) and `time` (string, `HH:MM`): both required to reschedule.
  - `status` (string, only `Đã hủy`) and `cancelReason` (string, required with `status`): to cancel.

### Reschedule Clash Example (409 Conflict)

```http
PATCH /api/bookings/GS-1024
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date":"2026-10-24","time":"09:00"}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error":{"code":"CONFLICT","message":"09:00 bị trùng vì Mai bận 08:00–12:00 (trang điểm GS-1017), mà gói Premium cần trang điểm 08:00–09:00."}}
```

### Reschedule Success Example (200 OK)

GS-1020 (Chân dung, no make-up) moves from 31/10 15:00 to 01/11 10:00; Tuấn and Phòng A are free then.

```http
PATCH /api/bookings/GS-1020
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date":"2026-11-01","time":"10:00"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"booking":{"id":"GS-1020","conversationId":null,"customerId":"cus-bao","customerName":"Võ Gia Bảo","serviceId":"svc-chan-dung","serviceName":"Chân dung / Profile CV","packageId":"pkg-chan-dung","packageName":"Gói Chân dung Profile","extras":[],"date":"2026-11-01","makeup":null,"shoot":{"start":"10:00","end":"11:00","staffId":"u-tuan","staffName":"Tuấn","roomId":"room-a","roomName":"Phòng A"},"price":{"total":690000,"deposit":207000,"remaining":483000},"status":"Chờ cọc 30%","paymentStatus":"Chưa cọc","photoStatus":"Chưa có ảnh","maxSelect":10,"previews":[],"selectedPhotoIds":[],"finalLink":null,"cancelReason":null,"createdAt":"2026-10-22T14:30:00Z"}}
```

### Cancel Example (200 OK)

```http
PATCH /api/bookings/GS-1020
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"status":"Đã hủy","cancelReason":"Khách báo bận việc gia đình, xin huỷ lịch chụp."}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"booking":{"id":"GS-1020","conversationId":null,"customerId":"cus-bao","customerName":"Võ Gia Bảo","serviceId":"svc-chan-dung","serviceName":"Chân dung / Profile CV","packageId":"pkg-chan-dung","packageName":"Gói Chân dung Profile","extras":[],"date":"2026-11-01","makeup":null,"shoot":{"start":"10:00","end":"11:00","staffId":"u-tuan","staffName":"Tuấn","roomId":"room-a","roomName":"Phòng A"},"price":{"total":690000,"deposit":207000,"remaining":483000},"status":"Đã hủy","paymentStatus":"Chưa cọc","photoStatus":"Chưa có ảnh","maxSelect":10,"previews":[],"selectedPhotoIds":[],"finalLink":null,"cancelReason":"Khách báo bận việc gia đình, xin huỷ lịch chụp.","createdAt":"2026-10-22T14:30:00Z"}}
```

### Invalid Date Example (400 Bad Request)

```http
PATCH /api/bookings/GS-1024
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date":"24/10/2026","time":"14:00"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error":{"code":"BAD_REQUEST","message":"Invalid booking update","fields":{"date":"Date must be in format YYYY-MM-DD"}}}
```

---

## 5. Attach Final Link (POST /api/bookings/:id/final-link)

Attaches the downloadable archive of the retouched photos (G10). The studio can only retouch after the customer has chosen photos (G9), so the link is accepted only when `photoStatus` is `Đã chọn ảnh`. Afterwards the customer can press **Nhận ảnh** (`09-gallery.md`).

- **Endpoint**: `POST /api/bookings/:id/final-link`
- **Permissions**: Admin role (`admin`).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `url` (string, required): An absolute `http` or `https` URL.
- **Effect**: Sets `finalLink` and `photoStatus` `Đã có link ảnh cuối`.
- **Errors**: `400 BAD_REQUEST` for a missing or invalid `url` (checked first); `409 CONFLICT` when `photoStatus` is anything other than `Đã chọn ảnh`.
- **Response**: `{booking: {id, status, paymentStatus, photoStatus, finalLink}}` (only the changed part; reload the details for the rest).

### Not Ready Example (409 Conflict)

GS-1024 has no previews yet, so the customer has not chosen photos (`photoStatus` `Chưa có ảnh`).

```http
POST /api/bookings/GS-1024/final-link
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"url":"https://files.gradstudio.test/final/GS-1024.zip"}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error":{"code":"CONFLICT","message":"Cannot add the final link: the customer has not chosen photos yet"}}
```

### Success Example (200 OK)

GS-1021 (Lê Bảo Nhi) is a seed booking further along the flow: deposit paid, previews uploaded, photos chosen (`Đã chọn ảnh`). Linh's GS-1023 is kept for the live walk (G9 choose → pay 70% → G10 link → Nhận ảnh).

```http
POST /api/bookings/GS-1021/final-link
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"url":"https://files.gradstudio.test/final/GS-1021.zip"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"booking":{"id":"GS-1021","status":"Đã đặt lịch","paymentStatus":"Đã cọc 30%","photoStatus":"Đã có link ảnh cuối","finalLink":"https://files.gradstudio.test/final/GS-1021.zip"}}
```

### Invalid URL Example (400 Bad Request)

```http
POST /api/bookings/GS-1021/final-link
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"url":"anh-cuoi-GS-1021"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error":{"code":"BAD_REQUEST","message":"Invalid final link","fields":{"url":"Final link must be a valid http or https URL"}}}
```

---

## Changes

- **2026-11-25** (Hạ Uyên):
  - Initialized the bookings contract in `docs/api/05-bookings.md`: booking object, `POST /api/bookings`, `GET /api/bookings`, `GET /api/bookings/:id`, `PATCH /api/bookings/:id`, `POST /api/bookings/:id/final-link`.
  - Status words follow the team's mock data plan: `status`, `paymentStatus` and `photoStatus` are separate fields.
  - Examples follow the plan's order and assume `03-chat.md` runs first and leaves c-linh-06 with Linh's accepted 24/10 at 14:00 proposal; GS-1024 is created here and GS-1020 is rescheduled, then cancelled.
  - List items leave out `previews` and `selectedPhotoIds` (GS-1023 alone has 40 previews); `POST …/final-link` answers only the changed fields.
  - `POST …/final-link` is accepted only at `photoStatus` `Đã chọn ảnh` (the studio retouches the chosen photos), instead of the plan's "deposit paid and previews exist". The success example uses a new seed booking GS-1021 (Lê Bảo Nhi, already at `Đã chọn ảnh`), so GS-1023 stays free for Linh's live G9–G10 walk. The admin list now has seven bookings.

- **2026-11-27**:
  - Updated the successful booking example to consume the accepted proposal from `c-linh-06` and use the next server-generated booking ID, GS-1024; `c-linh-05` is a separate older pending thread used for decline and re-proposal examples.
  - Kept cancellation and rescheduling examples in the contract-check execution order and aligned them with the seeded eligible booking state. Rescheduling updates all related staff jobs and recalculates the schedule reminder.
