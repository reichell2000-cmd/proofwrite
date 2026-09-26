import { requireReader, isTeacher } from "../../../../server/auth";
import { read } from "../../../../server/store";
import { handler } from "../../../../server/validation";
import type { Assignment, Submission } from "../../../../core/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handler(async () => {
    await requireReader(id);
    const submission = await read<Submission>("submissions", id);
    const assignment = await read<Assignment>(
      "assignments",
      submission.assignmentId,
    );
    const { joinCode, ...publicAssignment } = assignment;
    void joinCode;
    // Intermediate teacher notes are not published feedback.
    if (!(await isTeacher()) && !submission.review.completed) {
      submission.review = {
        passages: [],
        fullRead: false,
        reaction: "",
        completed: false,
        updatedAt: 0,
      };
    }
    return { submission, assignment: publicAssignment };
  })(req);
}
