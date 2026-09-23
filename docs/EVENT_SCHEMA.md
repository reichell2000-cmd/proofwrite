# Event schema v0.1

Every event has: id, submissionId, sessionId, monotonic seq, timestamp, type, optional position/counts/hash/payload.

Priority events:
session_start/end; insert/delete/replace; paste/cut; undo/redo; paragraph_move; focus/blur; visibility_hidden/visible; snapshot; submit; table/image/link changes.

## Snapshot policy
Take snapshots on meaningful checkpoints, not every keystroke:
- periodic dirty checkpoint
- session end
- before/after major paste or structural edit
- submit

## My Proof prototype
Store derived timing features rather than typed characters:
- flight interval
- dwell interval where technically reliable
- burst length
- pause-before-burst
- correction latency
Do not expose a "same person %" in v0.1.
