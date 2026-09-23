import { cookies } from "next/headers";
import { csrf } from "../../../../server/auth";
import { handler } from "../../../../server/validation";
export const POST = handler(async (req) => {
  csrf(req);
  (await cookies()).delete("pw_teacher");
  return { ok: true };
});
