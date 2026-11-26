import { Link } from 'react-router-dom';
import { getHomePathForRole, useAuth } from '../context/AuthContext.jsx';

const ROLE_LABELS = {
  customer: 'Khách hàng (Customer)',
  admin: 'Quản lý studio (Admin)',
  staff: 'Nhân sự studio (Staff)',
  superadmin: 'Quản trị hệ thống (Superadmin)'
};

export default function ForbiddenPage({ requiredRoles = [] }) {
  const { user } = useAuth();
  const homePath = getHomePathForRole(user?.role);

  return (
    <div className="page-main">
      <section className="state-card state-card--error" aria-labelledby="forbidden-title">
        <p className="eyebrow">&lt; Phân quyền truy cập · 403 &gt;</p>
        <h1 id="forbidden-title">Bạn không có quyền mở trang này</h1>
        <p>
          Tài khoản hiện tại (<strong>{user?.name || 'Chưa xác định'}</strong> —{' '}
          {ROLE_LABELS[user?.role] || user?.role}) không thuộc vai trò được phép truy cập{' '}
          {requiredRoles.length > 0
            ? `(${requiredRoles.map((r) => ROLE_LABELS[r] || r).join(', ')})`
            : 'khu vực này'}
          .
        </p>
        <div className="state-actions">
          <Link className="blue-cta" to={homePath}>
            Về trang chính của vai trò
          </Link>
          <Link className="pink-cta" to="/">
            Về trang chủ Dịch vụ
          </Link>
        </div>
      </section>
    </div>
  );
}
