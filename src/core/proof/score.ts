import { EvidenceSummary } from "../evidence/types";

export interface ProofScoreBreakdown {
  total: number;
  thoughtTrace: number; // 0-30
  myProof: number; // 0-25 (prototype confidence in rhythm continuity, not identity)
  inputEvidence: number; // 0-20
  revisionEvidence: number; // 0-15
  processContinuity: number; // 0-10
  label: "과정증거 충분" | "확인 권장" | "과정 확인 필요";
  caveat: string;
}

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

export function calculateProofScore(
  s: EvidenceSummary,
  rhythmContinuity: number | null = null
): ProofScoreBreakdown {
  const trace = clamp(
    8 + Math.min(10,s.snapshotCount*1.2) + Math.min(8,s.revisionCount*0.35) + Math.min(4,s.sessionCount),
    0,30
  );
  const myProof = rhythmContinuity == null ? 12 : clamp(Math.round(rhythmContinuity*25),0,25);
  const ratio=s.observedDirectInputRatio ?? 0;
  const input = clamp(Math.round(4 + ratio*16 - Math.min(6,s.largestPasteChars/250)),0,20);
  const revision = clamp(Math.round(Math.min(10,s.revisionCount*0.45)+Math.min(5,s.majorRevisionCount*2)),0,15);
  const continuity = clamp(Math.round(Math.min(5,s.activeMs/600_000)+Math.min(3,s.sessionCount)+Math.max(0,2-Math.min(2,s.focusExitCount/8))),0,10);
  const total=Math.round(trace+myProof+input+revision+continuity);
  return {
    total, thoughtTrace:Math.round(trace), myProof, inputEvidence:input,
    revisionEvidence:revision, processContinuity:continuity,
    label: total>=80 ? "과정증거 충분" : total>=55 ? "확인 권장" : "과정 확인 필요",
    caveat:"Proof Score는 본인 작성 확률이나 부정행위 확률이 아닙니다. 기록된 작성과정 증거의 충분성을 요약합니다."
  };
}
