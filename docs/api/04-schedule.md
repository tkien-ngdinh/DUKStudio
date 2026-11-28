# Schedule & Clash Check API Contract (04-schedule.md)

Specification of the daily studio schedule (staff, rooms, opening hours, busy blocks) and the clash check that explains in plain text why a requested slot does not work and proposes open slots (serving Steps G5 and G10).

---

## 1. Daily Schedule (GET /api/schedule)

Retrieves the staff members, studio rooms, opening hours and every busy block of one day, so the admin can see the whole day before proposing a time in chat.

- **Endpoint**: `GET /api/schedule?date=YYYY-MM-DD`
- **Permissions**: Admin role (`admin`).
- **Required Header**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `date` (string, required): Day to load, format `YYYY-MM-DD`.
- **Response Fields**:
  - `date` (string): The requested day.
  - `openingHours` (object): `{start, end}` in `HH:MM`, from the studio settings (G11).
  - `staff` (array): `{id, name, role}` where `role` is `makeup` or `photographer`.
  - `rooms` (array): `{id, name}`.
  - `staff` lists every person the clash check can pick, including staff without a login (photographer Khoa, `st-khoa`).
  - `busy` (array): `{resourceId, resourceName, start, end, reason, bookingId}`, one entry per busy block of a staff member or room. `bookingId` is `null` for a block that is not a booking (e.g. lunch break).

### Success Example (200 OK)

The 2026-10-24 schedule before GS-1024 exists: Mai does group make-up for GS-1017 08:00–12:00 and takes lunch 12:00–13:00; Khoa shoots GS-1017 in Phòng A 09:30–12:30; Tuấn shoots GS-1018 in Phòng A 16:30–17:30; Phòng B is free all day.

```http
GET /api/schedule?date=2026-10-24
Authorization: Bearer {{token:thao}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"date": "2026-10-24", "openingHours": {"start": "08:00", "end": "19:00"}, "staff": [{"id": "u-mai", "name": "Mai", "role": "makeup"}, {"id": "u-tuan", "name": "Tuấn", "role": "photographer"}, {"id": "st-khoa", "name": "Khoa", "role": "photographer"}], "rooms": [{"id": "room-a", "name": "Phòng A"}, {"id": "room-b", "name": "Phòng B"}], "busy": [{"resourceId": "u-mai", "resourceName": "Mai", "start": "08:00", "end": "12:00", "reason": "Trang điểm nhóm 4 người", "bookingId": "GS-1017"}, {"resourceId": "u-mai", "resourceName": "Mai", "start": "12:00", "end": "13:00", "reason": "Nghỉ trưa", "bookingId": null}, {"resourceId": "st-khoa", "resourceName": "Khoa", "start": "09:30", "end": "12:30", "reason": "Chụp nhóm", "bookingId": "GS-1017"}, {"resourceId": "room-a", "resourceName": "Phòng A", "start": "09:30", "end": "12:30", "reason": "Chụp nhóm", "bookingId": "GS-1017"}, {"resourceId": "u-tuan", "resourceName": "Tuấn", "start": "16:30", "end": "17:30", "reason": "Chụp chân dung", "bookingId": "GS-1018"}, {"resourceId": "room-a", "resourceName": "Phòng A", "start": "16:30", "end": "17:30", "reason": "Chụp chân dung", "bookingId": "GS-1018"}]}
```

### Missing Date Example (400 Bad Request)

