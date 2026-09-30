import { csrf, requireTeacher, rateLimit } from "../../../../../server/auth";
import { read, HttpError } from "../../../../../server/store";
import { handler } from "../../../../../server/validation";
import { prepareReviewDraft } from "../../../../../server/review-draft";
import type { Assignment, Submission } from "../../../../../core/model";
export const runtime = "nodejs";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handler(async () => {
    csrf(req);
    await requireTeacher();
    rateLimit("review-draft", 60);
    const s = await read<Submission>("submissions", id);
    if (s.status !== "submitted")
      throw new HttpError(400, "제출된 과제만 검토할 수 있습니다.");
    const a = await read<Assignment>("assignments", s.assignmentId);
    return { draft: await prepareReviewDraft(s, a) };
  })(req);
}
