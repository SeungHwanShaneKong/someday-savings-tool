// IQR-based outlier detection for price data (BRD §5.2)

export interface PriceDataPoint {
  value: number;
  source?: string;
  category?: string;
}

export interface FilterResult {
  valid: PriceDataPoint[];
  outliers: PriceDataPoint[];
  stats: {
    q1: number;
    q3: number;
    iqr: number;
    lowerBound: number;
    upperBound: number;
    median: number;
    mean: number;
  };
}

/**
 * IQR (Interquartile Range) based outlier filter
 * Removes data points outside Q1 - 1.5*IQR and Q3 + 1.5*IQR
 * Used for cleaning crawled wedding cost data
 */
export function filterOutliers(
  data: PriceDataPoint[],
  multiplier: number = 1.5
): FilterResult {
  if (data.length < 4) {
    return {
      valid: data,
      outliers: [],
      stats: {
        q1: 0,
        q3: 0,
        iqr: 0,
        lowerBound: 0,
        upperBound: Infinity,
        median: data.length > 0 ? data[Math.floor(data.length / 2)].value : 0,
        mean:
          data.length > 0
            ? data.reduce((sum, d) => sum + d.value, 0) / data.length
            : 0,
      },
    };
  }

  const sorted = [...data].sort((a, b) => a.value - b.value);
  const values = sorted.map((d) => d.value);

  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  const iqr = q3 - q1;

  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;

  const valid: PriceDataPoint[] = [];
  const outliers: PriceDataPoint[] = [];

  for (const dp of data) {
    if (dp.value >= lowerBound && dp.value <= upperBound) {
      valid.push(dp);
    } else {
      outliers.push(dp);
    }
  }

  return {
    valid,
    outliers,
    stats: {
      q1,
      q3,
      iqr,
      lowerBound,
      upperBound,
      median: percentile(values, 50),
      mean: values.reduce((sum, v) => sum + v, 0) / values.length,
    },
  };
}

function percentile(sortedValues: number[], p: number): number {
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sortedValues[lower];

  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Filter price data by category with appropriate bounds
 * Different categories have different reasonable price ranges
 */
export function filterByCategory(
  data: PriceDataPoint[],
  category: string
): FilterResult {
  // Category-specific reasonable bounds (₩)
  const categoryBounds: Record<string, { min: number; max: number }> = {
    wedding_hall: { min: 500_000, max: 50_000_000 },
    studio: { min: 300_000, max: 5_000_000 },
    dress: { min: 200_000, max: 10_000_000 },
    makeup: { min: 100_000, max: 3_000_000 },
    honeymoon: { min: 1_000_000, max: 20_000_000 },
    catering: { min: 50_000, max: 300_000 }, // per person
    ring: { min: 100_000, max: 30_000_000 },
    invitation: { min: 50_000, max: 1_000_000 },
  };

  const bounds = categoryBounds[category];

  // First pass: remove clearly invalid data
  const preFiltered = bounds
    ? data.filter((d) => d.value >= bounds.min && d.value <= bounds.max)
    : data;

  // Second pass: IQR filter on remaining valid data
  return filterOutliers(preFiltered);
}
