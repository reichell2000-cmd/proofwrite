import { requireTeacher } from "../../../../server/auth";
import { read, list } from "../../../../server/store";
import { handler } from "../../../../server/validation";
import type { Assignment, Submission } from "../../../../core/model";
import { summarizeEvidence } from "../../../../core/evidence/summarize";
import { submissionScore } from "../../../../core/proof/submission-score";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handler(async () => {
    await requireTeacher();
    const assignment = await read<Assignment>("assignments", id);
    const submissions = (await list<Submission>("submissions"))
      .filter((s) => s.assignmentId === id)
      .map((s) => ({
        id: s.id,
        alias: s.alias,
        title: s.title,
        status: s.status,
        updatedAt: s.updatedAt,
        review: s.review,
        score: submissionScore(s),
        hasPick: !!s.pick,
      }));
    return { assignment, submissions };
  })(req);
}