```http
GET /api/schedule
Authorization: Bearer {{token:thao}}

```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid schedule query", "fields": {"date": "Date is required in format YYYY-MM-DD"}}}
```

---

## 2. Clash Check (POST /api/schedule/clash-check)

Checks whether the make-up artist, photographer and room are all free for a requested shoot, and answers with a plain-text explanation (never only a flag) plus open alternative slots.

- **Endpoint**: `POST /api/schedule/clash-check`
- **Permissions**: Admin role (`admin`).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `date` (string, required): Shoot day, format `YYYY-MM-DD`.
  - `time` (string, required): Shoot start, format `HH:MM`.
  - `packageId` (string, required): The package decides the make-up and shoot lengths, read from the package data (`makeupMinutes`, `shootMinutes`). Make-up always ends when the shoot starts:
    - Premium (`pkg-tn-premium`): 60 min of make-up, 120-min shoot, Phòng B;
    - Nhóm (`pkg-tn-nhom`): 60 min of group make-up, 180-min shoot, Phòng A;
    - Cơ bản (`pkg-tn-co-ban`) and Chân dung (`pkg-chan-dung`): no make-up, 60-min shoot, Phòng A;
    - Kỷ yếu (`pkg-ky-yeu`): no make-up, 180-min shoot at the school, no room.
  - `makeupArtistId` (string, required when the package has make-up): Staff id with role `makeup`.
  - `photographerId` (string, required): Staff id with role `photographer`.
  - `roomId` (string, required when the package uses a room): Must be the package's room; another room answers `400` with `fields.roomId`.
  - `ignoreBookingId` (string, optional): The booking being rescheduled (G10). Its own busy blocks are left out, so moving it within or next to its current time does not clash with itself. This is the same check `PATCH /api/bookings/:id` runs (`05-bookings.md`). An id that does not exist answers `400` with `fields.ignoreBookingId`.
- **Rules**:
  - A start that puts the make-up before opening or the end of the shoot after closing is a clash: `conflicts` then holds an entry with `resourceId` `studio` and the opening hours.
  - When no other start of the same day is free, `suggestions` is `[]` and `explanation` says so in words.
- **400 field messages** (one per wrong field): `date`, `time` as in the example below; `packageId` "Unknown package"; `makeupArtistId` "Staff <id> is not a make-up artist"; `photographerId` "Staff <id> is not a photographer"; `roomId` "This package requires <room name> (<room id>)"; a missing id "… is required"; an unknown id "Unknown …"; `ignoreBookingId` "Unknown booking".
- **Response Fields**:
  - `clash` (boolean): `true` when at least one resource is busy.
  - `explanation` (string): One plain-text sentence saying why the slot clashes or that it is free.
  - `conflicts` (array): `{resourceId, resourceName, start, end, reason, bookingId}` for each busy block that overlaps the request. Empty when `clash` is `false`.
  - `suggestions` (array): Open slots on the same day. Candidate start times are on the hour, and the whole make-up + shoot block must fit inside opening hours. Each item is `{time, text, makeup: {start, end, staffId, staffName}, shoot: {start, end, staffId, staffName, roomId, roomName}}`. Empty when `clash` is `false`.
  - `slot` (object, only when `clash` is `false`): The requested slot itself, `{makeup: {start, end, staffId, staffName}, shoot: {start, end, staffId, staffName, roomId, roomName}}`, in the same shape as a suggestion, so the admin can propose it in chat (`POST /api/conversations/:id/propose-time`). `makeup` is `null` when the package has no make-up; `roomId` and `roomName` are `null` when the package uses no room. Not present when `clash` is `true`.

### Clash Example (200 OK)

A 09:00 Premium shoot needs make-up 08:00–09:00, but Mai is busy 08:00–12:00. With Mai, Tuấn and Phòng B, 14:00 is the only free start: 10:00–13:00 put make-up inside Mai's busy block or lunch, 15:00–17:00 overlap Tuấn's 16:30 job, 18:00 ends after closing, and 08:00 needs make-up before opening.

```http
POST /api/schedule/clash-check
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "2026-10-24", "time": "09:00", "packageId": "pkg-tn-premium", "makeupArtistId": "u-mai", "photographerId": "u-tuan", "roomId": "room-b"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"clash": true, "explanation": "09:00 bị trùng vì Mai bận 08:00–12:00 (trang điểm GS-1017), mà gói Premium cần trang điểm 08:00–09:00.", "conflicts": [{"resourceId": "u-mai", "resourceName": "Mai", "start": "08:00", "end": "12:00", "reason": "Trang điểm nhóm 4 người", "bookingId": "GS-1017"}], "suggestions": [{"time": "14:00", "text": "14:00: trang điểm 13:00–14:00 với Mai, chụp 14:00–16:00 với Tuấn tại Phòng B.", "makeup": {"start": "13:00", "end": "14:00", "staffId": "u-mai", "staffName": "Mai"}, "shoot": {"start": "14:00", "end": "16:00", "staffId": "u-tuan", "staffName": "Tuấn", "roomId": "room-b", "roomName": "Phòng B"}}]}
```

### No Clash Example (200 OK)

```http
POST /api/schedule/clash-check
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "2026-10-24", "time": "14:00", "packageId": "pkg-tn-premium", "makeupArtistId": "u-mai", "photographerId": "u-tuan", "roomId": "room-b"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"clash": false, "explanation": "14:00 trống: Mai rảnh 13:00–14:00, Tuấn và Phòng B rảnh 14:00–16:00.", "conflicts": [], "suggestions": [], "slot": {"makeup": {"start": "13:00", "end": "14:00", "staffId": "u-mai", "staffName": "Mai"}, "shoot": {"start": "14:00", "end": "16:00", "staffId": "u-tuan", "staffName": "Tuấn", "roomId": "room-b", "roomName": "Phòng B"}}}
```

### Reschedule Check Example (200 OK)

GS-1023 (Linh) has make-up 13:00–14:00 and a shoot 14:00–16:00 with Tuấn in Phòng B on 2026-10-17. Moving it one hour later overlaps its own shoot, so without `ignoreBookingId` 15:00 clashes with GS-1023 itself. With `ignoreBookingId` the check skips GS-1023's blocks, and 15:00 is free.

```http
POST /api/schedule/clash-check
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "2026-10-17", "time": "15:00", "packageId": "pkg-tn-premium", "makeupArtistId": "u-mai", "photographerId": "u-tuan", "roomId": "room-b", "ignoreBookingId": "GS-1023"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"clash": false, "explanation": "15:00 trống: Mai rảnh 14:00–15:00, Tuấn và Phòng B rảnh 15:00–17:00.", "conflicts": [], "suggestions": [], "slot": {"makeup": {"start": "14:00", "end": "15:00", "staffId": "u-mai", "staffName": "Mai"}, "shoot": {"start": "15:00", "end": "17:00", "staffId": "u-tuan", "staffName": "Tuấn", "roomId": "room-b", "roomName": "Phòng B"}}}
```

### Missing Fields Example (400 Bad Request)

```http
POST /api/schedule/clash-check
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"packageId": "pkg-tn-premium", "makeupArtistId": "u-mai", "photographerId": "u-tuan", "roomId": "room-b"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid clash check payload", "fields": {"date": "Date is required in format YYYY-MM-DD", "time": "Time is required in format HH:MM"}}}
```

### Wrong Room Example (400 Bad Request)

Premium is shot in Phòng B; asking with Phòng A is refused before any clash check.

```http
POST /api/schedule/clash-check
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "2026-10-24", "time": "14:00", "packageId": "pkg-tn-premium", "makeupArtistId": "u-mai", "photographerId": "u-tuan", "roomId": "room-a"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid clash check payload", "fields": {"roomId": "This package requires Phòng B (room-b)"}}}
```

### Group Package Clash Example (200 OK)

A 12:30 Nhóm shoot needs group make-up 11:30–12:30, which overlaps Mai's GS-1017 make-up and her lunch break. Khoa and Phòng A are free from 12:30, so Mai is the only reason. No other start that day fits a 60-min make-up and a 180-min shoot in Phòng A (Mai is busy until 13:00, Phòng A again from 16:30), so there is no suggestion and the explanation says so.

```http
POST /api/schedule/clash-check
Authorization: Bearer {{token:thao}}
Content-Type: application/json

