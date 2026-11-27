# Service Catalog API Contract (02-catalog.md)

Specification of the service discovery and catalog endpoint for the DUKStudio platform, providing photography packages, pricing tiers, rental accessories, sample portfolio photos, and verified customer testimonials (serving Step G1).

Every service exposes at least one package. Every package includes a name, duration, edited-photo count, and price. In this project, edited-photo counts are capped at 30 to match the brief; `startingPrice` is the lowest package price for that service. The Kỷ yếu class package is priced per person; its booking inquiry supplies a participant count, which the server multiplies by the unit price.

---

## 1. Retrieve Service Catalog (GET /api/catalog)

Retrieves public studio offerings including photography services, tiered package details, studio amenities, rental accessories, portfolio sample photos, and customer reviews.

- **Endpoint**: `GET /api/catalog`
- **Permissions**: Public (Visitor / Unauthenticated, Customer).
- **Query Parameters**:
  - `service` (string, optional): Specific service identifier to filter catalog items (e.g. `svc-tot-nghiep`).

### Behavior & Filtering Rules

1. **Full Catalog (`GET /api/catalog`)**:
   When called without query parameters, returns all available photography services (`svc-tot-nghiep`, `svc-ky-yeu`, `svc-chan-dung`), complete package tiers, rental accessories, sample portfolio images across all categories, and verified customer testimonials.

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

{"services":[{"id":"svc-tot-nghiep","title":"Chụp tốt nghiệp","description":"Ảnh tốt nghiệp cá nhân hoặc nhóm, có trang điểm và phòng chụp riêng.","unit":"buổi","startingPrice":1200000,"packages":[{"id":"pkg-tn-co-ban","name":"Gói Tốt nghiệp Cơ bản","price":1200000,"durationHours":1,"editedPhotos":15,"deposit30":360000,"remaining70":840000,"features":["Chụp 60 phút","Phòng A","Không trang điểm"]},{"id":"pkg-tn-premium","name":"Gói Tốt nghiệp Premium","price":1800000,"durationHours":2,"editedPhotos":30,"deposit30":540000,"remaining70":1260000,"features":["Trang điểm 60 phút ngay trước giờ chụp","Chụp 120 phút","Phòng B"]},{"id":"pkg-tn-nhom","name":"Gói Tốt nghiệp Nhóm (tối đa 5 người)","price":4500000,"durationHours":3,"editedPhotos":30,"deposit30":1350000,"remaining70":3150000,"features":["Trang điểm theo nhóm 60 phút ngay trước giờ chụp","Chụp 180 phút","Phòng A"]}]},{"id":"svc-ky-yeu","title":"Chụp kỷ yếu","description":"Chụp tập thể lớp, concept theo yêu cầu của lớp.","unit":"người","startingPrice":350000,"packages":[{"id":"pkg-ky-yeu","name":"Gói Kỷ yếu Lớp","price":350000,"durationHours":3,"editedPhotos":30,"deposit30":105000,"remaining70":245000,"features":["Chụp 180 phút tại trường","Cọc 30%, còn lại 70% của tổng"]}]},{"id":"svc-chan-dung","title":"Chân dung / Profile CV","description":"Ảnh chân dung cho hồ sơ xin việc và mạng nghề nghiệp.","unit":"buổi","startingPrice":690000,"packages":[{"id":"pkg-chan-dung","name":"Gói Chân dung Profile","price":690000,"durationHours":1,"editedPhotos":10,"deposit30":207000,"remaining70":483000,"features":["Chụp 60 phút","Phòng A"]}]}],"accessories":[{"id":"acc-cu-nhan","name":"Bộ lễ phục cử nhân","price":50000,"unit":"bộ","description":"Áo cử nhân, mũ và nơ tốt nghiệp chuẩn các trường"},{"id":"acc-hoa-cam-tay","name":"Bó hoa tốt nghiệp tươi","price":150000,"unit":"bó","description":"Hoa hướng dương hoặc hoa hồng kèm băng rôn chúc mừng"},{"id":"acc-bang-ten","name":"Bằng tốt nghiệp mô hình","price":30000,"unit":"cuốn","description":"Bằng da đỏ cao cấp khắc chữ mạ vàng phục vụ chụp ảnh"}],"samplePhotos":[{"id":"sp-01","title":"Kỷ yếu thanh xuân 12A3","category":"s-ky-yeu","url":"/assets/samples/ky-yeu-12a3.jpg","description":"Chụp ngoại cảnh sân trường và lớp học"},{"id":"sp-02","title":"Tốt nghiệp cử nhân DUKStudio","category":"s-tot-nghiep","url":"/assets/samples/tot-nghiep-premium.jpg","description":"Concept cá nhân tại Phòng B studio"},{"id":"sp-03","title":"Chân dung Profile CV chuyên nghiệp","category":"s-chan-dung","url":"/assets/samples/profile-cv.jpg","description":"Tone màu xám tối giản cho hồ sơ LinkedIn"}],"reviews":[{"id":"rv-01","customerName":"Huỳnh Thu Hà","service":"Gói Tốt nghiệp Premium","rating":5,"comment":"Studio báo lịch rõ ràng, chọn ảnh dễ, nhận ảnh đúng hẹn.","date":"2026-10-25"},{"id":"rv-02","customerName":"Phan Ngọc Anh","service":"Gói Tốt nghiệp Nhóm (tối đa 5 người)","rating":5,"comment":"Nhóm 4 người trang điểm nhanh, chụp rất vui.","date":"2026-10-25"},{"id":"rv-03","customerName":"Lương Đức Thịnh","service":"Gói Chân dung Profile","rating":4,"comment":"Ảnh CV chuyên nghiệp, chỉ phải chờ ảnh hơi lâu.","date":"2026-10-25"},{"id":"rev-01","customerName":"Nguyễn Thị Thúy Linh","service":"Gói Tốt nghiệp Premium","rating":5,"comment":"Studio làm việc chuyên nghiệp, thợ makeup Mai trang điểm rất tự nhiên và anh Tuấn chụp ảnh hướng dẫn tạo dáng nhiệt tình!","date":"2026-10-25"},{"id":"rev-02","customerName":"Trần Hoàng Nam","service":"Gói Kỷ yếu Lớp","rating":5,"comment":"Bộ ảnh lớp mình ai cũng khen, màu ảnh trong trẻo, giao file nhanh đúng hẹn.","date":"2026-10-25"}]}
```

### Success Example — Filtered Catalog (200 OK)

Query with specific service identifier `?service=svc-tot-nghiep` returning filtered service details, matching sample photos, and testimonials.

```http
GET /api/catalog?service=svc-tot-nghiep

