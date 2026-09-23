import { csrf, requireTeacher } from "../../../../../server/auth";
import { HttpError, read, write, locked } from "../../../../../server/store";
import { handler, body, reviewSchema } from "../../../../../server/validation";
import { buildReadingGuide } from "../../../../../core/teacher/reading-guide";
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
    const review = reviewSchema.parse(await body(req));
    return locked(async () => {
      const current = await read<Submission>("submissions", id);
      if (current.status !== "submitted")
        throw new HttpError(400, "제출된 문서만 검토할 수 있습니다.");
      const assignment = await read<Assignment>(
        "assignments",
        current.assignmentId,
      );
      const guide = buildReadingGuide(
        current.events,
        current.snapshots,
        current.pick?.text,
      );
      const ids = new Set(guide.map((g) => g.id));
      const passages = [...new Set(review.passages)].filter((p) => ids.has(p));
      if (
        review.completed &&
        !(
          review.fullRead ||
          (!assignment.fullRead && passages.length >= assignment.minRead)
        )
      )
        throw new HttpError(
          400,
          "설정된 최소 대목을 읽고 확인해주세요. 대목이 적으면 전체 글을 읽어주세요.",
        );
      current.review = { ...review, passages, updatedAt: Date.now() };
      await write("submissions", id, current);
      return { review: current.review };
    });
  })(req);
}
