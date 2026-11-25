import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read pristine seed data from JSON
const seedRaw = fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8');

// In-memory state
let state = JSON.parse(seedRaw);

/**
 * Reset all mock state to pristine seed data
 */
export function resetStore() {
  state = JSON.parse(seedRaw);
  return state;
}

/**
 * Retrieve reference to full state store
 */
export function getStore() {
  return state;
}

/**
 * Account name used in tokens and as user name at sign-in: the user id without "u-"
 */
function accountName(user) {
  return user.id.replace(/^u-/, '');
}

/**
 * Find user by e-mail or user name; the password must match exactly
 */
export function findUserByCredentials(login, password) {
  if (!login || !password) return null;
  const wanted = String(login).trim().toLowerCase();
  return (
    state.users.find(
      (u) =>
        ((u.email && u.email.toLowerCase() === wanted) || accountName(u) === wanted) &&
        u.password === password
    ) || null
  );
}

/**
 * Resolve user from the stable token format token-<account name> (exact match only)
 */
export function findUserByToken(token) {
  if (!token) return null;
  const clean = String(token).replace(/^Bearer\s+/i, '').trim();
  const match = clean.match(/^token-(.+)$/);
  if (!match) return null;
  return state.users.find((u) => accountName(u) === match[1]) || null;
}

/**
 * Retrieve jobs assigned to a staff member (or all if omitted)
 */
export function getJobs(staffId) {
  state.jobs = state.jobs || [];
  const list = staffId ? state.jobs.filter((j) => j.staffId === staffId) : state.jobs;
  return list.map((j) => ({
    id: j.id,
    bookingId: j.bookingId,
    role: j.role,
    service: j.service,
    customerName: j.customerName,
    date: j.date,
    time: j.time,
    location: j.location,
    status: j.status,
    previewsCount: j.previewsCount || (j.previews ? j.previews.length : 0)
  }));
}

/**
 * Find job by id
 */
export function findJobById(id) {
  state.jobs = state.jobs || [];
  return state.jobs.find((j) => j.id === id) || null;
}

/**
 * Update job status or fields
 */
export function updateJob(id, updates) {
  const job = findJobById(id);
  if (!job) return null;
  Object.assign(job, updates);
  return job;
}

/**
 * Next preview id, unique across all jobs (prev-01, prev-02, ...)
 */
export function nextPreviewId() {
  const total = (state.jobs || []).reduce((n, j) => n + (j.previews ? j.previews.length : 0), 0);
  return `prev-${String(total + 1).padStart(2, '0')}`;
}

/**
 * Add preview photo to job, and to the job's booking so the customer gallery (G9) shows it
 */
export function addJobPreview(jobId, preview) {
  const job = findJobById(jobId);
  if (!job) return null;
  job.previews = job.previews || [];
  job.previews.push(preview);
  job.previewsCount = (job.previewsCount || 0) + 1;

  const booking = (state.bookings || []).find((b) => b.id === job.bookingId);
  if (booking) {
    booking.previews = booking.previews || [];
    booking.previews.push({
      id: preview.id,
      url: preview.url,
      alt: `Ảnh xem trước ${preview.filename} (${booking.id})`
    });
  }
  return preview;
}

/**
 * List administrator accounts
 */
export function getAdminAccounts() {
  return (state.users || [])
    .filter((u) => u.role === 'admin')
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt || '2026-10-01T08:00:00Z'
    }));
}

/**
 * Create administrator account
 */
