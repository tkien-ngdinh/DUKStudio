import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { ErrorState, LoadingState } from '../DataStates.jsx';
import { formatDate } from '../../utils/format.js';
import { getOnce } from '../../utils/requests.js';

/**
 * G5 clash check + G6 proposal for one conversation (admin).
 * - Staff, rooms, opening hours and busy blocks: GET /api/schedule?date= (04-schedule.md).
 * - Check: POST /api/schedule/clash-check (04). The answer is shown as the API sends it;
 *   this component never decides by itself whether a slot clashes.
 * - "Dùng giờ này" copies a suggestion (or the free requested slot) into the proposal;
 *   "Đề xuất giờ" sends POST /api/conversations/:id/propose-time (03-chat.md).
 * Every name, room, date and time on screen comes from the conversation request, the catalog
 * or these answers.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const CHECK_FIELDS = ['date', 'time', 'packageId', 'makeupArtistId', 'photographerId', 'roomId'];
const PROPOSAL_FIELDS = ['date', 'makeup', 'shoot', 'room', 'text'];
const EMPTY_PROPOSAL = { date: '', makeup: '', shoot: '', room: '', text: '' };

const range = (part) => (part ? `${part.start}–${part.end}` : '');

/** One sentence for a slot object of the clash check ({makeup, shoot}), from its own values */
function describeSlot(slot) {
  const parts = [];
  if (slot.makeup) parts.push(`trang điểm ${range(slot.makeup)} với ${slot.makeup.staffName}`);
  if (slot.shoot) {
    parts.push(`chụp ${range(slot.shoot)} với ${slot.shoot.staffName}${slot.shoot.roomName ? ` tại ${slot.shoot.roomName}` : ''}`);
  }
  return parts.join(', ');
}

/** A clash-check slot in the shape of the 03-chat.md proposal body */
function toProposal(date, slot) {
  return {
    date,
    makeup: slot.makeup ? `${slot.makeup.start} - ${slot.makeup.end}` : '',
    shoot: slot.shoot ? `${slot.shoot.start} - ${slot.shoot.end}` : '',
    room: slot.shoot?.roomName || '',
    text: `Studio đề xuất ngày ${formatDate(date)}: ${describeSlot(slot)}.`
  };
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  );
}

