# Service Catalog API Contract (02-catalog.md)

Specification of the service discovery and catalog endpoint for the DUKStudio platform, providing photography packages, pricing tiers, rental accessories, sample portfolio photos, and verified customer testimonials (serving Step G1).

---

## 1. Retrieve Service Catalog (GET /api/catalog)

Retrieves public studio offerings including photography services, tiered package details, studio amenities, rental accessories, portfolio sample photos, and customer reviews.

- **Endpoint**: `GET /api/catalog`
- **Permissions**: Public (Visitor / Unauthenticated, Customer).
- **Query Parameters**:
  - `service` (string, optional): Specific service identifier to filter catalog items (e.g. `s-tot-nghiep`).

### Behavior & Filtering Rules

1. **Full Catalog (`GET /api/catalog`)**:
   When called without query parameters, returns all available photography services (`s-ky-yeu`, `s-tot-nghiep`, `s-chan-dung`), complete package tiers, rental accessories, sample portfolio images across all categories, and verified customer testimonials.

2. **Filtered Catalog (`GET /api/catalog?service=<serviceId>`)**:
   When the optional `service` parameter is provided, filters the response to include:
   - `services`: An array containing solely the requested service object and its associated packages.
   - `accessories`: The full list of studio rental accessories (accessories remain globally relevant across all shoot types).
   - `samplePhotos`: Portfolio photos specifically matching the requested service category.
   - `reviews`: Customer testimonials specifically evaluating the requested service.

3. **Invalid Filter (`GET /api/catalog?service=<unknownId>`)**:
   When the provided `service` parameter does not match any recognized service identifier in the catalog, returns HTTP `400 Bad Request` with standard error shape and `fields.service` key.

### Success Example — Full Catalog (200 OK)

Standard request without query parameters returning complete catalog data.

```http
GET /api/catalog

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"services": [{"id": "s-ky-yeu", "title": "Kỷ yếu lớp", "startingPrice": 350000, "unit": "người", "description": "Dành cho tập thể lớp, lưu giữ thanh xuân trường học với concept sáng tạo.", "packages": [{"id": "pkg-ky-yeu-standard", "name": "Gói Kỷ yếu Tiêu chuẩn", "price": 350000, "durationHours": 3, "features": ["30 file ảnh chỉnh sửa", "Chụp toàn bộ lớp + ảnh nhóm nhỏ", "Hỗ trợ 1 trang phục cử nhân"]}]}, {"id": "s-tot-nghiep", "title": "Tốt nghiệp cá nhân / nhóm", "startingPrice": 1800000, "unit": "buổi", "description": "Chụp tốt nghiệp phong cách thanh lịch, chuyên nghiệp, hỗ trợ makeup và phòng studio hiện đại.", "packages": [{"id": "pkg-tot-nghiep-premium", "name": "Gói Tốt nghiệp Premium", "price": 1800000, "deposit30": 540000, "remaining70": 1260000, "durationHours": 2, "editedPhotos": 30, "features": ["2 giờ chụp studio & sân vườn", "30 ảnh chỉnh sửa chuyên sâu", "Trang điểm & làm tóc chuyên nghiệp 1 giờ", "Phòng chụp B tiện nghi"]}]}, {"id": "s-chan-dung", "title": "Chân dung / Profile CV", "startingPrice": 690000, "unit": "buổi", "description": "Ảnh chân dung doanh nhân, profile xin việc, định hình hình ảnh cá nhân uy tín.", "packages": [{"id": "pkg-chan-dung-standard", "name": "Gói Chân dung Profile", "price": 690000, "durationHours": 1, "features": ["10 ảnh chỉnh sửa hoàn thiện", "Phông nền studio chuyên nghiệp"]}]}], "accessories": [{"id": "acc-cu-nhan", "name": "Bộ lễ phục cử nhân", "price": 50000, "unit": "bộ", "description": "Áo cử nhân, mũ và nơ tốt nghiệp chuẩn các trường"}, {"id": "acc-hoa-cam-tay", "name": "Bó hoa tốt nghiệp tươi", "price": 150000, "unit": "bó", "description": "Hoa hướng dương hoặc hoa hồng kèm băng rôn chúc mừng"}, {"id": "acc-bang-ten", "name": "Bằng tốt nghiệp mô hình", "price": 30000, "unit": "cuốn", "description": "Bằng da đỏ cao cấp khắc chữ mạ vàng phục vụ chụp ảnh"}], "samplePhotos": [{"id": "sp-01", "title": "Kỷ yếu thanh xuân 12A3", "category": "s-ky-yeu", "url": "/assets/samples/ky-yeu-12a3.jpg", "description": "Chụp ngoại cảnh sân trường và lớp học"}, {"id": "sp-02", "title": "Tốt nghiệp cử nhân DUKStudio", "category": "s-tot-nghiep", "url": "/assets/samples/tot-nghiep-premium.jpg", "description": "Concept cá nhân tại Phòng B studio"}, {"id": "sp-03", "title": "Chân dung Profile CV chuyên nghiệp", "category": "s-chan-dung", "url": "/assets/samples/profile-cv.jpg", "description": "Tone màu xám tối giản cho hồ sơ LinkedIn"}], "reviews": [{"id": "rev-01", "customerName": "Nguyễn Thị Thúy Linh", "service": "Gói Tốt nghiệp Premium", "rating": 5, "comment": "Studio làm việc chuyên nghiệp, thợ makeup Mai trang điểm rất tự nhiên và anh Tuấn chụp ảnh hướng dẫn tạo dáng nhiệt tình!", "date": "2026-10-25"}, {"id": "rev-02", "customerName": "Trần Hoàng Nam", "service": "Gói Kỷ yếu Tiêu chuẩn", "rating": 5, "comment": "Bộ ảnh lớp mình ai cũng khen, màu ảnh trong trẻo, giao file nhanh đúng hẹn.", "date": "2026-10-18"}]}
```

