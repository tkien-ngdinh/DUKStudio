import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoutePlaceholder from './components/RoutePlaceholder.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import CustomerChatPage from './pages/CustomerChatPage.jsx';
import StaffJobsPage from './pages/StaffJobsPage.jsx';
import SuperadminSettingsPage from './pages/SuperadminSettingsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Public / Visitor + Customer */}
        <Route path="/" element={<HomePage />} />

        {/* Authentication (G2) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Customer routes (G3, G6, G7, G9) */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerChatPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <RoutePlaceholder
                step="G7"
                title="Lịch chụp của tôi"
                description="Danh sách booking của khách hàng và nhắc lịch tự động."
                endpoints={['GET /api/bookings', 'GET /api/reminders']}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bookings/:id"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <RoutePlaceholder
                step="G7"
                title="Chi tiết booking"
                description="Xem thông tin gói chụp, lịch đã thống nhất, giá gói, cọc 30% và phần còn lại 70%."
                endpoints={['GET /api/bookings/:id', 'POST /api/payments/deposit']}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment/test"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <RoutePlaceholder
                step="G7 (after G7 payment initiation)"
                title="Cổng thanh toán thử (Test Payment)"
                description="Màn hình mô phỏng kết quả thanh toán thành công hoặc thất bại; nếu mở trước khi tạo giao dịch sẽ hiển thị thông báo."
                endpoints={['POST /api/payments/test-result']}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/gallery/:id"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <RoutePlaceholder
                step="G9"
                title="Thư viện ảnh xem trước"
                description="Chọn tối đa 30 ảnh chỉnh sửa, thanh toán 70% còn lại và xác nhận Nhận ảnh."
                endpoints={[
                  'GET /api/bookings/:id',
                  'POST /api/gallery/:id/select',
                  'POST /api/payments/remaining',
                  'POST /api/gallery/:id/receive'
                ]}
              />
            </ProtectedRoute>
          }
        />

        {/* Admin routes (G4, G5, G6, G10) */}
        <Route
          path="/admin/conversations"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <RoutePlaceholder
                step="G4"
                title="Quản lý hội thoại khách hàng"
                description="Danh sách hội thoại theo 4 trạng thái: Chưa trả lời, Đang tư vấn, Đã chốt lịch, Hoàn thành."
                endpoints={['GET /api/conversations', 'GET /api/conversations/:id']}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/conversations/:id"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <RoutePlaceholder
                step="G4 · G5 · G6"
                title="Chi tiết hội thoại & Kiểm tra trùng lịch"
                description="Kiểm tra lịch nhân sự/phòng, đề xuất giờ mới trong chat và Tạo booking khi khách đồng ý."
                endpoints={[
                  'GET /api/conversations/:id',
                  'POST /api/conversations/:id/messages',
                  'GET /api/schedule',
                  'POST /api/schedule/clash-check',
                  'POST /api/conversations/:id/propose-time',
                  'POST /api/bookings'
                ]}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <RoutePlaceholder
                step="G10"
                title="Quản lý danh sách booking"
                description="Theo dõi toàn bộ booking và trạng thái thanh toán của studio."
                endpoints={['GET /api/bookings']}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/bookings/:id"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <RoutePlaceholder
                step="G10"
                title="Điều chỉnh booking & Link ảnh hoàn thiện"
                description="Đổi lịch kèm kiểm tra trùng lịch, hủy booking và gắn link tải ảnh cuối."
                endpoints={[
                  'GET /api/bookings/:id',
                  'GET /api/schedule',
                  'PATCH /api/bookings/:id',
                  'POST /api/bookings/:id/final-link'
                ]}
              />
            </ProtectedRoute>
          }
        />

        {/* Staff route (G8) */}
        <Route
          path="/staff/jobs"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffJobsPage />
            </ProtectedRoute>
          }
        />

        {/* Superadmin route (G11) */}
        <Route
          path="/superadmin/settings"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperadminSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
