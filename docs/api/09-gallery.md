# Photo Gallery & Delivery API Contract (09-gallery.md)

Specification of customer photo selection, retouching requests, and final deliverable receipt confirmation endpoints for the DUKStudio platform (serving Step G9).

---

## Preview Photo Data & Schema

Following the photo shoot session (Step G8), studio photographers upload watermarked, low-resolution preview images to the booking job. The customer reviews these preview assets in the gallery viewer to select frames for final high-resolution retouching.

Each preview photo object conforms to the following schema:
- `id` (string, required): Unique preview photo identifier (e.g. `prev-01`).
- `jobId` (string, required): Associated staff job identifier (e.g. `job-101`).
- `filename` (string, required): Stored image filename (e.g. `preview-01.png`).
- `url` (string, required): Relative asset URL for image rendering (e.g. `/uploads/preview-01.png`).
- `size` (integer, required): File size in bytes (e.g. `204800`).
- `uploadedAt` (string, required): ISO 8601 upload timestamp (e.g. `2026-10-24T16:15:00Z`).

Under seeded booking `GS-1023` (package `pkg-tot-nghiep-premium`), the customer is entitled to select up to **30 photos** for professional retouching. Following the upload example in `08-jobs.md`, photographer Tuấn has uploaded preview photo `prev-01` to `job-101` for this booking.

---

## 1. Submit Selected Photos for Retouching (POST /api/gallery/:id/select)

Submits the customer's chosen preview photo identifiers for retouching by the studio team (Step G9).

- **Endpoint**: `POST /api/gallery/:id/select`
- **Permissions**: Customer role (`customer` - booking owner).
- **Required Header**: `Authorization: Bearer <token>`
- **Path Parameter**:
  - `:id`: Booking identifier (e.g. `GS-1023`).
- **Request Body**:
  - `photoIds` (array of strings, required): Array of selected preview photo IDs. Minimum 1 photo, maximum 30 photos.
  - `notes` (string, optional): Customer retouching requests or styling instructions.

### Success Example (200 OK)

Customer Linh selects available preview photo `prev-01` for professional retouching on booking `GS-1023`. Booking operational progress advances to `Đang chỉnh sửa`.

```http
POST /api/gallery/GS-1023/select
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"photoIds": ["prev-01"], "notes": "Chỉnh sáng da tự nhiên và làm mờ hậu cảnh"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "bookingId": "GS-1023", "selectedCount": 1, "selectedPhotos": ["prev-01"], "status": "Đang chỉnh sửa", "submittedAt": "2026-10-25T09:00:00Z"}
```

### Combined / Missing Field Validation Example (400 Bad Request)

Returned when the required `photoIds` parameter is missing from the payload.

```http
POST /api/gallery/GS-1023/select
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"notes": "Chỉnh da"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid selection payload", "fields": {"photoIds": "photoIds is required and must be an array"}}}
```

### Empty Photo Selection Validation Example (400 Bad Request)

Returned when `photoIds` is provided as an empty array (`[]`). At least 1 preview photo must be selected.

```http
POST /api/gallery/GS-1023/select
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"photoIds": []}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid selection payload", "fields": {"photoIds": "At least 1 photo must be selected"}}}
```

### Photo Limit Exceeded Validation Example (400 Bad Request)

Returned when the selection exceeds the package limit of 30 photos (e.g. 31 photo IDs submitted).

```http
POST /api/gallery/GS-1023/select
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"photoIds": ["prev-01", "prev-02", "prev-03", "prev-04", "prev-05", "prev-06", "prev-07", "prev-08", "prev-09", "prev-10", "prev-11", "prev-12", "prev-13", "prev-14", "prev-15", "prev-16", "prev-17", "prev-18", "prev-19", "prev-20", "prev-21", "prev-22", "prev-23", "prev-24", "prev-25", "prev-26", "prev-27", "prev-28", "prev-29", "prev-30", "prev-31"]}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid selection payload", "fields": {"photoIds": "Maximum 30 photos can be selected for retouching"}}}
```

### Booking Not Found Example (404 Not Found)

```http
POST /api/gallery/GS-9999/select
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"photoIds": ["prev-01"]}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error": {"code": "NOT_FOUND", "message": "Booking GS-9999 not found"}}
```

