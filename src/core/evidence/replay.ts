import { Node } from "@tiptap/pm/model";
import { Step } from "@tiptap/pm/transform";
import { schema } from "../editor/extensions";
import { EMPTY_DOC, type Doc } from "../model";
import type { EvidenceEvent, TextDelta, WritingSnapshot } from "./types";
export const textOf = (doc: Doc) =>
  Node.fromJSON(schema, doc).textBetween(
    0,
    Node.fromJSON(schema, doc).content.size,
    "\n",
    "\uFFFC",
  );
export function textDelta(before: string, after: string): TextDelta {
  let from = 0;
  while (
    from < before.length &&
    from < after.length &&
    before[from] === after[from]
  )
    from++;
  let end = 0;
  while (
    end < before.length - from &&
    end < after.length - from &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  )
    end++;
  return {
    from,
    deleteCount: before.length - from - end,
    insert: after.slice(from, after.length - end),
  };
}
// Preserve the actual replacement range, even when clipboard text equals the
// selected text. A net string diff alone would incorrectly report zero paste.
export function eventTextDelta(
  before: Doc,
  after: Doc,
  steps: unknown[],
): TextDelta {
  const left = textOf(before),
    right = textOf(after);
  const step =
    steps.length === 1
      ? (steps[0] as { stepType?: string; from?: number; to?: number })
      : undefined;
  if (
    step?.stepType === "replace" &&
    Number.isInteger(step.from) &&
    Number.isInteger(step.to)
  ) {
    const node = Node.fromJSON(schema, before);
    if (
      step.from! >= 0 &&
      step.to! >= step.from! &&
      step.to! <= node.content.size
    ) {
      const from = node.textBetween(0, step.from!, "\n", "\uFFFC").length;
      const to = node.textBetween(0, step.to!, "\n", "\uFFFC").length;
      const prefix = left.slice(0, from),
        suffix = left.slice(to);
      if (
        right.startsWith(prefix) &&
        right.endsWith(suffix) &&
        right.length >= prefix.length + suffix.length
      )
        return {
          from,
          deleteCount: to - from,
          insert: right.slice(from, right.length - suffix.length),
        };
    }
  }
  return textDelta(left, right);
}
export function applyEvent(doc: Doc, event: EvidenceEvent): Doc {
  let node = Node.fromJSON(schema, doc);
  const steps = event.payload?.steps;
  if (Array.isArray(steps))
    for (const raw of steps) {
      const result = Step.fromJSON(schema, raw).apply(node);
      if (result.failed || !result.doc)
        throw new Error("문서 변경 기록을 재구성할 수 없습니다.");
      node = result.doc;
    }
  return node.toJSON();
}
export function replayAt(
  events: EvidenceEvent[],
  snapshots: WritingSnapshot[],
  seq: number,
): Doc {
  const snapshot = [...snapshots]
    .filter((s) => s.seq <= seq && s.doc)
    .sort((a, b) => b.seq - a.seq)[0];
  let doc = snapshot?.doc || EMPTY_DOC;
  for (const event of events) {
    if (event.seq > (snapshot?.seq || 0) && event.seq <= seq)
      doc = applyEvent(doc, event);
  }
  return doc;
}
export interface PasteTransformation {
  eventSeq: number;
  pasted: number;
  remaining: number;
  deleted: number;
  laterInserted: number;
  approximate: boolean;
}
export function externalTransformation(
  events: EvidenceEvent[],
): PasteTransformation[] {
  let text = "";
  let origins: (number | null)[] = [];
  const pastes: PasteTransformation[] = [];
  const history: { text: string; origins: (number | null)[] }[] = [
    { text: "", origins: [] },
  ];
  for (const event of events) {
    const delta = event.payload?.delta as TextDelta | undefined;
    if (!delta) continue;
    const next =
      text.slice(0, delta.from) +
      delta.insert +
      text.slice(delta.from + delta.deleteCount);
    const restore = ["undo", "redo"].includes(event.type)
      ? history.findLast((h) => h.text === next)
      : undefined;
    if (
      ["undo", "redo"].includes(event.type) &&
      next === text &&
      delta.deleteCount > 0
    )
      for (const paste of pastes) paste.approximate = true;
    if (restore) origins = [...restore.origins];
    else {
      const removed = origins.slice(delta.from, delta.from + delta.deleteCount);
      for (const paste of pastes)
        if (removed.includes(paste.eventSeq))
          paste.laterInserted += delta.insert.length;
      origins.splice(
        delta.from,
        delta.deleteCount,
        ...Array<number | null>(delta.insert.length).fill(
          event.type === "paste" ? event.seq : null,
        ),
      );
    }
    if (event.type === "paste")
      pastes.push({
        eventSeq: event.seq,
        pasted: delta.insert.length,
        remaining: 0,
        deleted: 0,
        laterInserted: 0,
        approximate: false,
      });
    if (event.type === "paragraph_move")
      for (const p of pastes) p.approximate = true;
    text = next;
    history.push({ text, origins: [...origins] });
    // Bound transient provenance memory; old undo targets become explicitly approximate.
    if (history.length > 100) history.splice(0, 1);
    if (["undo", "redo"].includes(event.type) && !restore)
      for (const p of pastes) p.approximate = true;
  }
  for (const p of pastes) {
    p.remaining = origins.filter((n) => n === p.eventSeq).length;
    p.deleted = Math.max(0, p.pasted - p.remaining);
  }
  return pastes;
}
