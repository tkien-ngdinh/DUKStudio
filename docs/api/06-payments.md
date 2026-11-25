# Payments API Contract (06-payments.md)

Specification of payment processing endpoints for the DUKStudio platform, covering the 30% shoot booking deposit, the interactive sandbox test payment gateway outcomes (success/failure), and the 70% remaining balance payment settlement (serving Steps G7 and G9).

---

## 1. Initiate 30% Deposit Payment (POST /api/payments/deposit)

Initiates the 30% deposit checkout for booking `GS-1023` (Step G7). Studio shoot slots are not reserved or held until the 30% deposit payment succeeds. The response provides transaction metadata and the relative client route `/payment/test` as the redirect destination for interactive payment sandbox simulation.

- **Endpoint**: `POST /api/payments/deposit`
- **Permissions**: Customer role (`customer` - booking owner).
- **Required Header**: `Authorization: Bearer <token>`
- **Status Code**: `200 OK` (successful operation returning initialized transaction session and redirect URL).
- **Request Body**:
  - `bookingId` (string, required): Target booking identifier (e.g. `GS-1023`).
  - `paymentMethod` (string, required): Payment method (`bank_transfer`, `vnpay`, `momo`).

### Success Example — Initial Deposit Attempt (200 OK)

Customer Linh initiates an initial 30% deposit checkout (540,000 VND) for booking `GS-1023`. A pending transaction `tx-dep-1023-fail` is created for subsequent simulation.

```http
POST /api/payments/deposit
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"bookingId": "GS-1023", "paymentMethod": "bank_transfer"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"payment": {"transactionId": "tx-dep-1023-fail", "bookingId": "GS-1023", "type": "deposit", "amount": 540000, "percentage": 30, "status": "pending", "redirectUrl": "/payment/test"}}
```

### Combined Validation Error Example (400 Bad Request)

Returned when both required fields (`bookingId` and `paymentMethod`) are empty or omitted.

```http
POST /api/payments/deposit
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"bookingId": "", "paymentMethod": ""}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid payment payload", "fields": {"bookingId": "Booking ID is required", "paymentMethod": "Payment method is required"}}}
```

### Individual Field Validation — Missing Booking ID (400 Bad Request)

```http
POST /api/payments/deposit
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"paymentMethod": "bank_transfer"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid payment payload", "fields": {"bookingId": "Booking ID is required"}}}
```

### Individual Field Validation — Missing Payment Method (400 Bad Request)

```http
POST /api/payments/deposit
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"bookingId": "GS-1023"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid payment payload", "fields": {"paymentMethod": "Payment method is required"}}}
```

### Booking Not Found Example (404 Not Found)

```http
POST /api/payments/deposit
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"bookingId": "GS-9999", "paymentMethod": "bank_transfer"}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error": {"code": "NOT_FOUND", "message": "Booking GS-9999 not found"}}
```

### Access Denied Example (403 Forbidden)

Returned when a non-owner user attempts to initiate deposit payment on another customer's booking.

```http
POST /api/payments/deposit
Authorization: Bearer {{token:tuan}}
Content-Type: application/json

{"bookingId": "GS-1023", "paymentMethod": "bank_transfer"}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. Only the booking owner can initiate payment"}}
```

---

## 2. Handle Test Payment Gateway Outcome (POST /api/payments/test-result)

Processes the simulated payment result dispatched by the interactive client sandbox at `/payment/test` (serving Steps G7 and G9). The `/payment/test` path is a relative client route where the customer interacts with simulated "Success" or "Failure" gateway controls, which then submit this API request. Terminal transactions cannot be transitioned to multiple opposing outcomes; retries require creating a separate transaction.

- **Endpoint**: `POST /api/payments/test-result`
- **Permissions**: Customer role (`customer` - transaction owner).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `transactionId` (string, required): Existing pending transaction identifier.
  - `result` (string, required): Gateway outcome result (`success` or `failure`).

