export function cmToInches(cm) {
  return cm / 2.54;
}

export function inchesToCm(inches) {
  return inches * 2.54;
}

export function calculateCssPixelsPerCm(widthPx, physicalCm) {
  if (!(widthPx > 0) || !(physicalCm > 0)) throw new Error('Values must be positive.');
  return widthPx / physicalCm;
}

export function calculateScreenTravelCm(movementPx, cssPixelsPerCm) {
  if (!(cssPixelsPerCm > 0)) throw new Error('Display calibration is required.');
  return Math.abs(movementPx) / cssPixelsPerCm;
}

export function calculateSensitivityRatio(screenTravelCm, mouseTravelCm) {
  if (!(mouseTravelCm > 0)) throw new Error('Mouse travel must be positive.');
  return screenTravelCm / mouseTravelCm;
}

export function calculateDifferencePercent(current, target) {
  if (!(target > 0)) throw new Error('Target must be positive.');
  return ((current - target) / target) * 100;
}

export function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function standardDeviation(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function calculateStatistics(values) {
  if (!values.length) return { mean: 0, median: 0, sd: 0, min: 0, max: 0 };
  return {
    mean: mean(values),
    median: median(values),
    sd: standardDeviation(values),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function verticalQuality(totalAbsY, totalAbsX) {
  if (!(totalAbsX > 0)) return 0;
  return totalAbsY / totalAbsX;
}
