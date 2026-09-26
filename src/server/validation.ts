import { z } from "zod";
import { HttpError } from "./store";
export const assignmentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(6000),
  dueAt: z.number().int().positive().nullable().optional(),
  contentPriorities: z
    .array(
      z.enum([
        "argument",
        "perspective",
        "interpretation",
        "logic",
        "application",
      ]),
    )
    .min(1)
    .max(5)
    .optional(),
  learningGoal: z.string().trim().max(600).default(""),
  successCriteria: z
    .array(z.string().trim().min(1).max(250))
    .max(4)
    .default([]),
  policy: z.enum(["SOLO", "RESEARCH", "COACH", "COLLAB"]),
  minRead: z.number().int().min(1).max(10),
  fullRead: z.boolean(),
  questions: z.array(z.string().trim().min(1).max(250)).max(8),
});
const eventTypes = [
  "session_start",
  "session_end",
  "insert",
  "delete",
  "replace",
  "paste",
  "cut",
  "undo",
  "redo",
  "paragraph_move",
  "format",
  "visibility_hidden",
  "visibility_visible",
  "blur",
  "focus",
  "snapshot",
  "submit",
  "table_change",
  "image_insert",
  "link_insert",
] as const;
const event = z
  .object({
    id: z.string().uuid(),
    submissionId: z.string().uuid(),
    sessionId: z.string().uuid(),
    seq: z.number().int().positive(),
    type: z.enum(eventTypes),
    at: z.number().finite().nonnegative(),
    source: z
      .enum(["keyboard", "paste", "editor_command", "unknown", "composition"])
      .optional(),
    position: z.number().int().nonnegative().optional(),
    insertedChars: z.number().int().nonnegative().optional(),
    deletedChars: z.number().int().nonnegative().optional(),
    payload: z.record(z.unknown()).optional(),
  })
  .strict();
const snapshot = z
  .object({
    id: z.string().uuid(),
    submissionId: z.string().uuid(),
    seq: z.number().int().positive(),
    at: z.number().finite(),
    text: z.string().max(50000),
    doc: z.record(z.unknown()).optional(),
    wordCount: z.number().int().nonnegative(),
    charCount: z.number().int().nonnegative(),
  })
  .strict();
const rhythm = z
  .object({
    at: z.number().finite(),
    mode: z.enum(["direct", "composition"]).optional(),
    dwellMs: z.number().finite().min(0).max(60000).optional(),
    flightMs: z.number().finite().min(0).max(86400000).optional(),
    burstLength: z.number().int().min(1).max(100000).optional(),
    pauseBeforeMs: z.number().finite().min(0).max(86400000).optional(),
    correctionLatencyMs: z.number().finite().min(0).max(86400000).optional(),
  })
  .strict();
const effortSchema = z
  .object({
    difficulty: z.string().max(2000),
    attempt: z.string().max(3000),
    outcome: z.string().max(2000),
    attachments: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            name: z.string().min(1).max(180),
            mime: z.enum([
              "application/pdf",
              "image/png",
              "image/jpeg",
              "image/webp",
            ]),
            size: z.number().int().positive().max(524288),
            data: z.string().max(700000),
          })
          .strict(),
      )
      .max(3),
  })
  .strict();
export const syncSchema = z
  .object({
    baseRevision: z.number().int().nonnegative(),
    events: z.array(event).max(3000),
    snapshots: z.array(snapshot).max(100),
    rhythm: z.array(rhythm).max(10000),
    rhythmOptIn: z.boolean(),
    title: z.string().trim().max(160),
    sources: z.string().max(6000),
    effort: effortSchema.optional(),
    pick: z
      .object({
        text: z.string().min(1).max(1500),
        why: z.string().max(1000),
        from: z.number().int().nonnegative(),
        to: z.number().int().nonnegative(),
      })
      .nullable(),
    reflections: z.array(z.string().max(3000)).max(8),
    submit: z.boolean(),
  })
  .strict();
export const feedbackSchema = z
  .object({
    quote: z.string().trim().max(1500),
    strength: z.string().trim().max(2000),
    question: z.string().trim().max(1000),
    nextStep: z.string().trim().max(2000),
  })
  .strict();
export const learningResponseSchema = z
  .object({
    reviewUpdatedAt: z.number().int().positive(),
    baseVersion: z.number().int().nonnegative(),
    revisedExcerpt: z.string().trim().max(3000),
    explanation: z.string().trim().min(1).max(2000),
  })
  .strict();
export const reviewSchema = z
  .object({
    passages: z.array(z.string().max(80)).max(30),
    fullRead: z.boolean(),
    reaction: z.enum([
      "",
      "잘 읽었어요",
      "좋은 생각이에요",
      "여기 조금 더 이야기해볼까요?",
      "수업에서 함께 이야기합시다",
    ]),
    completed: z.boolean(),
    feedback: feedbackSchema.optional(),
  })
  .strict();
export async function body(req: Request) {
  const text = await req.text();
  if (text.length > 4_000_000)
    throw new HttpError(413, "한 번에 저장할 수 있는 크기를 초과했습니다.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "요청 형식이 올바르지 않습니다.");
  }
}
export function handler(fn: (req: Request) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      const result = await fn(req);
      return Response.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (e) {
      if (e instanceof z.ZodError)
        return Response.json(
          {
            error: "입력값을 확인해주세요.",
            details: e.issues.map((i) => i.path.join(".")),
          },
          { status: 400 },
        );
      if (e instanceof HttpError)
        return Response.json({ error: e.message }, { status: e.status });
      console.error(
        "ProofWrite request failed",
        e instanceof Error ? e.name : "unknown",
      );
      return Response.json(
        { error: "요청을 처리하지 못했습니다. 다시 시도해주세요." },
        { status: 500 },
      );
    }
  };
}
