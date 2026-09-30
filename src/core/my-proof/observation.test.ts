import { describe, expect, it } from "vitest";
import type { Submission } from "../model";
import { observeRhythm } from "./observation";
import { fiveEvidence } from "../proof/five-evidence";
import { submissionScore } from "../proof/submission-score";
const sample = (
  count: number,
  flightMs: number,
  mode: "direct" | "composition" = "direct",
) => Array.from({ length: count }, (_, at) => ({ at, flightMs, mode }));
function submission(): Submission {
  return {
    id: "s",
    assignmentId: "a",
    alias: "test",
    title: "",
    sources: "",
    doc: {},
    events: [
      {
        id: "e",
        submissionId: "s",
        sessionId: "session",
        seq: 1,
        at: 1,
        type: "insert",
        source: "keyboard",
        insertedChars: 600,
      },
    ],
    snapshots: [],
    rhythm: [],
    rhythmOptIn: true,
    pick: null,
    reflections: [],
    status: "submitted",
    createdAt: 1,
    updatedAt: 1,
    revision: 1,
    review: {
      passages: [],
      fullRead: false,
      reaction: "",
      completed: false,
      updatedAt: 0,
    },
  };
}
describe("consistent rhythm observation and score", () => {
  it("requires 80 valid intervals in one mode, excluding long pauses and missing intervals", () => {
    const s = submission();
    s.rhythm = [
      ...sample(40, 200),
      ...sample(40, 900, "composition"),
      ...sample(100, 60000),
    ];
    expect(observeRhythm(s).continuity).toBeNull();
    expect(submissionScore(s).myProof).toBeNull();
    expect(fiveEvidence(s)[4].available).toBe(false);
    s.rhythm = [...sample(80, 900, "composition"), ...sample(40, 200)];
    expect(submissionScore(s).myProof).toBe(25);
    expect(fiveEvidence(s)[4].available).toBe(true);
  });
  it("uses the same eligible historical baseline in the score and evidence card", () => {
    const s = submission();
    s.rhythm = sample(80, 400, "composition");
    s.rhythmBaseline = {
      mode: "composition",
      submissionId: "old",
      capturedAt: 1,
      profile: {
        sampleCount: 80,
        medianFlightMs: 200,
        p90FlightMs: 250,
        medianBurstLength: 3,
      },
    };
    expect(submissionScore(s).myProof).toBe(13);
    expect(fiveEvidence(s)[4].facts.join(" ")).toContain("간격 유사도 50%");
    s.rhythmBaseline.mode = "direct";
    expect(submissionScore(s).myProof).toBe(25);
    expect(fiveEvidence(s)[4].status).toBe("이번 과제의 전·후반 비교");
  });
  it("excludes all timing after opt-out even if stale samples are present", () => {
    const s = submission();
    s.rhythm = sample(80, 200);
    s.rhythmOptIn = false;
    expect(observeRhythm(s).samples).toHaveLength(0);
    expect(submissionScore(s).availableMax).toBe(75);
    expect(fiveEvidence(s)[0].facts.join(" ")).toContain("미수집");
  });
});
