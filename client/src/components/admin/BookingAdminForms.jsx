import { useRef, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { formatDate } from '../../utils/format.js';

/**
 * G10 admin actions on one booking (05-bookings.md):
 * - Reschedule: PATCH /api/bookings/:id {date, time}. The server runs the clash check; a 409
 *   carries the clash explanation as error.message and nothing changes.
 * - Cancel: PATCH /api/bookings/:id {status: "Đã hủy", cancelReason}, after an in-page confirm step.
 * - Final link: POST /api/bookings/:id/final-link {url}. The answer holds only the changed fields.
 * Every form keeps its values on any error, shows one message per field (client check first,
 * then the API's 400 fields) and sends at most one request at a time.
 * onUpdated(partialBooking) merges an answer into the booking on screen.
 */

const CANCELLED = 'Đã hủy';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  );
}

const describedBy = (error, id) => (error ? id : undefined);

/** API 400 fields that belong to one of `known`; any other field goes to the banner */
function splitFields(fields, known) {
  const own = {};
  const other = [];
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (known.includes(key)) own[key] = value;
    else other.push(value);
  });
  return { own, other };
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function RescheduleForm({ booking, onUpdated }) {
  const [values, setValues] = useState({ date: booking.date || '', time: booking.shoot?.start || '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const refs = { date: useRef(null), time: useRef(null) };

  const change = (field) => (e) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  async function submit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    setBanner('');
    setNotice('');
    const next = {};
    if (!values.date) next.date = 'Vui lòng chọn ngày chụp mới.';
    else if (!DATE_RE.test(values.date)) next.date = 'Ngày phải có dạng YYYY-MM-DD.';
    if (!values.time) next.time = 'Vui lòng chọn giờ bắt đầu chụp.';
    else if (!TIME_RE.test(values.time)) next.time = 'Giờ phải có dạng HH:MM.';
    setErrors(next);
    const first = ['date', 'time'].find((f) => next[f]);
    if (first) {
      refs[first].current?.focus();
      return;
    }

    inFlight.current = true;
    setSending(true);
    try {
      const data = await apiFetch(`/api/bookings/${encodeURIComponent(booking.id)}`, {
        method: 'PATCH',
        body: { date: values.date, time: values.time }
      });
      if (data?.booking) {
        onUpdated(data.booking);
        const b = data.booking;
        setNotice(`Đã đổi lịch sang ngày ${formatDate(b.date)}, chụp ${b.shoot?.start}–${b.shoot?.end}.`);
      }
    } catch (err) {
      if (err?.status === 400 && err.fields && Object.keys(err.fields).length) {
        const { own, other } = splitFields(err.fields, ['date', 'time']);
        setErrors(own);
        if (other.length) setBanner(other.join(' '));
        const firstField = ['date', 'time'].find((f) => own[f]);
        if (firstField) refs[firstField].current?.focus();
      } else {
        // 409: the clash explanation from the API, shown as sent; the booking is unchanged
        setBanner(err?.message || 'Không đổi được lịch. Vui lòng thử lại.');
      }
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <form className="booking-action-form" onSubmit={submit} noValidate aria-labelledby="reschedule-title">
      <h3 id="reschedule-title">Đổi lịch chụp</h3>
      <p className="booking-action-note">
        Studio kiểm tra trùng lịch với nhân viên và phòng của booking này trước khi đổi.
      </p>
      <div className="booking-action-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="reschedule-date">Ngày chụp mới</label>
          <input
            id="reschedule-date"
            ref={refs.date}
            type="date"
            className="form-input"
            value={values.date}
            onChange={change('date')}
            aria-invalid={errors.date ? 'true' : undefined}
            aria-describedby={describedBy(errors.date, 'reschedule-date-error')}
          />
          <FieldError id="reschedule-date-error" message={errors.date} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="reschedule-time">Giờ bắt đầu chụp mới</label>
          <input
            id="reschedule-time"
            ref={refs.time}
            type="time"
            className="form-input"
            value={values.time}
            onChange={change('time')}
            aria-invalid={errors.time ? 'true' : undefined}
            aria-describedby={describedBy(errors.time, 'reschedule-time-error')}
          />
          <FieldError id="reschedule-time-error" message={errors.time} />
        </div>
      </div>
      {banner && (
        <div className="form-banner-error booking-action-banner" role="alert">
          {banner}
        </div>
      )}
      <div className="booking-action-buttons">
        <button type="submit" className="blue-cta" disabled={sending}>
          {sending ? 'Đang đổi lịch...' : 'Đổi lịch'}
        </button>
        <p className="booking-action-status" role="status">{notice}</p>
      </div>
    </form>
  );
}

function CancelForm({ booking, onUpdated }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const reasonInput = useRef(null);
  const confirmHeading = useRef(null);

  function ask(e) {
    e.preventDefault();
    setBanner('');
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do hủy.');
      reasonInput.current?.focus();
      return;
    }
    setError('');
    setConfirming(true);
    // Move focus to the confirm step so keyboard and screen reader users land on it
    setTimeout(() => confirmHeading.current?.focus(), 0);
  }

  function back() {
    setConfirming(false);
    setTimeout(() => reasonInput.current?.focus(), 0);
  }

  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setBanner('');
    try {
      const data = await apiFetch(`/api/bookings/${encodeURIComponent(booking.id)}`, {
        method: 'PATCH',
        body: { status: CANCELLED, cancelReason: reason.trim() }
      });
      if (data?.booking) onUpdated(data.booking);
    } catch (err) {
      setConfirming(false);
      if (err?.status === 400 && err.fields && Object.keys(err.fields).length) {
        const { own, other } = splitFields(err.fields, ['cancelReason']);
        setError(own.cancelReason || '');
        if (other.length) setBanner(other.join(' '));
      } else {
        setBanner(err?.message || 'Không hủy được booking. Vui lòng thử lại.');
      }
      // The confirm step is gone: keep keyboard focus in the form, on the kept reason
      setTimeout(() => reasonInput.current?.focus(), 0);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <form className="booking-action-form" onSubmit={ask} noValidate aria-labelledby="cancel-title">
      <h3 id="cancel-title">Hủy booking</h3>
      <div className="form-group">
        <label className="form-label" htmlFor="cancel-reason">Lý do hủy</label>
        <textarea
          id="cancel-reason"
          ref={reasonInput}
          className="form-input"
          rows={3}
          value={reason}
          readOnly={confirming}
          onChange={(e) => {
            setReason(e.target.value);
            if (error && e.target.value.trim()) setError('');
          }}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(error, 'cancel-reason-error')}
        />
        <FieldError id="cancel-reason-error" message={error} />
      </div>
      {banner && (
        <div className="form-banner-error booking-action-banner" role="alert">
          {banner}
        </div>
      )}
      {confirming ? (
        <div className="booking-confirm" role="group" aria-labelledby="cancel-confirm-title">
          <p id="cancel-confirm-title" className="booking-confirm-title" tabIndex={-1} ref={confirmHeading}>
            Xác nhận hủy booking {booking.id}?
          </p>
          <p>Lý do: {reason.trim()}</p>
          <p>Booking sẽ chuyển sang trạng thái “{CANCELLED}”.</p>
          <div className="booking-action-buttons">
            <button type="button" className="pink-cta" onClick={confirm} disabled={sending}>
              {sending ? 'Đang hủy...' : 'Xác nhận hủy'}
            </button>
            <button type="button" className="booking-secondary-button" onClick={back} disabled={sending}>
              Quay lại
            </button>
          </div>
        </div>
      ) : (
        <div className="booking-action-buttons">
          <button type="submit" className="pink-cta">
            Hủy booking
          </button>
        </div>
      )}
    </form>
  );
}

