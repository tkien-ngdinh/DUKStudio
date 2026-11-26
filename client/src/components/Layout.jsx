import { Link, NavLink, useNavigate } from 'react-router-dom';
import { getHomePathForRole, useAuth } from '../context/AuthContext.jsx';

const NAV_BY_ROLE = {
  visitor: [
    { to: '/', label: 'Dịch vụ', end: true },
    { to: '/login', label: 'Đăng nhập', end: true }
  ],
  customer: [
    { to: '/', label: 'Dịch vụ', end: true },
    { to: '/chat', label: 'Tư vấn', end: true },
    { to: '/my-bookings', label: 'Lịch chụp của tôi', end: true }
  ],
  admin: [
    { to: '/admin/conversations', label: 'Hội thoại', end: false },
    { to: '/admin/bookings', label: 'Quản lý booking', end: false },
    { to: '/', label: 'Dịch vụ', end: true }
  ],
  staff: [{ to: '/staff/jobs', label: 'Công việc của tôi', end: true }],
  superadmin: [{ to: '/superadmin/settings', label: 'Tài khoản & Cài đặt', end: true }]
};

export default function Layout({ children }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const roleKey = isAuthenticated && user?.role ? user.role : 'visitor';
  const navItems = NAV_BY_ROLE[roleKey] || NAV_BY_ROLE.visitor;
  const homePath = isAuthenticated ? getHomePathForRole(user?.role) : '/';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="site" id="dau-trang">
      <header className="site-header">
        <div className="brand-block">
          <Link className="brand-link" to={homePath} aria-label="DUKStudio — Trang chủ">
            <img className="brand-logo" src="/assets/logo.svg" alt="DUKStudio" />
          </Link>
          <p className="brand-caption">&lt; studio ảnh tốt nghiệp &gt;</p>
        </div>

        <nav className="main-nav" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-account">
          {isAuthenticated && user ? (
            <>
              <div className="user-badge">
                <div className="user-avatar" aria-hidden="true">
                  <span>{(user.name || user.email || '?').slice(0, 1).toUpperCase()}</span>
                  <span className="online-dot" />
                </div>
                <div className="user-meta">
                  <strong className="user-name">{user.name}</strong>
                  <span className="user-role">{user.role}</span>
                </div>
              </div>
              <button type="button" className="logout-button" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <Link className="header-login-link" to="/login">
              Đăng nhập
            </Link>
          )}
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-head">
          <img src="/assets/logo.svg" alt="DUKStudio" />
          <span>&lt; GradStudio · DUKStudio &gt;</span>
        </div>
        <p className="footer-meta">
          DUKStudio · Nền tảng đặt lịch và giao ảnh tốt nghiệp GradStudio
        </p>
        <nav aria-label="Điều hướng chân trang">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
        <p>DUKStudio · CSC13008 PA#3 React SPA</p>
      </footer>
    </div>
  );
}
