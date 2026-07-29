export const APP_TIMEZONE = "Asia/Tokyo";

export function getTodayYmdInAppTimezone(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

export function toYmdInAppTimezone(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function parseDateOnlyInAppTimezone(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00+09:00`);

  if (Number.isNaN(date.getTime())) return undefined;

  // JavaScript Date は 2026-02-30 のような値を補正することがあるため、
  // Asia/Tokyo で表示し直した日付が入力値と一致することを確認する。
  return toYmdInAppTimezone(date) === value ? date : undefined;
}
