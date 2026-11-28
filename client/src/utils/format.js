/**
 * Display helpers for the admin screens (G4, G5, G6, G10).
 * Times from the API are ISO 8601 UTC; the studio works in Vietnam time.
 */

const DATE_TIME = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

/** "YYYY-MM-DD" -> "DD/MM/YYYY"; any other value is returned unchanged ('' when missing) */
export function formatDate(ymd) {
  if (!ymd) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(ymd);
}

/** ISO 8601 UTC timestamp -> "HH:MM DD/MM/YYYY" in Vietnam time; '' for a missing or bad value */
export function formatDateTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return DATE_TIME.format(date);
}
