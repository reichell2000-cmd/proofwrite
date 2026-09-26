import { findRhythmBaseline } from "../../../../../server/rhythm-baseline";
import { csrf, requireStudent } from "../../../../../server/auth";
import { read, write, locked } from "../../../../../server/store";
import { handler, body, syncSchema } from "../../../../../server/validation";
import { mergeSubmission } from "../../../../../server/sync";
import type { Submission } from "../../../../../core/model";
export const runtime = "nodejs";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handler(async () => {
    csrf(req);
    await requireStudent(id);
    const request = syncSchema.parse(await body(req));
    return locked(async () => {
      const current = await read<Submission>("submissions", id);
      const next = mergeSubmission(current, request);
      if (
        next.rhythmOptIn &&
        !next.rhythmBaseline &&
        current.status === "draft"
      )
        next.rhythmBaseline = await findRhythmBaseline(next);
      if (!next.rhythmOptIn) delete next.rhythmBaseline;
      await write("submissions", id, next);
      return {
        ackSeq: next.events.at(-1)?.seq || 0,
        revision: next.revision,
        status: next.status,
        submittedAt: next.submittedAt,
        rhythmBaseline: next.rhythmBaseline,
      };
    });
  })(req);
}
