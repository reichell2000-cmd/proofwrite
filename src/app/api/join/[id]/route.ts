import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  csrf,
  equal,
  rateLimit,
  setSession,
  valid,
} from "../../../../server/auth";
import { HttpError, read, write, locked } from "../../../../server/store";
import { body, handler } from "../../../../server/validation";
import {
  type Assignment,
  type Submission,
  EMPTY_DOC,
} from "../../../../core/model";
export const runtime = "nodejs";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handler(async () => {
    csrf(req);
    rateLimit("join", 120);
    const data = z
      .object({
        code: z.string(),
        alias: z.string().trim().min(1).max(60),
        consent: z.literal(true),
        resumeId: z.string().uuid().optional(),
      })
      .parse(await body(req));
    const assignment = await read<Assignment>("assignments", id);
    if (!equal(data.code, assignment.joinCode))
      throw new HttpError(403, "참여 링크를 확인해주세요.");
    if (
      data.resumeId &&
      valid(
        (await cookies()).get(`pw_s_${data.resumeId}`)?.value,
        `student:${data.resumeId}`,
      )
    ) {
      const old = await read<Submission>("submissions", data.resumeId);
      if (old.assignmentId === id) return { id: old.id };
    }
    const submission: Submission = {
      id: randomUUID(),
      assignmentId: id,
      alias: data.alias,
      title: "",
      sources: "",
      doc: EMPTY_DOC,
      events: [],
      snapshots: [],
      rhythm: [],
      rhythmOptIn: false,
      pick: null,
      reflections: assignment.questions.map(() => ""),
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
    };
    await locked(() => write("submissions", submission.id, submission));
    await setSession(`pw_s_${submission.id}`, `student:${submission.id}`);
    return { id: submission.id };
  })(req);
}
