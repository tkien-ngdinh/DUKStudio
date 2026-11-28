import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/DataStates.jsx';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format.js';
import { getOnce } from '../../utils/requests.js';

/**
 * G10: one booking for the admin (05-bookings.md, GET /api/bookings/:id, one request).
 * Read only in this step: package, make-up, shoot, price, the three statuses, the final link
 * and the conversation it came from. Every value is the API's; nothing is computed here.
 */

const range = (part) => (part ? `${part.start}–${part.end}` : '');

function Fact({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function AdminBookingDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ phase: 'loading', booking: null, error: null });
  const requestId = useRef(0);

  useEffect(() => {
    document.title = `DUKStudio — Booking ${id}`;
  }, [id]);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setState({ phase: 'loading', booking: null, error: null });
    try {
      const data = await getOnce(`/api/bookings/${encodeURIComponent(id)}`);
      if (current !== requestId.current) return;
      if (!data?.booking) throw new Error('Máy chủ không trả về booking.');
      setState({ phase: 'ready', booking: data.booking, error: null });
    } catch (err) {
      if (current !== requestId.current) return;
      setState({
        phase: 'error',
        booking: null,
        error: { status: err?.status, message: err?.message || 'Không thể tải booking.' }
      });
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const { phase, booking: b, error } = state;
  const extras = Array.isArray(b?.extras) ? b.extras : [];

  return (
    <div className="page-main">
      <p className="admin-back">
        <Link className="admin-back-link" to="/admin/bookings">
          ← Danh sách booking
        </Link>
      </p>

      <div className="page-heading">
        <p className="eyebrow">&lt; G10 &gt;</p>
        <h1>Booking {id}</h1>
        <p className="page-subtitle">Lịch chụp, nhân viên, chi phí và trạng thái của booking.</p>
      </div>

      {phase === 'loading' && <LoadingState label="Đang tải booking..." />}

      {phase === 'error' && error?.status === 404 && (
        <ErrorState title="Không tìm thấy booking" message={error.message} />
      )}

      {phase === 'error' && error?.status !== 404 && (
        <ErrorState title="Không thể tải booking" message={error?.message} onRetry={load} />
      )}

      {phase === 'ready' && b && (
        <div className="admin-booking-detail">
          <section className="admin-booking-card" aria-labelledby="booking-status-title">
            <h2 id="booking-status-title">Trạng thái</h2>
            <dl className="admin-booking-facts">
              <Fact label="Booking">{b.status}</Fact>
              <Fact label="Thanh toán">{b.paymentStatus}</Fact>
              <Fact label="Ảnh">{b.photoStatus}</Fact>
              <Fact label="Link ảnh cuối">
                {b.finalLink ? (
                  <a className="admin-booking-link" href={b.finalLink} target="_blank" rel="noopener noreferrer">
                    {b.finalLink}
                  </a>
                ) : (
                  'Chưa có'
                )}
              </Fact>
              {b.status === 'Đã hủy' && b.cancelReason && <Fact label="Lý do hủy">{b.cancelReason}</Fact>}
            </dl>
          </section>

          <section className="admin-booking-card" aria-labelledby="booking-schedule-title">
            <h2 id="booking-schedule-title">Lịch chụp</h2>
            <dl className="admin-booking-facts">
              <Fact label="Khách hàng">{b.customerName || b.customerId}</Fact>
              <Fact label="Dịch vụ">{b.serviceName}</Fact>
              <Fact label="Gói chụp">{b.packageName}</Fact>
              {b.participantCount != null && <Fact label="Số người">{b.participantCount}</Fact>}
              <Fact label="Ghi chú phối hợp">{extras.length ? extras.map((e) => e.name).join(', ') : 'Không có'}</Fact>
              <Fact label="Ngày chụp">
                {b.date ? <time dateTime={b.date}>{formatDate(b.date)}</time> : 'Chưa có'}
              </Fact>
              <Fact label="Trang điểm">
                {b.makeup ? `${range(b.makeup)} · ${b.makeup.staffName}` : 'Gói không có trang điểm'}
              </Fact>
              <Fact label="Chụp ảnh">
                {b.shoot
                  ? `${range(b.shoot)} · ${b.shoot.staffName}${b.shoot.roomName ? ` · ${b.shoot.roomName}` : ''}`
                  : 'Chưa có'}
              </Fact>
            </dl>
          </section>

          <section className="admin-booking-card" aria-labelledby="booking-price-title">
            <h2 id="booking-price-title">Chi phí</h2>
            <dl className="admin-booking-facts">
              <Fact label="Tổng tiền">{formatMoney(b.price?.total)}</Fact>
              <Fact label="Đặt cọc 30%">{formatMoney(b.price?.deposit)}</Fact>
              <Fact label="Còn lại 70%">{formatMoney(b.price?.remaining)}</Fact>
            </dl>
          </section>

          <section className="admin-booking-card" aria-labelledby="booking-origin-title">
            <h2 id="booking-origin-title">Nguồn booking</h2>
            <dl className="admin-booking-facts">
              <Fact label="Hội thoại">
                {b.conversationId ? (
                  <Link className="admin-booking-link" to={`/admin/conversations/${encodeURIComponent(b.conversationId)}`}>
                    {b.conversationId}
                  </Link>
                ) : (
                  'Tạo ngoài chat'
                )}
              </Fact>
              {b.createdAt && (
                <Fact label="Tạo lúc">
                  <time dateTime={b.createdAt}>{formatDateTime(b.createdAt)}</time>
                </Fact>
              )}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
