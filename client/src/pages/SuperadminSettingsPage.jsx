import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../components/DataStates.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OPENING_HOURS_RE = /^([01]?\d|2[0-3]):([0-5]\d)\s*-\s*([01]?\d|2[0-3]):([0-5]\d)$/;

// Deduplicate concurrent GET calls across React 18 StrictMode double-mounts
const inflightAccountsByToken = new Map();
const inflightSettingsByToken = new Map();

function fetchAccountsOnce(token, force = false) {
  const key = token || 'anon';
  if (force) inflightAccountsByToken.delete(key);
  if (inflightAccountsByToken.has(key)) return inflightAccountsByToken.get(key);
  const promise = apiFetch('/api/admin/accounts').finally(() => {
    inflightAccountsByToken.delete(key);
  });
  inflightAccountsByToken.set(key, promise);
  return promise;
}

function fetchSettingsOnce(token, force = false) {
  const key = token || 'anon';
  if (force) inflightSettingsByToken.delete(key);
  if (inflightSettingsByToken.has(key)) return inflightSettingsByToken.get(key);
  const promise = apiFetch('/api/admin/settings').finally(() => {
    inflightSettingsByToken.delete(key);
  });
  inflightSettingsByToken.set(key, promise);
  return promise;
}

function validateAccountForm({ name, email, password }) {
  const errors = {};
  if (!name.trim()) {
    errors.name = 'Vui lòng nhập họ tên quản trị viên.';
  }
  if (!email.trim()) {
    errors.email = 'Vui lòng nhập địa chỉ email.';
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = 'Địa chỉ email không đúng định dạng.';
  }
  if (!password) {
    errors.password = 'Vui lòng nhập mật khẩu khởi tạo.';
  } else if (password.length < 6) {
    errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
  }
  return errors;
}

function validateSettingsForm({ openingHours, reminderHoursBefore }) {
  const errors = {};
  const trimmedHours = String(openingHours || '').trim();
  if (!trimmedHours) {
    errors.openingHours = 'Vui lòng nhập khung giờ mở cửa (ví dụ: 08:00 - 19:00).';
  } else {
    const match = OPENING_HOURS_RE.exec(trimmedHours);
    if (!match) {
      errors.openingHours = 'Giờ mở cửa phải theo định dạng HH:MM - HH:MM (ví dụ: 08:00 - 19:00).';
    } else {
      const startMinutes = Number(match[1]) * 60 + Number(match[2]);
      const endMinutes = Number(match[3]) * 60 + Number(match[4]);
      if (startMinutes >= endMinutes) {
        errors.openingHours = 'Giờ mở cửa phải sớm hơn giờ đóng cửa.';
      }
    }
  }

  const rawHours = String(reminderHoursBefore ?? '').trim();
  const parsedHours = Number(rawHours);
  if (!rawHours || !Number.isInteger(parsedHours) || parsedHours < 1) {
    errors.reminderHoursBefore = 'Số giờ nhắc lịch trước buổi chụp phải là số nguyên lớn hơn hoặc bằng 1.';
  }

  return errors;
}

