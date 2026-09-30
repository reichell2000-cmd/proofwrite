import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { equal, valid } from "./auth";
import { read, write, HttpError } from "./store";
import type { StudentAccount } from "../core/identity";
import type { Submission } from "../core/model";
const hash = (code: string) => createHash("sha256").update(code).digest("hex");
export function newRecoveryCode(account: StudentAccount) {
  const code = `${account.id}.${randomBytes(24).toString("base64url")}`;
  account.recoveryHash = hash(code);
  return code;
}
export async function recoverAccount(code: string) {
  const fail = () => new HttpError(403, "연결 코드를 확인해주세요.");
  if (!/^[a-f0-9-]{36}\.[A-Za-z0-9_-]{32}$/.test(code)) throw fail();
  let account: StudentAccount;
  try {
    account = await read<StudentAccount>("students", code.split(".")[0]);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) throw fail();
    throw e;
  }
  if (!equal(account.recoveryHash, hash(code))) throw fail();
  return account;
}
export async function claimBrowserTasks(account: StudentAccount) {
  let claimed = 0;
  for (const c of (await cookies()).getAll()) {
    if (!/^pw_s_[a-f0-9-]{36}$/.test(c.name)) continue;
    const id = c.name.slice(5);
    if (!valid(c.value, `student:${id}`)) continue;
    try {
      const s = await read<Submission>("submissions", id);
      if (s.studentId) continue;
      s.studentId = account.id;
      delete s.rhythmBaseline;
      if (s.status === "draft") s.revision++;
      await write("submissions", id, s);
      claimed++;
    } catch (e) {
      if (!(e instanceof HttpError && e.status === 404)) throw e;
    }
  }
  return claimed;
}
export async function clearStudentSessions() {
  const jar = await cookies();
  for (const c of jar.getAll())
    if (c.name === "pw_profile" || /^pw_s_[a-f0-9-]{36}$/.test(c.name))
      jar.delete(c.name);
}
