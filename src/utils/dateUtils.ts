function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = padTwoDigits(date.getMonth() + 1);
  const day = padTwoDigits(date.getDate());

  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function getStartOfWeek(date: Date): Date {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const dayOffset = day === 0 ? -6 : 1;

  weekStart.setDate(weekStart.getDate() - day + dayOffset);
  return weekStart;
}

export function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);

  end.setDate(start.getDate() + 6);
  return end;
}

export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);

  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setMonth(result.getMonth() + months);

  if (result.getDate() !== originalDay) {
    result.setDate(0);
  }

  return result;
}
