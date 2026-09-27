import { requireTeacher } from "../../../../server/auth";
import { read, list } from "../../../../server/store";
import { handler } from "../../../../server/validation";
import type { Assignment, Submission } from "../../../../core/model";
import { submissionScore } from "../../../../core/proof/submission-score";
import { buildReadingGuide } from "../../../../core/teacher/reading-guide";
import { readingProgress } from "../../../../core/teacher/review-progress";
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
        submittedAt: s.submittedAt,
        review: s.review,
        hasPick: !!s.pick,
        score: s.status === "submitted" ? submissionScore(s) : null,
        reading: readingProgress(
          assignment,
          s.review,
          buildReadingGuide(s.events, s.snapshots, s.pick?.text, {
            doc: s.doc,
            priorities: assignment.contentPriorities,
          }),
        ),
      }));
    return { assignment, submissions };
  })(req);
}
