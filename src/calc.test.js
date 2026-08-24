import { describe, expect, it } from 'vitest';
import {
  calculateCssPixelsPerMm,
  calculateDifferencePercent,
  calculateScreenTravelMm,
  calculateSensitivityRatio,
  calculateStatistics,
  cmToMm,
  inchesToMm,
  mmToCm,
  mmToInches,
  verticalQuality,
} from './calc.js';

describe('MousePSR calculations', () => {
  it('calculates CSS pixels per millimeter', () => {
    expect(calculateCssPixelsPerMm(378, 100)).toBeCloseTo(3.78, 10);
  });

  it('converts cursor movement to physical screen travel in millimeters', () => {
    expect(calculateScreenTravelMm(1134, 3.78)).toBeCloseTo(300, 10);
  });

  it('calculates Mouse PSR using millimeters', () => {
    expect(calculateSensitivityRatio(300, 100)).toBeCloseTo(3, 10);
  });

  it('converts millimeters, centimeters, and inches', () => {
    expect(mmToCm(10)).toBeCloseTo(1, 10);
    expect(cmToMm(1)).toBeCloseTo(10, 10);
    expect(mmToInches(25.4)).toBeCloseTo(1, 10);
    expect(inchesToMm(1)).toBeCloseTo(25.4, 10);
  });

  it('calculates target difference', () => {
    expect(calculateDifferencePercent(2.585, 2.74)).toBeCloseTo(-5.6569, 3);
  });

  it('calculates run statistics', () => {
    const stats = calculateStatistics([2.731, 2.748, 2.742]);
    expect(stats.mean).toBeCloseTo(2.740333, 5);
    expect(stats.median).toBe(2.742);
    expect(stats.min).toBe(2.731);
    expect(stats.max).toBe(2.748);
  });

  it('uses vertical movement only as a quality ratio', () => {
    expect(verticalQuality(20, 1000)).toBeCloseTo(0.02, 10);
  });
});