{"date": "2026-10-24", "time": "12:30", "packageId": "pkg-tn-nhom", "makeupArtistId": "u-mai", "photographerId": "st-khoa", "roomId": "room-a"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"clash": true, "explanation": "12:30 bị trùng vì Mai bận 08:00–12:00 (trang điểm GS-1017), mà gói Nhóm cần trang điểm 11:30–12:30. Ngoài ra, Mai cũng bận 12:00–13:00 (nghỉ trưa). Ngày 24/10 không còn giờ trống cho gói Nhóm với những người và phòng này.", "conflicts": [{"resourceId": "u-mai", "resourceName": "Mai", "start": "08:00", "end": "12:00", "reason": "Trang điểm nhóm 4 người", "bookingId": "GS-1017"}, {"resourceId": "u-mai", "resourceName": "Mai", "start": "12:00", "end": "13:00", "reason": "Nghỉ trưa", "bookingId": null}], "suggestions": []}
```

### Access Denied Example (403 Forbidden)

Returned when a non-admin account (e.g., customer Linh) runs a clash check.

```http
POST /api/schedule/clash-check
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"date": "2026-10-24", "time": "09:00", "packageId": "pkg-tn-premium", "makeupArtistId": "u-mai", "photographerId": "u-tuan", "roomId": "room-b"}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. Admin role required"}}
```

### Missing Token Example (401 Unauthorized)

```http
POST /api/schedule/clash-check
Content-Type: application/json

