import { describe, it, expect } from "vitest";
import { EditorState } from "@tiptap/pm/state";
import { schema } from "../core/editor/extensions";
import { EMPTY_DOC, type Submission, type SyncBody } from "../core/model";
import { textDelta } from "../core/evidence/replay";
import { mergeSubmission, validateDoc } from "./sync";
import { syncSchema } from "./validation";
const id = crypto.randomUUID(),
  sessionId = crypto.randomUUID();
const draft = (): Submission => ({
  id,
  assignmentId: crypto.randomUUID(),
  alias: "test",
  title: "",
  sources: "",
  doc: EMPTY_DOC,
  events: [],
  snapshots: [],
  rhythm: [],
  rhythmOptIn: false,
  pick: null,
  reflections: [],
  status: "draft",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  review: {
    passages: [],
    fullRead: false,
    reaction: "",
    completed: false,
    updatedAt: 0,
  },
  revision: 0,
});
const request = (): SyncBody => {
  const tr = EditorState.create({ schema }).tr.insertText("학생의 생각", 1);
  const delta = textDelta("", tr.doc.textContent);
  return {
    baseRevision: 0,
    events: [
      {
        id: crypto.randomUUID(),
        submissionId: id,
        sessionId,
        seq: 1,
        type: "insert",
        at: Date.now(),
        source: "composition",
        insertedChars: delta.insert.length,
        deletedChars: 0,
        payload: { steps: tr.steps.map((s) => s.toJSON()), delta },
      },
    ],
    snapshots: [],
    rhythm: [],
    rhythmOptIn: false,
    title: "제목",
    sources: "",
    pick: null,
    reflections: [],
    submit: false,
  };
};
describe("Append-only server synchronization", () => {
  it("replays and persists the student document", () => {
    const next = mergeSubmission(draft(), request());
    expect(next.doc).toMatchObject({
      content: [{ content: [{ text: "학생의 생각" }] }],
    });
    expect(next.revision).toBe(1);
  });
  it("accepts lost-response retries without duplicating events", () => {
    const r = request(),
      next = mergeSubmission(draft(), r);
    expect(mergeSubmission(next, r)).toEqual(next);
  });
  it("rejects conflicting tabs and edited history", () => {
    const r = request(),
      next = mergeSubmission(draft(), r);
    const other = request();
    expect(() => mergeSubmission(next, other)).toThrow("다른 탭");
    const modified = {
      ...r,
      baseRevision: 1,
      events: r.events.map((e) => ({ ...e, type: "paste" as const })),
    };
    expect(() => mergeSubmission(next, modified)).toThrow("다른 탭");
  });
  it("rejects skipped sequences, fabricated counts, bad steps and mismatched snapshots", () => {
    const bad = request();
    bad.events[0].seq = 3;
    expect(() => mergeSubmission(draft(), bad)).toThrow("순서");
    const counts = request();
    counts.events[0].insertedChars = 999;
    expect(() => mergeSubmission(draft(), counts)).toThrow("일치");
    const snap = request();
    snap.snapshots = [
      {
        id: crypto.randomUUID(),
        submissionId: id,
        seq: 1,
        at: Date.now(),
        text: "forged",
        doc: EMPTY_DOC,
        charCount: 6,
        wordCount: 1,
      },
    ];
    expect(() => mergeSubmission(draft(), snap)).toThrow("버전");
  });
  it("rejects arbitrary rhythm properties and unsafe links/images", () => {
    const r = request();
    (r.rhythm as unknown[]).push({ at: Date.now(), key: "sensitive" });
    expect(syncSchema.safeParse(r).success).toBe(false);
    expect(() =>
      validateDoc({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "click",
                marks: [
                  { type: "link", attrs: { href: "javascript:alert(1)" } },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow("http");
    expect(() =>
      validateDoc({
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: "https://tracker.example/image.png" },
          },
        ],
      }),
    ).toThrow("이미지");
  });
  it("requires student selection to belong to submitted text", () => {
    const r = request();
    r.pick = { text: "unrelated", from: 0, to: 9, why: "" };
    expect(() => mergeSubmission(draft(), r)).toThrow("선택 대목");
  });
  it("locks submitted documents", () => {
    const current = draft();
    current.status = "submitted";
    expect(() => mergeSubmission(current, request())).toThrow("제출");
  });
});

describe("ProofMe submission evidence", () => {
  function ready() {
    const r = request();
    r.submit = true;
    r.events.push({
      id: crypto.randomUUID(),
      submissionId: id,
      sessionId,
      seq: 2,
      type: "submit",
      at: r.events[0].at,
    });
    return r;
  }
  it("requires effort evidence and allows submitting without a highlight", () => {
    const r = ready();
    expect(() => mergeSubmission(draft(), r)).toThrow("노력의 증거");
    r.effort = {
      difficulty: "",
      attempt: "다른 사례와 비교했다",
      outcome: "",
      attachments: [],
    };
    const next = mergeSubmission(draft(), r);
    expect(next.status).toBe("submitted");
    expect(next.pick).toBeNull();
    expect(next.submittedAt).toBeGreaterThan(0);
    expect(mergeSubmission(next, r).submittedAt).toBe(next.submittedAt);
  });
  it("preserves new metadata on older clients and rejects stale effort writes", () => {
    const r = request();
    r.effort = {
      difficulty: "",
      attempt: "자료를 비교함",
      outcome: "",
      attachments: [],
    };
    const next = mergeSubmission(draft(), r);
    const stale = { ...r, effort: { ...r.effort, attempt: "다른 시도" } };
    expect(() => mergeSubmission(next, stale)).toThrow("충돌");
    expect(
      mergeSubmission(next, {
        ...r,
        baseRevision: next.revision,
        events: [],
        effort: undefined,
      }).effort,
    ).toEqual(r.effort);
  });
  it("checks attachment bytes, not just extension or supplied MIME", () => {
    const r = ready();
    r.effort = {
      difficulty: "",
      attempt: "",
      outcome: "",
      attachments: [
        {
          id: crypto.randomUUID(),
          name: "notes.pdf",
          mime: "application/pdf",
          size: 6,
          data: "data:application/pdf;base64,PGh0bWw+",
        },
      ],
    };
    expect(() => mergeSubmission(draft(), r)).toThrow("종류나 크기");
    const data = Buffer.from("%PDF-1.4\n%%EOF");
    r.effort.attachments[0] = {
      ...r.effort.attachments[0],
      size: data.length,
      data: `data:application/pdf;base64,${data.toString("base64")}`,
    };
    expect(mergeSubmission(draft(), r).status).toBe("submitted");
  });
});
