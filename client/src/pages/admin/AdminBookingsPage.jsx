import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../../components/DataStates.jsx';
import { formatDate } from '../../utils/format.js';
import { getOnce } from '../../utils/requests.js';

/**
 * G10: every studio booking for the admin (05-bookings.md, GET /api/bookings, one request).
 * Rows keep the order of the API (sorted by id). Status and payment status are the API's text.
 * Below 768px each row is a card (no horizontal scroll); from 768px it is a normal table.
 */

const PAGE_TITLE = 'Quản lý booking';

export default function AdminBookingsPage() {
  const [state, setState] = useState({ phase: 'loading', bookings: [], message: '' });
  const requestId = useRef(0);

  useEffect(() => {
    document.title = `DUKStudio — ${PAGE_TITLE}`;
  }, []);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, phase: 'loading', message: '' }));
    try {
      const data = await getOnce('/api/bookings');
      if (id !== requestId.current) return;
      setState({ phase: 'ready', bookings: Array.isArray(data?.bookings) ? data.bookings : [], message: '' });
    } catch (err) {
      if (id !== requestId.current) return;
      setState({ phase: 'error', bookings: [], message: err?.message || '' });
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const { phase, bookings, message } = state;
  const ready = phase === 'ready';

  return (
    <div className="page-main">
      <div className="page-heading">
        <p className="eyebrow">&lt; G10 &gt;</p>
        <h1>{PAGE_TITLE}</h1>
        <p className="page-subtitle">Toàn bộ booking của studio với trạng thái lịch và thanh toán. Chọn mã booking để xem chi tiết.</p>
      </div>

      <section className="admin-bookings-panel" aria-labelledby="admin-bookings-heading">
        <h2 id="admin-bookings-heading">
          Danh sách booking{ready && ` (${bookings.length})`}
        </h2>

        {phase === 'loading' && <LoadingState label="Đang tải danh sách booking..." />}

        {phase === 'error' && (
          <ErrorState
            title="Không thể tải danh sách booking"
            message={message || 'Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.'}
            onRetry={load}
          />
        )}

        {ready && bookings.length === 0 && (
          <EmptyState
            title="Chưa có booking nào"
            description="Booking được tạo từ hội thoại (nút Tạo booking) sẽ hiện ở đây."
          />
        )}

        {ready && bookings.length > 0 && (
          <table className="admin-bookings-table" aria-labelledby="admin-bookings-heading">
            <thead>
              <tr>
                <th scope="col">Mã booking</th>
                <th scope="col">Khách hàng</th>
                <th scope="col">Ngày chụp</th>
                <th scope="col">Gói chụp</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <th scope="row">
                    <Link className="admin-bookings-link" to={`/admin/bookings/${encodeURIComponent(b.id)}`}>
                      {b.id}
                    </Link>
                  </th>
                  <td data-label="Khách hàng">{b.customerName || b.customerId}</td>
                  <td data-label="Ngày chụp">
                    {b.date ? <time dateTime={b.date}>{formatDate(b.date)}</time> : 'Chưa có'}
                  </td>
                  <td data-label="Gói chụp">{b.packageName}</td>
                  <td data-label="Trạng thái">{b.status}</td>
                  <td data-label="Thanh toán">{b.paymentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