{"date": "2026-10-24", "time": "09:00", "packageId": "pkg-tn-premium", "makeupArtistId": "u-mai", "photographerId": "u-tuan", "roomId": "room-b"}
```

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error": {"code": "UNAUTHORIZED", "message": "Missing or invalid Bearer token"}}
```

---

## Changes

- **2026-11-25** (Hạ Uyên):
  - Initialized the schedule and clash check contract in `docs/api/04-schedule.md`.
  - Added `GET /api/schedule?date=YYYY-MM-DD` (staff, rooms, opening hours, busy blocks) and `POST /api/schedule/clash-check` (plain-text explanation, conflicts, suggested open slots).
  - Examples use the 2026-10-24 schedule from the team's mock data plan (before GS-1024 exists): Mai busy 08:00–12:00 for GS-1017 make-up plus lunch 12:00–13:00, Khoa and Phòng A busy 09:30–12:30 (GS-1017), Tuấn and Phòng A busy 16:30–17:30 (GS-1018). A 09:00 Premium shoot clashes and 14:00 is the only suggestion (make-up 13:00–14:00 with Mai, shoot 14:00–16:00 with Tuấn in Phòng B).

- **2026-11-26** (Hạ Uyên, for Diệp's review of PR #3):
  - `roomId` must be the package's room; another room answers `400` with `fields.roomId`. Before, any room was checked, so a Premium shoot could be checked and proposed in Phòng A. Added the "Wrong Room" example.
  - `makeupArtistId` must be staff with role `makeup` and `photographerId` staff with role `photographer`; otherwise `400` with a message on that field.
  - The make-up and shoot lengths come only from the package data. Nhóm now has 60 min of group make-up right before the shoot (it had no length, which the mock read as 0, so Mai was never checked for a group shoot). Added the "Group Package Clash" example, where the group make-up overlaps Mai's busy block.
  - Written down a rule the mock already applied: a start outside opening hours is a clash (`resourceId` `studio`).
  - New: when no other start of the day is free, `suggestions` is `[]` and the explanation ends with a sentence saying so, so G5 always says in words what to do next.
  - No front-end code calls these endpoints yet.

- **2026-11-28** (Hạ Uyên, before the G4/G5/G10 admin screens):
  - A clash check with `clash: false` now also returns `slot`, which holds the requested make-up and shoot windows with staff and room. Before, a free answer had only the `explanation` sentence. The catalog has no make-up or shoot lengths, so the admin screen could not build the `makeup` / `shoot` times that `POST /api/conversations/:id/propose-time` needs. "No Clash" example updated.
  - New optional body field `ignoreBookingId`. It leaves the booking being rescheduled out of the busy blocks, so the G10 reschedule form can check a new time before it sends `PATCH /api/bookings/:id` without the booking clashing with itself. PATCH already ran its check this way. An unknown id answers `400`. Added the "Reschedule Check" example (GS-1023 moved to 15:00 on 2026-10-17).
