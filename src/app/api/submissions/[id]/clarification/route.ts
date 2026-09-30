import { z } from "zod";
import { csrf, requireStudent } from "../../../../../server/auth";
import { read, write, locked, HttpError } from "../../../../../server/store";
import { body, handler } from "../../../../../server/validation";
import type { Submission } from "../../../../../core/model";
export const runtime = "nodejs";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handler(async () => {
    csrf(req);
    const data = z
      .object({ text: z.string().trim().min(1).max(2000) })
      .parse(await body(req));
    return locked(async () => {
      await requireStudent(id);
      const s = await read<Submission>("submissions", id);
      if (s.status !== "submitted")
        throw new HttpError(400, "제출 후 설명을 남길 수 있습니다.");
      s.clarification = { text: data.text, updatedAt: Date.now() };
      await write("submissions", id, s);
      return { clarification: s.clarification };
    });
  })(req);
}