function formatDateTime(isoString) {
  if (!isoString) return 'Chưa rõ';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function SuperadminSettingsPage() {
  const { token, user } = useAuth();
  const isMountedRef = useRef(true);

  // Accounts list state
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsRetrying, setAccountsRetrying] = useState(false);
  const [accountsError, setAccountsError] = useState('');

  // Create admin form state
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [accountFieldErrors, setAccountFieldErrors] = useState({});
  const [accountTriedSubmit, setAccountTriedSubmit] = useState(false);
  const [accountFormError, setAccountFormError] = useState('');
  const [accountFormSuccess, setAccountFormSuccess] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Studio settings state
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsRetrying, setSettingsRetrying] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  // Settings form state
  const [openingHours, setOpeningHours] = useState('');
  const [reminderHoursBefore, setReminderHoursBefore] = useState('');
  const [settingsFieldErrors, setSettingsFieldErrors] = useState({});
  const [settingsTriedSubmit, setSettingsTriedSubmit] = useState(false);
  const [settingsFormError, setSettingsFormError] = useState('');
  const [settingsFormSuccess, setSettingsFormSuccess] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    document.title = 'DUKStudio — Quản trị hệ thống & Cài đặt';
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadAccounts = useCallback(
    async (isRetry = false) => {
      if (isRetry) {
        setAccountsRetrying(true);
      } else {
        setAccountsLoading(true);
      }
      setAccountsError('');

      try {
        const data = await fetchAccountsOnce(token, isRetry);
        if (!isMountedRef.current) return;
        setAccounts(Array.isArray(data?.accounts) ? data.accounts : []);
      } catch (err) {
        if (!isMountedRef.current) return;
        setAccountsError(
          err?.message || 'Không thể tải danh sách tài khoản Admin. Vui lòng thử lại.'
        );
      } finally {
        if (isMountedRef.current) {
          setAccountsLoading(false);
          setAccountsRetrying(false);
        }
      }
    },
    [token]
  );

  const loadSettings = useCallback(
    async (isRetry = false) => {
      if (isRetry) {
        setSettingsRetrying(true);
      } else {
        setSettingsLoading(true);
      }
      setSettingsError('');

      try {
        const data = await fetchSettingsOnce(token, isRetry);
        if (!isMountedRef.current) return;
        const loaded = data?.settings || null;
        setSettings(loaded);
        if (loaded) {
          setOpeningHours(loaded.openingHours ?? '');
          setReminderHoursBefore(
            loaded.reminderHoursBefore !== undefined && loaded.reminderHoursBefore !== null
              ? String(loaded.reminderHoursBefore)
              : ''
          );
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        setSettingsError(err?.message || 'Không thể tải cấu hình hệ thống. Vui lòng thử lại.');
      } finally {
        if (isMountedRef.current) {
          setSettingsLoading(false);
          setSettingsRetrying(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    loadAccounts(false);
    loadSettings(false);
  }, [loadAccounts, loadSettings]);

  const handleAdminNameChange = (e) => {
    const val = e.target.value;
    setAdminName(val);
    setAccountFormError('');
    setAccountFormSuccess('');
    if (accountTriedSubmit) {
      setAccountFieldErrors(
        validateAccountForm({ name: val, email: adminEmail, password: adminPassword })
      );
    }
  };

  const handleAdminEmailChange = (e) => {
    const val = e.target.value;
    setAdminEmail(val);
    setAccountFormError('');
    setAccountFormSuccess('');
    if (accountTriedSubmit) {
      setAccountFieldErrors(
        validateAccountForm({ name: adminName, email: val, password: adminPassword })
      );
    }
  };

  const handleAdminPasswordChange = (e) => {
    const val = e.target.value;
    setAdminPassword(val);
    setAccountFormError('');
    setAccountFormSuccess('');
    if (accountTriedSubmit) {
      setAccountFieldErrors(
        validateAccountForm({ name: adminName, email: adminEmail, password: val })
      );
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (creatingAccount) return;

    setAccountTriedSubmit(true);
    setAccountFormError('');
    setAccountFormSuccess('');

    const clientErrors = validateAccountForm({
      name: adminName,
      email: adminEmail,
      password: adminPassword
    });
    if (Object.keys(clientErrors).length > 0) {
      setAccountFieldErrors(clientErrors);
      return;
    }

    setAccountFieldErrors({});
    setCreatingAccount(true);

    try {
      const data = await apiFetch('/api/admin/accounts', {
        method: 'POST',
        body: {
          name: adminName.trim(),
          email: adminEmail.trim(),
          password: adminPassword
        }
      });

      const created = data?.account;
      if (created) {
        setAccounts((prev) =>
          prev.some((acc) => acc.id === created.id) ? prev : [...prev, created]
        );
      }

      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setAccountTriedSubmit(false);
      setAccountFieldErrors({});
      setAccountFormSuccess(
        created
          ? `Đã tạo tài khoản ${created.name} (${created.email}) thành công.`
          : 'Đã tạo tài khoản Admin thành công.'
      );
    } catch (err) {
      if (err?.status === 400 && err?.fields && Object.keys(err.fields).length > 0) {
        setAccountFieldErrors(err.fields);
      }
      setAccountFormError(
        err?.message || 'Không thể tạo tài khoản Admin. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleOpeningHoursChange = (e) => {
    const val = e.target.value;
    setOpeningHours(val);
    setSettingsFormError('');
    setSettingsFormSuccess('');
    if (settingsTriedSubmit) {
      setSettingsFieldErrors(
        validateSettingsForm({ openingHours: val, reminderHoursBefore })
      );
    }
  };

  const handleReminderHoursChange = (e) => {
    const val = e.target.value;
    setReminderHoursBefore(val);
    setSettingsFormError('');
    setSettingsFormSuccess('');
    if (settingsTriedSubmit) {
      setSettingsFieldErrors(
        validateSettingsForm({ openingHours, reminderHoursBefore: val })
      );
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (savingSettings) return;

    setSettingsTriedSubmit(true);
    setSettingsFormError('');
    setSettingsFormSuccess('');

    const clientErrors = validateSettingsForm({ openingHours, reminderHoursBefore });
    if (Object.keys(clientErrors).length > 0) {
      setSettingsFieldErrors(clientErrors);
      return;
    }

    setSettingsFieldErrors({});
    setSavingSettings(true);

    try {
      const normalizedHours = openingHours.trim();
      const parsedReminder = Number(String(reminderHoursBefore).trim());

      const data = await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: {
          openingHours: normalizedHours,
          reminderHoursBefore: parsedReminder
        }
      });

      const updated = data?.settings || {
        openingHours: normalizedHours,
        reminderHoursBefore: parsedReminder
      };
      setSettings(updated);
      setOpeningHours(updated.openingHours ?? normalizedHours);
      setReminderHoursBefore(String(updated.reminderHoursBefore ?? parsedReminder));
      setSettingsTriedSubmit(false);
      setSettingsFieldErrors({});
      setSettingsFormSuccess(
        `Đã lưu cấu hình: mở cửa ${updated.openingHours}, nhắc lịch trước ${updated.reminderHoursBefore} giờ.`
      );
    } catch (err) {
      if (err?.status === 400 && err?.fields && Object.keys(err.fields).length > 0) {
        setSettingsFieldErrors(err.fields);
      }
      setSettingsFormError(
        err?.message || 'Không thể lưu cấu hình hệ thống. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="page-main">
      <div className="page-heading">
        <p className="eyebrow">&lt; Quản trị hệ thống · G11 &gt;</p>
        <h1>Quản trị hệ thống &amp; Cài đặt</h1>
        <p className="page-subtitle">
          {user?.name ? `${user.name} — ` : ''}Quản lý danh sách tài khoản Quản lý studio (Admin) và
          thiết lập giờ mở cửa, thời gian gửi nhắc lịch tự động.
        </p>
      </div>

      <div className="superadmin-layout">
        {/* Section 1: Admin Accounts Directory & Provisioning */}
        <section className="admin-panel" aria-labelledby="admin-accounts-heading">
          <div className="panel-header">
            <h2 id="admin-accounts-heading">Tài khoản Quản lý studio (Admin)</h2>
            <p className="panel-subtitle">
              Danh sách các tài khoản Admin hiện có và biểu mẫu cấp tài khoản Admin mới.
            </p>
          </div>

          <div className="panel-subsection">
            <h3>Danh sách tài khoản ({accounts.length})</h3>

            {accountsLoading && <LoadingState label="Đang tải danh sách tài khoản Admin..." />}

            {!accountsLoading && accountsError && (
              <ErrorState
                title="Không thể tải danh sách tài khoản Admin"
                message={accountsError}
                onRetry={() => loadAccounts(true)}
                retrying={accountsRetrying}
              />
            )}

            {!accountsLoading && !accountsError && accounts.length === 0 && (
              <EmptyState
                title="Chưa có tài khoản Admin nào"
                description="Danh sách tài khoản quản lý studio đang trống. Bạn có thể tạo tài khoản Admin mới ngay bên dưới."
              />
            )}

            {!accountsLoading && !accountsError && accounts.length > 0 && (
              <ul className="admin-accounts-list">
                {accounts.map((acc) => (
                  <li key={acc.id} className="admin-account-card">
                    <div className="admin-account-top">
                      <strong>{acc.name}</strong>
                      <span className="status-pill">{acc.role}</span>
                    </div>
                    <p className="admin-account-email">{acc.email}</p>
                    <p className="admin-account-meta">
                      Mã: <code>{acc.id}</code> · Tạo lúc: {formatDateTime(acc.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel-subsection">
            <h3>Tạo tài khoản Admin mới</h3>

            {accountFormError && (
              <p className="form-banner-error" role="alert">
                {accountFormError}
              </p>
            )}

            {accountFormSuccess && (
              <p className="form-banner-success" role="status">
                {accountFormSuccess}
              </p>
            )}

            <form className="form-stack" onSubmit={handleCreateAccount} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-name">
                  Họ tên quản trị viên
                </label>
                <input
                  id="admin-name"
                  name="name"
                  type="text"
                  className="form-input"
                  value={adminName}
                  onChange={handleAdminNameChange}
                  aria-invalid={Boolean(accountFieldErrors.name)}
                  aria-describedby={accountFieldErrors.name ? 'admin-name-error' : undefined}
                />
                {accountFieldErrors.name && (
                  <p id="admin-name-error" className="field-error">
                    {accountFieldErrors.name}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="admin-email">
                  Email đăng nhập
                </label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  className="form-input"
                  value={adminEmail}
                  onChange={handleAdminEmailChange}
                  aria-invalid={Boolean(accountFieldErrors.email)}
                  aria-describedby={accountFieldErrors.email ? 'admin-email-error' : undefined}
                />
                {accountFieldErrors.email && (
                  <p id="admin-email-error" className="field-error">
                    {accountFieldErrors.email}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="admin-password">
                  Mật khẩu khởi tạo (tối thiểu 6 ký tự)
                </label>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  className="form-input"
                  value={adminPassword}
                  onChange={handleAdminPasswordChange}
                  aria-invalid={Boolean(accountFieldErrors.password)}
                  aria-describedby={
                    accountFieldErrors.password ? 'admin-password-error' : undefined
                  }
                />
                {accountFieldErrors.password && (
                  <p id="admin-password-error" className="field-error">
                    {accountFieldErrors.password}
                  </p>
                )}
              </div>

              <button type="submit" className="pink-cta" disabled={creatingAccount}>
                {creatingAccount ? 'Đang tạo tài khoản...' : 'Tạo tài khoản Admin'}
              </button>
            </form>
          </div>
        </section>

        {/* Section 2: Studio Operating Hours & Reminder Settings */}
        <section className="admin-panel" aria-labelledby="studio-settings-heading">
          <div className="panel-header">
            <h2 id="studio-settings-heading">Cấu hình vận hành studio</h2>
            <p className="panel-subtitle">
              Thiết lập giờ mở cửa áp dụng cho kiểm tra trùng lịch và số giờ gửi nhắc lịch trước
              buổi chụp.
            </p>
          </div>

          <div className="panel-subsection">
            <h3>Giờ mở cửa &amp; nhắc lịch</h3>

            {settingsLoading && <LoadingState label="Đang tải cấu hình hệ thống..." />}

            {!settingsLoading && settingsError && (
              <ErrorState
                title="Không thể tải cấu hình hệ thống"
                message={settingsError}
                onRetry={() => loadSettings(true)}
                retrying={settingsRetrying}
              />
            )}

            {!settingsLoading && !settingsError && !settings && (
              <EmptyState
                title="Chưa có cấu hình hệ thống"
                description="Hiện chưa có thông số vận hành studio được thiết lập."
              />
            )}

            {!settingsLoading && !settingsError && settings && (
              <>
                <dl className="settings-summary">
                  <div className="settings-summary-row">
                    <dt>Giờ mở cửa hiện tại</dt>
                    <dd>{settings.openingHours}</dd>
                  </div>
                  <div className="settings-summary-row">
                    <dt>Nhắc lịch trước buổi chụp</dt>
                    <dd>{settings.reminderHoursBefore} giờ</dd>
                  </div>
                  {settings.updatedAt && (
                    <div className="settings-summary-row">
                      <dt>Cập nhật gần nhất</dt>
                      <dd>{formatDateTime(settings.updatedAt)}</dd>
                    </div>
                  )}
                </dl>

                {settingsFormError && (
                  <p className="form-banner-error" role="alert">
                    {settingsFormError}
                  </p>
                )}

                {settingsFormSuccess && (
                  <p className="form-banner-success" role="status">
                    {settingsFormSuccess}
                  </p>
                )}

                <form className="form-stack" onSubmit={handleSaveSettings} noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="settings-opening-hours">
                      Giờ mở cửa studio (định dạng HH:MM - HH:MM)
                    </label>
                    <input
                      id="settings-opening-hours"
                      name="openingHours"
                      type="text"
                      className="form-input"
                      value={openingHours}
                      onChange={handleOpeningHoursChange}
                      aria-invalid={Boolean(settingsFieldErrors.openingHours)}
                      aria-describedby={
                        settingsFieldErrors.openingHours
                          ? 'settings-opening-hours-help settings-opening-hours-error'
                          : 'settings-opening-hours-help'
                      }
                    />
                    <p id="settings-opening-hours-help" className="field-hint">
                      Ví dụ: 08:00 - 19:00 hoặc 07:30 - 20:00.
                    </p>
                    {settingsFieldErrors.openingHours && (
                      <p id="settings-opening-hours-error" className="field-error">
                        {settingsFieldErrors.openingHours}
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="settings-reminder-hours">
                      Thời gian gửi nhắc lịch trước buổi chụp (giờ)
                    </label>
                    <input
                      id="settings-reminder-hours"
                      name="reminderHoursBefore"
                      type="number"
                      min="1"
                      step="1"
                      className="form-input"
                      value={reminderHoursBefore}
                      onChange={handleReminderHoursChange}
                      aria-invalid={Boolean(settingsFieldErrors.reminderHoursBefore)}
                      aria-describedby={
                        settingsFieldErrors.reminderHoursBefore
                          ? 'settings-reminder-hours-help settings-reminder-hours-error'
                          : 'settings-reminder-hours-help'
                      }
                    />
                    <p id="settings-reminder-hours-help" className="field-hint">
                      Nhập số nguyên dương (tối thiểu 1 giờ, mặc định 24 giờ).
                    </p>
                    {settingsFieldErrors.reminderHoursBefore && (
                      <p id="settings-reminder-hours-error" className="field-error">
                        {settingsFieldErrors.reminderHoursBefore}
                      </p>
                    )}
                  </div>

                  <button type="submit" className="blue-cta" disabled={savingSettings}>
                    {savingSettings ? 'Đang lưu cài đặt...' : 'Lưu cài đặt'}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
