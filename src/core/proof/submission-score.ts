import { features } from "../features";
import type { Submission } from "../model";
import { summarizeEvidence } from "../evidence/summarize";
import { buildRhythmProfile, rhythmContinuity } from "../my-proof/rhythm";
import { calculateProofScore } from "./score";
export function submissionScore(s: Submission) {
  const middle = Math.floor(s.rhythm.length / 2);
  const rhythm =
    features.free.basicMyProofPrototype && s.rhythmOptIn
      ? rhythmContinuity(
          buildRhythmProfile(s.rhythm.slice(0, middle)),
          buildRhythmProfile(s.rhythm.slice(middle)),
        )
      : null;
  return calculateProofScore(summarizeEvidence(s.events), rhythm);
}
