import type { EvidenceSummary } from "../evidence/types";
export interface ProofScoreBreakdown {
  total: number;
  thoughtTrace: number;
  myProof: number | null;
  inputEvidence: number;
  revisionEvidence: number;
  processContinuity: number;
  availableMax: number;
  label: "과정증거 충분" | "확인 권장" | "과정 확인 필요";
  caveat: string;
}
const bounded = (n: number, max: number) =>
  Math.round(Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0)));
export function calculateProofScore(
  s: EvidenceSummary,
  rhythmContinuity: number | null = null,
): ProofScoreBreakdown {
  const hasWork = s.insertedChars + s.deletedChars > 0;
  const thoughtTrace = hasWork
    ? bounded(
        Math.min(15, s.snapshotCount * 3) +
          Math.min(10, (s.insertedChars + s.deletedChars) / 50) +
          Math.min(5, s.sessionCount * 2),
        30,
      )
    : 0;
  // Missing / opted-out rhythm is N/A, never fabricated points or an accessibility penalty.
  const myProof =
    !hasWork || rhythmContinuity === null
      ? null
      : bounded(rhythmContinuity * 25, 25);
  // Evidence exists for paste as well; no paste-size or window-exit penalties.
  const inputEvidence = hasWork
    ? bounded(Math.min(20, (s.insertedChars + s.deletedChars) / 30), 20)
    : 0;
  const revisionEvidence = hasWork
    ? bounded(
        Math.min(10, s.revisionCount * 0.7) + Math.min(5, s.majorRevisionCount),
        15,
      )
    : 0;
  const processContinuity = hasWork
    ? bounded(
        Math.min(5, s.snapshotCount) + Math.min(5, s.activeMs / 60_000),
        10,
      )
    : 0;
  const availableMax = myProof === null ? 75 : 100;
  const total = bounded(
    ((thoughtTrace +
      (myProof ?? 0) +
      inputEvidence +
      revisionEvidence +
      processContinuity) *
      100) /
      availableMax,
    100,
  );
  return {
    total,
    thoughtTrace,
    myProof,
    inputEvidence,
    revisionEvidence,
    processContinuity,
    availableMax,
    label:
      total >= 80
        ? "과정증거 충분"
        : total >= 55
          ? "확인 권장"
          : "과정 확인 필요",
    caveat:
      "Proof Score는 본인 작성 확률이나 부정행위 확률이 아닙니다. 기록된 작성과정 증거의 충분성을 요약합니다. 가중치와 기준은 Pilot 검증 전 가설입니다.",
  };
}