### Access Denied Example (403 Forbidden)

Returned when an unprivileged account (e.g. photographer Tuấn) attempts to submit customer photo selections.

```http
POST /api/gallery/GS-1023/select
Authorization: Bearer {{token:tuan}}
Content-Type: application/json

{"photoIds": ["prev-01"]}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. Only the booking owner can select photos"}}
```

---

## 2. Confirm Photo Receipt (POST /api/gallery/:id/receive)

Finalizes deliverables delivery (Step G9). The customer clicks "Receive photos" to confirm access to retouched digital assets and mark the booking completed.

- **Endpoint**: `POST /api/gallery/:id/receive`
- **Permissions**: Customer role (`customer` - booking owner).
- **Required Header**: `Authorization: Bearer <token>`
- **Path Parameter**:
  - `:id`: Booking identifier (e.g. `GS-1023`).
- **Request Body**: `{}` (empty JSON object as specified; no undocumented flags).

### Prerequisites & Completion Rules

To confirm photo receipt and complete the booking:
1. Retouching selections must have been submitted (`photos` array contains selected IDs).
2. The remaining 70% balance payment must have been settled successfully (`hasFinalPayment: true`).
3. The studio administrator must have attached the final downloadable archive link (`finalFileLink` is not null).

When all prerequisites are met, the successful operation transitions booking status to *Completed* (`Hoàn thành`). The response schema is shown below, but a runnable success request is blocked until the detailed `05-bookings.md` contract and mock flow can attach `finalFileLink`; the current seed has `finalFileLink: null` and this gallery contract does not invent the admin final-link request schema.

```json
{
  "success": true,
  "booking": {
    "id": "GS-1023",
    "status": "Hoàn thành",
    "hasDeposit": true,
    "hasFinalPayment": true,
    "completedAt": "2026-10-26T14:00:00Z",
    "finalFileLink": "https://drive.gradstudio.test/deliverables/GS-1023-final.zip"
  }
}
```

### Final Deliverables Not Ready Conflict Example (409 Conflict)

In the sequential contract execution against a fresh mock with initial seed data, booking `GS-1023` has `hasDeposit: true`, `hasFinalPayment: true` (settled in `06-payments.md`), and `photos: ["prev-01"]` (selected above). However, the initial seed state has `finalFileLink: null`, and the endpoint to attach final links (`POST /api/bookings/:id/final-link`) belongs to `05-bookings.md` which has not yet been authored in the repository.

Consequently, attempting to confirm photo receipt before the studio administrator attaches the final download archive returns HTTP `409 Conflict`.

```http
POST /api/gallery/GS-1023/receive
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error": {"code": "CONFLICT", "message": "Final photo deliverables archive link has not been attached yet"}}
```

### Booking Not Found Example (404 Not Found)

```http
POST /api/gallery/GS-9999/receive
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error": {"code": "NOT_FOUND", "message": "Booking GS-9999 not found"}}
```

### Access Denied Example (403 Forbidden)

Returned when a non-owner user attempts to confirm photo receipt.

```http
POST /api/gallery/GS-1023/receive
Authorization: Bearer {{token:tuan}}
Content-Type: application/json

{}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. Only the customer who owns this booking can confirm receipt"}}
```

---

## Changes

- **2026-11-26** (Bích Diệp):
  - Revised `docs/api/09-gallery.md` to ensure sequential state consistency and alignment with actual seed and earlier contract uploads.
  - Updated photo selection example to use `prev-01` (the single preview established by `08-jobs.md`), removing references to unestablished previews `prev-02` through `prev-05`.
  - Added explicit field-level HTTP 400 validation error examples for `photoIds`: missing field, empty selection (`photoIds: []`), and exceeding the 30-photo maximum limit.
  - Updated `POST /api/gallery/:id/receive` request body to `{}` without undocumented fields (`bypassPayment`).
  - Aligned the 409 Conflict response with current sequential state: because remaining 70% balance was already paid in `06-payments.md`, the 409 example accurately reflects the missing final deliverables archive link (`finalFileLink: null`), avoiding contradictory unpaid-balance claims while documenting the success response shape and dependency blocker.
  - Marked the receive-success payload as a response schema rather than a runnable example until the detailed admin final-link contract and mock setup are available.
