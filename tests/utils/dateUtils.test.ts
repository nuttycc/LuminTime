import { describe, test, expect } from "vitest";
import {
  formatDate,
  parseDate,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  addDays,
  addMonths
} from "@/utils/dateUtils";

describe("Date Utils", () => {
  const WEDNESDAY = "2023-10-25";
  const MONDAY = "2023-10-23";
  const SUNDAY = "2023-10-29";
  const FIRST_OF_OCT = "2023-10-01";
  const LAST_OF_OCT = "2023-10-31";

  test("formatDate and parseDate", () => {
    const d = new Date(2023, 9, 25); // Oct is month 9
    expect(formatDate(d)).toBe(WEDNESDAY);

    const parsed = parseDate(WEDNESDAY);
    expect(parsed.getFullYear()).toBe(2023);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(25);
  });

  test("getStartOfWeek (Monday)", () => {
    const d1 = parseDate(WEDNESDAY);
    expect(formatDate(getStartOfWeek(d1))).toBe(MONDAY);

    const d2 = parseDate(MONDAY);
    expect(formatDate(getStartOfWeek(d2))).toBe(MONDAY);

    const d3 = parseDate(SUNDAY);
    expect(formatDate(getStartOfWeek(d3))).toBe(MONDAY);
  });

  test("getEndOfWeek (Sunday)", () => {
    const d1 = parseDate(WEDNESDAY);
    expect(formatDate(getEndOfWeek(d1))).toBe(SUNDAY);

    const d2 = parseDate(MONDAY);
    expect(formatDate(getEndOfWeek(d2))).toBe(SUNDAY);

    const d3 = parseDate(SUNDAY);
    expect(formatDate(getEndOfWeek(d3))).toBe(SUNDAY);
  });

  test("getStartOfMonth", () => {
    const d = parseDate(WEDNESDAY);
    expect(formatDate(getStartOfMonth(d))).toBe(FIRST_OF_OCT);
  });

  test("getEndOfMonth", () => {
    const d = parseDate(WEDNESDAY);
    expect(formatDate(getEndOfMonth(d))).toBe(LAST_OF_OCT);
  });

  test("addDays", () => {
    const d = parseDate("2023-10-31");
    const nextDay = addDays(d, 1);
    expect(formatDate(nextDay)).toBe("2023-11-01");

    const prevDay = addDays(d, -1);
    expect(formatDate(prevDay)).toBe("2023-10-30");
  });

  test("addMonths", () => {
    const d = parseDate("2023-10-25");
    const nextMonth = addMonths(d, 1);
    expect(formatDate(nextMonth)).toBe("2023-11-25");

    // Edge case: Jan 31 -> Feb 28
    const d2 = parseDate("2023-01-31");
    const feb = addMonths(d2, 1);
    expect(feb.getMonth()).toBe(1); // February
    expect(feb.getDate()).toBe(28); // Last day

    // Edge case: Jan 31 -> Feb 29 (Leap year 2024)
    const d3 = parseDate("2024-01-31");
    const febLeap = addMonths(d3, 1);
    expect(febLeap.getMonth()).toBe(1);
    expect(febLeap.getDate()).toBe(29);
  });
});