```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"services":[{"id":"svc-tot-nghiep","title":"Chụp tốt nghiệp","description":"Ảnh tốt nghiệp cá nhân hoặc nhóm, có trang điểm và phòng chụp riêng.","unit":"buổi","startingPrice":1200000,"packages":[{"id":"pkg-tn-co-ban","name":"Gói Tốt nghiệp Cơ bản","price":1200000,"durationHours":1,"editedPhotos":15,"deposit30":360000,"remaining70":840000,"features":["Chụp 60 phút","Phòng A","Không trang điểm"]},{"id":"pkg-tn-premium","name":"Gói Tốt nghiệp Premium","price":1800000,"durationHours":2,"editedPhotos":30,"deposit30":540000,"remaining70":1260000,"features":["Trang điểm 60 phút ngay trước giờ chụp","Chụp 120 phút","Phòng B"]},{"id":"pkg-tn-nhom","name":"Gói Tốt nghiệp Nhóm (tối đa 5 người)","price":4500000,"durationHours":3,"editedPhotos":30,"deposit30":1350000,"remaining70":3150000,"features":["Trang điểm theo nhóm 60 phút ngay trước giờ chụp","Chụp 180 phút","Phòng A"]}]}],"accessories":[{"id":"acc-cu-nhan","name":"Bộ lễ phục cử nhân","price":50000,"unit":"bộ","description":"Áo cử nhân, mũ và nơ tốt nghiệp chuẩn các trường"},{"id":"acc-hoa-cam-tay","name":"Bó hoa tốt nghiệp tươi","price":150000,"unit":"bó","description":"Hoa hướng dương hoặc hoa hồng kèm băng rôn chúc mừng"},{"id":"acc-bang-ten","name":"Bằng tốt nghiệp mô hình","price":30000,"unit":"cuốn","description":"Bằng da đỏ cao cấp khắc chữ mạ vàng phục vụ chụp ảnh"}],"samplePhotos":[{"id":"sp-02","title":"Tốt nghiệp cử nhân DUKStudio","category":"s-tot-nghiep","url":"/assets/samples/tot-nghiep-premium.jpg","description":"Concept cá nhân tại Phòng B studio"}],"reviews":[{"id":"rv-01","customerName":"Huỳnh Thu Hà","service":"Gói Tốt nghiệp Premium","rating":5,"comment":"Studio báo lịch rõ ràng, chọn ảnh dễ, nhận ảnh đúng hẹn.","date":"2026-10-25"},{"id":"rv-02","customerName":"Phan Ngọc Anh","service":"Gói Tốt nghiệp Nhóm (tối đa 5 người)","rating":5,"comment":"Nhóm 4 người trang điểm nhanh, chụp rất vui.","date":"2026-10-25"},{"id":"rev-01","customerName":"Nguyễn Thị Thúy Linh","service":"Gói Tốt nghiệp Premium","rating":5,"comment":"Studio làm việc chuyên nghiệp, thợ makeup Mai trang điểm rất tự nhiên và anh Tuấn chụp ảnh hướng dẫn tạo dáng nhiệt tình!","date":"2026-10-25"}]}
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

- **2026-11-27**:
  - Documented that every service must expose at least one package, the catalog starting price is the service's lowest package price, and each package supplies duration, edited-photo count and price. Documented the per-person Kỷ yếu pricing choice and server-side multiplication.
  - Replaced stale catalog response examples and service identifiers with the current mock data; the filter accepts service IDs and returns sample photos in their matching legacy category.
  - Capped the team-defined group package at 30 edited photos to match the brief's overall selection limit.
