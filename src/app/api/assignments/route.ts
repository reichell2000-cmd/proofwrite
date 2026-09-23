import { randomUUID, randomBytes } from "node:crypto";
import { csrf, requireTeacher } from "../../../server/auth";
import { list, locked, write } from "../../../server/store";
import { assignmentSchema, body, handler } from "../../../server/validation";
import type { Assignment } from "../../../core/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handler(async () => {
  await requireTeacher();
  return {
    assignments: (await list<Assignment>("assignments")).sort(
      (a, b) => b.createdAt - a.createdAt,
    ),
  };
});
export const POST = handler(async (req) => {
  csrf(req);
  await requireTeacher();
  const data = assignmentSchema.parse(await body(req));
  const assignment: Assignment = {
    ...data,
    id: randomUUID(),
    joinCode: randomBytes(18).toString("hex"),
    createdAt: Date.now(),
  };
  await locked(() => write("assignments", assignment.id, assignment));
  return { assignment };
});
