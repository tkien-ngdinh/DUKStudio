import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getHomePathForRole, useAuth } from '../context/AuthContext.jsx';

const DEMO_ACCOUNTS = [
  { role: 'customer', label: 'Linh (Customer)', email: 'linh@gradstudio.test', password: 'linh-demo' },
  { role: 'admin', label: 'Admin Thảo', email: 'thao@gradstudio.test', password: 'thao-demo' },
  { role: 'staff', label: 'Mai (Makeup Staff)', email: 'mai@gradstudio.test', password: 'mai-demo' },
  { role: 'staff', label: 'Tuấn (Photographer)', email: 'tuan@gradstudio.test', password: 'tuan-demo' },
  { role: 'superadmin', label: 'Superadmin', email: 'superadmin@gradstudio.test', password: 'superadmin-demo' }
];

export default function LoginPage() {
  const { user, isAuthenticated, authNotice, clearNotice, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = 'DUKStudio — Đăng nhập';
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

  const redirectTo = location.state?.from;

  function validateInputs(nextEmail, nextPassword) {
    const errors = {};
    if (!nextEmail.trim()) {
      errors.email = 'Vui lòng nhập email hoặc tên đăng nhập.';
    }
    if (!nextPassword) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    }
    return errors;
  }

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (hasTriedSubmit) {
      setFieldErrors(validateInputs(val, password));
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (hasTriedSubmit) {
      setFieldErrors(validateInputs(email, val));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setHasTriedSubmit(true);
    setFormError('');
    clearNotice();

    const clientErrors = validateInputs(email, password);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const data = await login(email.trim(), password);
      const target =
        typeof redirectTo === 'string' && redirectTo.startsWith('/') && redirectTo !== '/login'
          ? redirectTo
          : getHomePathForRole(data?.user?.role);
      navigate(target, { replace: true });
    } catch (err) {
      if (err?.status === 400 && err?.fields && Object.keys(err.fields).length > 0) {
        setFieldErrors(err.fields);
      }
      setFormError(err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra thông tin và thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated && user) {
    const homePath = getHomePathForRole(user.role);
    return (
      <div className="page-main">
        <section className="auth-section" aria-labelledby="login-active-title">
          <div className="page-heading">
            <p className="eyebrow">&lt; Tài khoản &gt;</p>
            <h1 id="login-active-title">Bạn đã đăng nhập</h1>
            <p className="page-subtitle">
              Đang sử dụng tài khoản <strong>{user.name}</strong> ({user.role}). Để đổi vai trò khác, hãy đăng xuất trước.
            </p>
          </div>
          <div className="auth-card">
            <div className="state-actions">
              <Link className="blue-cta" to={homePath}>
                Vào trang chính của tôi
              </Link>
              <button type="button" className="logout-button" onClick={logout}>
                Đăng xuất
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-main">
      <section className="auth-section" aria-labelledby="login-title">
        <div className="page-heading">
          <p className="eyebrow">&lt; Xác thực tài khoản · G2 &gt;</p>
          <h1 id="login-title">Đăng nhập GradStudio</h1>
          <p className="page-subtitle">
            Cổng đăng nhập chung cho Khách hàng, Admin, Nhân sự và Superadmin.
          </p>
        </div>

        <div className="auth-card">
          <h2>Thông tin đăng nhập</h2>

          {authNotice && (
            <p className="auth-notice" role="status">
              {authNotice}
            </p>
          )}

          {!authNotice && redirectTo && (
            <p className="auth-notice" role="status">
              Vui lòng đăng nhập để tiếp tục truy cập <strong>{redirectTo}</strong>.
            </p>
          )}

          {formError && (
            <p className="form-banner-error" role="alert">
              {formError}
            </p>
          )}

          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email hoặc tên đăng nhập
              </label>
              <input
                id="login-email"
                name="email"
                type="text"
                autoComplete="username"
                className="form-input"
                value={email}
                onChange={handleEmailChange}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              />
              {fieldErrors.email && (
                <p id="login-email-error" className="field-error">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Mật khẩu
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="form-input"
                value={password}
                onChange={handlePasswordChange}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
              />
              {fieldErrors.password && (
                <p id="login-password-error" className="field-error">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button type="submit" className="pink-cta" disabled={submitting}>
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <aside className="demo-accounts-box" aria-labelledby="demo-accounts-heading">
          <h2 id="demo-accounts-heading">Tài khoản thử nghiệm</h2>
          <p>Nhập đúng email (hoặc tên ngắn) và mật khẩu tương ứng từ bảng tài khoản mẫu:</p>
          <ul className="demo-accounts-list">
            {DEMO_ACCOUNTS.map((acc) => (
              <li key={acc.email}>
                <strong>{acc.label}</strong>: <code>{acc.email}</code> / <code>{acc.password}</code>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
