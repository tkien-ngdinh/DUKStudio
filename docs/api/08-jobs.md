# Staff Jobs & Previews API Contract (08-jobs.md)

Specification of staff assignments, job lifecycle management, and watermarked preview photo uploads for the DUKStudio system (serving Step G8).

---

## 1. List Assigned Jobs (GET /api/staff/jobs)

Retrieves all shoot and service assignments allocated to the authenticated staff member (e.g. photographer Tuấn, makeup artist Mai).

- **Endpoint**: `GET /api/staff/jobs`
- **Permissions**: Staff role (`staff`).
- **Required Header**: `Authorization: Bearer <token>`

### Success Example (200 OK)

```http
GET /api/staff/jobs
Authorization: Bearer {{token:tuan}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"jobs":[{"id":"job-101","bookingId":"GS-1023","role":"photographer","service":"Gói Tốt nghiệp Premium","customerName":"Linh","date":"2026-10-17","time":"14:00 - 16:00","location":"Phòng B","status":"Hoàn thành","previewsCount":40},{"id":"job-104","bookingId":"GS-1018","role":"photographer","service":"Gói Chân dung Profile","customerName":"Lương Đức Thịnh","date":"2026-10-24","time":"16:30 - 17:30","location":"Phòng A","status":"Chưa bắt đầu","previewsCount":0},{"id":"job-107","bookingId":"GS-1021","role":"photographer","service":"Gói Tốt nghiệp Premium","customerName":"Lê Bảo Nhi","date":"2026-10-14","time":"14:00 - 16:00","location":"Phòng B","status":"Hoàn thành","previewsCount":40},{"id":"job-109","bookingId":"GS-1024","role":"photographer","service":"Gói Tốt nghiệp Premium","customerName":"Linh","date":"2026-10-25","time":"15:00 - 17:00","location":"Phòng B","status":"Chưa bắt đầu","previewsCount":0}]}
```

### Access Denied Example (403 Forbidden)

Returned when an unprivileged account (e.g., customer Linh) attempts to access the staff job dashboard.

```http
GET /api/staff/jobs
Authorization: Bearer {{token:linh}}

```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. Staff role required"}}
```

---

## 2. Update Job Status (PATCH /api/staff/jobs/:id)

Updates the operational progress state of a specific assigned task (`Chưa bắt đầu`, `Đang làm`, `Hoàn thành`).

- **Endpoint**: `PATCH /api/staff/jobs/:id`
- **Permissions**: Staff role (`staff`), and only the staff member the job is assigned to (`403` otherwise).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `status` (string, required): New status (`Chưa bắt đầu`, `Đang làm`, `Hoàn thành`).

### Success Example (200 OK)

```http
PATCH /api/staff/jobs/job-101
Authorization: Bearer {{token:tuan}}
Content-Type: application/json

{"status": "Đang làm"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"job": {"id": "job-101", "bookingId": "GS-1023", "status": "Đang làm", "updatedAt": "2026-10-17T14:05:00Z"}}
```

### Invalid Status Example (400 Bad Request)

```http
PATCH /api/staff/jobs/job-101
Authorization: Bearer {{token:tuan}}
Content-Type: application/json

{"status": "invalid_status"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid job status", "fields": {"status": "Status must be one of: Chưa bắt đầu, Đang làm, Hoàn thành"}}}
```

### Job Not Found Example (404 Not Found)

```http
PATCH /api/staff/jobs/job-999
Authorization: Bearer {{token:tuan}}
Content-Type: application/json

{"status": "Hoàn thành"}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error": {"code": "NOT_FOUND", "message": "Job job-999 not found"}}
```

### Job of Another Staff Member Example (403 Forbidden)

Returned when a staff member updates a job assigned to someone else (photographer Tuấn changing make-up artist Mai's job).

```http
PATCH /api/staff/jobs/job-102
Authorization: Bearer {{token:tuan}}
Content-Type: application/json

{"status": "Hoàn thành"}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. This job is assigned to another staff member"}}
```

---

## 3. Upload Watermarked Preview Photos (POST /api/staff/jobs/:id/previews)

Uploads watermarked, low-resolution preview images to a booking session for customer review and selection (G8/G9 flow). Maximum file size is 10MB. Permitted MIME types are `image/jpeg` and `image/png`.

- **Endpoint**: `POST /api/staff/jobs/:id/previews`
- **Permissions**: Staff role (`staff`), and only the staff member the job is assigned to (`403` otherwise).
- **Effect**: The preview is also added to the `previews` list of the job's booking, so the customer sees it in the gallery (G9).
- **Required Header**: `Authorization: Bearer <token>`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file` (binary, required): Image file (PNG or JPEG, max 10MB).

### Success Example (201 Created)

```sh
curl -i http://localhost:3001/api/staff/jobs/job-101/previews \
  -H "Authorization: Bearer {{token:tuan}}" \
  -F "file=@{{file:preview-01.png:200KB}};type=image/png"
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"success": true, "preview": {"id": "prev-01", "jobId": "job-101", "filename": "preview-01.png", "url": "/uploads/preview-01.png", "size": 204800, "uploadedAt": "2026-10-17T16:15:00Z"}}
```

### File Too Large Example (400 Bad Request)

Returned when the uploaded file exceeds the 10MB limit.

```sh
curl -i http://localhost:3001/api/staff/jobs/job-101/previews \
  -H "Authorization: Bearer {{token:tuan}}" \
  -F "file=@{{file:preview-large.png:15MB}};type=image/png"
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "File exceeds maximum size limit of 10MB", "fields": {"file": "File size must not exceed 10MB"}}}
```

### Invalid File Format Example (400 Bad Request)

Returned when a non-image file (e.g. PDF document) is uploaded.

```sh
curl -i http://localhost:3001/api/staff/jobs/job-101/previews \
  -H "Authorization: Bearer {{token:tuan}}" \
  -F "file=@{{file:document.pdf:100KB}};type=application/pdf"
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid file format", "fields": {"file": "Only JPEG and PNG image files are permitted"}}}
```

---

## Changes

- **2026-11-24** (Trung Kiên):
  - Initialized staff jobs and preview photo upload contract specification in `docs/api/08-jobs.md`.
  - Added endpoints for job assignment listing (`GET /api/staff/jobs`), status update (`PATCH /api/staff/jobs/:id`), and preview photo upload (`POST /api/staff/jobs/:id/previews`) with multipart format checks and 10MB size limits.

- **2026-11-25** (Hạ Uyên, for Trung Kiên's review items):
  - Example values follow the mock data: GS-1023 is Linh's earlier shoot on 2026-10-17 (moved off 2026-10-24 so the 14:00 slot is free for GS-1024 in G5–G6), and `customerName` is the short name `Linh`.
  - `PATCH` and `POST …/previews` now answer `403` when the job belongs to another staff member; added an example.
  - An uploaded preview is also added to the booking's `previews`, so G9 shows what G8 uploaded. Preview ids are unique (`prev-01`, `prev-02`, …).

- **2026-11-27**:
  - Changed the shared makeup, photography and retouching task status vocabulary to `Chưa bắt đầu`, `Đang làm`, and `Hoàn thành`; staff may update only their own job. Job status changes do not change booking status.
