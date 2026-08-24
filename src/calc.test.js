import { describe, expect, it } from 'vitest';
import {
  calculateCssPixelsPerCm,
  calculateDifferencePercent,
  calculateScreenTravelCm,
  calculateSensitivityRatio,
  calculateStatistics,
  cmToInches,
  inchesToCm,
  verticalQuality,
} from './calc.js';

describe('MousePSR calculations', () => {
  it('calculates CSS pixels per centimeter', () => {
    expect(calculateCssPixelsPerCm(378, 10)).toBeCloseTo(37.8, 10);
  });

  it('converts cursor movement to physical screen travel', () => {
    expect(calculateScreenTravelCm(1134, 37.8)).toBeCloseTo(30, 10);
  });

  it('calculates Mouse PSR', () => {
    expect(calculateSensitivityRatio(30, 10)).toBeCloseTo(3, 10);
  });

  it('converts centimeters and inches', () => {
    expect(cmToInches(2.54)).toBeCloseTo(1, 10);
    expect(inchesToCm(1)).toBeCloseTo(2.54, 10);
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
