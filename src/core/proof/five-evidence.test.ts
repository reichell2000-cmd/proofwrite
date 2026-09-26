import { describe, it, expect } from "vitest";
import type { Submission } from "../model";
import { fiveEvidence } from "./five-evidence";
import { comparableRhythm } from "../my-proof/rhythm";
import { EvidenceCollector } from "../evidence/collector";
const empty = (): Submission => ({
  id: "id",
  assignmentId: "a",
  alias: "A",
  title: "",
  sources: "",
  doc: { type: "doc", content: [{ type: "paragraph" }] },
  events: [],
  snapshots: [],
  rhythm: [],
  rhythmOptIn: true,
  pick: null,
  reflections: [],
  status: "draft",
  createdAt: 0,
  updatedAt: 0,
  review: {
    passages: [],
    fullRead: false,
    reaction: "",
    completed: false,
    updatedAt: 0,
  },
  revision: 0,
});
describe("five process evidence axes", () => {
  it("does not treat missing rhythm or a long dwell as identity evidence", () => {
    const s = empty();
    s.rhythm = Array.from({ length: 100 }, (_, i) => ({
      at: i,
      dwellMs: 30,
      flightMs: 60000,
    }));
    const axes = fiveEvidence(s);
    expect(axes.map((x) => x.source)).toEqual([
      "자동 기록",
      "자동 기록",
      "자동 기록",
      "작성자 제공",
      "자동 기록",
    ]);
    expect(axes[4].available).toBe(false);
    expect(axes[4].status).toBe("비교 표본 부족");
  });
  it("breaks typing continuity at window exits and across long pauses", () => {
    const s = empty();
    s.events = [0, 1000, 2000, 100000, 101000].map((at, index) => ({
      id: String(index),
      submissionId: "id",
      sessionId: "s",
      seq: index + 1,
      type: index === 2 ? "blur" : "insert",
      at,
      source: "keyboard",
      insertedChars: index === 2 ? 0 : 1,
    }));
    expect(fiveEvidence(s)[1].facts[0]).toBe("이어진 입력 구간 합계 0분 2초");
    expect(fiveEvidence(s)[1].facts[1]).toBe("가장 길게 이어진 입력 0분 1초");
  });
  it("compares a historical profile only for the same input mode", () => {
    const s = empty();
    s.rhythm = Array.from({ length: 80 }, (_, i) => ({
      at: i,
      flightMs: 200,
      mode: "composition" as const,
    }));
    s.rhythmBaseline = {
      profile: {
        sampleCount: 100,
        medianFlightMs: 200,
        p90FlightMs: 220,
        medianBurstLength: 3,
      },
      submissionId: "old",
      capturedAt: 0,
      mode: "direct",
    };
    expect(fiveEvidence(s)[4].status).toBe("이번 과제의 전·후반 비교");
    s.rhythmBaseline.mode = "composition";
    expect(fiveEvidence(s)[4].status).toBe("이전 제출의 입력 습관과 비교");
    s.rhythmOptIn = false;
    expect(fiveEvidence(s)[4].available).toBe(false);
  });
  it("retains timing and mode without key values and separates IME from direct keys", () => {
    const collector = new EvidenceCollector("id", "session", () => {});
    collector.keyDown(100, false, "composition");
    collector.keyUp(130);
    collector.keyDown(200, false, "composition");
    collector.keyUp(230);
    collector.keyDown(300, false, "direct");
    collector.keyDown(450, true, "direct");
    const samples = collector.drainRhythm();
    expect(samples[1].flightMs).toBe(100);
    expect(samples[2].flightMs).toBeUndefined();
    expect(samples.some((x) => "key" in x || "code" in x)).toBe(false);
    expect(comparableRhythm(samples, "composition").samples).toHaveLength(1);
  });
});