export function createAdminAccount({ name, email, password }) {
  const existing = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return { error: 'DUPLICATE_EMAIL' };
  const baseId = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');
  const id = `u-${baseId}`;
  const newAccount = {
    id,
    name,
    email,
    password,
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  state.users.push(newAccount);
  return {
    account: {
      id: newAccount.id,
      name: newAccount.name,
      email: newAccount.email,
      role: newAccount.role,
      createdAt: newAccount.createdAt
    }
  };
}

/**
 * Get studio settings
 */
export function getSettings() {
  return state.settings || { openingHours: '08:00 - 19:00', reminderHoursBefore: 24 };
}

/**
 * Update studio settings
 */
export function updateSettings(updates) {
  state.settings = state.settings || {};
  Object.assign(state.settings, updates);
  return state.settings;
}

// ---------------------------------------------------------------------------
// Schedule and bookings (serving G5, G6, G10; contracts 04-schedule.md and 05-bookings.md)
//
// Every date and time used here comes from the seed data or from the request.
// Nothing in these rules reads the clock.
//
// Helpers that can fail return { error: { code, message, fields? } } where code is
// BAD_REQUEST, NOT_FOUND or CONFLICT; the route maps it to 400, 404 or 409.
// ---------------------------------------------------------------------------

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const CANCELLED = 'Đã huỷ';
const COMPLETED = 'Hoàn thành';
const AWAITING_DEPOSIT = 'Chờ cọc 30%';

/**
 * True for a real calendar day written as YYYY-MM-DD
 */
export function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/**
 * True for a time written as HH:MM (24 hours)
 */
export function isValidTime(value) {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toTime(minutes) {
  const clamped = Math.max(0, minutes);
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function bookingNumber(id) {
  const match = /^GS-(\d+)$/.exec(id || '');
  return match ? Number(match[1]) : 0;
}

function fail(code, message, fields) {
  const error = { code, message };
  if (fields) error.fields = fields;
  return { error };
}

function lookupStaff(id) {
  return (state.staff || []).find((s) => s.id === id) || null;
}

function lookupRoom(id) {
  return (state.rooms || []).find((r) => r.id === id) || null;
}

/**
 * Opening hours from the studio settings ("08:00 - 19:00") as {start, end}
 */
function openingWindow() {
  const match = /^\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*$/.exec(getSettings().openingHours || '');
  return {
    start: match ? match[1].padStart(5, '0') : '08:00',
    end: match ? match[2].padStart(5, '0') : '19:00'
  };
}

/**
 * "Gói Tốt nghiệp Premium" -> "Premium" (used in the clash explanations)
 */
function shortPackageName(name) {
  return String(name || '')
    .replace(/^Gói\s+/i, '')
    .replace(/^Tốt nghiệp\s+/i, '')
    .replace(/\s*\(.*\)\s*$/, '')
    .trim();
}

/**
 * Find booking by id (full object, including previews)
 */
export function findBooking(id) {
  return (state.bookings || []).find((b) => b.id === id) || null;
}

/**
 * Booking without the photo lists, as returned in GET /api/bookings
 */
function toListItem(booking) {
  const { previews, selectedPhotoIds, ...rest } = booking;
  return JSON.parse(JSON.stringify(rest));
}

/**
 * Whether the user may open this booking: its customer, any admin, or the staff assigned to it
 */
export function canViewBooking(user, booking) {
  if (!user || !booking) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'customer') return booking.customerId === user.id;
  if (user.role === 'staff') {
    return (booking.makeup && booking.makeup.staffId === user.id) || booking.shoot.staffId === user.id;
  }
  return false;
}

/**
 * Bookings a user sees in the list: customer -> own, admin -> all, staff -> assigned
 */
export function listBookingsFor(user) {
  const all = (state.bookings || []).slice().sort((a, b) => bookingNumber(a.id) - bookingNumber(b.id));
  let visible = [];
  if (user && user.role === 'admin') visible = all;
  else if (user && (user.role === 'customer' || user.role === 'staff')) {
    visible = all.filter((b) => canViewBooking(user, b));
  }
  return visible.map(toListItem);
}

/**
 * Next booking id: highest GS number + 1
 */
export function nextBookingId() {
  const highest = (state.bookings || []).reduce((max, b) => Math.max(max, bookingNumber(b.id)), 1000);
  return `GS-${highest + 1}`;
}

function nextJobId() {
  const highest = (state.jobs || []).reduce((max, j) => {
    const match = /^job-(\d+)$/.exec(j.id || '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 100);
  return `job-${highest + 1}`;
}

/**
 * Busy blocks of one day, from the (not cancelled) bookings plus the non-booking busy blocks.
 * A booking gives one block for its make-up artist, one for its photographer and one for its room.
 * A non-booking block (such as a lunch break) follows the previous block of the same resource.
 * `kind` is internal: makeup, shoot, room or other.
 */
function dayBlocks(date, ignoreBookingId) {
  const reasons = state.scheduleReasons || {};
  const blocks = [];
  const bookings = (state.bookings || [])
    .filter((b) => b.date === date && b.status !== CANCELLED && b.id !== ignoreBookingId)
    .sort((a, b) => bookingNumber(a.id) - bookingNumber(b.id));

  for (const b of bookings) {
    const note = reasons[b.id] || {};
    const shootReason = note.shoot || 'Chụp';
    if (b.makeup) {
      blocks.push({
        resourceId: b.makeup.staffId, resourceName: b.makeup.staffName, start: b.makeup.start, end: b.makeup.end,
        reason: note.makeup || 'Trang điểm', bookingId: b.id, kind: 'makeup'
      });
    }
    blocks.push({
      resourceId: b.shoot.staffId, resourceName: b.shoot.staffName, start: b.shoot.start, end: b.shoot.end,
      reason: shootReason, bookingId: b.id, kind: 'shoot'
    });
    if (b.shoot.roomId) {
      blocks.push({
        resourceId: b.shoot.roomId, resourceName: b.shoot.roomName, start: b.shoot.start, end: b.shoot.end,
        reason: shootReason, bookingId: b.id, kind: 'room'
      });
    }
  }

  for (const extra of (state.busyBlocks || [])) {
    if (extra.date !== date || (extra.bookingId && extra.bookingId === ignoreBookingId)) continue;
    const block = {
      resourceId: extra.resourceId, resourceName: extra.resourceName, start: extra.start, end: extra.end,
      reason: extra.reason, bookingId: extra.bookingId || null, kind: 'other'
    };
    let after = -1;
    blocks.forEach((existing, i) => {
      if (existing.resourceId === extra.resourceId) after = i;
    });
    blocks.splice(after + 1 || blocks.length, 0, block);
  }
  return blocks;
}

function publicBlock(block) {
  const { kind, ...rest } = block;
  return rest;
}

/**
 * Schedule of one day (GET /api/schedule): staff, rooms, opening hours and busy blocks
 */
export function getDaySchedule(date) {
  return {
    date,
    openingHours: openingWindow(),
    staff: (state.staff || []).map((s) => ({ id: s.id, name: s.name, role: s.role })),
    rooms: (state.rooms || []).map((r) => ({ id: r.id, name: r.name })),
    busy: dayBlocks(date).map(publicBlock)
  };
}

/**
 * The one clash check, used by POST /api/schedule/clash-check and by PATCH /api/bookings/:id.
 *
 * `time` is the shoot start. The package gives the shoot length and the make-up length;
 * make-up is placed right before the shoot. Suggestions are start times on the hour on the
 * same day where the whole make-up + shoot block fits inside opening hours and the make-up
 * artist, photographer and room are all free. `makeupMinutes` and `shootMinutes` are optional
 * overrides (used when a booking keeps the lengths it already has).
 *
 * Returns { clash, explanation, conflicts, suggestions }, or { invalid: { field: message } }
 * when the request itself is incomplete.
 */
export function checkClash({
  date, time, packageId, makeupArtistId, photographerId, roomId, ignoreBookingId, makeupMinutes, shootMinutes
}) {
  const invalid = {};
  if (!isValidDate(date)) invalid.date = 'Date is required in format YYYY-MM-DD';
  if (!isValidTime(time)) invalid.time = 'Time is required in format HH:MM';

  const pkg = (state.packages || []).find((p) => p.id === packageId);
  if (!pkg) invalid.packageId = packageId ? 'Unknown package' : 'Package is required';

  const makeupLength = typeof makeupMinutes === 'number' ? makeupMinutes : (pkg && pkg.makeupMinutes) || 0;
  const shootLength = typeof shootMinutes === 'number' ? shootMinutes : (pkg && pkg.shootMinutes) || 60;
  const needMakeup = makeupLength > 0;
  const needRoom = pkg ? pkg.roomId !== null : true;

  const makeupArtist = lookupStaff(makeupArtistId);
  const photographer = lookupStaff(photographerId);
  const room = lookupRoom(roomId);
  if (needMakeup && !makeupArtist) invalid.makeupArtistId = makeupArtistId ? 'Unknown make-up artist' : 'Make-up artist is required';
  if (!photographer) invalid.photographerId = photographerId ? 'Unknown photographer' : 'Photographer is required';
  if (needRoom && !room) invalid.roomId = roomId ? 'Unknown room' : 'Room is required';
  if (Object.keys(invalid).length) return { invalid };

  const hours = openingWindow();
  const open = toMinutes(hours.start);
  const close = toMinutes(hours.end);
  const blocks = dayBlocks(date, ignoreBookingId);
  const shortName = shortPackageName(pkg.name);

  // Windows needed when the shoot starts at `startMinutes`
  function windowsFor(startMinutes) {
    return {
      makeup: needMakeup ? { start: startMinutes - makeupLength, end: startMinutes } : null,
      shoot: { start: startMinutes, end: startMinutes + shootLength }
    };
  }

  function busyIn(resourceId, window, kind) {
    return blocks
      .filter((b) => b.resourceId === resourceId && overlaps(toMinutes(b.start), toMinutes(b.end), window.start, window.end))
      .map((b) => ({ block: b, need: { kind, start: window.start, end: window.end } }));
  }

  function evaluate(startMinutes) {
    const w = windowsFor(startMinutes);
    const busy = [];
    if (w.makeup) busy.push(...busyIn(makeupArtist.id, w.makeup, 'makeup'));
    busy.push(...busyIn(photographer.id, w.shoot, 'shoot'));
    if (needRoom) busy.push(...busyIn(room.id, w.shoot, 'room'));
    const from = w.makeup ? w.makeup.start : w.shoot.start;
    return { windows: w, busy, outside: from < open || w.shoot.end > close };
  }

  function describe(entry) {
    const { block, need } = entry;
    const word = block.kind === 'makeup' ? 'trang điểm' : 'chụp';
    const what = block.bookingId ? `(${word} ${block.bookingId})` : `(${String(block.reason).toLowerCase()})`;
    const needText = need.kind === 'makeup'
      ? `cần trang điểm ${toTime(need.start)}–${toTime(need.end)}`
      : need.kind === 'room'
        ? `cần dùng ${room.name} ${toTime(need.start)}–${toTime(need.end)}`
        : `cần chụp ${toTime(need.start)}–${toTime(need.end)}`;
    return { who: block.resourceName, range: `${block.start}–${block.end}`, what, needText };
  }

  const requested = evaluate(toMinutes(time));
  const conflicts = requested.busy.map((entry) => publicBlock(entry.block));
  if (requested.outside) {
    conflicts.unshift({
      resourceId: 'studio', resourceName: 'Studio', start: hours.start, end: hours.end,
      reason: `Ngoài giờ mở cửa ${hours.start}–${hours.end}`, bookingId: null
    });
  }

  const w = requested.windows;
  if (!conflicts.length) {
    const makeupPart = w.makeup ? `${makeupArtist.name} rảnh ${toTime(w.makeup.start)}–${toTime(w.makeup.end)}, ` : '';
    const shootWho = needRoom ? `${photographer.name} và ${room.name}` : photographer.name;
    return {
      clash: false,
      explanation: `${time} trống: ${makeupPart}${shootWho} rảnh ${toTime(w.shoot.start)}–${toTime(w.shoot.end)}.`,
      conflicts: [],
      suggestions: []
    };
  }

  // Explanation: one plain sentence for the first problem, then the others
  const sentences = [];
  const details = requested.busy.map(describe);
  if (requested.outside) {
    const from = w.makeup ? w.makeup.start : w.shoot.start;
    sentences.push(
      `${time} nằm ngoài giờ mở cửa ${hours.start}–${hours.end}, mà gói ${shortName} cần ${toTime(from)}–${toTime(w.shoot.end)}.`
    );
  }
  details.forEach((d, i) => {
    if (i === 0 && !requested.outside) {
      sentences.push(`${time} bị trùng vì ${d.who} bận ${d.range} ${d.what}, mà gói ${shortName} ${d.needText}.`);
    } else {
      sentences.push(`Ngoài ra, ${d.who} cũng bận ${d.range} ${d.what}.`);
    }
  });

  // Suggestions: every free start on the hour of the same day
  const suggestions = [];
  for (let start = 0; start < 24 * 60; start += 60) {
    if (start === toMinutes(time)) continue;
    const candidate = evaluate(start);
    if (candidate.outside || candidate.busy.length) continue;
    const cw = candidate.windows;
    const parts = [];
    if (cw.makeup) parts.push(`trang điểm ${toTime(cw.makeup.start)}–${toTime(cw.makeup.end)} với ${makeupArtist.name}`);
    parts.push(`chụp ${toTime(cw.shoot.start)}–${toTime(cw.shoot.end)} với ${photographer.name}${needRoom ? ` tại ${room.name}` : ''}`);
    suggestions.push({
      time: toTime(start),
      text: `${toTime(start)}: ${parts.join(', ')}.`,
      makeup: cw.makeup
        ? { start: toTime(cw.makeup.start), end: toTime(cw.makeup.end), staffId: makeupArtist.id, staffName: makeupArtist.name }
        : null,
      shoot: {
        start: toTime(cw.shoot.start), end: toTime(cw.shoot.end), staffId: photographer.id, staffName: photographer.name,
        roomId: needRoom ? room.id : null, roomName: needRoom ? room.name : null
      }
    });
  }

  return { clash: true, explanation: sentences.join(' '), conflicts, suggestions };
}

/**
 * Create a booking from a conversation whose latest proposal the customer accepted (POST /api/bookings).
 * Times, staff and room come from that proposal; package, extras and customer from the request.
 * createdAt is the conversation's lastMessageAt (the moment the customer agreed), not the clock.
 */
export function createBookingFromConversation(conversationId) {
  const conversation = (state.conversations || []).find((c) => c.id === conversationId);
  if (!conversation) return fail('NOT_FOUND', `Conversation ${conversationId} not found`);

  const proposalMessage = (conversation.messages || []).slice().reverse().find((m) => m.proposal);
  if (!proposalMessage || proposalMessage.proposal.status !== 'accepted') {
    return fail('CONFLICT', 'The customer has not accepted the proposed time yet');
  }
  if (conversation.bookingId) {
    return fail('CONFLICT', `Conversation ${conversationId} already has booking ${conversation.bookingId}`);
  }

  const proposal = proposalMessage.proposal;
  const request = conversation.request || {};
  const pkg = (state.packages || []).find((p) => p.id === request.packageId);
  if (!pkg) return fail('CONFLICT', `Conversation ${conversationId} has no package to book`);
  const service = (state.services || []).find((s) => s.id === pkg.serviceId);

  const extras = (request.extras || [])
    .map((extraId) => (state.extras || []).find((e) => e.id === extraId))
    .filter(Boolean)
    .map((e) => ({ id: e.id, name: e.name, price: (e.includedIn || []).includes(pkg.id) ? 0 : e.price }));
  const total = pkg.price + extras.reduce((sum, e) => sum + e.price, 0);
  const deposit = Math.round(total * 0.3);

  const makeupArtist = proposal.makeupArtistId ? lookupStaff(proposal.makeupArtistId) : null;
  const photographer = lookupStaff(proposal.photographerId);
  const room = proposal.roomId ? lookupRoom(proposal.roomId) : null;
  const createdAt = conversation.lastMessageAt;
  const id = nextBookingId();

  const booking = {
    id,
    conversationId: conversation.id,
    customerId: conversation.customerId,
    customerName: conversation.customerName,
    serviceId: pkg.serviceId,
    serviceName: service ? service.name : '',
    packageId: pkg.id,
    packageName: pkg.name,
    extras,
    date: proposal.date,
    makeup: makeupArtist && proposal.makeupStart
      ? { start: proposal.makeupStart, end: proposal.makeupEnd, staffId: makeupArtist.id, staffName: makeupArtist.name }
      : null,
    shoot: {
      start: proposal.shootStart,
      end: proposal.shootEnd,
      staffId: photographer.id,
      staffName: photographer.name,
      roomId: room ? room.id : null,
      roomName: room ? room.name : null
    },
    price: { total, deposit, remaining: total - deposit },
    status: AWAITING_DEPOSIT,
    paymentStatus: 'Chưa cọc',
    photoStatus: 'Chưa có ảnh',
    maxSelect: pkg.maxSelect,
    previews: [],
    selectedPhotoIds: [],
    finalLink: null,
    cancelReason: null,
    createdAt
  };
  state.bookings.push(booking);

  conversation.bookingId = id;
  const messageNumber = String((conversation.messages || []).length + 1).padStart(2, '0');
  conversation.messages.push({
    id: `m-${conversation.id.replace(/^c-/, '')}-${messageNumber}`,
    sender: 'system',
    senderName: 'Hệ thống',
    text: `Đã tạo booking ${id} · ${AWAITING_DEPOSIT}. Studio chỉ giữ lịch sau khi bạn đặt cọc thành công.`,
    sentAt: createdAt
  });

  // Jobs for the staff, in the schema of 08-jobs.md
  state.jobs = state.jobs || [];
  if (booking.makeup) {
    state.jobs.push({
      id: nextJobId(), staffId: booking.makeup.staffId, bookingId: id, role: 'makeup', service: booking.packageName,
      customerName: booking.customerName, date: booking.date, time: `${booking.makeup.start} - ${booking.makeup.end}`,
      location: 'Khu trang điểm, tầng 1', status: 'assigned', previewsCount: 0, previews: []
    });
  }
  state.jobs.push({
    id: nextJobId(), staffId: booking.shoot.staffId, bookingId: id, role: 'photographer', service: booking.packageName,
    customerName: booking.customerName, date: booking.date, time: `${booking.shoot.start} - ${booking.shoot.end}`,
    location: booking.shoot.roomName || 'Tại chỗ', status: 'assigned', previewsCount: 0, previews: []
  });

  return { booking };
}

function minutesBetween(start, end) {
  return toMinutes(end) - toMinutes(start);
}

/**
 * Reschedule {date, time} (with the same clash check as 04) or cancel {status: "Đã huỷ", cancelReason}
 * (PATCH /api/bookings/:id). On a clash the booking is left unchanged and the error message is the
 * explanation sentence; the full clash result is returned next to the error.
 */
export function updateBooking(id, body) {
  const booking = findBooking(id);
  if (!booking) return fail('NOT_FOUND', `Booking ${id} not found`);

  const { date, time, status, cancelReason } = body || {};

  // Cancel
  if (status !== undefined) {
    const fields = {};
    if (status !== CANCELLED) fields.status = `Status can only be changed to ${CANCELLED}`;
    if (typeof cancelReason !== 'string' || !cancelReason.trim()) fields.cancelReason = 'Cancel reason is required';
    if (Object.keys(fields).length) return fail('BAD_REQUEST', 'Invalid booking update', fields);
    if (booking.status === CANCELLED) return fail('CONFLICT', `Booking ${id} is already cancelled`);
    if (booking.status === COMPLETED) return fail('CONFLICT', `Booking ${id} is completed and cannot be cancelled`);

    booking.status = CANCELLED;
    booking.cancelReason = cancelReason.trim();
    (state.jobs || []).forEach((j) => {
      if (j.bookingId === id && (j.status === 'assigned' || j.status === 'in_progress')) j.status = 'cancelled';
    });
    return { booking };
  }

  // Reschedule
  const fields = {};
  if (!isValidDate(date)) fields.date = date === undefined ? 'Date is required in format YYYY-MM-DD' : 'Date must be in format YYYY-MM-DD';
  if (!isValidTime(time)) fields.time = time === undefined ? 'Time is required in format HH:MM' : 'Time must be in format HH:MM';
  if (Object.keys(fields).length) return fail('BAD_REQUEST', 'Invalid booking update', fields);
  if (booking.status === CANCELLED) return fail('CONFLICT', `Booking ${id} is cancelled and cannot be rescheduled`);
  if (booking.status === COMPLETED) return fail('CONFLICT', `Booking ${id} is completed and cannot be rescheduled`);

  const pkg = (state.packages || []).find((p) => p.id === booking.packageId);
  const makeupLength = pkg && typeof pkg.makeupMinutes === 'number'
    ? pkg.makeupMinutes
    : (booking.makeup ? minutesBetween(booking.makeup.start, booking.makeup.end) : 0);
  const shootLength = pkg && typeof pkg.shootMinutes === 'number'
    ? pkg.shootMinutes
    : minutesBetween(booking.shoot.start, booking.shoot.end);

  const clash = checkClash({
    date,
    time,
    packageId: booking.packageId,
    makeupArtistId: booking.makeup ? booking.makeup.staffId : undefined,
    photographerId: booking.shoot.staffId,
    roomId: booking.shoot.roomId,
    ignoreBookingId: id,
    makeupMinutes: makeupLength,
    shootMinutes: shootLength
  });
  if (clash.invalid) return fail('BAD_REQUEST', 'Invalid booking update', clash.invalid);
  if (clash.clash) return { ...fail('CONFLICT', clash.explanation), clash };

  const shootStart = toMinutes(time);
  booking.date = date;
  if (booking.makeup && makeupLength > 0) {
    booking.makeup.start = toTime(shootStart - makeupLength);
    booking.makeup.end = time;
  }
  booking.shoot.start = time;
  booking.shoot.end = toTime(shootStart + shootLength);

  (state.jobs || []).forEach((j) => {
    if (j.bookingId !== id || j.status === 'completed' || j.status === 'cancelled') return;
    j.date = date;
    const window = j.role === 'makeup' && booking.makeup ? booking.makeup : booking.shoot;
    j.time = `${window.start} - ${window.end}`;
  });
  return { booking };
}

/**
 * Attach the final photo link (POST /api/bookings/:id/final-link).
 * A bad url is a 400 (checked first); anything but photoStatus "Đã chọn ảnh" is a 409.
 */
export function setFinalLink(id, url) {
  const booking = findBooking(id);
  if (!booking) return fail('NOT_FOUND', `Booking ${id} not found`);

  let valid = false;
  if (typeof url === 'string' && url.trim()) {
    try {
      const parsed = new URL(url.trim());
      valid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (err) {
      valid = false;
    }
  }
  if (!valid) {
    return fail('BAD_REQUEST', 'Invalid final link', { url: 'Final link must be a valid http or https URL' });
  }

  if (booking.photoStatus !== 'Đã chọn ảnh') {
    return fail('CONFLICT', 'Cannot add the final link: the customer has not chosen photos yet');
  }

  booking.finalLink = url.trim();
  booking.photoStatus = 'Đã có link ảnh cuối';
  return {
    booking: {
      id: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      photoStatus: booking.photoStatus,
      finalLink: booking.finalLink
    }
  };
}
