# Authentication API Contract (01-auth.md)

Specification of authentication endpoints, session management, and current user profile retrieval for the DUKStudio system.

---

## 1. Sign In (POST /api/auth/login)

Authenticates user credentials and returns a Bearer Token along with basic profile data.

- **Endpoint**: `POST /api/auth/login`
- **Permissions**: Public (Visitor / Unauthenticated).
- **Request Body**:
  - `email` (string, required): Account email address or username.
  - `password` (string, required): Account password.

### Success Example (200 OK)

```http
POST /api/auth/login
Content-Type: application/json

{"email": "linh@gradstudio.test", "password": "linh-demo"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"token": "token-linh", "user": {"id": "u-linh", "name": "Linh", "email": "linh@gradstudio.test", "role": "customer"}}
```

### Validation Error Example (400 Bad Request)

```http
POST /api/auth/login
Content-Type: application/json

{"email": "", "password": ""}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid login payload", "fields": {"email": "Email or username is required", "password": "Password is required"}}}
```

### Invalid Credentials Example (401 Unauthorized)

```http
POST /api/auth/login
Content-Type: application/json

{"email": "linh@gradstudio.test", "password": "wrong-password"}
```

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error": {"code": "UNAUTHORIZED", "message": "Invalid email or password"}}
```

---

## 2. Current User Profile (GET /api/auth/me)

Retrieves profile data of the currently authenticated user based on the Bearer token in the Authorization header.

- **Endpoint**: `GET /api/auth/me`
- **Permissions**: Authenticated users (Customer, Admin, Staff, Superadmin).
- **Required Header**: `Authorization: Bearer <token>`

### Success Example (200 OK)

```http
GET /api/auth/me
Authorization: Bearer {{token:linh}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"user": {"id": "u-linh", "name": "Linh", "email": "linh@gradstudio.test", "role": "customer"}}
```

### Unauthenticated or Expired Token Example (401 Unauthorized)

```http
GET /api/auth/me

```

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error": {"code": "UNAUTHORIZED", "message": "Missing or expired authentication token"}}
```

---

## 3. Sign Out (POST /api/auth/logout)

Terminates user session.

- **Endpoint**: `POST /api/auth/logout`
- **Permissions**: Authenticated users.
- **Required Header**: `Authorization: Bearer <token>`

### Success Example (200 OK)

```http
POST /api/auth/logout
Authorization: Bearer {{token:linh}}

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Logged out successfully"}
```

---

## Changes

- **2026-11-23** (Trung Kiên):
  - Initialized authentication contract specification `docs/api/01-auth.md`.
  - Added standardized `http` examples for `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout` verified by `contract-check`.

- **2026-11-25** (Hạ Uyên, for Trung Kiên's review items):
  - `user.name` in the examples is now the short name from the brief (`Linh`); the full name stays in the mock data only, so the answer fields are unchanged.
  - Sign-in now requires the exact password of the account, and a token must be exactly `token-<account name>`; any other password answers `401`, any other token answers `401`.
