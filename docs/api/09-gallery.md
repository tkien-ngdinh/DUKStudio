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

Under seeded booking `GS-1023` (package `pkg-tn-premium`), the customer is entitled to select up to **30 photos** for professional retouching. Following the upload example in `08-jobs.md`, photographer Tuấn has uploaded preview photo `prev-01` to `job-101` for this booking.

---

## 1. Submit Selected Photos for Retouching (POST /api/gallery/:id/select)

Submits the customer's chosen preview photo identifiers for retouching by the studio team (Step G9).

- **Endpoint**: `POST /api/gallery/:id/select`
- **Permissions**: Customer role (`customer` - booking owner).
- **Required Header**: `Authorization: Bearer <token>`
- **Path Parameter**:
  - `:id`: Booking identifier (e.g. `GS-1023`).
- **Request Body**:
  - `photoIds` (array of strings, required): Array of selected preview photo IDs. Minimum 1 photo, maximum equal to the package edited-photo count (`maxSelect`); no package may allow more than 30 photos.
  - `notes` (string, optional): Customer retouching requests or styling instructions.

### Success Example (200 OK)

Customer Linh selects available preview photo `prev-01` for professional retouching on booking `GS-1023`. Selection is saved and can be replaced until the remaining 70% is paid; booking status does not change.

```http
POST /api/gallery/GS-1023/select
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"photoIds": ["prev-01"], "notes": "Chỉnh sáng da tự nhiên và làm mờ hậu cảnh"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "bookingId": "GS-1023", "selectedCount": 1, "selectedPhotos": ["prev-01"], "status": "Đã chọn ảnh", "submittedAt": "2026-10-25T09:00:00Z"}
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

Returned when the selection exceeds the package-specific `maxSelect` limit (30 for this seeded package). The request below contains 31 photos to exceed that limit.

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

Finalizes deliverables delivery (Step G9). The customer clicks "Receive photos" to confirm access to retouched digital assets and mark the booking and its linked conversation to `Hoàn thành`.

- **Endpoint**: `POST /api/gallery/:id/receive`
- **Permissions**: Customer role (`customer` - booking owner).
- **Required Header**: `Authorization: Bearer <token>`
- **Path Parameter**:
  - `:id`: Booking identifier (e.g. `GS-1023`).
- **Request Body**: `{}` (empty JSON object as specified; no undocumented flags).

### Prerequisites & Completion Rules

To confirm photo receipt and complete the booking:
1. Retouching selections must have been submitted (`selectedPhotoIds` contains selected IDs).
2. The remaining 70% balance payment must have been settled successfully (`hasFinalPayment: true`).
3. The studio administrator must have attached the final downloadable archive link (`finalLink` is not null).

When all prerequisites are met, the successful operation transitions booking and its linked conversation status to `Hoàn thành`.

```json
{
  "success": true,
  "booking": {
    "id": "GS-1023",
    "status": "Hoàn thành",
    "hasDeposit": true,
    "hasFinalPayment": true,
    "completedAt": "2026-10-26T14:00:00Z",
    "finalLink": "https://drive.gradstudio.test/deliverables/GS-1023-final.zip"
  }
}
```

### Remaining Payment Required Conflict Example (409 Conflict)

After a selection is saved, the customer cannot confirm photo receipt until the remaining 70% has been paid and the Admin has attached the final archive link. The sequential example uses seeded booking GS-1023 before any 70% payment succeeds, so the first unmet receipt condition is the unpaid remaining balance.

```http
POST /api/gallery/GS-1023/receive
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error": {"code": "CONFLICT", "message": "Remaining 70% balance must be settled before confirming photo receipt"}}
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
  - Aligned the 409 Conflict response with current sequential state: because the remaining-balance gate correctly blocked payment in `06-payments.md`, the 409 example accurately reflects the unpaid remaining balance, avoiding contradictory unpaid-balance claims while documenting the success response shape and dependency blocker.
  - Marked the receive-success payload as a response schema rather than a runnable example until the detailed admin final-link contract and mock setup are available.

- **2026-11-27**:
  - Made photo selection limits package-specific, capped at 30 project-wide, and locked selection after successful 70% payment. Receiving photos now requires saved selections, paid remaining balance and an attached final link; success completes the booking and its linked conversation.
  - Updated the gallery contract to use the shared `selectedPhotoIds` and `finalLink` fields used by bookings and payments.
  - Clarified that the seeded package limit is 30 photos and the invalid request example submits 31.


### Selection Lock and Remaining-Balance Gate

The customer may replace the saved selection any number of times before the 70% payment succeeds, provided the selection count does not exceed the booking package's `maxSelect`. After successful payment, selection changes return `409 Conflict`. The 70% payment endpoint also requires the linked photographer job to be `Hoàn thành` and at least one saved selected photo. Selecting photos does not change booking status.
