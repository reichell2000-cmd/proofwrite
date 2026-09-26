import { csrf, equal, rateLimit, setSession } from "../../../../server/auth";
import { body, handler } from "../../../../server/validation";
import { HttpError } from "../../../../server/store";
export const runtime = "nodejs";
export const POST = handler(async (req) => {
  csrf(req);
  rateLimit("login", 20);
  const value = await body(req);
  const expected = process.env.PROOFWRITE_TEACHER_PASSWORD;
  if (!expected || expected.length < 12)
    throw new HttpError(
      503,
      "서비스 설정이 필요합니다. 운영자에게 문의해주세요.",
    );
  if (typeof value.password !== "string" || !equal(value.password, expected))
    throw new HttpError(401, "비밀번호를 확인해주세요.");
  await setSession("pw_teacher", "teacher");
  return { ok: true };
});
