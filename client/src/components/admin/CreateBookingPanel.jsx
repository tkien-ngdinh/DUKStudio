import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { formatDate, formatMoney } from '../../utils/format.js';

/**
 * G6: the "Tạo booking" button of one conversation (admin).
 * - The button is enabled only when the latest proposal of the conversation (03-chat.md message
 *   objects) has status "agreed". Otherwise it is disabled and a visible reason next to it,
 *   linked with aria-describedby, says why. This is the only disabled-until-ready button of the app.
 * - Click: POST /api/bookings {conversationId} (05-bookings.md). The 201 answer gives the booking;
 *   the page then loads the conversation once more for the system message (onCreated).
 * - A conversation that already has a bookingId shows a link to it instead of the button.
 * Nothing is polled: the admin sees the customer's answer when the page loads.
 */

const REASONS = {
  none: 'Chưa có giờ đề xuất. Hãy kiểm tra lịch và đề xuất giờ cho khách trước.',
  pending: 'Khách chưa đồng ý giờ đề xuất.',
  declined: 'Khách đã từ chối, hãy đề xuất giờ mới.'
};

/** Status of the latest proposal in the message history: 'none' when there is none */
function latestProposalStatus(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]?.proposal) return list[i].proposal.status || 'pending';
  }
  return 'none';
}

const bookingHref = (bookingId) => `/admin/bookings/${encodeURIComponent(bookingId)}`;

export default function CreateBookingPanel({ conversation, onCreated, refresh }) {
  const [creating, setCreating] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  const proposalStatus = latestProposalStatus(conversation.messages);
  const reason = proposalStatus === 'agreed' ? '' : REASONS[proposalStatus] || REASONS.pending;

  async function handleCreate() {
    if (inFlight.current || reason) return;
    inFlight.current = true;
    setCreating(true);
    setError('');
    try {
      const data = await apiFetch('/api/bookings', {
        method: 'POST',
        body: { conversationId: conversation.id }
      });
      if (!data?.booking?.id) throw new Error('Máy chủ không trả về booking.');
      setBooking(data.booking);
      onCreated?.(data.booking);
    } catch (err) {
      setError(err?.message || 'Không tạo được booking. Vui lòng thử lại.');
    } finally {
      inFlight.current = false;
      setCreating(false);
    }
  }

  return (
    <section className="admin-create-booking" aria-labelledby="create-booking-title">
      <h3 id="create-booking-title">Booking từ hội thoại</h3>

      {booking ? (
        <div className="create-booking-done" role="status">
          <p>
            Đã tạo booking{' '}
            <Link className="create-booking-link" to={bookingHref(booking.id)}>
              {booking.id}
            </Link>{' '}
            · <strong>{booking.status}</strong>
          </p>
          <dl className="create-booking-facts">
            <div>
              <dt>Ngày chụp</dt>
              <dd>{formatDate(booking.date)}</dd>
            </div>
            {booking.makeup && (
              <div>
                <dt>Trang điểm</dt>
                <dd>
                  {booking.makeup.start}–{booking.makeup.end} ({booking.makeup.staffName})
                </dd>
              </div>
            )}
            {booking.shoot && (
              <div>
                <dt>Chụp ảnh</dt>
                <dd>
                  {booking.shoot.start}–{booking.shoot.end} ({booking.shoot.staffName}
                  {booking.shoot.roomName ? `, ${booking.shoot.roomName}` : ''})
                </dd>
              </div>
            )}
            <div>
              <dt>Tổng tiền</dt>
              <dd>{formatMoney(booking.price?.total)}</dd>
            </div>
            <div>
              <dt>Đặt cọc 30%</dt>
              <dd>{formatMoney(booking.price?.deposit)}</dd>
            </div>
            <div>
              <dt>Còn lại</dt>
              <dd>{formatMoney(booking.price?.remaining)}</dd>
            </div>
          </dl>
          {refresh?.phase === 'loading' && <p className="create-booking-note">Đang tải tin nhắn hệ thống...</p>}
          {refresh?.phase === 'error' && (
            <div className="create-booking-note" role="alert">
              <p>Booking đã được tạo nhưng chưa tải lại được hội thoại: {refresh.message}</p>
              <button type="button" className="blue-cta" onClick={refresh.onRetry}>
                Thử lại
              </button>
            </div>
          )}
        </div>
      ) : conversation.bookingId ? (
        <p>
          Hội thoại đã có booking:{' '}
          <Link className="create-booking-link" to={bookingHref(conversation.bookingId)}>
            {conversation.bookingId}
          </Link>
        </p>
      ) : (
        <>
          <div className="create-booking-actions">
            <button
              type="button"
              className="pink-cta"
              onClick={handleCreate}
              disabled={Boolean(reason) || creating}
              aria-describedby={reason ? 'create-booking-reason' : undefined}
            >
              {creating ? 'Đang tạo booking...' : 'Tạo booking'}
            </button>
            {reason ? (
              <p id="create-booking-reason" className="create-booking-reason">
                {reason}
              </p>
            ) : (
              <p className="create-booking-ready">Khách đã đồng ý giờ đề xuất. Có thể tạo booking.</p>
            )}
          </div>
          {error && (
            <div className="form-banner-error create-booking-error" role="alert">
              {error}
            </div>
          )}
        </>
      )}
    </section>
  );
}
