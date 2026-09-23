# ProofWrite FREE v0.1 architecture

## Core pipeline
Editor → Evidence Collector → immutable-ish event stream → snapshots → Evidence Summary → Thought Trace / My Proof prototype → Proof Score → Timeline/Replay → Teacher Reading Guide.

## Evidence rules
- Collect only inside the ProofWrite editor.
- Never treat focus loss as proof of external AI use.
- Preserve observed facts separately from interpretations.
- Do not store raw key values for My Proof. Derive timing features (flight/dwell/burst/correction) and minimize retention.
- Paste is evidence of external text insertion, not evidence of misconduct.
- Proof Score is evidence sufficiency, never authorship probability.

## Proof Score v0.1
Weights are provisional and MUST be calibrated during pilot:
- Thought Trace 30
- My Proof 25
- Input Evidence 20
- Revision Evidence 15
- Process Continuity 10

A low score only routes a submission to human review.

## Teacher Reading Guide
The product should reduce indiscriminate reading, not remove teacher reading. Default recommendation: at least two passages per student, including the student's own selected passage when present.

## Privacy
No system-wide keylogger. No collection from other tabs/apps. My Proof long-term identity modeling is feature-flagged off until privacy/legal/false-positive validation.
