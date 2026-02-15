/**
 * Pure computation logic for the generative art heatmap.
 * Extracted from ArtHeatmap.vue so it can be unit-tested in node.
 */

/** Normalize a value against a max, with a minimum threshold of 0.08. */
export function intensity(val: number, maxVal: number): number {
  if (val === 0 || maxVal === 0) return 0;
  return Math.max(0.08, val / maxVal);
}

/** Deterministic pseudo-random in [0, 1) based on grid coordinates. */
export function noise(dayIdx: number, hour: number): number {
  const seed = dayIdx * 24 + hour;
  return ((Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453) % 1 + 1) % 1;
}

/**
 * Generate CSS style object for a single heatmap cell.
 * Uses oklch gradients, hue shifts, glow, and organic shape variation.
 */
export function getCellStyle(val: number, maxVal: number, dayIdx: number, hour: number): Record<string, string> {
  const t = intensity(val, maxVal);
  const n = noise(dayIdx, hour);

  // Empty cell: subtle grey dot
  if (t === 0) {
    return {
      background: 'radial-gradient(circle at 50% 50%, oklch(0.55 0.01 0 / 0.12) 40%, transparent 70%)',
      borderRadius: '50%',
      transform: `scale(${0.7 + n * 0.15})`,
    };
  }

  // Hue shift: night hours (0-6, 20-23) → cool/blue offset, day hours (8-18) → warm offset
  const hourNorm = hour / 23;
  const hueShift = Math.sin(hourNorm * Math.PI * 2 - Math.PI / 2) * 15;

  // Radial gradient center offset for organic feel
  const cx = 35 + n * 30; // 35% to 65%
  const cy = 35 + ((n * 7.3) % 1) * 30;

  // Lightness and chroma based on intensity
  const lightness = 0.55 + t * 0.2; // 0.55 to 0.75
  const chroma = 0.12 + t * 0.14; // 0.12 to 0.26
  const baseHue = 270 + hueShift; // base purple-ish from primary, shifted

  const innerColor = `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${baseHue.toFixed(1)})`;
  const outerColor = `oklch(${(lightness - 0.15).toFixed(3)} ${(chroma * 0.6).toFixed(3)} ${(baseHue + 10).toFixed(1)} / ${(t * 0.7).toFixed(2)})`;

  const style: Record<string, string> = {
    background: `radial-gradient(ellipse at ${cx.toFixed(0)}% ${cy.toFixed(0)}%, ${innerColor} 0%, ${outerColor} 70%, transparent 100%)`,
  };

  // Glow for high-intensity cells
  if (t > 0.6) {
    const glowStrength = (t - 0.6) * 2.5; // 0 to 1
    const glowAlpha = (0.3 + glowStrength * 0.4).toFixed(2);
    style.boxShadow = `0 0 ${(4 + glowStrength * 8).toFixed(0)}px oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${baseHue.toFixed(1)} / ${glowAlpha})`;
  }

  // Border radius: low intensity → rounder, high intensity → sharper
  const radius = Math.round(50 - t * 40 + n * 8); // ~50% down to ~10%
  style.borderRadius = `${Math.max(4, radius)}%`;

  // Micro scale variation driven by noise
  const scale = 0.92 + n * 0.08;
  style.transform = `scale(${scale.toFixed(3)})`;

  return style;
}
