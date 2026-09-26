import { describe, it, expect } from "vitest";
import { calculateProofScore } from "./score";
import { summarizeEvidence } from "../evidence/summarize";
import type { EvidenceSummary } from "../evidence/types";
const base: EvidenceSummary = {
  totalElapsedMs: 3600000,
  activeMs: 1800000,
  inactiveMs: 1800000,
  sessionCount: 2,
  insertedChars: 1800,
  deletedChars: 400,
  pasteChars: 0,
  pasteCount: 0,
  largestPasteChars: 0,
  revisionCount: 40,
  majorRevisionCount: 3,
  focusExitCount: 2,
  snapshotCount: 12,
  observedDirectInputRatio: 1,
};
describe("Proof Score ethics and boundaries", () => {
  it("gives no points to an empty record", () =>
    expect(calculateProofScore(summarizeEvidence([])).total).toBe(0));
  it("does not penalize paste or window exits in isolation", () => {
    const original = calculateProofScore(base);
    const varied = calculateProofScore({
      ...base,
      pasteChars: 1400,
      pasteCount: 1,
      largestPasteChars: 1400,
      observedDirectInputRatio: 0.22,
      focusExitCount: 100,
    });
    expect(varied.total).toBe(original.total);
    expect(varied.caveat).toContain("본인 작성 확률");
  });
  it("uses N/A for missing rhythm and exposes the denominator", () => {
    const score = calculateProofScore(base);
    expect(score.myProof).toBeNull();
    expect(score.availableMax).toBe(75);
    expect(score.total).toBe(
      Math.round(
        ((score.thoughtTrace +
          score.inputEvidence +
          score.revisionEvidence +
          score.processContinuity) /
          75) *
          100,
      ),
    );
  });
  it("is bounded and sums the displayed components when rhythm is available", () => {
    for (const rhythm of [0, 0.5, 1, 999, NaN]) {
      const score = calculateProofScore(base, rhythm);
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);
      expect(score.total).toBe(
        score.thoughtTrace +
          (score.myProof ?? 0) +
          score.inputEvidence +
          score.revisionEvidence +
          score.processContinuity,
      );
    }
  });
});
