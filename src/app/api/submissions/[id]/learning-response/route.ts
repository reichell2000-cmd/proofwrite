import { csrf, requireStudent } from "../../../../../server/auth";
import { HttpError, read, write, locked } from "../../../../../server/store";
import {
  handler,
  body,
  learningResponseSchema,
} from "../../../../../server/validation";
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
    const data = learningResponseSchema.parse(await body(req));
    return locked(async () => {
      const current = await read<Submission>("submissions", id);
      if (
        current.status !== "submitted" ||
        !current.review.completed ||
        !current.review.feedback
      )
        throw new HttpError(400, "선생님의 피드백이 도착한 뒤 답할 수 있어요.");
      if (current.review.updatedAt !== data.reviewUpdatedAt)
        throw new HttpError(
          409,
          "선생님의 피드백이 바뀌었어요. 작성한 답을 복사해두고 새로고침해주세요.",
        );
      const previous = current.learningResponse;
      // A lost-response retry must not create a second revision.
      if (
        previous &&
        previous.reviewUpdatedAt === data.reviewUpdatedAt &&
        previous.revisedExcerpt === data.revisedExcerpt &&
        previous.explanation === data.explanation
      )
        return { learningResponse: previous };
      if ((previous?.version ?? 0) !== data.baseVersion)
        throw new HttpError(
          409,
          "다른 곳에서 답이 바뀌었어요. 작성한 답을 복사해두고 새로고침해주세요.",
        );
      current.learningResponse = {
        reviewUpdatedAt: data.reviewUpdatedAt,
        revisedExcerpt: data.revisedExcerpt,
        explanation: data.explanation,
        version: (previous?.version ?? 0) + 1,
        updatedAt: Date.now(),
      };
      await write("submissions", id, current);
      return { learningResponse: current.learningResponse };
    });
  })(req);
}
