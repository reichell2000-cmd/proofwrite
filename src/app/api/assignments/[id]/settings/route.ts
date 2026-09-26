import { csrf, requireTeacher } from "../../../../../server/auth";
import { read, write, locked } from "../../../../../server/store";
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
      const assignment = {
        ...(await read<Assignment>("assignments", id)),
        ...settings,
      };
      await write("assignments", id, assignment);
      return { assignment };
    });
  })(req);
}
