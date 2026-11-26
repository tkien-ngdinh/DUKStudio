import { Link } from 'react-router-dom';
import { getHomePathForRole, useAuth } from '../context/AuthContext.jsx';

export default function NotFoundPage() {
  const { isAuthenticated, user } = useAuth();
  const homePath = isAuthenticated ? getHomePathForRole(user?.role) : '/';

  return (
    <div className="page-main">
      <section className="state-card state-card--empty" aria-labelledby="not-found-title">
        <p className="eyebrow">&lt; Lỗi điều hướng · 404 &gt;</p>
        <h1 id="not-found-title">Không tìm thấy trang bạn yêu cầu</h1>
        <p>
          Đường dẫn này không tồn tại trong hệ thống DUKStudio hoặc chưa được mở ở bước hiện tại.
        </p>
        <div className="state-actions">
          <Link className="blue-cta" to={homePath}>
            {isAuthenticated ? 'Về trang chính của tôi' : 'Về trang Dịch vụ'}
          </Link>
          {isAuthenticated && (
            <Link className="pink-cta" to="/">
              Xem trang Dịch vụ
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