### Simulated Failure Outcome Example (200 OK)

Customer simulates a failed transaction outcome for `tx-dep-1023-fail` in `/payment/test`. The transaction is marked `failed`. Booking remains in pending deposit status (`Chờ cọc 30%`), and shoot slot is not held.

```http
POST /api/payments/test-result
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"transactionId": "tx-dep-1023-fail", "result": "failure"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"payment": {"transactionId": "tx-dep-1023-fail", "bookingId": "GS-1023", "type": "deposit", "amount": 540000, "status": "failed"}, "booking": {"id": "GS-1023", "status": "Chờ cọc 30%", "hasDeposit": false}}
```

### Retry Deposit Payment Initiation (200 OK)

Following the failed transaction, Customer Linh retries the deposit payment. A new active transaction `tx-dep-1023` is created with status `pending`.

```http
POST /api/payments/deposit
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"bookingId": "GS-1023", "paymentMethod": "bank_transfer"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"payment": {"transactionId": "tx-dep-1023", "bookingId": "GS-1023", "type": "deposit", "amount": 540000, "percentage": 30, "status": "pending", "redirectUrl": "/payment/test"}}
```

### Simulated Success Outcome Example (200 OK)

Customer simulates a successful deposit transaction on the new transaction `tx-dep-1023`. Booking status transitions to `Đã đặt lịch` with `hasDeposit: true`.

```http
POST /api/payments/test-result
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"transactionId": "tx-dep-1023", "result": "success"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"payment": {"transactionId": "tx-dep-1023", "bookingId": "GS-1023", "type": "deposit", "amount": 540000, "status": "paid", "paidAt": "2026-10-21T10:00:00Z"}, "booking": {"id": "GS-1023", "status": "Đã đặt lịch", "hasDeposit": true}}
```

### Combined Validation Error Example (400 Bad Request)

Returned when both required fields (`transactionId` and `result`) are empty or missing.

```http
POST /api/payments/test-result
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"transactionId": "", "result": ""}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid payment result payload", "fields": {"transactionId": "Transaction ID is required", "result": "Result must be 'success' or 'failure'"}}}
```

### Individual Field Validation — Missing Transaction ID (400 Bad Request)

```http
POST /api/payments/test-result
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"result": "success"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid payment result payload", "fields": {"transactionId": "Transaction ID is required"}}}
```

### Individual Field Validation — Invalid Result Value (400 Bad Request)

```http
POST /api/payments/test-result
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"transactionId": "tx-dep-1023", "result": "unknown_status"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid payment result payload", "fields": {"result": "Result must be 'success' or 'failure'"}}}
```

### Transaction Not Found Example (404 Not Found)

```http
POST /api/payments/test-result
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"transactionId": "tx-9999", "result": "success"}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error": {"code": "NOT_FOUND", "message": "Transaction tx-9999 not found"}}
```

---

## 3. Initiate 70% Remaining Balance Payment (POST /api/payments/remaining)

Initiates checkout for the remaining 70% balance (1,260,000 VND on `GS-1023`) after the shoot and successful deposit (Step G9). In the customer journey, photo selection should happen before this payment; however, the contract checker processes `06-payments.md` before `09-gallery.md`, so the examples in these two files cannot demonstrate that cross-file order in one alphabetical run. The remaining-payment example verifies its documented payment prerequisite (`hasDeposit: true`) and does not claim that photo selection has already been submitted.

- **Endpoint**: `POST /api/payments/remaining`
- **Permissions**: Customer role (`customer` - booking owner).
- **Required Header**: `Authorization: Bearer <token>`
- **Status Code**: `200 OK` (successful operation returning initialized transaction session and redirect URL).
- **Request Body**:
  - `bookingId` (string, required): Target booking identifier (e.g. `GS-1023`).
  - `paymentMethod` (string, required): Payment method (`bank_transfer`, `vnpay`, `momo`).

