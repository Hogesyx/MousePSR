export function mmToCm(mm) {
  return mm / 10;
}

export function cmToMm(cm) {
  return cm * 10;
}

export function mmToInches(mm) {
  return mm / 25.4;
}

export function inchesToMm(inches) {
  return inches * 25.4;
}

export function calculateCssPixelsPerMm(widthPx, physicalMm) {
  if (!(widthPx > 0) || !(physicalMm > 0)) throw new Error('Values must be positive.');
  return widthPx / physicalMm;
}

export function calculateScreenTravelMm(movementPx, cssPixelsPerMm) {
  if (!(cssPixelsPerMm > 0)) throw new Error('Display calibration is required.');
  return Math.abs(movementPx) / cssPixelsPerMm;
}

export function calculateSensitivityRatio(screenTravelMm, mouseTravelMm) {
  if (!(mouseTravelMm > 0)) throw new Error('Mouse travel must be positive.');
  return screenTravelMm / mouseTravelMm;
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
