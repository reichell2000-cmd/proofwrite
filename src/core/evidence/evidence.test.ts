import { describe, it, expect } from "vitest";
import { EditorState } from "@tiptap/pm/state";
import { schema } from "../editor/extensions";
import {
  applyEvent,
  eventTextDelta,
  externalTransformation,
  replayAt,
  textDelta,
  textOf,
} from "./replay";
import { summarizeEvidence } from "./summarize";
import { EvidenceCollector } from "./collector";
import { EMPTY_DOC } from "../model";
import type { EvidenceEvent, EvidenceEventType } from "./types";
let seq = 0;
const event = (
  type: EvidenceEventType,
  at: number,
  data: Partial<EvidenceEvent> = {},
): EvidenceEvent => ({
  id: crypto.randomUUID(),
  submissionId: "document",
  sessionId: "session",
  seq: ++seq,
  at,
  type,
  ...data,
});
describe("Observed evidence", () => {
  it("does not count snapshots, hidden intervals or gaps between sessions as activity", () => {
    const xs = [
      event("session_start", 0),
      event("insert", 1000, { source: "keyboard", insertedChars: 1 }),
      event("insert", 2000, { source: "keyboard", insertedChars: 1 }),
      event("blur", 3000),
      event("visibility_hidden", 3100),
      event("snapshot", 30000),
      event("visibility_visible", 90000),
      event("focus", 91000),
      event("insert", 92000, { source: "keyboard", insertedChars: 1 }),
      event("session_end", 93000),
      event("session_start", 300000, { sessionId: "session-2" }),
      event("insert", 301000, {
        sessionId: "session-2",
        source: "keyboard",
        insertedChars: 1,
      }),
    ];
    const s = summarizeEvidence(xs);
    expect(s.activeMs).toBe(1000);
    expect(s.focusExitCount).toBe(1);
    expect(s.focusAwayMs).toBe(88000);
    expect(s.sessionCount).toBe(2);
  });
  it("does not classify undo or unknown insertion as direct input", () => {
    const s = summarizeEvidence([
      event("insert", 1, { source: "keyboard", insertedChars: 5 }),
      event("paste", 2, { source: "paste", insertedChars: 5 }),
      event("undo", 3, { source: "editor_command", insertedChars: 10 }),
    ]);
    expect(s.observedDirectInputRatio).toBe(0.25);
  });
  it("keeps globally increasing sequence on resumed collectors and stores no keys", () => {
    const out: EvidenceEvent[] = [];
    const c = new EvidenceCollector("a", "b", (e) => out.push(e), 22);
    c.record("session_start");
    c.keyDown(20);
    c.keyUp(80);
    c.keyDown(180);
    expect(out[0].seq).toBe(23);
    expect(c.rhythmFeatures()[1].flightMs).toBe(160);
    expect(Object.keys(c.rhythmFeatures()[0])).not.toContain("key");
  });
  it("reconstructs a Unicode document exactly from steps", () => {
    const initial = schema.nodeFromJSON(EMPTY_DOC);
    const tr = EditorState.create({ schema, doc: initial }).tr.insertText(
      "한글과 🦋의 생각",
      1,
    );
    const delta = textDelta("", tr.doc.textContent);
    const e = event("insert", 1, {
      insertedChars: delta.insert.length,
      deletedChars: 0,
      payload: { steps: tr.steps.map((x) => x.toJSON()), delta },
    });
    expect(textOf(applyEvent(EMPTY_DOC, e))).toBe("한글과 🦋의 생각");
    expect(replayAt([e], [], e.seq)).toEqual(tr.doc.toJSON());
    expect(replayAt([e], [], 0)).toEqual(EMPTY_DOC);
  });
  it("tracks paste deletion, replacement and undo restoration", () => {
    const a = event("paste", 1, {
      payload: { delta: { from: 0, deleteCount: 0, insert: "abcde" } },
    });
    const b = event("replace", 2, {
      payload: { delta: { from: 1, deleteCount: 2, insert: "XY" } },
    });
    expect(externalTransformation([a, b])[0]).toMatchObject({
      pasted: 5,
      remaining: 3,
      deleted: 2,
      laterInserted: 2,
    });
    const undo = event("undo", 3, {
      payload: { delta: { from: 1, deleteCount: 2, insert: "bc" } },
    });
    expect(externalTransformation([a, b, undo])[0].remaining).toBe(5);
  });
  it("marks moved paste provenance as approximate", () => {
    const a = event("paste", 1, {
      payload: { delta: { from: 0, deleteCount: 0, insert: "first\nsecond" } },
    });
    const b = event("paragraph_move", 2, {
      payload: { delta: textDelta("first\nsecond", "second\nfirst") },
    });
    expect(externalTransformation([a, b])[0].approximate).toBe(true);
  });
});

it("counts replacement paste even when the resulting text is identical", () => {
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "same text" }] },
    ],
  });
  const tr = EditorState.create({ schema, doc }).tr.insertText(
    "same text",
    1,
    10,
  );
  const delta = eventTextDelta(
    doc.toJSON(),
    tr.doc.toJSON(),
    tr.steps.map((s) => s.toJSON()),
  );
  expect(delta).toEqual({ from: 0, deleteCount: 9, insert: "same text" });
  const first = event("insert", 1, {
    payload: { delta: { from: 0, deleteCount: 0, insert: "same text" } },
  });
  const pasted = event("paste", 2, { payload: { delta } });
  expect(externalTransformation([first, pasted])[0]).toMatchObject({
    pasted: 9,
    remaining: 9,
  });
});
