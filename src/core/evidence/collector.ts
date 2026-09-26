import type { EvidenceEvent, EvidenceEventType, RhythmSample } from "./types";
export class EvidenceCollector {
  private mode: "direct" | "composition" = "direct";
  private lastDown: number | null = null;
  private burst = 0;
  private held: number | null = null;
  private rhythm: RhythmSample[] = [];
  constructor(
    private submissionId: string,
    private sessionId: string,
    private emit: (e: EvidenceEvent) => void,
    private seq = 0,
  ) {}
  record(
    type: EvidenceEventType,
    data: Partial<
      Omit<
        EvidenceEvent,
        "id" | "submissionId" | "sessionId" | "seq" | "type" | "at"
      >
    > = {},
    at = Date.now(),
  ) {
    const e: EvidenceEvent = {
      ...data,
      id: crypto.randomUUID(),
      submissionId: this.submissionId,
      sessionId: this.sessionId,
      seq: ++this.seq,
      type,
      at,
    };
    this.emit(e);
    return e;
  }
  // Bound only to editor DOM. No key/code/string values are retained.
  keyDown(
    at = performance.now(),
    correction = false,
    mode: "direct" | "composition" = "direct",
  ) {
    if (mode !== this.mode) this.resetRhythm();
    this.mode = mode;
    const flight =
      this.lastDown === null ? undefined : Math.max(0, at - this.lastDown);
    this.burst = flight !== undefined && flight < 1200 ? this.burst + 1 : 1;
    this.rhythm.push({
      at: Date.now(),
      mode,
      flightMs: flight,
      burstLength: this.burst,
      pauseBeforeMs:
        flight !== undefined && flight >= 1200 ? flight : undefined,
      correctionLatencyMs: correction ? flight : undefined,
    });
    this.lastDown = at;
    this.held = at;
  }
  keyUp(at = performance.now()) {
    const last = this.rhythm.at(-1);
    if (last && this.held !== null) last.dwellMs = Math.max(0, at - this.held);
    this.held = null;
  }
  resetRhythm() {
    this.lastDown = null;
    this.held = null;
    this.burst = 0;
  }
  drainRhythm() {
    const samples = this.rhythm;
    this.rhythm = [];
    return samples;
  }
  rhythmFeatures() {
    return [...this.rhythm];
  }
  attachDocumentSignals() {
    const visibility = () => {
      this.resetRhythm();
      this.record(document.hidden ? "visibility_hidden" : "visibility_visible");
    };
    const blur = () => {
      this.resetRhythm();
      this.record("blur");
    };
    const focus = () => this.record("focus");
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
    };
  }
}
