// Persian-first formatters for restaurant reservation system

export function toFaDigits(value: string | number): string {
  const num = String(value);
  const persian = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.replace(/\d/g, (d) => persian[parseInt(d, 10)]);
}

export function formatJalali(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  // Use Persian locale for Jalali-style formatting
  return new Date(y, m - 1, d).toLocaleDateString("fa-IR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatJalaliShort(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fa-IR", {
    day: "numeric",
    month: "long",
  });
}

export function formatToday(): string {
  const now = new Date();
  return now.toLocaleDateString("fa-IR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function isToday(isoDate: string): boolean {
  const today = new Date();
  const [y, m, d] = isoDate.split("-").map(Number);
  return y === today.getFullYear() && m === today.getMonth() + 1 && d === today.getDate();
}
