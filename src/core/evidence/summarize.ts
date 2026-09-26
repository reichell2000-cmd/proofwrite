import type { EvidenceEvent, EvidenceSummary } from "./types";
const EDITS = new Set([
  "insert",
  "delete",
  "replace",
  "paste",
  "cut",
  "undo",
  "redo",
  "format",
  "paragraph_move",
  "table_change",
  "image_insert",
  "link_insert",
]);
export function summarizeEvidence(events: EvidenceEvent[]): EvidenceSummary {
  const xs = [...events].sort((a, b) => a.seq - b.seq);
  let activeMs = 0,
    inserted = 0,
    deleted = 0,
    pasteChars = 0,
    pasteCount = 0,
    largestPaste = 0,
    revisions = 0,
    major = 0,
    exits = 0,
    snapshots = 0,
    awayMs = 0,
    awayAt: number | null = null;
  let hidden = false,
    blurred = false,
    lastEdit: EvidenceEvent | undefined,
    longPauses = 0;
  const sessions = new Set<string>();
  for (const e of xs) {
    sessions.add(e.sessionId);
    inserted += e.insertedChars ?? 0;
    deleted += e.deletedChars ?? 0;
    const wasAway = hidden || blurred;
    if (e.type === "session_start") {
      hidden = false;
      blurred = false;
      lastEdit = undefined;
    }
    if (e.type === "blur") blurred = true;
    if (e.type === "visibility_hidden") hidden = true;
    if (e.type === "focus") blurred = false;
    if (e.type === "visibility_visible") hidden = false;
    if (!wasAway && (hidden || blurred)) {
      exits++;
      awayAt = e.at;
      lastEdit = undefined;
    }
    if (wasAway && !(hidden || blurred) && awayAt !== null) {
      awayMs += Math.max(0, e.at - awayAt);
      awayAt = null;
    }
    if (e.type === "session_end") {
      if (awayAt !== null) awayMs += Math.max(0, e.at - awayAt);
      awayAt = null;
      lastEdit = undefined;
      hidden = false;
      blurred = false;
    }
    if (EDITS.has(e.type) && !(hidden || blurred)) {
      if (lastEdit?.sessionId === e.sessionId) {
        const gap = Math.max(0, e.at - lastEdit.at);
        if (gap <= 60_000) activeMs += gap;
        else longPauses++;
      }
      lastEdit = e;
    }
    if (e.type === "paste") {
      const n = e.insertedChars ?? 0;
      pasteChars += n;
      pasteCount++;
      largestPaste = Math.max(largestPaste, n);
    }
    if (["delete", "replace", "cut", "paragraph_move"].includes(e.type))
      revisions++;
    if (
      (e.deletedChars ?? 0) > 0 &&
      (e.deletedChars ?? 0) + (e.insertedChars ?? 0) >= 120
    )
      major++;
    if (e.type === "snapshot") snapshots++;
  }
  if (awayAt !== null && xs.length)
    awayMs += Math.max(0, xs.at(-1)!.at - awayAt);
  const total = xs.length > 1 ? Math.max(0, xs.at(-1)!.at - xs[0].at) : 0;
  const direct = xs
    .filter((e) => e.source === "keyboard" || e.source === "composition")
    .reduce((n, e) => n + (e.insertedChars ?? 0), 0);
  const count = (type: string) => xs.filter((e) => e.type === type).length;
  return {
    totalElapsedMs: total,
    activeMs,
    inactiveMs: Math.max(0, total - activeMs),
    sessionCount: sessions.size,
    insertedChars: inserted,
    deletedChars: deleted,
    pasteChars,
    pasteCount,
    largestPasteChars: largestPaste,
    revisionCount: revisions,
    majorRevisionCount: major,
    focusExitCount: exits,
    snapshotCount: snapshots,
    observedDirectInputRatio: inserted ? direct / inserted : null,
    focusAwayMs: awayMs,
    undoCount: count("undo"),
    redoCount: count("redo"),
    paragraphMoveCount: count("paragraph_move"),
    tableChangeCount: count("table_change"),
    imageCount: count("image_insert"),
    linkCount: count("link_insert"),
    longPauseCount: longPauses,
  };
}
