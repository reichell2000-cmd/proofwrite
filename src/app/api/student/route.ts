import { cookies } from "next/headers";
import { valid } from "../../../server/auth";
import { HttpError, read } from "../../../server/store";
import { handler } from "../../../server/validation";
import type { Assignment, Submission } from "../../../core/model";
import { fiveEvidence } from "../../../core/proof/five-evidence";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handler(async () => {
  const jar = await cookies();
  const ids = jar
    .getAll()
    .filter(
      (c) =>
        /^pw_s_[a-f0-9-]{36}$/.test(c.name) &&
        valid(c.value, `student:${c.name.slice(5)}`),
    )
    .map((c) => c.name.slice(5));
  const tasks = [];
  for (const id of ids) {
    try {
      const s = await read<Submission>("submissions", id);
      const a = await read<Assignment>("assignments", s.assignmentId);
      tasks.push({
        id: s.id,
        title: a.title,
        alias: s.alias,
        status: s.status,
        updatedAt: s.updatedAt,
        dueAt: a.dueAt,
        feedbackReady: s.review.completed,
        responded:
          !!s.learningResponse &&
          s.learningResponse.reviewUpdatedAt === s.review.updatedAt,
        axes: fiveEvidence(s, a),
      });
    } catch (e) {
      if (!(e instanceof HttpError && e.status === 404)) throw e;
    }
  }
  return { tasks: tasks.sort((a, b) => b.updatedAt - a.updatedAt) };
});
