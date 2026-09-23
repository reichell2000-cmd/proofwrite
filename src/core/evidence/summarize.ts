import { EvidenceEvent, EvidenceSummary } from "./types";

const ACTIVE_GAP_MS = 60_000;

export function summarizeEvidence(events: EvidenceEvent[]): EvidenceSummary {
  const xs = [...events].sort((a,b)=>a.at-b.at || a.seq-b.seq);
  let activeMs=0, inserted=0, deleted=0, pasteChars=0, pasteCount=0;
  let largestPaste=0, revisions=0, major=0, exits=0, snapshots=0;
  const sessions=new Set<string>();
  for (let i=0;i<xs.length;i++) {
    const e=xs[i]; sessions.add(e.sessionId);
    if(i>0) activeMs += Math.min(ACTIVE_GAP_MS, Math.max(0,e.at-xs[i-1].at));
    inserted += e.insertedChars ?? 0; deleted += e.deletedChars ?? 0;
    if(e.type==="paste"){ const n=e.insertedChars??0; pasteChars+=n; pasteCount++; largestPaste=Math.max(largestPaste,n); }
    if(["delete","replace","paragraph_move"].includes(e.type)) revisions++;
    if(e.type==="replace" && ((e.insertedChars??0)+(e.deletedChars??0)>=120)) major++;
    if(e.type==="visibility_hidden" || e.type==="blur") exits++;
    if(e.type==="snapshot") snapshots++;
  }
  const total = xs.length>1 ? xs[xs.length-1].at-xs[0].at : 0;
  const direct=Math.max(0,inserted-pasteChars);
  return {
    totalElapsedMs:total, activeMs, inactiveMs:Math.max(0,total-activeMs),
    sessionCount:sessions.size, insertedChars:inserted, deletedChars:deleted,
    pasteChars, pasteCount, largestPasteChars:largestPaste,
    revisionCount:revisions, majorRevisionCount:major, focusExitCount:exits,
    snapshotCount:snapshots,
    observedDirectInputRatio: inserted>0 ? direct/inserted : null
  };
}
