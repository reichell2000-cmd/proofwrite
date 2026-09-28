import { csrf, requireTeacher } from "../../../../../server/auth";
import { read, write, locked, HttpError } from "../../../../../server/store";
import {
  handler,
  body,
  assignmentSchema,
} from "../../../../../server/validation";
import type { Assignment } from "../../../../../core/model";
export const runtime = "nodejs";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handler(async () => {
    csrf(req);
    await requireTeacher();
    const settings = assignmentSchema
      .pick({ dueAt: true, contentPriorities: true })
      .strict()
      .parse(await body(req));
    return locked(async () => {
      const current = await read<Assignment>("assignments", id);
      if (
        current.assessment &&
        settings.contentPriorities &&
        JSON.stringify(settings.contentPriorities) !==
          JSON.stringify(current.contentPriorities)
      )
        throw new HttpError(
          409,
          "게시한 읽기·평가 기준은 고정됩니다. 다른 기준은 새 과제로 안내해주세요.",
        );
      const assignment = {
        ...current,
        ...settings,
      };
      await write("assignments", id, assignment);
      return { assignment };
    });
  })(req);
}
