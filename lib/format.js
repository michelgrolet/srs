// Date / interval formatting and id generation. No external dependencies.

export function uuid() {
  // GitHub Pages is HTTPS, so crypto.randomUUID is available (secure context).
  return crypto.randomUUID();
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Coarse "time from now until `date`" for the rating buttons: <1m, Xm, Xh, Xd,
// Xmo, Xy. Always a single rounded unit so the four buttons stay scannable.
export function formatInterval(date, now = new Date()) {
  const ms = new Date(date).getTime() - now.getTime();
  if (ms <= 0) return 'now';
  if (ms < MIN) return '<1m';
  if (ms < HOUR) return `${Math.round(ms / MIN)}m`;
  if (ms < DAY) return `${Math.round(ms / HOUR)}h`;
  const days = ms / DAY;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  const years = days / 365;
  return `${years < 2 ? years.toFixed(1) : Math.round(years)}y`;
}

// Signed "in 3h" / "now" / "2d ago" for the All-done screen and Browse list.
export function formatDue(date, now = new Date()) {
  const ms = new Date(date).getTime() - now.getTime();
  if (Math.abs(ms) < MIN) return 'now';
  const a = Math.abs(ms);
  let s;
  if (a < HOUR) s = `${Math.round(a / MIN)}m`;
  else if (a < DAY) s = `${Math.round(a / HOUR)}h`;
  else if (a < 30 * DAY) s = `${Math.round(a / DAY)}d`;
  else if (a < 365 * DAY) s = `${Math.round(a / (30 * DAY))}mo`;
  else s = `${(a / (365 * DAY)).toFixed(1)}y`;
  return ms > 0 ? `in ${s}` : `${s} ago`;
}

// Absolute calendar date, e.g. "Jun 13, 2026".
export function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
