import { Link, useParams } from 'react-router-dom';
import { getHomePathForRole, useAuth } from '../context/AuthContext.jsx';

/**
 * Clean scaffold view for routes whose full feature UI is implemented in Tasks 8–12.
 * Never hardcodes domain data; displays route identity and navigation links only.
 */
export default function RoutePlaceholder({ step, title, description, endpoints = [] }) {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const homePath = isAuthenticated ? getHomePathForRole(user?.role) : '/';

  return (
    <div className="page-main">
      <div className="page-heading">
        <p className="eyebrow">&lt; {step} &gt;</p>
        <h1>{id ? `${title} (${id})` : title}</h1>
        <p className="page-subtitle">{description}</p>
      </div>

      <section className="scaffold-card" aria-labelledby="scaffold-section-title">
        <h2 id="scaffold-section-title">Khung tuyến đường đã sẵn sàng</h2>
        <div className="scaffold-meta">
          <span className="status-pill">Bước: {step}</span>
          {user && (
            <span className="status-pill">
              Vai trò: {user.name} ({user.role})
            </span>
          )}
        </div>
        <p>
          Màn hình này đã được gắn vào React Router, AuthContext và khung layout chung. Phần giao diện dữ liệu chi tiết sẽ được lắp ghép từ API trong các task màn hình tiếp theo.
        </p>

        {endpoints.length > 0 && (
          <>
            <h3>Endpoints theo hợp đồng API</h3>
            <ul className="endpoint-list">
              {endpoints.map((ep) => (
                <li key={ep}>
                  <code>{ep}</code>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="state-actions">
          <Link className="blue-cta" to={homePath}>
            Trang chính vai trò
          </Link>
          <Link className="pink-cta" to="/">
            Trang chủ Dịch vụ
          </Link>
        </div>
      </section>
    </div>
  );
}