function FinalLinkForm({ booking, onUpdated }) {
  const [url, setUrl] = useState(booking.finalLink || '');
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const urlInput = useRef(null);

  async function submit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    setBanner('');
    setNotice('');
    const value = url.trim();
    if (!value) {
      setError('Vui lòng nhập link ảnh cuối.');
      urlInput.current?.focus();
      return;
    }
    if (!isHttpUrl(value)) {
      setError('Link phải là địa chỉ đầy đủ bắt đầu bằng http:// hoặc https://.');
      urlInput.current?.focus();
      return;
    }
    setError('');
    inFlight.current = true;
    setSending(true);
    try {
      const data = await apiFetch(`/api/bookings/${encodeURIComponent(booking.id)}/final-link`, {
        method: 'POST',
        body: { url: value }
      });
      if (data?.booking) {
        onUpdated(data.booking);
        setNotice(`Đã gắn link ảnh cuối. Trạng thái ảnh: ${data.booking.photoStatus}.`);
      }
    } catch (err) {
      if (err?.status === 400 && err.fields?.url) {
        setError(err.fields.url);
        urlInput.current?.focus();
      } else {
        // 409: the API says why the link cannot be added yet
        setBanner(err?.message || 'Không gắn được link ảnh cuối. Vui lòng thử lại.');
      }
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <form className="booking-action-form" onSubmit={submit} noValidate aria-labelledby="final-link-title">
      <h3 id="final-link-title">Link ảnh cuối</h3>
      <p className="booking-action-note">Gắn link tải ảnh đã chỉnh sửa sau khi khách chọn ảnh.</p>
      <div className="form-group">
        <label className="form-label" htmlFor="final-link-url">Link tải ảnh cuối</label>
        <input
          id="final-link-url"
          ref={urlInput}
          type="url"
          inputMode="url"
          className="form-input"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError('');
          }}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(error, 'final-link-url-error')}
        />
        <FieldError id="final-link-url-error" message={error} />
      </div>
      {banner && (
        <div className="form-banner-error booking-action-banner" role="alert">
          {banner}
        </div>
      )}
      <div className="booking-action-buttons">
        <button type="submit" className="blue-cta" disabled={sending}>
          {sending ? 'Đang gắn link...' : 'Gắn link ảnh cuối'}
        </button>
        <p className="booking-action-status" role="status">{notice}</p>
      </div>
    </form>
  );
}

export default function BookingAdminForms({ booking, onUpdated }) {
  const closed = booking.status === CANCELLED || booking.status === 'Hoàn thành';
  return (
    <section className="admin-booking-actions" aria-labelledby="booking-actions-title">
      <h2 id="booking-actions-title">Điều chỉnh booking</h2>
      {closed ? (
        <p className="booking-action-note">
          Booking đang ở trạng thái “{booking.status}”, không thể đổi lịch hay hủy nữa.
        </p>
      ) : (
        <>
          <RescheduleForm booking={booking} onUpdated={onUpdated} />
          <CancelForm booking={booking} onUpdated={onUpdated} />
        </>
      )}
      {booking.status !== CANCELLED && <FinalLinkForm booking={booking} onUpdated={onUpdated} />}
    </section>
  );
}
