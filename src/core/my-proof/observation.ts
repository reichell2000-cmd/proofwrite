import type { Submission } from "../model";
import { features } from "../features";
import {
  buildRhythmProfile,
  comparableRhythm,
  rhythmContinuity,
  registeredContinuity,
} from "./rhythm";

// The evidence cards and the aggregate must use the same eligible samples.
export function observeRhythm(
  s: Pick<
    Submission,
    "rhythm" | "rhythmOptIn" | "rhythmBaseline" | "studentId" | "rhythmDeviceId"
  >,
) {
  const { samples, mode } = comparableRhythm(
    s.rhythmOptIn && features.free.basicMyProofPrototype
      ? s.rhythm.filter((x) => !s.studentId || x.deviceId === s.rhythmDeviceId)
      : [],
  );
  const middle = Math.floor(samples.length / 2);
  const before = buildRhythmProfile(samples.slice(0, middle));
  const after = buildRhythmProfile(samples.slice(middle));
  const current = buildRhythmProfile(samples);
  const candidate = s.rhythmBaseline;
  const baseline =
    candidate &&
    (!s.studentId ||
      (!!candidate.registrationId &&
        candidate.deviceId === s.rhythmDeviceId)) &&
    (candidate.mode || "direct") === mode &&
    candidate.profile.sampleCount >= 80 &&
    candidate.profile.medianFlightMs !== null &&
    candidate.profile.medianFlightMs > 0 &&
    candidate.profile.medianFlightMs < 5000
      ? candidate.profile
      : undefined;
  const continuity =
    samples.length >= 80
      ? candidate?.registrationId && baseline
        ? registeredContinuity(baseline, current)
        : s.studentId
          ? null
          : rhythmContinuity(baseline || before, baseline ? current : after)
      : null;
  return { samples, mode, before, after, current, baseline, continuity };
}
