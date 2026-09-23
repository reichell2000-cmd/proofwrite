import { describe, it, expect } from "vitest";
import { buildReadingGuide } from "./reading-guide";
import type { WritingSnapshot } from "../evidence/types";
const snapshot = (text: string): WritingSnapshot => ({
  id: crypto.randomUUID(),
  submissionId: crypto.randomUUID(),
  seq: 1,
  at: 1,
  text,
  wordCount: 3,
  charCount: text.length,
});
describe("distinct reading opportunities", () => {
  it("does not count whitespace variants of the student pick as a second passage", () => {
    const guide = buildReadingGuide(
      [],
      [snapshot("내 생각\n내  생각\n다른 근거")],
      "내 생각",
    );
    expect(guide.map((item) => item.excerpt)).toEqual(["내 생각", "다른 근거"]);
    expect(guide[0].id).toBe("student-pick");
  });
  it("does not offer empty evidence as readable passages", () => {
    expect(buildReadingGuide([], [snapshot("\n  \n")], "  ")).toEqual([]);
  });
});
