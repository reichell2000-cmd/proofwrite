import { describe, it, expect } from "vitest";
import {
  CATEGORY_IDS,
  recommendedPlan,
  redistribute,
  planError,
  scoreCriteria,
  templateDoc,
  hasAssignmentContent,
  blankEvaluation,
  gradeError,
  gradeTotal,
  effortMode,
} from "./assessment";
import { assessmentSchema } from "../server/validation";
import { validateDoc } from "../server/sync";
import { textOf } from "./evidence/replay";
describe("published assessment contracts", () => {
  it.each(CATEGORY_IDS)(
    "%s has a valid 100-point rubric and usable empty template",
    (category) => {
      const plan = recommendedPlan(category);
      expect(assessmentSchema.safeParse(plan).success).toBe(true);
      expect(planError(plan)).toBe("");
      expect(scoreCriteria(plan).reduce((n, c) => n + c.weight, 0)).toBe(100);
      const doc = templateDoc(category);
      validateDoc(doc);
      expect(hasAssignmentContent(textOf(doc), plan)).toBe(false);
      expect(
        hasAssignmentContent(textOf(doc) + "\n내가 조사하여 발견한 내용", plan),
      ).toBe(true);
    },
  );
  it("exclusion requires an explicit redistribution and preserves locked weights", () => {
    const plan = recommendedPlan("research");
    const changed = plan.criteria.map((c) =>
      c.id === "proof:effort"
        ? { ...c, mode: "exclude" as const, weight: 0 }
        : c.id === "proof:thought"
          ? { ...c, weight: 10, locked: true }
          : c,
    );
    expect(planError({ ...plan, criteria: changed })).toContain("100점");
    const next = redistribute(changed);
    expect(next.find((c) => c.id === "proof:thought")?.weight).toBe(10);
    expect(planError({ ...plan, criteria: next })).toBe("");
    expect(changed.find((c) => c.id === "proof:effort")?.weight).toBe(0);
  });
  it("rejects impossible fixed totals, duplicates and unsupported category", () => {
    const p = recommendedPlan("argument");
    expect(() =>
      redistribute(
        p.criteria.map((c) => ({
          ...c,
          locked: true,
          weight: c.mode === "score" ? 100 : 0,
        })),
      ),
    ).toThrow();
    expect(
      assessmentSchema.safeParse({
        ...p,
        criteria: [...p.criteria, p.criteria[0]],
      }).success,
    ).toBe(false);
    expect(
      assessmentSchema.safeParse({ ...p, category: "video-editor" }).success,
    ).toBe(false);
  });
  it("custom grading stays pending until the teacher enters a score and evidence", () => {
    const p = recommendedPlan("reading");
    p.criteria = p.criteria.map((c) => ({
      ...c,
      mode: "reference",
      weight: 0,
    }));
    p.criteria.push({
      id: "custom:1",
      label: "관점 비교",
      description: "두 관점을 직접 읽고 비교",
      source: "custom",
      mode: "score",
      weight: 100,
      locked: true,
    });
    const v = blankEvaluation(p);
    expect(gradeTotal(v)).toBeNull();
    expect(gradeError(p, v)).toContain("점수");
    v.scores[0].value = 80;
    expect(gradeError(p, v)).toContain("근거");
    v.scores[0].note = "두 관점을 본문과 연결하여 비교함";
    expect(gradeError(p, v)).toContain("확정");
    v.confirmed = true;
    expect(gradeError(p, v)).toBe("");
    expect(gradeTotal(v)).toBe(80);
    v.scores[0].value = 101;
    expect(gradeError(p, v)).toContain("0~100");
  });
  it("a feedback-only assignment has no numeric assessment", () => {
    const p = recommendedPlan("reflection");
    p.grading = "feedback";
    expect(
      effortMode({ ...recommendedPlan("research"), grading: "feedback" }),
    ).toBe("reference");
    p.criteria = p.criteria.map((c) => ({
      ...c,
      mode: c.mode === "score" ? "reference" : c.mode,
      weight: 0,
    }));
    const v = blankEvaluation(p);
    v.confirmed = true;
    expect(assessmentSchema.safeParse(p).success).toBe(true);
    expect(v.scores).toEqual([]);
    expect(gradeError(p, v)).toBe("");
  });
});

import {
  recommendedRevision,
  gradeAvailableMax,
  GRADE_BANDS,
  sectionsFor,
} from "./assessment";
it("recommendation preserves teacher exclusions, custom criteria and locked points without keyword triggers", () => {
  const p = recommendedPlan("research", "창의력은 평가하지 않습니다");
  expect(p.criteria.some((c) => c.id === "common:creativity")).toBe(false);
  p.criteria = p.criteria.map((c) =>
    c.id === "proof:effort" ? { ...c, mode: "exclude", weight: 0 } : c,
  );
  p.criteria.push({
    id: "custom:oral",
    label: "직접 관찰",
    description: "교사가 직접 들은 설명",
    source: "custom",
    mode: "score",
    weight: 30,
    locked: true,
  });
  const r = recommendedRevision(p);
  expect(r.criteria.find((c) => c.id === "custom:oral")?.weight).toBe(30);
  expect(r.criteria.find((c) => c.id === "proof:effort")?.mode).toBe("exclude");
  expect(planError(r)).toBe("");
});
it("missing evidence is explicitly excluded and remaining weights normalize to 100", () => {
  const p = recommendedPlan("research"),
    v = blankEvaluation(p);
  v.confirmed = true;
  v.scores = v.scores.map((row) => ({
    ...row,
    value: p.criteria.find((c) => c.id === row.id)!.weight,
    note: "본문과 수행 기록 확인",
  }));
  v.scores[0] = {
    ...v.scores[0],
    value: null,
    unavailable: true,
    note: "직접 입력 자료 부족",
  };
  expect(gradeError(p, v)).toBe("");
  expect(gradeAvailableMax(p, v)).toBe(90);
  expect(gradeTotal(v, p)).toBe(100);
  v.scores = v.scores.map((r) => ({ ...r, value: null, unavailable: true }));
  expect(gradeError(p, v)).toContain("모든 항목");
});
it("all grade-specific templates are valid and empty prompts cannot count as student work", () => {
  for (const category of CATEGORY_IDS)
    for (const gradeBand of Object.keys(
      GRADE_BANDS,
    ) as (keyof typeof GRADE_BANDS)[]) {
      const p = { ...recommendedPlan(category), gradeBand };
      const doc = templateDoc(category, gradeBand);
      validateDoc(doc);
      expect(hasAssignmentContent(textOf(doc), p)).toBe(false);
      if (gradeBand === "lowerPrimary" || gradeBand === "middlePrimary")
        expect(sectionsFor(category, gradeBand)).toHaveLength(3);
    }
});
