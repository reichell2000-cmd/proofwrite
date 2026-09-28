# Codex handoff — ProofMe / ProofWrite

Updated: 2026-09-28

## Branch layout
This is the most important fact:
- `main`: currently only the early README/stub
- `dev/free-v0.1`: actual working application and the branch Railway deploys
- safe orientation branch created from the application branch: `codex/safe-handoff-20260928`

When starting a new task, branch from the current `dev/free-v0.1`, not from `main`.

## Runtime/deployment
Railway project: `proofwrite-pilot`
Service: `proofwrite`
Source: `reichell2000-cmd/proofwrite`, branch `dev/free-v0.1`
Builder: Dockerfile
Healthcheck: `/`
Persistent volume: `/app/data`
Public domain: `proofwrite-production.up.railway.app`

Latest observed deployment on 2026-09-28: SUCCESS.

## Application structure
The application branch contains:
- `src/**`
- `docs/**`
- `scripts/**`
- `tests/**`
- Playwright and Vitest configuration
- Dockerfile and persistent-data configuration

## Product role
ProofMe is the teacher/student assignment workflow:
- teacher creates/publishes an assignment,
- student writes inside the instrumented editor,
- process evidence and versions are stored,
- teacher reads the submission and evidence,
- teacher finalizes feedback/evaluation.

It must not turn process evidence into a definitive cheating/AI-use verdict.

## Verification
Normal code gate:
`npm run typecheck && npm test && npm run build`

Browser/editor/workflow changes:
`npm run test:e2e`
when a browser is available.

## Production caution
Because Railway watches `dev/free-v0.1`, pushing directly to that branch is effectively a deployment action. Keep ordinary Codex work on a separate task branch until the user explicitly requests merge/deploy.
