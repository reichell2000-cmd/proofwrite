import { describe, expect, it } from "vitest";
import { readingProgress } from "./review-progress";
const assignment = { minRead: 2, fullRead: false };
const guide = [{ id: "a" }, { id: "b" }];
describe("required reading progress", () => {
  it("only counts distinct current passage IDs", () => {
    const progress = readingProgress(
      assignment,
      { fullRead: false, passages: ["a", "a", "old"] },
      guide,
    );
    expect(progress.passages).toEqual(["a"]);
    expect(progress.remaining).toBe(1);
    expect(progress.fulfilled).toBe(false);
    expect(
      readingProgress(
        assignment,
        { fullRead: false, passages: ["a", "b"] },
        guide,
      ).fulfilled,
    ).toBe(true);
  });
  it("requires full text when too few passages exist or the teacher selected full reading", () => {
    for (const [a, g] of [
      [assignment, guide.slice(0, 1)],
      [{ ...assignment, fullRead: true }, guide],
    ] as const) {
      const progress = readingProgress(
        a,
        { fullRead: false, passages: ["a", "b"] },
        g,
      );
      expect(progress.fullReadRequired).toBe(true);
      expect(progress.fulfilled).toBe(false);
      expect(
        readingProgress(a, { fullRead: true, passages: [] }, g).fulfilled,
      ).toBe(true);
    }
  });
});
