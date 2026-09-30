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

it("prioritizes content cues in the final document and gives exact excerpts", () => {
  const text =
    "처음에는 성공만 중요하다고 생각했다. 하지만 지금은 시도 자체도 중요하다고 느낀다.";
  const doc = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
  const guide = buildReadingGuide([], [snapshot("오래된 문장")], undefined, {
    doc,
    priorities: ["perspective"],
  });
  expect(guide[0].reason).toBe("content_priority");
  expect(guide[0].excerpt).toBe(text);
  expect(guide[0].question).toContain("관점");
  expect(guide.some((item) => item.excerpt === "오래된 문장")).toBe(false);
});
