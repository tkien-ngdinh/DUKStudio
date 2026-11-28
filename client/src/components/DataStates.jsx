/**
 * Shared UX state components required by AGENTS.md and PA#3 Criterion 3:
 * LoadingState, ErrorState (with in-place Retry), and EmptyState.
 */

export function LoadingState({ label = 'Đang tải dữ liệu...' }) {
  return (
    <section className="state-card state-card--loading" role="status" aria-live="polite">
      <div className="loading-row">
        <span className="loading-spinner" aria-hidden="true" />
        <h2>Đang tải</h2>
      </div>
      <p>{label}</p>
    </section>
  );
}

export function ErrorState({
  title = 'Không thể tải dữ liệu',
  message = 'Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.',
  onRetry,
  retrying = false
}) {
  return (
    <section className="state-card state-card--error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {typeof onRetry === 'function' && (
        <div className="state-actions">
          <button
            type="button"
            className="blue-cta"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? 'Đang thử lại...' : 'Thử lại'}
          </button>
        </div>
      )}
    </section>
  );
}

export function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Hiện chưa có mục nào để hiển thị.',
  action = null
}) {
  return (
    <section className="state-card state-card--empty" aria-live="polite">
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className="state-actions">{action}</div>}
    </section>
  );
}
