import { describe,it,expect } from "vitest";
import { calculateProofScore } from "./score";
import { EvidenceSummary } from "../evidence/types";

const base:EvidenceSummary={totalElapsedMs:3_600_000,activeMs:1_800_000,inactiveMs:1_800_000,sessionCount:2,insertedChars:1800,deletedChars:400,pasteChars:0,pasteCount:0,largestPasteChars:0,revisionCount:40,majorRevisionCount:3,focusExitCount:2,snapshotCount:12,observedDirectInputRatio:1};

describe("Proof Score",()=>{
  it("returns evidence sufficiency, not authorship probability",()=>{
    const x=calculateProofScore(base,.9);
    expect(x.total).toBeGreaterThan(70);
    expect(x.caveat).toContain("본인 작성 확률");
  });
  it("reduces input evidence for dominant paste without declaring misconduct",()=>{
    const x=calculateProofScore({...base,pasteChars:1400,pasteCount:1,largestPasteChars:1400,observedDirectInputRatio:.22},.9);
    expect(x.inputEvidence).toBeLessThan(calculateProofScore(base,.9).inputEvidence);
  });
});
