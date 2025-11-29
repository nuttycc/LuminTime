import { describe, it, expect } from "vitest";
import { splitByMidnight } from "@/db/service";

describe("splitByMidnight", () => {
  it("no split within single day", () => {
    // Starts at 2025-01-15 10:00:00, lasts 1 hour
    const start = new Date(2025, 0, 15, 10, 0, 0).getTime();
    const duration = 60 * 60 * 1000;

    const result = splitByMidnight(start, duration);

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2025-01-15");
    expect(result[0].duration).toBe(duration);
  });

  it("split across one day", () => {
    // Starts at 23:30, lasts 1 hour
    const start = new Date(2025, 0, 15, 23, 30, 0).getTime();
    const duration = 60 * 60 * 1000;

    const result = splitByMidnight(start, duration);

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2025-01-15");
    expect(result[0].duration).toBe(30 * 60 * 1000);
    expect(result[1].date).toBe("2025-01-16");
    expect(result[1].duration).toBe(30 * 60 * 1000);
  });

  it("returns empty array when duration <= 0", () => {
    const start = Date.now();
    expect(splitByMidnight(start, 0)).toEqual([]);
    expect(splitByMidnight(start, -100)).toEqual([]);
  });
});
