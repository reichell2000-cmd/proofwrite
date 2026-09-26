import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { HttpError } from "./store";
function secret() {
  const value = process.env.PROOFWRITE_SESSION_SECRET;
  if (!value || value.length < 32)
    throw new HttpError(
      503,
      "서비스 설정이 필요합니다. 운영자에게 문의해주세요.",
    );
  return value;
}
const mac = (text: string) =>
  createHmac("sha256", secret()).update(text).digest("hex");
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function issue(scope: string) {
  const text = `${scope}|${Date.now() + 7 * 86400000}`;
  return `${text}|${mac(text)}`;
}
export function valid(value: string | undefined, scope: string) {
  if (!value) return false;
  const parts = value.split("|");
  return (
    parts.length === 3 &&
    parts[0] === scope &&
    Number(parts[1]) > Date.now() &&
    equal(parts[2], mac(parts.slice(0, 2).join("|")))
  );
}
export async function isTeacher() {
  return valid((await cookies()).get("pw_teacher")?.value, "teacher");
}
export async function requireTeacher() {
  if (!(await isTeacher()))
    throw new HttpError(401, "교사 로그인이 필요합니다.");
}
export async function requireStudent(id: string) {
  if (!valid((await cookies()).get(`pw_s_${id}`)?.value, `student:${id}`))
    throw new HttpError(
      403,
      "이 문서에 접근할 수 없습니다. 같은 브라우저에서 참여 링크를 열어주세요.",
    );
}
export async function requireReader(id: string) {
  if (!(await isTeacher())) await requireStudent(id);
}
export async function setSession(name: string, scope: string) {
  (await cookies()).set(name, issue(scope), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 86400,
  });
}
export function csrf(req: Request) {
  const url = new URL(req.url);
  const expected =
    process.env.PROOFWRITE_PUBLIC_ORIGIN ||
    `${url.protocol}//${req.headers.get("host") || url.host}`;
  if (req.headers.get("origin") !== expected)
    throw new HttpError(403, "요청 출처를 확인할 수 없습니다.");
}
const globalLimits = globalThis as typeof globalThis & {
  pwLimits?: Map<string, { count: number; until: number }>;
};
export function rateLimit(key: string, max: number) {
  const buckets = (globalLimits.pwLimits ??= new Map());
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.until < now) buckets.set(key, { count: 1, until: now + 60000 });
  else if (++b.count > max)
    throw new HttpError(429, "요청이 많습니다. 잠시 후 다시 시도해주세요.");
}
