import { afterEach, describe, expect, it, vi } from "vitest";
import type { Submission } from "../core/model";
const mocks = vi.hoisted(() => ({
  jar: [] as { name: string; value: string }[],
  records: new Map<string, Submission>(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => mocks.jar }),
}));
vi.mock("./store", async (original) => ({
  ...(await original<typeof import("./store")>()),
  read: async (_kind: string, id: string) => mocks.records.get(id),
}));
import { issue } from "./auth";
import { findRhythmBaseline } from "./rhythm-baseline";
const previousId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const sample = (id: string, assignmentId: string): Submission => ({
  id,
  assignmentId,
  alias: "학생",
  title: "",
  sources: "",
  doc: {},
  events: [],
  snapshots: [],
  rhythm: Array.from({ length: 80 }, (_, i) => ({
    at: i,
    flightMs: 200,
    mode: "composition",
  })),
  rhythmOptIn: true,
  pick: null,
  reflections: [],
  status: "submitted",
  createdAt: 0,
  updatedAt: 1,
  review: {
    passages: [],
    fullRead: false,
    reaction: "",
    completed: false,
    updatedAt: 0,
  },
  revision: 0,
});
afterEach(() => {
  mocks.jar = [];
  mocks.records.clear();
  vi.unstubAllEnvs();
});
describe("automatic past-task rhythm baseline", () => {
  it("requires a valid previous submission capability, same alias, consent and matching input mode", async () => {
    vi.stubEnv(
      "PROOFWRITE_SESSION_SECRET",
      "test-only-proofme-baseline-secret-32-characters",
    );
    const current = sample("new", "new-task"),
      previous = sample(previousId, "old-task");
    mocks.records.set(previousId, previous);
    expect(await findRhythmBaseline(current)).toBeUndefined();
    mocks.jar = [{ name: `pw_s_${previousId}`, value: "forged" }];
    expect(await findRhythmBaseline(current)).toBeUndefined();
    mocks.jar[0].value = issue(`student:${previousId}`);
    expect((await findRhythmBaseline(current))?.profile.sampleCount).toBe(80);
    previous.alias = "다른 학생";
    expect(await findRhythmBaseline(current)).toBeUndefined();
    previous.alias = current.alias;
    previous.rhythmOptIn = false;
    expect(await findRhythmBaseline(current)).toBeUndefined();
    previous.rhythmOptIn = true;
    previous.rhythm = previous.rhythm.map((x) => ({ ...x, mode: "direct" }));
    expect(await findRhythmBaseline(current)).toBeUndefined();
  });
});
