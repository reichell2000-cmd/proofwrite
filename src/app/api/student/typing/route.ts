import { z } from "zod";
import { randomUUID } from "node:crypto";
import { csrf, requireAccount, rateLimit } from "../../../../server/auth";
import { locked, write, list, HttpError } from "../../../../server/store";
import { handler, body, rhythmSchema } from "../../../../server/validation";
import { registerTyping } from "../../../../server/typing-registration";
import { publicStudent, TYPING_TEXT } from "../../../../core/identity";
import type { Submission } from "../../../../core/model";
export const runtime = "nodejs";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    language: z.enum(["ko", "en"]),
    consent: z.literal(true),
  }),
  z.object({
    action: z.literal("save"),
    challengeId: z.string().uuid(),
    deviceId: z.string().uuid(),
    deviceLabel: z.string().trim().min(1).max(60),
    copyText: z.string().max(2000),
    copySamples: z.array(rhythmSchema).min(80).max(4000),
  }),
  z.object({ action: z.literal("delete"), registrationId: z.string().uuid() }),
]);
export const POST = handler(async (req) => {
  csrf(req);
  const data = schema.parse(await body(req));
  return locked(async () => {
    const a = await requireAccount();
    rateLimit(`typing:${a.id}`, 20);
    if (data.action === "start") {
      a.challenge = {
        id: randomUUID(),
        at: Date.now(),
        language: data.language,
      };
      await write("students", a.id, a);
      return { challengeId: a.challenge.id, text: TYPING_TEXT[data.language] };
    }
    if (data.action === "save") registerTyping(a, data);
    else {
      const r = a.registrations.find((r) => r.id === data.registrationId);
      if (!r) throw new HttpError(404, "등록 기준을 찾을 수 없습니다.");
      a.registrations = a.registrations.filter((x) => x.id !== r.id);
      for (const s of await list<Submission>("submissions")) {
        if (
          s.studentId === a.id &&
          s.rhythmBaseline?.deviceId === r.deviceId &&
          s.rhythmBaseline.mode === r.mode
        ) {
          delete s.rhythmBaseline;
          if (s.status === "draft") s.revision++;
          await write("submissions", s.id, s);
        }
      }
    }
    await write("students", a.id, a);
    return { student: publicStudent(a) };
  });
});
