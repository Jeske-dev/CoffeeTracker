const oneDecimal = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const twoDecimals = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const fullDate = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
const shortDate = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", timeZone: "Europe/Berlin" });
const clockTime = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

export const formatWeight = (value: number | null | undefined) => value === null || value === undefined ? "—" : `${oneDecimal.format(value)} g`;
export const formatTime = (value: number | null | undefined) => value === null || value === undefined ? "—" : `${oneDecimal.format(value)} s`;
export const formatRatio = (value: number | null | undefined) => value === null || value === undefined ? "—" : `1 : ${twoDecimals.format(value)}`;
export const formatDateTime = (value: string | Date) => formatValidDate(dateTime, value);
export const formatDate = (value: string | Date) => formatValidDate(fullDate, value);
export const formatShortDate = (value: string | Date) => formatValidDate(shortDate, value);
export const formatClockTime = (value: string | Date) => formatValidDate(clockTime, value);

function formatValidDate(formatter: Intl.DateTimeFormat, value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : formatter.format(date);
}
