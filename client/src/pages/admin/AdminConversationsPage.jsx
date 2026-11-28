import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../../components/DataStates.jsx';
import { formatDateTime } from '../../utils/format.js';

const PAGE_TITLE = 'Hội thoại khách hàng';
const LIST_PATH = '/api/conversations';

// The four G4 tabs, named exactly as in the brief and as the API sends `status` (03-chat.md).
// The badge colour only supports the status text; it never carries the meaning alone.
const STATUS_TABS = [
  { status: 'Chưa trả lời', badge: 'status-badge--new' },
  { status: 'Đang tư vấn', badge: 'status-badge--advising' },
  { status: 'Đã chốt lịch', badge: 'status-badge--agreed' },
  { status: 'Hoàn thành', badge: 'status-badge--done' }
];

function badgeFor(status) {
  return STATUS_TABS.find((tab) => tab.status === status)?.badge || '';
}

function tabHref(status) {
  return `/admin/conversations?${new URLSearchParams({ status }).toString()}`;
}

// StrictMode mounts the page twice in development; both mounts share one in-flight request,
// so the mock log shows a single GET /api/conversations per load.
const inflight = new Map();
function getOnce(path) {
  if (inflight.has(path)) return inflight.get(path);
  const promise = apiFetch(path).finally(() => inflight.delete(path));
  inflight.set(path, promise);
  return promise;
}

function lastMessageOf(conversation) {
  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
  return messages.length ? messages[messages.length - 1] : null;
}

function byLatestMessage(a, b) {
  return String(b.lastMessageAt || '').localeCompare(String(a.lastMessageAt || ''));
}

export default function AdminConversationsPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ phase: 'loading', conversations: [], message: '' });
  const requestId = useRef(0);

  // An unknown or missing ?status= shows the first tab
  const activeTab =
    STATUS_TABS.find((tab) => tab.status === searchParams.get('status')) || STATUS_TABS[0];

  useEffect(() => {
    document.title = `DUKStudio — ${PAGE_TITLE}`;
  }, []);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, phase: 'loading', message: '' }));
    try {
      const data = await getOnce(LIST_PATH);
      if (id !== requestId.current) return;
      const list = Array.isArray(data?.conversations) ? data.conversations : [];
      setState({ phase: 'ready', conversations: list, message: '' });
    } catch (err) {
      if (id !== requestId.current) return;
      setState({ phase: 'error', conversations: [], message: err?.message || '' });
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      // Ignore an answer that arrives after the page is left
      requestId.current += 1;
    };
  }, [load]);

  const { phase, conversations, message } = state;
  const ready = phase === 'ready';
  const countOf = (status) => conversations.filter((c) => c.status === status).length;
  const visible = conversations.filter((c) => c.status === activeTab.status).sort(byLatestMessage);

  return (
    <div className="page-main">
      <div className="page-heading">
        <p className="eyebrow">&lt; G4 &gt;</p>
        <h1>{PAGE_TITLE}</h1>
        <p className="page-subtitle">
          Yêu cầu tư vấn của khách, chia theo 4 trạng thái. Chọn một hội thoại để trả lời, kiểm tra lịch và đề xuất giờ chụp.
        </p>
      </div>

      <ul className="admin-status-tabs" aria-label="Lọc hội thoại theo trạng thái">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.status === activeTab.status;
          return (
            <li key={tab.status}>
              <Link
                to={tabHref(tab.status)}
                className={isActive ? 'admin-status-tab is-active' : 'admin-status-tab'}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.status}
                {ready && <span className="admin-status-count">({countOf(tab.status)})</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="admin-convo-panel" aria-labelledby="admin-convo-heading">
        <h2 id="admin-convo-heading">
          {activeTab.status}
          {ready && ` (${visible.length})`}
        </h2>

        {phase === 'loading' && <LoadingState label="Đang tải danh sách hội thoại..." />}

        {phase === 'error' && (
          <ErrorState
            title="Không thể tải danh sách hội thoại"
            message={message || 'Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.'}
            onRetry={load}
          />
        )}

        {ready && conversations.length === 0 && (
          <EmptyState
            title="Chưa có hội thoại nào"
            description="Khi khách gửi yêu cầu tư vấn, hội thoại sẽ hiện ở đây."
          />
        )}

        {ready && conversations.length > 0 && visible.length === 0 && (
          <EmptyState
            title={`Không có hội thoại ở trạng thái “${activeTab.status}”`}
            description="Chọn một trạng thái khác ở trên để xem các hội thoại còn lại."
          />
        )}

        {ready && visible.length > 0 && (
          <ul className="admin-convo-list">
            {visible.map((c) => {
              const last = lastMessageOf(c);
              const name = c.customerName || c.customerId || c.id;
              return (
                <li key={c.id}>
                  <Link className="admin-convo-link" to={`/admin/conversations/${encodeURIComponent(c.id)}`}>
                    <span className="convo-avatar" aria-hidden="true">
                      {String(name).slice(0, 1).toUpperCase()}
                    </span>
                    <span className="admin-convo-body">
                      <span className="admin-convo-top">
                        <strong className="admin-convo-name">{name}</strong>
                        <span className={`status-badge ${badgeFor(c.status)}`}>{c.status}</span>
                      </span>
                      <span className="admin-convo-last">
                        {last ? `${last.senderName ? `${last.senderName}: ` : ''}${last.text || ''}` : 'Chưa có tin nhắn'}
                      </span>
                      <span className="admin-convo-meta">
                        {c.id}
                        {c.lastMessageAt && (
                          <>
                            {' · '}
                            <time dateTime={c.lastMessageAt}>{formatDateTime(c.lastMessageAt)}</time>
                          </>
                        )}
                        {c.bookingId && ` · Booking ${c.bookingId}`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
