import { RhythmSample } from "../evidence/types";

export interface RhythmProfile {
  sampleCount: number;
  medianFlightMs: number | null;
  medianDwellMs?: number | null;
  p90FlightMs: number | null;
  medianBurstLength: number | null;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const percentile = (xs: number[], p: number) => {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor((a.length - 1) * p))];
};

export function buildRhythmProfile(samples: RhythmSample[]): RhythmProfile {
  const flights = samples
    .map((x) => x.flightMs)
    .filter(
      (x): x is number =>
        typeof x === "number" && Number.isFinite(x) && x >= 0 && x < 5000,
    );
  const bursts = samples
    .map((x) => x.burstLength)
    .filter((x): x is number => typeof x === "number");
  return {
    sampleCount: samples.length,
    medianDwellMs: median(
      samples
        .map((s) => s.dwellMs)
        .filter(
          (x): x is number => typeof x === "number" && x >= 0 && x < 5000,
        ),
    ),
    medianFlightMs: median(flights),
    p90FlightMs: percentile(flights, 0.9),
    medianBurstLength: median(bursts),
  };
}

// Conservative prototype signal. It measures profile continuity, never identity.
export function rhythmContinuity(
  a: RhythmProfile,
  b: RhythmProfile,
): number | null {
  if (
    a.sampleCount < 40 ||
    b.sampleCount < 40 ||
    a.medianFlightMs == null ||
    b.medianFlightMs == null
  )
    return null;
  const d =
    Math.abs(a.medianFlightMs - b.medianFlightMs) /
    Math.max(80, a.medianFlightMs, b.medianFlightMs);
  return Math.max(0, Math.min(1, 1 - d));
}

// Compare like input modes: IME composition timing differs from direct typing.
export function comparableRhythm(
  samples: RhythmSample[],
  mode?: "direct" | "composition",
) {
  const valid = samples.filter(
    (x) => x.flightMs !== undefined && x.flightMs > 0 && x.flightMs < 5000,
  );
  const direct = valid.filter((x) => x.mode !== "composition");
  const composition = valid.filter((x) => x.mode === "composition");
  const selected =
    mode || (composition.length > direct.length ? "composition" : "direct");
  return {
    mode: selected,
    samples: selected === "composition" ? composition : direct,
  };
}

// Experimental descriptive similarity, never a probability of authorship.
export function registeredContinuity(
  a: RhythmProfile,
  b: RhythmProfile,
): number | null {
  if (a.sampleCount < 80 || b.sampleCount < 80) return null;
  const metrics: [keyof RhythmProfile, number, number][] = [
    ["medianFlightMs", 0.4, 80],
    ["p90FlightMs", 0.2, 100],
    ["medianDwellMs", 0.25, 50],
    ["medianBurstLength", 0.15, 5],
  ];
  let total = 0,
    weights = 0,
    count = 0;
  for (const [key, weight, floor] of metrics) {
    const x = a[key],
      y = b[key];
    if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y))
      continue;
    total += weight * Math.max(0, 1 - Math.abs(x - y) / Math.max(floor, x, y));
    weights += weight;
    count++;
  }
  return count >= 2 ? total / weights : null;
}