### Success Example — Filtered Catalog (200 OK)

Query with specific service identifier `?service=s-tot-nghiep` returning filtered service details, matching sample photos, and testimonials.

```http
GET /api/catalog?service=s-tot-nghiep

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"services": [{"id": "s-tot-nghiep", "title": "Tốt nghiệp cá nhân / nhóm", "startingPrice": 1800000, "unit": "buổi", "description": "Chụp tốt nghiệp phong cách thanh lịch, chuyên nghiệp, hỗ trợ makeup và phòng studio hiện đại.", "packages": [{"id": "pkg-tot-nghiep-premium", "name": "Gói Tốt nghiệp Premium", "price": 1800000, "deposit30": 540000, "remaining70": 1260000, "durationHours": 2, "editedPhotos": 30, "features": ["2 giờ chụp studio & sân vườn", "30 ảnh chỉnh sửa chuyên sâu", "Trang điểm & làm tóc chuyên nghiệp 1 giờ", "Phòng chụp B tiện nghi"]}]}], "accessories": [{"id": "acc-cu-nhan", "name": "Bộ lễ phục cử nhân", "price": 50000, "unit": "bộ", "description": "Áo cử nhân, mũ và nơ tốt nghiệp chuẩn các trường"}, {"id": "acc-hoa-cam-tay", "name": "Bó hoa tốt nghiệp tươi", "price": 150000, "unit": "bó", "description": "Hoa hướng dương hoặc hoa hồng kèm băng rôn chúc mừng"}, {"id": "acc-bang-ten", "name": "Bằng tốt nghiệp mô hình", "price": 30000, "unit": "cuốn", "description": "Bằng da đỏ cao cấp khắc chữ mạ vàng phục vụ chụp ảnh"}], "samplePhotos": [{"id": "sp-02", "title": "Tốt nghiệp cử nhân DUKStudio", "category": "s-tot-nghiep", "url": "/assets/samples/tot-nghiep-premium.jpg", "description": "Concept cá nhân tại Phòng B studio"}], "reviews": [{"id": "rev-01", "customerName": "Nguyễn Thị Thúy Linh", "service": "Gói Tốt nghiệp Premium", "rating": 5, "comment": "Studio làm việc chuyên nghiệp, thợ makeup Mai trang điểm rất tự nhiên và anh Tuấn chụp ảnh hướng dẫn tạo dáng nhiệt tình!", "date": "2026-10-25"}]}
```

### Validation Error Example — Invalid Filter (400 Bad Request)

Returned when an invalid or non-existent service query parameter is provided.

```http
GET /api/catalog?service=invalid-service

```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": {"code": "BAD_REQUEST", "message": "Invalid catalog filter parameter", "fields": {"service": "Service 'invalid-service' does not exist"}}}
```

---

## Changes

- **2026-11-26** (Bích Diệp):
  - Initialized service catalog API contract specification in `docs/api/02-catalog.md` (Step G1).
  - Documented `GET /api/catalog` returning photography services, tiered packages, rental accessories, portfolio sample photos, and customer reviews.
  - Specified exact full-catalog and filtered-catalog payload schemas and filtering rules.
  - Formatted standard HTTP 400 Bad Request validation response with `fields.service` key for invalid service queries.
