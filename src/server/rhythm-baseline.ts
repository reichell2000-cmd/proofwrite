import { cookies } from "next/headers";
import { valid } from "./auth";
import { read, HttpError } from "./store";
import type { Submission } from "../core/model";
import { buildRhythmProfile, comparableRhythm } from "../core/my-proof/rhythm";
// The browser must still hold the previous submission's signed student capability.
// Alias equality groups work for a pilot comparison; it does not verify identity.
export async function findRhythmBaseline(
  current: Submission,
): Promise<Submission["rhythmBaseline"]> {
  const currentGroup = comparableRhythm(current.rhythm);
  if (currentGroup.samples.length < 80) return;
  const candidates: Submission[] = [];
  for (const cookie of (await cookies()).getAll()) {
    if (!/^pw_s_[a-f0-9-]{36}$/.test(cookie.name)) continue;
    const id = cookie.name.slice(5);
    if (id === current.id || !valid(cookie.value, `student:${id}`)) continue;
    try {
      const previous = await read<Submission>("submissions", id);
      if (
        previous.status === "submitted" &&
        previous.rhythmOptIn &&
        previous.alias === current.alias &&
        previous.assignmentId !== current.assignmentId
      )
        candidates.push(previous);
    } catch (e) {
      if (!(e instanceof HttpError && e.status === 404)) throw e;
    }
  }
  for (const previous of candidates.sort((a, b) => b.updatedAt - a.updatedAt)) {
    const { samples } = comparableRhythm(previous.rhythm, currentGroup.mode);
    if (samples.length < 80) continue;
    return {
      profile: buildRhythmProfile(samples),
      mode: currentGroup.mode,
      submissionId: previous.id,
      capturedAt: Date.now(),
    };
  }
}
