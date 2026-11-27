# Administration & System Settings API Contract (10-admin.md)

Specification of administrator account provisioning and system-wide studio settings (opening hours, automated reminder intervals) serving Step G11. Restricted strictly to the Superadmin role.

---

## 1. List Administrator Accounts (GET /api/admin/accounts)

Retrieves the directory of studio administrator accounts.

- **Endpoint**: `GET /api/admin/accounts`
- **Permissions**: Superadmin role (`superadmin`).
- **Required Header**: `Authorization: Bearer <token>`

### Success Example (200 OK)

```http
GET /api/admin/accounts
Authorization: Bearer {{token:superadmin}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"accounts": [{"id": "u-thao", "name": "Admin Thảo", "email": "thao@gradstudio.test", "role": "admin", "createdAt": "2026-10-01T08:00:00Z"}]}
```

### Access Denied Example (403 Forbidden)

Returned when a non-superadmin account (e.g., studio admin Thảo or customer Linh) attempts to list admin accounts.

```http
GET /api/admin/accounts
Authorization: Bearer {{token:thao}}

```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. Superadmin role required"}}
```

---

## 2. Create Administrator Account (POST /api/admin/accounts)

Provisions a new studio administrator account into the system.

- **Endpoint**: `POST /api/admin/accounts`
- **Permissions**: Superadmin role (`superadmin`).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `name` (string, required): Full name of the administrator.
  - `email` (string, required): Unique email address.
  - `password` (string, required): Initial password ($\ge 6$ characters).

### Success Example (201 Created)

```http
POST /api/admin/accounts
Authorization: Bearer {{token:superadmin}}
Content-Type: application/json

{"name": "Admin Nam", "email": "nam@gradstudio.test", "password": "nam-demo"}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"account": {"id": "u-nam", "name": "Admin Nam", "email": "nam@gradstudio.test", "role": "admin", "createdAt": "2026-11-24T18:00:00Z"}}
```

### Validation Error Example (400 Bad Request)

```http
POST /api/admin/accounts
Authorization: Bearer {{token:superadmin}}
Content-Type: application/json

{"name": "", "email": "invalid-email", "password": "123"}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid administrator payload", "fields": {"name": "Admin name is required", "email": "Valid email address is required", "password": "Password must be at least 6 characters"}}}
```

### Duplicate Email Conflict Example (409 Conflict)

```http
POST /api/admin/accounts
Authorization: Bearer {{token:superadmin}}
Content-Type: application/json

{"name": "Admin Thảo Dup", "email": "thao@gradstudio.test", "password": "thao-demo"}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error": {"code": "CONFLICT", "message": "An administrator account with this email already exists"}}
```

---

## 3. Retrieve Studio Settings (GET /api/admin/settings)

Retrieves global studio operating configurations, such as operational hours and advance reminder notification triggers.

- **Endpoint**: `GET /api/admin/settings`
- **Permissions**: Superadmin role (`superadmin`).
- **Required Header**: `Authorization: Bearer <token>`

### Success Example (200 OK)

```http
GET /api/admin/settings
Authorization: Bearer {{token:superadmin}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"settings": {"openingHours": "08:00 - 19:00", "reminderHoursBefore": 24}}
```

### Access Denied Example (403 Forbidden)

```http
GET /api/admin/settings
Authorization: Bearer {{token:linh}}

```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": {"code": "FORBIDDEN", "message": "Access denied. Superadmin role required"}}
```

---

## 4. Update Studio Settings (PUT /api/admin/settings)

Updates system operating parameters.

- **Endpoint**: `PUT /api/admin/settings`
- **Permissions**: Superadmin role (`superadmin`).
- **Required Header**: `Authorization: Bearer <token>`
- **Request Body**:
  - `openingHours` (string, required): Operational hours format (e.g. `07:30 - 20:00`).
  - `reminderHoursBefore` (integer, required): Hours ahead of shoot to trigger reminder ($\ge 1$).

### Success Example (200 OK)

```http
PUT /api/admin/settings
Authorization: Bearer {{token:superadmin}}
Content-Type: application/json

{"openingHours": "07:30 - 20:00", "reminderHoursBefore": 48}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"settings": {"openingHours": "07:30 - 20:00", "reminderHoursBefore": 48, "updatedAt": "2026-11-24T18:00:00Z"}}
```

### Validation Error Example (400 Bad Request)

```http
PUT /api/admin/settings
Authorization: Bearer {{token:superadmin}}
Content-Type: application/json

{"openingHours": "", "reminderHoursBefore": -5}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid settings payload", "fields": {"openingHours": "Opening hours string is required", "reminderHoursBefore": "Reminder hours must be a positive integer"}}}
```

---

## Changes

- **2026-11-27**:
  - Kept the successful administrator-creation example deterministic by fixing the mock-created account timestamp to the value shown in the contract example; duplicate email still returns `409`.

- **2026-11-24** (Trung Kiên):
  - Initialized administration and system settings contract specification in `docs/api/10-admin.md`.
  - Specified endpoints for Admin account listing and provisioning (`GET`, `POST /api/admin/accounts`) and studio settings (`GET`, `PUT /api/admin/settings`) with strict Superadmin role verification (403 for other roles).
