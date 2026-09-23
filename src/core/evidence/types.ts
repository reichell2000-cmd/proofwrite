export type EvidenceEventType =
  | "session_start" | "session_end" | "insert" | "delete" | "replace"
  | "paste" | "cut" | "undo" | "redo" | "paragraph_move"
  | "visibility_hidden" | "visibility_visible" | "blur" | "focus"
  | "snapshot" | "submit" | "table_change" | "image_insert" | "link_insert";

export type InputSource = "keyboard" | "paste" | "editor_command" | "unknown";

export interface EvidenceEvent {
  id: string;
  submissionId: string;
  sessionId: string;
  seq: number;
  type: EvidenceEventType;
  at: number;
  source?: InputSource;
  position?: number;
  insertedChars?: number;
  deletedChars?: number;
  selectionLength?: number;
  contentHash?: string;
  payload?: Record<string, unknown>;
}

export interface WritingSnapshot {
  id: string;
  submissionId: string;
  seq: number;
  at: number;
  text: string;
  html?: string;
  wordCount: number;
  charCount: number;
}

export interface RhythmSample {
  at: number;
  dwellMs?: number;
  flightMs?: number;
  burstLength?: number;
  pauseBeforeMs?: number;
  correctionLatencyMs?: number;
}

export interface EvidenceSummary {
  totalElapsedMs: number;
  activeMs: number;
  inactiveMs: number;
  sessionCount: number;
  insertedChars: number;
  deletedChars: number;
  pasteChars: number;
  pasteCount: number;
  largestPasteChars: number;
  revisionCount: number;
  majorRevisionCount: number;
  focusExitCount: number;
  snapshotCount: number;
  observedDirectInputRatio: number | null;
}