export default function ClashCheckPanel({ conversationId, request, catalog, onProposed }) {
  const [form, setForm] = useState(() => ({
    date: request?.preferredDate || '',
    time: request?.preferredTime || '',
    packageId: request?.packageId || '',
    makeupArtistId: '',
    photographerId: '',
    roomId: ''
  }));
  const [fieldErrors, setFieldErrors] = useState({});
  const [checkError, setCheckError] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [schedule, setSchedule] = useState({ phase: 'idle', date: '', data: null, message: '' });
  const [proposal, setProposal] = useState(EMPTY_PROPOSAL);
  const [proposalErrors, setProposalErrors] = useState({});
  const [proposalError, setProposalError] = useState('');
  const [proposing, setProposing] = useState(false);
  const [proposalNotice, setProposalNotice] = useState('');
  const mounted = useRef(true);
  const scheduleRequest = useRef(0);
  const proposalHeading = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // ----- daily schedule: one GET per chosen date -----
  const loadSchedule = useCallback(async (date) => {
    const current = ++scheduleRequest.current;
    setSchedule({ phase: 'loading', date, data: null, message: '' });
    try {
      const data = await getOnce(`/api/schedule?date=${encodeURIComponent(date)}`);
      if (!mounted.current || current !== scheduleRequest.current) return;
      setSchedule({ phase: 'ready', date, data: data || {}, message: '' });
    } catch (err) {
      if (!mounted.current || current !== scheduleRequest.current) return;
      setSchedule({ phase: 'error', date, data: null, message: err?.message || '' });
    }
  }, []);

  useEffect(() => {
    if (DATE_RE.test(form.date)) {
      loadSchedule(form.date);
    } else {
      scheduleRequest.current += 1;
      setSchedule({ phase: 'idle', date: '', data: null, message: '' });
    }
  }, [form.date, loadSchedule]);

  const staff = schedule.phase === 'ready' && Array.isArray(schedule.data?.staff) ? schedule.data.staff : [];
  const rooms = schedule.phase === 'ready' && Array.isArray(schedule.data?.rooms) ? schedule.data.rooms : [];
  const busy = schedule.phase === 'ready' && Array.isArray(schedule.data?.busy) ? schedule.data.busy : [];
  const makeupStaff = staff.filter((s) => s.role === 'makeup');
  const photographers = staff.filter((s) => s.role === 'photographer');
  const hours = schedule.data?.openingHours;

  // A staff member or room chosen for another day is kept only if it is in the new day's lists
  useEffect(() => {
    if (schedule.phase !== 'ready') return;
    const ids = (list) => new Set(list.map((item) => item.id));
    const m = ids(makeupStaff);
    const p = ids(photographers);
    const r = ids(rooms);
    setForm((f) => ({
      ...f,
      makeupArtistId: m.has(f.makeupArtistId) ? f.makeupArtistId : '',
      photographerId: p.has(f.photographerId) ? f.photographerId : '',
      roomId: r.has(f.roomId) ? f.roomId : ''
    }));
  }, [schedule]);

  // ----- packages from the catalog -----
  const services = catalog.phase === 'ready' && Array.isArray(catalog.data?.services) ? catalog.data.services : [];
  const hasPackages = services.some((s) => Array.isArray(s.packages) && s.packages.length > 0);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((errs) => (errs[field] ? { ...errs, [field]: '' } : errs));
    setResult(null);
    setCheckError('');
  }

  function focusFirst(errors, prefix, fields) {
    const first = fields.find((f) => errors[f]);
    if (first) document.getElementById(`${prefix}-${first}`)?.focus();
  }

  async function handleCheck(event) {
    event.preventDefault();
    if (checking) return;
    setCheckError('');

    const errors = {};
    if (!DATE_RE.test(form.date)) errors.date = 'Vui lòng chọn ngày chụp.';
    if (!TIME_RE.test(form.time)) errors.time = 'Vui lòng nhập giờ bắt đầu chụp (HH:MM).';
    if (!form.packageId) errors.packageId = 'Vui lòng chọn gói chụp.';
    if (!form.photographerId) errors.photographerId = 'Vui lòng chọn thợ chụp.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      focusFirst(errors, 'clash', CHECK_FIELDS);
      return;
    }

    // Make-up artist and room are required only for some packages; the API decides (400 on the field)
    const body = { date: form.date, time: form.time, packageId: form.packageId, photographerId: form.photographerId };
    if (form.makeupArtistId) body.makeupArtistId = form.makeupArtistId;
    if (form.roomId) body.roomId = form.roomId;

    setChecking(true);
    setResult(null);
    try {
      const data = await apiFetch('/api/schedule/clash-check', { method: 'POST', body });
      if (!mounted.current) return;
      setResult({ ...data, checked: body });
    } catch (err) {
      if (!mounted.current) return;
      if (err?.status === 400 && err.fields && Object.keys(err.fields).length) {
        setFieldErrors(err.fields);
        focusFirst(err.fields, 'clash', CHECK_FIELDS);
      } else {
        setCheckError(err?.message || 'Không kiểm tra được lịch. Vui lòng thử lại.');
      }
    } finally {
      if (mounted.current) setChecking(false);
    }
  }

  function applySlot(slot) {
    setProposal(toProposal(result.checked.date, slot));
    setProposalErrors({});
    setProposalError('');
    setProposalNotice('');
    proposalHeading.current?.focus();
  }

  async function handlePropose(event) {
    event.preventDefault();
    if (proposing) return;
    setProposalError('');
    setProposalNotice('');
    if (!proposal.date) {
      setProposalError('Hãy chọn một giờ trong kết quả kiểm tra bằng nút "Dùng giờ này" trước.');
      return;
    }
    const body = { date: proposal.date, makeup: proposal.makeup, shoot: proposal.shoot, room: proposal.room };
    if (proposal.text.trim()) body.text = proposal.text.trim();

    setProposing(true);
    try {
      const data = await apiFetch(`/api/conversations/${encodeURIComponent(conversationId)}/propose-time`, {
        method: 'POST',
        body
      });
      if (!mounted.current) return;
      onProposed?.(data);
      setProposal(EMPTY_PROPOSAL);
      setProposalErrors({});
      setProposalNotice('Đã gửi đề xuất vào chat. Khách sẽ đồng ý hoặc từ chối trong trang Tư vấn.');
    } catch (err) {
      if (!mounted.current) return;
      if (err?.status === 400 && err.fields && Object.keys(err.fields).length) {
        setProposalErrors(err.fields);
        focusFirst(err.fields, 'proposal', PROPOSAL_FIELDS);
      } else {
        setProposalError(err?.message || 'Không gửi được đề xuất. Vui lòng thử lại.');
      }
    } finally {
      if (mounted.current) setProposing(false);
    }
  }

  // aria-describedby only when the error is on screen
  const describedBy = (prefix, field, errors) => (errors[field] ? `${prefix}-${field}-error` : undefined);
  const invalid = (field, errors) => (errors[field] ? 'true' : undefined);

  /** A select of the schedule lists, or a sentence when the list is empty / not loaded */
  function scheduleSelect(field, labelText, list, emptyText, optional) {
    const id = `clash-${field}`;
    const ready = schedule.phase === 'ready';
    const withSelect = ready && list.length > 0;
    return (
      <div className="form-group">
        {withSelect ? (
          <label className="form-label" htmlFor={id}>
            {labelText}
            {optional && <span className="clash-optional"> (nếu gói cần)</span>}
          </label>
        ) : (
          <p className="form-label clash-label-text">{labelText}</p>
        )}
        {withSelect ? (
          <select
            id={id}
            className="form-input"
            value={form[field]}
            onChange={(e) => update(field, e.target.value)}
            aria-invalid={invalid(field, fieldErrors)}
            aria-describedby={describedBy('clash', field, fieldErrors)}
          >
            <option value="">— Chọn —</option>
            {list.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="clash-field-note">
            {ready ? emptyText : DATE_RE.test(form.date) ? 'Đang chờ lịch của ngày này…' : 'Chọn ngày để tải danh sách.'}
          </p>
        )}
        <FieldError id={`clash-${field}-error`} message={fieldErrors[field]} />
      </div>
    );
  }

  const free = result && result.clash === false;
  const conflicts = Array.isArray(result?.conflicts) ? result.conflicts : [];
  const suggestions = Array.isArray(result?.suggestions) ? result.suggestions : [];

  return (
    <section className="admin-clash-panel" aria-labelledby="clash-title">
      <h2 id="clash-title">Kiểm tra trùng lịch</h2>
      <p className="clash-intro">
        Kiểm tra thợ trang điểm, thợ chụp và phòng cho giờ khách muốn, rồi đề xuất một giờ vào chat.
      </p>

      {/* ----- the check form ----- */}
      <form className="clash-form" onSubmit={handleCheck} noValidate>
        <div className="clash-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="clash-date">Ngày chụp</label>
            <input
              id="clash-date"
              type="date"
              className="form-input"
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
              aria-invalid={invalid('date', fieldErrors)}
              aria-describedby={describedBy('clash', 'date', fieldErrors)}
            />
            <FieldError id="clash-date-error" message={fieldErrors.date} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="clash-time">Giờ bắt đầu chụp</label>
            <input
              id="clash-time"
              type="time"
              className="form-input"
              value={form.time}
              onChange={(e) => update('time', e.target.value)}
              aria-invalid={invalid('time', fieldErrors)}
              aria-describedby={describedBy('clash', 'time', fieldErrors)}
            />
            <FieldError id="clash-time-error" message={fieldErrors.time} />
          </div>

          <div className="form-group clash-wide">
            {hasPackages ? (
              <label className="form-label" htmlFor="clash-packageId">Gói chụp</label>
            ) : (
              <p className="form-label clash-label-text">Gói chụp</p>
            )}
            {hasPackages ? (
              <select
                id="clash-packageId"
                className="form-input"
                value={form.packageId}
                onChange={(e) => update('packageId', e.target.value)}
                aria-invalid={invalid('packageId', fieldErrors)}
                aria-describedby={describedBy('clash', 'packageId', fieldErrors)}
              >
                <option value="">— Chọn —</option>
                {services.map((s) => (
                  <optgroup key={s.id} label={s.title}>
                    {(s.packages || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : catalog.phase === 'error' ? (
              <div className="clash-field-note">
                <p>Không tải được danh mục gói. {catalog.message}</p>
                <button type="button" className="blue-cta" onClick={catalog.onRetry}>
                  Thử lại tải danh mục
                </button>
              </div>
            ) : (
              <p className="clash-field-note">
                {catalog.phase === 'ready' ? 'Chưa có gói chụp trong danh mục.' : 'Đang tải danh mục gói…'}
              </p>
            )}
            <FieldError id="clash-packageId-error" message={fieldErrors.packageId} />
          </div>

          {scheduleSelect('makeupArtistId', 'Thợ trang điểm', makeupStaff, 'Chưa có nhân viên trang điểm trong lịch ngày này.', true)}
          {scheduleSelect('photographerId', 'Thợ chụp', photographers, 'Chưa có nhân viên chụp ảnh trong lịch ngày này.', false)}
          {scheduleSelect('roomId', 'Phòng chụp', rooms, 'Chưa có phòng trong lịch ngày này.', true)}
        </div>

        {checkError && (
          <div className="form-banner-error clash-banner" role="alert">
            {checkError}
          </div>
        )}

        <div className="clash-actions">
          <button type="submit" className="blue-cta" disabled={checking}>
            {checking ? 'Đang kiểm tra...' : 'Kiểm tra trùng lịch'}
          </button>
        </div>
      </form>

      {/* ----- the day's schedule ----- */}
      <section className="clash-day" aria-labelledby="clash-day-title">
        <h3 id="clash-day-title">
          {schedule.date ? `Lịch ngày ${formatDate(schedule.date)}` : 'Lịch trong ngày'}
          {hours?.start && hours?.end && ` · mở cửa ${hours.start}–${hours.end}`}
        </h3>
        {schedule.phase === 'idle' && <p className="clash-field-note">Chọn ngày chụp để xem lịch bận của nhân viên và phòng.</p>}
        {schedule.phase === 'loading' && <LoadingState label="Đang tải lịch trong ngày..." />}
        {schedule.phase === 'error' && (
          <ErrorState
            title="Không tải được lịch trong ngày"
            message={schedule.message || 'Đã xảy ra lỗi khi kết nối máy chủ.'}
            onRetry={() => loadSchedule(schedule.date)}
          />
        )}
        {schedule.phase === 'ready' && staff.length === 0 && rooms.length === 0 && (
          <p className="clash-field-note">Chưa có nhân viên/phòng trong lịch ngày này.</p>
        )}
        {schedule.phase === 'ready' &&
          (busy.length === 0 ? (
            <p className="clash-field-note">Không có lịch bận nào trong ngày.</p>
          ) : (
            <ul className="clash-busy-list">
              {busy.map((b, i) => (
                <li key={`${b.resourceId}-${b.start}-${i}`}>
                  <strong>{b.resourceName}</strong> · {b.start}–{b.end} · {b.reason}
                  {b.bookingId ? ` · ${b.bookingId}` : ''}
                </li>
              ))}
            </ul>
          ))}
      </section>

      {/* ----- the answer of the clash check ----- */}
      {result && (
        <section className="clash-result" aria-labelledby="clash-result-title">
          <h3 id="clash-result-title">
            Kết quả: {result.checked.time} ngày {formatDate(result.checked.date)}
          </h3>
          <p className={free ? 'clash-explanation is-free' : 'clash-explanation is-clash'} role="status">
            <strong>{free ? 'Còn trống. ' : 'Bị trùng lịch. '}</strong>
            {result.explanation}
          </p>

          {conflicts.length > 0 && (
            <>
              <h4>Trùng với</h4>
              <ul className="clash-conflicts">
                {conflicts.map((c, i) => (
                  <li key={`${c.resourceId}-${c.start}-${i}`}>
                    <strong>{c.resourceName}</strong> bận {c.start}–{c.end} · {c.reason} ·{' '}
                    {c.bookingId ? `booking ${c.bookingId}` : 'không thuộc booking nào'}
                  </li>
                ))}
              </ul>
            </>
          )}

          {free && result.slot && (
            <div className="clash-option">
              <p id="clash-slot-text">
                {result.checked.time}: {describeSlot(result.slot)}.
              </p>
              <button type="button" className="pink-cta" aria-describedby="clash-slot-text" onClick={() => applySlot(result.slot)}>
                Dùng giờ này
              </button>
            </div>
          )}

          {suggestions.length > 0 && (
            <>
              <h4>Giờ trống gợi ý</h4>
              <ul className="clash-suggestions">
                {suggestions.map((s, i) => (
                  <li key={`${s.time}-${i}`} className="clash-option">
                    <p id={`clash-suggestion-${i}`}>{s.text}</p>
                    <button
                      type="button"
                      className="pink-cta"
                      aria-describedby={`clash-suggestion-${i}`}
                      onClick={() => applySlot(s)}
                    >
                      Dùng giờ này
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {/* ----- the proposal sent to the chat ----- */}
      <form className="clash-proposal" onSubmit={handlePropose} noValidate>
        <h3 id="proposal-title" ref={proposalHeading} tabIndex={-1}>
          Đề xuất giờ cho khách
        </h3>
        {!proposal.date && (
          <p className="clash-field-note">Chọn một giờ trong kết quả kiểm tra bằng nút "Dùng giờ này".</p>
        )}
        <div className="clash-grid">
          {[
            ['date', 'Ngày', proposal.date ? formatDate(proposal.date) : ''],
            ['makeup', 'Trang điểm', proposal.makeup || (proposal.date ? 'Không có' : '')],
            ['shoot', 'Chụp ảnh', proposal.shoot],
            ['room', 'Phòng', proposal.room]
          ].map(([field, labelText, value]) => (
            <div className="form-group" key={field}>
              <label className="form-label" htmlFor={`proposal-${field}`}>{labelText}</label>
              <input
                id={`proposal-${field}`}
                className="form-input"
                value={value}
                readOnly
                aria-invalid={invalid(field, proposalErrors)}
                aria-describedby={describedBy('proposal', field, proposalErrors)}
              />
              <FieldError id={`proposal-${field}-error`} message={proposalErrors[field]} />
            </div>
          ))}
          <div className="form-group clash-wide">
            <label className="form-label" htmlFor="proposal-text">Lời nhắn kèm đề xuất</label>
            <textarea
              id="proposal-text"
              className="form-input"
              rows={3}
              value={proposal.text}
              onChange={(e) => {
                const text = e.target.value;
                setProposal((p) => ({ ...p, text }));
              }}
              aria-invalid={invalid('text', proposalErrors)}
              aria-describedby={describedBy('proposal', 'text', proposalErrors)}
            />
            <FieldError id="proposal-text-error" message={proposalErrors.text} />
          </div>
        </div>

        {proposalError && (
          <div className="form-banner-error clash-banner" role="alert">
            {proposalError}
          </div>
        )}

        <div className="clash-actions">
          <button type="submit" className="blue-cta" disabled={proposing}>
            {proposing ? 'Đang gửi...' : 'Đề xuất giờ'}
          </button>
          <p className="admin-reply-status" role="status">
            {proposalNotice}
          </p>
        </div>
      </form>
    </section>
  );
}
