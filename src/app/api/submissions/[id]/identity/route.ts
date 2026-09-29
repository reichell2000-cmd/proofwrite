import { z } from "zod";
import { csrf, requireTeacher } from "../../../../../server/auth";
import {
  read,
  write,
  list,
  locked,
  HttpError,
} from "../../../../../server/store";
import { handler, body } from "../../../../../server/validation";
import type { Submission } from "../../../../../core/model";
import type { StudentAccount } from "../../../../../core/identity";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, context: Context) {
  return handler(async () => {
    await requireTeacher();
    const { id } = await context.params;
    const s = await read<Submission>("submissions", id);
    const a = s.studentId
      ? await read<StudentAccount>("students", s.studentId)
      : null;
    return { registrations: a?.registrations || [], linked: !!a };
  })(req);
}
export async function POST(req: Request, context: Context) {
  return handler(async () => {
    csrf(req);
    await requireTeacher();
    const { id } = await context.params;
    const data = z
      .object({ registrationId: z.string().uuid(), witnessed: z.literal(true) })
      .parse(await body(req));
    return locked(async () => {
      const s = await read<Submission>("submissions", id);
      if (!s.studentId) throw new HttpError(400, "학생 연결이 필요합니다.");
      const a = await read<StudentAccount>("students", s.studentId);
      const r = a.registrations.find((r) => r.id === data.registrationId);
      if (!r) throw new HttpError(404, "등록 기준이 없습니다.");
      r.verifiedAt = Date.now();
      r.verifiedAssignmentId = s.assignmentId;
      await write("students", a.id, a);
      for (const doc of await list<Submission>("submissions"))
        if (
          doc.studentId === a.id &&
          doc.rhythmBaseline?.registrationId === r.id
        ) {
          doc.rhythmBaseline.verifiedAt = r.verifiedAt;
          await write("submissions", doc.id, doc);
        }
      return { registrations: a.registrations };
    });
  })(req);
}
