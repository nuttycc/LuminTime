import { describe, it, expect } from "vitest";
import { intensity, noise, getCellStyle } from "@/components/artHeatmap";

describe("intensity", () => {
  it("returns 0 for zero value", () => {
    expect(intensity(0, 100)).toBe(0);
  });

  it("returns 0 when maxVal is 0 (all-empty matrix)", () => {
    expect(intensity(50, 0)).toBe(0);
  });

  it("returns 1.0 for the max value itself", () => {
    expect(intensity(100, 100)).toBe(1.0);
  });

  it("enforces minimum threshold of 0.08", () => {
    // val/maxVal = 1/1000 = 0.001, should be clamped to 0.08
    expect(intensity(1, 1000)).toBe(0.08);
  });

  it("returns proportional value above threshold", () => {
    expect(intensity(50, 100)).toBe(0.5);
    expect(intensity(25, 100)).toBe(0.25);
  });
});

describe("noise", () => {
  it("is deterministic — same input always returns same output", () => {
    const a = noise(3, 12);
    const b = noise(3, 12);
    expect(a).toBe(b);
  });

  it("returns values in [0, 1)", () => {
    // Exhaustively check all 168 cells of a 7×24 grid
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const n = noise(d, h);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(1);
      }
    }
  });

  it("produces different values for different coordinates", () => {
    // Not all 168 values should be the same
    const values = new Set<number>();
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        values.add(noise(d, h));
      }
    }
    // At least 100 unique values out of 168 — confirms spread
    expect(values.size).toBeGreaterThan(100);
  });
});

describe("getCellStyle", () => {
  describe("empty cells (val=0)", () => {
    it("renders a round dot", () => {
      const style = getCellStyle(0, 100, 0, 0);
      expect(style.borderRadius).toBe("50%");
    });

    it("uses a centered radial gradient", () => {
      const style = getCellStyle(0, 100, 3, 12);
      expect(style.background).toContain("circle at 50% 50%");
    });

    it("has no glow", () => {
      const style = getCellStyle(0, 100, 0, 0);
      expect(style.boxShadow).toBeUndefined();
    });
  });

  describe("active cells (val > 0)", () => {
    it("uses oklch color in gradient", () => {
      const style = getCellStyle(50, 100, 2, 10);
      expect(style.background).toContain("oklch(");
    });

    it("does not have 50% border-radius (not a perfect circle)", () => {
      const style = getCellStyle(80, 100, 1, 6);
      expect(style.borderRadius).not.toBe("50%");
    });

    it("has a scale transform", () => {
      const style = getCellStyle(50, 100, 4, 18);
      expect(style.transform).toMatch(/^scale\(0\.9[2-9]\d*\)$/);
    });
  });

  describe("glow behavior", () => {
    it("no glow when intensity ≤ 0.6", () => {
      // val=60, max=100 → intensity=0.6, threshold is >0.6
      const style = getCellStyle(60, 100, 0, 0);
      expect(style.boxShadow).toBeUndefined();
    });

    it("has glow when intensity > 0.6", () => {
      // val=80, max=100 → intensity=0.8
      const style = getCellStyle(80, 100, 0, 0);
      expect(style.boxShadow).toBeDefined();
      expect(style.boxShadow).toContain("oklch(");
    });

    it("max intensity produces the strongest glow", () => {
      const medium = getCellStyle(70, 100, 0, 0);
      const max = getCellStyle(100, 100, 0, 0);
      // Extract glow spread radius (the number before "px")
      const spread = (s: string) => Number.parseFloat(s.match(/0 0 ([\d.]+)px/)![1]);
      expect(spread(max.boxShadow!)).toBeGreaterThan(spread(medium.boxShadow!));
    });
  });

  describe("all-zero matrix (maxVal = 0)", () => {
    it("renders empty dot style", () => {
      const style = getCellStyle(0, 0, 3, 15);
      expect(style.borderRadius).toBe("50%");
      expect(style.boxShadow).toBeUndefined();
    });
  });
});