### Prerequisite Rules & Lifecycle

1. **Deposit Prerequisite**: The 30% deposit must have already been settled (`hasDeposit: true`). If attempted while deposit is unpaid, the API returns `409 Conflict`.
2. **Double-Payment Guard**: If the remaining balance has already been paid (`hasFinalPayment: true`), subsequent remaining balance requests return `409 Conflict`.
3. Photo selection belongs to the G9 customer flow and should precede balance settlement in the product journey. It is not asserted as a precondition of this payment endpoint in the sequential contract examples because the selection example is documented later in `09-gallery.md`.

### Success Example (200 OK)

Customer Linh initiates checkout for the 70% balance on `GS-1023`. A pending transaction `tx-rem-1023` is created.

```http
POST /api/payments/remaining
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"bookingId": "GS-1023", "paymentMethod": "bank_transfer"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"payment": {"transactionId": "tx-rem-1023", "bookingId": "GS-1023", "type": "remaining", "amount": 1260000, "percentage": 70, "status": "pending", "redirectUrl": "/payment/test"}}
```

### Combined Validation Error Example (400 Bad Request)

```http
POST /api/payments/remaining
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"bookingId": "", "paymentMethod": ""}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid payment payload", "fields": {"bookingId": "Booking ID is required", "paymentMethod": "Payment method is required"}}}
```

### Individual Field Validation — Missing Booking ID (400 Bad Request)

```http
POST /api/payments/remaining
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"paymentMethod": "bank_transfer"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid payment payload", "fields": {"bookingId": "Booking ID is required"}}}
```

### Individual Field Validation — Missing Payment Method (400 Bad Request)

```http
POST /api/payments/remaining
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"bookingId": "GS-1023"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid payment payload", "fields": {"paymentMethod": "Payment method is required"}}}
```

### Booking Not Found Example (404 Not Found)

```http
POST /api/payments/remaining
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"bookingId": "GS-9999", "paymentMethod": "bank_transfer"}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error": {"code": "NOT_FOUND", "message": "Booking GS-9999 not found"}}
```

### Simulated Remaining Balance Settlement via Test Result (200 OK)

Simulating successful payment completion for the 70% remaining balance transaction `tx-rem-1023` in `/payment/test`. Marks booking `hasFinalPayment: true` while preserving status `Đã đặt lịch` until deliverables are confirmed in Step G9.

```http
POST /api/payments/test-result
Authorization: Bearer {{token:linh}}
Content-Type: application/json

{"transactionId": "tx-rem-1023", "result": "success"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"payment": {"transactionId": "tx-rem-1023", "bookingId": "GS-1023", "type": "remaining", "amount": 1260000, "status": "paid", "paidAt": "2026-10-25T11:00:00Z"}, "booking": {"id": "GS-1023", "status": "Đã đặt lịch", "hasDeposit": true, "hasFinalPayment": true}}
```

---

## Changes

- **2026-11-26** (Bích Diệp):
  - Revised `docs/api/06-payments.md` to ensure sequential state consistency and strict alignment with `AGENTS.md`.
  - Removed any claim that shoot slots are held before deposit succeeds; clarified that studio slots are held only upon successful deposit payment.
  - Separated failed and successful transactions: simulated failure uses `tx-dep-1023-fail`, followed by an explicit deposit retry request generating `tx-dep-1023` before its successful result example.
  - Aligned booking status names strictly with `AGENTS.md` and `seed.json` (`Chờ cọc 30%` and `Đã đặt lịch`), removing invented status labels.
  - Documented status code `200 OK` for payment initiation as a successful operation returning transaction session metadata and relative client redirect route `/payment/test`.
  - Clarified that the remaining-payment example verifies the deposit prerequisite only; the full G9 selection-before-payment journey cannot be demonstrated in a single alphabetical contract-check run because `09-gallery.md` follows this file.
