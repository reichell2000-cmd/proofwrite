import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  csrf,
  currentStudent,
  requireAccount,
  studentSession,
  rateLimit,
} from "../../../../server/auth";
import { locked, write, HttpError } from "../../../../server/store";
import { handler, body } from "../../../../server/validation";
import {
  claimBrowserTasks,
  clearStudentSessions,
  newRecoveryCode,
  recoverAccount,
} from "../../../../server/student-account";
import { publicStudent, type StudentAccount } from "../../../../core/identity";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handler(async () => {
  const a = await currentStudent();
  return { student: a ? publicStudent(a) : null };
});
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    alias: z.string().trim().min(1).max(80),
    consent: z.literal(true),
    claimExisting: z.boolean(),
  }),
  z.object({ action: z.literal("recover"), code: z.string().trim().max(100) }),
  z.object({ action: z.literal("rotate") }),
  z.object({ action: z.literal("claim") }),
  z.object({ action: z.literal("logout") }),
]);
export const POST = handler(async (req) => {
  csrf(req);
  rateLimit(`account:${req.headers.get("x-forwarded-for") || "local"}`, 20);
  const data = schema.parse(await body(req));
  return locked(async () => {
    if (data.action === "logout") {
      await clearStudentSessions();
      return { student: null };
    }
    if (data.action === "create") {
      if (await currentStudent())
        throw new HttpError(409, "이미 연결된 학생입니다.");
      const a: StudentAccount = {
        id: randomUUID(),
        alias: data.alias,
        createdAt: Date.now(),
        recoveryHash: "",
        sessionVersion: 1,
        registrations: [],
      };
      const code = newRecoveryCode(a);
      await write("students", a.id, a);
      const claimed = data.claimExisting ? await claimBrowserTasks(a) : 0;
      await studentSession(a);
      return { student: publicStudent(a), code, claimed };
    }
    if (data.action === "recover") {
      const a = await recoverAccount(data.code);
      await clearStudentSessions();
      await studentSession(a);
      return { student: publicStudent(a) };
    }
    const a = await requireAccount();
    if (data.action === "claim")
      return { student: publicStudent(a), claimed: await claimBrowserTasks(a) };
    a.sessionVersion++;
    const code = newRecoveryCode(a);
    await write("students", a.id, a);
    await studentSession(a);
    return { student: publicStudent(a), code };
  });
});
