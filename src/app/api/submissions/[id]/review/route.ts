import { csrf, requireTeacher } from "../../../../../server/auth";
import { HttpError, read, write, locked } from "../../../../../server/store";
import { handler, body, reviewSchema } from "../../../../../server/validation";
import { buildReadingGuide } from "../../../../../core/teacher/reading-guide";
import type { Assignment, Submission } from "../../../../../core/model";
import { textOf } from "../../../../../core/evidence/replay";
import { readingProgress } from "../../../../../core/teacher/review-progress";
import { gradeError, gradeTotal } from "../../../../../core/assessment";
export const runtime = "nodejs";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handler(async () => {
    csrf(req);
    await requireTeacher();
    const { baseReviewUpdatedAt, ...review } = reviewSchema.parse(
      await body(req),
    );
    return locked(async () => {
      const current = await read<Submission>("submissions", id);
      if (current.status !== "submitted")
        throw new HttpError(400, "제출된 문서만 검토할 수 있습니다.");
      const assignment = await read<Assignment>(
        "assignments",
        current.assignmentId,
      );
      const plan = current.assessment || assignment.assessment;
      if (plan && baseReviewUpdatedAt !== current.review.updatedAt)
        throw new HttpError(
          409,
          "다른 창에서 평가가 변경되었습니다. 새로고침 후 다시 확인해주세요.",
        );
      if (plan && review.completed) {
        const issue = gradeError(plan, review.assessment);
        if (issue) throw new HttpError(400, issue);
      }
      const guide = buildReadingGuide(
        current.events,
        current.snapshots,
        current.pick?.text,
        { doc: current.doc, priorities: assignment.contentPriorities },
      );
      const progress = readingProgress(assignment, review, guide);
      const passages = progress.passages;
      if (review.completed && !progress.fulfilled)
        throw new HttpError(
          400,
          "설정된 최소 대목을 읽고 확인해주세요. 대목이 적으면 전체 글을 읽어주세요.",
        );
      if (review.completed) {
        const feedback = review.feedback;
        if (!feedback?.quote || !feedback.strength || !feedback.nextStep)
          throw new HttpError(
            400,
            "글의 대목, 잘된 점과 이유, 다음에 해볼 수정 한 가지를 남겨주세요.",
          );
        if (!textOf(current.doc).includes(feedback.quote))
          throw new HttpError(
            400,
            "피드백의 대목은 제출된 본문에서 그대로 가져와주세요.",
          );
      }
      current.review = {
        ...review,
        passages,
        ...(plan && review.assessment
          ? {
              assessment: {
                ...review.assessment,
                ...(review.completed && plan.grading === "score"
                  ? { total: gradeTotal(review.assessment)! }
                  : {}),
              },
            }
          : {}),
        updatedAt: Math.max(Date.now(), current.review.updatedAt + 1),
      };
      await write("submissions", id, current);
      return { review: current.review };
    });
  })(req);
}
