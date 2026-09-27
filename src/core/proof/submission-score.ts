import type { Submission } from "../model";
import { summarizeEvidence } from "../evidence/summarize";
import { observeRhythm } from "../my-proof/observation";
import { calculateProofScore } from "./score";
export function submissionScore(s: Submission) {
  const rhythm = observeRhythm(s).continuity;
  return calculateProofScore(summarizeEvidence(s.events), rhythm);
}
