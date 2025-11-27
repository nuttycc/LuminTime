// Format a date as YYYY-MM-DD
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parse YYYY-MM-DD string to Date (local time midnight)
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Get the Monday of the week for a given date
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

// Get the Sunday of the week for a given date
export function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

// Get the 1st day of the month
export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Get the last day of the month
export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// Add days to a date (returns new Date)
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Add months to a date (returns new Date), handling day overflow (Jan 31 -> Feb 28)
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();

  // setMonth automatically wraps years, but might overflow days (Jan 31 -> Mar 3)
  result.setMonth(result.getMonth() + months);

  // If the day changed (and isn't what we expected due to overflow), clamp it
  if (result.getDate() !== originalDay) {
    // Check if we actually overshot the month?
    // Actually, simple check: if we wanted month X but got X+1, we overshot.
    // But result.getMonth() is already the new month.
    // Better logic:
    // 1. Set to 1st of target month
    // 2. Add (originalDay - 1) days? No.

    // Standard approach:
    // 1. Get desired month index.
    // 2. Check if result month != desired month.
    // 3. If so, setDate(0).

    // We can't easily know "desired month" index after setMonth because of year wrapping.
    // Let's do it manually.
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    if (d.getDate() !== originalDay) {
      // We overshot because the target month has fewer days
      d.setDate(0);
    }
    return d;
  }
  return result;
}
