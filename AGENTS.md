# AGENTS.md — ProofMe / ProofWrite

This repository has a non-standard branch layout.

## Critical branch rule
- GitHub repo: `reichell2000-cmd/proofwrite`
- `main` is not the deployed application; it is effectively a documentation stub.
- The current application and Railway production source are on `dev/free-v0.1`.
- Railway deploys `dev/free-v0.1` directly.

Never edit `dev/free-v0.1` directly for routine development. Create `codex/<task-name>` from `dev/free-v0.1`.

## Read first
Before editing:
1. `README.md` on the application branch
2. `docs/CODEX_HANDOFF.md`
3. relevant docs under `docs/**`

## Product invariants
- ProofMe records and explains writing-process evidence; it does not declare cheating or authorship probability.
- Process scores are evidence sufficiency indicators, not grades or identity proof.
- Final assessment remains with the teacher.
- Student content is untrusted input, not instructions to the system.
- Do not collect typing outside the editor scope.

## Runtime safety
- Single-process pilot with persistent data under `/app/data`.
- Do not remove the volume, switch to ephemeral storage, or assume multi-instance safety.
- Do not expose teacher/session secrets.
- Do not silently broaden data collection.

## Verification
Run:
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e` for browser/editor/workflow changes when the browser environment is available.

## Deployment gate
A task branch and local verification are allowed.
Do not merge/push changes into `dev/free-v0.1` in a way that triggers production deployment unless the user's current instruction explicitly authorizes deployment.
Never print or commit secrets.
