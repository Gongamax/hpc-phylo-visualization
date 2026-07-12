export function median(values) {
  return percentile(values, 50);
}

export function percentile(values, p) {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .toSorted((a, b) => a - b);

  if (!sorted.length) return NaN;
  if (p <= 0) return sorted[0];
  if (p >= 100) return sorted.at(-1);

  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const weight = rank - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
}

export function mean(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return NaN;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function round(value, digits = 2) {
  if (!Number.isFinite(value)) return "";
  return Number(value.toFixed(digits));
}
