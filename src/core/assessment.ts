import type { Doc } from "./model";

export const CATEGORY_IDS = [
  "argument",
  "reading",
  "research",
  "problem",
  "creative",
  "reflection",
  "observation",
  "presentation",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];
export type CriterionMode = "score" | "reference" | "exclude";
export interface Criterion {
  id: string;
  label: string;
  description: string;
  source: "proof" | "content" | "custom";
  mode: CriterionMode;
  weight: number;
  locked: boolean;
}
export interface AssessmentPlan {
  version: 1;
  category: CategoryId;
  purpose: "assignment" | "classroom" | "practice";
  grading: "score" | "feedback";
  criteria: Criterion[];
}
export interface Evaluation {
  version: 1;
  scores: { id: string; value: number | null; note: string }[];
  confirmed: boolean;
  total?: number;
}
export const CATEGORIES: Record<
  CategoryId,
  {
    label: string;
    goal: string;
    sections: string[];
    criteria: [string, string, number][];
    boundary?: string;
    table?: string[];
  }
> = {
  argument: {
    label: "설명·논증",
    goal: "자신의 생각을 근거와 연결하여 설득력 있게 설명하기",
    sections: [
      "질문과 나의 주장",
      "근거와 구체적인 예",
      "다른 관점과 나의 판단",
      "결론",
    ],
    criteria: [
      ["주장·이해", "질문에 대한 자신의 주장이 분명한가", 20],
      ["근거", "자료나 경험이 주장을 뒷받침하는가", 30],
      ["논리", "근거와 결론의 연결이 타당한가", 30],
      ["표현·구성", "독자가 이해할 수 있게 구성했는가", 20],
    ],
  },
  reading: {
    label: "독서·자료 해석",
    goal: "자료의 내용을 이해하고 근거를 들어 자신의 해석을 설명하기",
    sections: [
      "책·자료와 출처",
      "함께 읽을 대목",
      "내가 해석한 의미",
      "나의 관점과 판단",
    ],
    criteria: [
      ["이해", "자료의 내용을 정확히 이해했는가", 25],
      ["해석 근거", "선택 대목을 근거로 해석했는가", 30],
      ["자신의 관점", "자료와 자신의 판단을 구분했는가", 25],
      ["표현·인용", "인용과 해석을 분명히 전달했는가", 20],
    ],
  },
  research: {
    label: "조사·탐구 보고서",
    goal: "신뢰할 수 있는 자료를 비교하고 탐구 질문에 답하기",
    sections: ["탐구 질문", "자료와 출처", "자료 비교", "분석", "결론과 한계"],
    table: ["자료·출처", "확인한 사실", "나의 해석"],
    criteria: [
      ["탐구 질문", "탐구할 질문이 구체적인가", 15],
      ["자료·출처", "자료의 출처와 신뢰성을 확인했는가", 25],
      ["분석", "자료를 비교하여 의미를 설명했는가", 35],
      ["결론·구성", "질문에 답하고 한계를 설명했는가", 25],
    ],
  },
  problem: {
    label: "풀이·문제해결",
    goal: "문제의 조건에 맞는 해결 방법을 선택하고 검토하기",
    sections: [
      "문제와 조건",
      "해결 단계 또는 대안",
      "선택한 이유",
      "결과 검토",
    ],
    criteria: [
      ["정확성", "문제와 조건에 맞게 해결했는가", 30],
      ["추론·전략", "해결 방법을 선택한 이유가 타당한가", 35],
      ["검토", "결과나 다른 방법을 검토했는가", 20],
      ["설명", "풀이 과정을 이해할 수 있게 설명했는가", 15],
    ],
    boundary:
      "풀이 설명·표·손풀이 이미지를 지원합니다. 수식 계산·코드 실행·손글씨 과정 관찰은 지원하지 않습니다.",
  },
  creative: {
    label: "창작·기획",
    goal: "목적과 대상에 맞게 자신의 아이디어를 구체적인 작품으로 표현하기",
    sections: ["의도와 대상", "아이디어", "본문·장면 구성", "다듬은 작품"],
    criteria: [
      ["창의적 발상", "자신의 관점과 새로운 연결이 드러나는가", 30],
      ["목적 적합성", "대상과 목적에 맞게 표현했는가", 20],
      ["구성", "아이디어가 일관된 작품으로 이어지는가", 25],
      ["표현", "선택한 표현이 의도를 전달하는가", 25],
    ],
  },
  reflection: {
    label: "성찰·학습 기록",
    goal: "구체적인 경험에서 배움과 변화, 다음 시도를 찾아 설명하기",
    sections: [
      "경험과 활동",
      "배운 점과 변화",
      "변화를 보여주는 구체적인 근거",
      "다음 시도",
    ],
    criteria: [
      ["구체성", "실제 경험과 장면이 드러나는가", 25],
      ["배움·변화", "경험의 의미와 변화 이유를 설명했는가", 35],
      ["근거 연결", "경험과 생각을 연결했는가", 20],
      ["다음 계획", "배움을 다음 시도와 연결했는가", 20],
    ],
  },
  observation: {
    label: "관찰·실험·현장 기록",
    goal: "관찰 사실과 해석을 구분하고 자료를 근거로 결론을 설명하기",
    sections: ["질문과 방법", "관찰 기록", "결과 해석", "한계와 결론"],
    table: ["시점·조건", "관찰 사실", "해석·사진 설명"],
    criteria: [
      ["질문·방법", "질문과 방법을 명확히 설명했는가", 20],
      ["관찰 기록", "관찰 사실을 구체적으로 정리했는가", 25],
      ["분석", "사실과 해석을 구분했는가", 35],
      ["한계·결론", "자료에 맞는 결론과 한계를 설명했는가", 20],
    ],
    boundary:
      "실험·현장 활동은 외부에서 수행합니다. 입력 기록은 보고서 작성 과정이며 실제 수행은 교사가 확인합니다.",
  },
  presentation: {
    label: "발표·토론·제작 준비",
    goal: "핵심 메시지와 근거를 청중에게 전달할 순서로 구성하기",
    sections: [
      "목적과 청중",
      "핵심 메시지",
      "구성 카드 1 · 제목과 근거",
      "구성 카드 2 · 제목과 근거",
      "발표 대본·예상 질문",
      "외부 결과물 링크와 설명",
    ],
    criteria: [
      ["메시지", "목적과 청중에 맞는 메시지가 분명한가", 25],
      ["근거", "핵심 메시지를 뒷받침하는 근거가 있는가", 25],
      ["구성", "전달 순서가 효과적인가", 25],
      ["대본·예상 질문", "발표와 질문에 필요한 준비가 되어 있는가", 25],
    ],
    boundary:
      "PPT·영상은 외부에서 제작하고 링크로 연결하세요. 실제 발표·즉석 대응·제작 기술은 교사가 직접 확인합니다.",
  },
};
export const COMMON_CRITERIA = [
  [
    "creativity",
    "창의적 발상",
    "자신의 관점과 새로운 연결이 구체적으로 드러나는가",
  ],
  ["logic", "논리성", "주장·이유·결론의 연결이 타당한가"],
  ["evidence", "근거 활용", "신뢰할 수 있는 자료를 자신의 판단과 연결했는가"],
  ["accuracy", "정확성", "개념·사실·풀이가 정확한가"],
  ["problem", "문제 해결", "조건에 맞는 해결 전략을 선택하고 검토했는가"],
  ["expression", "표현·구성", "대상과 목적에 맞게 이해하기 쉽게 표현했는가"],
  [
    "response",
    "즉석 대응력",
    "교사가 직접 관찰한 질문에 적절하게 대응했는가 · 직접 평가",
  ],
] as const;
const PROOFS: [string, string, string, CriterionMode, number][] = [
  [
    "thought",
    "생각의 증거",
    "수정 기록과 실제 내용의 변화를 함께 확인합니다. 삭제 횟수나 빠르기로 채점하지 않습니다.",
    "score",
    10,
  ],
  [
    "focus",
    "집중의 증거",
    "앱 내부 입력 구간을 참고합니다. 독서·관찰·생각 중 입력 공백은 집중 부족을 뜻하지 않습니다.",
    "reference",
    0,
  ],
  [
    "diligence",
    "성실의 증거",
    "안내한 일정에 따른 진행·제출을 확인합니다. 밤샘이나 긴 체류에 가산하지 않습니다.",
    "score",
    10,
  ],
  [
    "effort",
    "노력의 증거",
    "학생이 제공한 시도·자료가 과제 해결에 어떻게 연결되는지 확인합니다.",
    "score",
    10,
  ],
  [
    "identity",
    "나라는 증거",
    "입력 습관의 비교 자료입니다. 본인 작성 확률이나 부정행위 판정으로 사용하지 않습니다.",
    "reference",
    0,
  ],
];
export function redistribute(criteria: Criterion[]): Criterion[] {
  const scored = criteria.filter((c) => c.mode === "score");
  const fixed = scored
    .filter((c) => c.locked)
    .reduce((n, c) => n + c.weight, 0);
  const open = scored.filter((c) => !c.locked);
  const remaining = 100 - fixed;
  if (remaining < open.length || (!open.length && remaining !== 0))
    throw new Error(
      "고정 배점과 평가 항목 수를 확인해주세요. 각 평가 항목에는 1점 이상이 필요합니다.",
    );
  if (!open.length) return criteria;
  const proportions = open.map((c) => Math.max(1, c.weight));
  const total = proportions.reduce((a, b) => a + b, 0);
  const raw = proportions.map((n) => ((remaining - open.length) * n) / total);
  const weights = raw.map((n) => 1 + Math.floor(n));
  let rest = remaining - weights.reduce((a, b) => a + b, 0);
  const order = raw
    .map((n, i) => ({ i, f: n - Math.floor(n) }))
    .sort((a, b) => b.f - a.f || a.i - b.i);
  for (const { i } of order) {
    if (!rest) break;
    weights[i]++;
    rest--;
  }
  return criteria.map((c) =>
    c.mode !== "score"
      ? { ...c, weight: 0 }
      : c.locked
        ? c
        : { ...c, weight: weights[open.findIndex((x) => x.id === c.id)] },
  );
}
export function recommendedPlan(
  category: CategoryId,
  goal = "",
): AssessmentPlan {
  const criteria: Criterion[] = PROOFS.map(
    ([id, label, description, mode, weight]) => ({
      id: `proof:${id}`,
      label,
      description,
      source: "proof",
      mode,
      weight,
      locked: true,
    }),
  );
  criteria.push(
    ...CATEGORIES[category].criteria.map(([label, description, weight], i) => ({
      id: `content:${category}:${i}`,
      label,
      description,
      weight,
      source: "content" as const,
      mode: "score" as const,
      locked: false,
    })),
  );
  if (/창의|독창|새로운/.test(goal)) {
    const existing = criteria.find((c) => c.label === "창의적 발상");
    if (existing) existing.weight += 20;
    else
      criteria.push({
        id: "common:creativity",
        label: "창의적 발상",
        description: COMMON_CRITERIA[0][2],
        weight: 30,
        source: "content",
        mode: "score",
        locked: false,
      });
  }
  if (/신뢰|출처|근거/.test(goal))
    for (const c of criteria)
      if (c.source === "content" && /근거|출처/.test(c.label)) c.weight += 15;
  if (category === "reflection") {
    const effort = criteria.find((c) => c.id === "proof:effort")!;
    effort.mode = "exclude";
    effort.weight = 0;
  }
  return {
    version: 1,
    category,
    purpose: "assignment",
    grading: "score",
    criteria: redistribute(criteria).map((c) => ({ ...c, locked: false })),
  };
}
export const scoreCriteria = (plan: AssessmentPlan) =>
  plan.grading === "score"
    ? plan.criteria.filter((c) => c.mode === "score")
    : [];
export function planError(plan: AssessmentPlan): string {
  if (new Set(plan.criteria.map((c) => c.id)).size !== plan.criteria.length)
    return "평가 항목이 중복되었습니다.";
  if (plan.criteria.some((c) => !c.label.trim() || !c.description.trim()))
    return "항목 이름과 판단 기준을 입력해주세요.";
  if (plan.criteria.filter((c) => c.source === "custom").length > 3)
    return "직접 만든 항목은 최대 3개입니다.";
  if (
    plan.criteria.some(
      (c) =>
        !Number.isInteger(c.weight) ||
        c.weight < 0 ||
        c.weight > 100 ||
        (c.mode !== "score" && c.weight !== 0),
    )
  )
    return "배점은 0~100 사이 정수로 입력해주세요.";
  const scored = scoreCriteria(plan);
  if (
    plan.grading === "score" &&
    (!scored.length ||
      scored.some((c) => c.weight < 1) ||
      scored.reduce((n, c) => n + c.weight, 0) !== 100)
  )
    return "평가에 포함한 항목의 배점 합계가 100점이어야 합니다.";
  return "";
}
export function effortMode(plan?: AssessmentPlan): CriterionMode {
  return plan
    ? (plan.criteria.find((c) => c.id === "proof:effort")?.mode ?? "exclude")
    : "score";
}
export function gradeError(
  plan: AssessmentPlan,
  evaluation?: Evaluation,
): string {
  if (!evaluation || evaluation.version !== plan.version)
    return "과제의 평가 기준을 확인해주세요.";
  const scored = scoreCriteria(plan);
  if (
    evaluation.scores.length !== scored.length ||
    new Set(evaluation.scores.map((s) => s.id)).size !== scored.length
  )
    return "평가 항목을 다시 확인해주세요.";
  for (const c of scored) {
    const value = evaluation.scores.find((s) => s.id === c.id);
    if (
      !value ||
      value.value === null ||
      !Number.isFinite(value.value) ||
      value.value < 0 ||
      value.value > c.weight
    )
      return `${c.label}: 0~${c.weight}점 사이의 점수를 입력해주세요.`;
    if (
      (c.source !== "content" || c.id === "common:response") &&
      !value.note.trim()
    )
      return `${c.label}: 직접 확인한 근거를 남겨주세요.`;
  }
  if (!evaluation.confirmed)
    return "평가와 근거를 확인한 뒤 확정에 동의해주세요.";
  return "";
}
export const gradeTotal = (evaluation?: Evaluation) =>
  evaluation?.scores.every((s) => s.value !== null)
    ? Math.round(
        evaluation.scores.reduce((n, s) => n + (s.value ?? 0), 0) * 100,
      ) / 100
    : null;
export function blankEvaluation(plan: AssessmentPlan): Evaluation {
  return {
    version: 1,
    scores: scoreCriteria(plan).map((c) => ({
      id: c.id,
      value: null,
      note: "",
    })),
    confirmed: false,
  };
}
const paragraph = (text?: string) => ({
  type: "paragraph",
  ...(text ? { content: [{ type: "text", text }] } : {}),
});
export function templateDoc(category: CategoryId): Doc {
  const t = CATEGORIES[category];
  const content: unknown[] = t.sections.flatMap((title) => [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: title }],
    },
    paragraph(),
  ]);
  if (t.table)
    content.splice(4, 0, {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: t.table.map((text) => ({
            type: "tableHeader",
            content: [paragraph(text)],
          })),
        },
        ...Array.from({ length: 2 }, () => ({
          type: "tableRow",
          content: t.table!.map(() => ({
            type: "tableCell",
            content: [paragraph()],
          })),
        })),
      ],
    });
  return { type: "doc", content };
}
export function hasAssignmentContent(
  text: string,
  plan?: AssessmentPlan,
): boolean {
  if (!plan) return !!text.trim();
  const t = CATEGORIES[plan.category];
  return !!text
    .split("\n")
    .filter(
      (line) => ![...t.sections, ...(t.table ?? [])].includes(line.trim()),
    )
    .join("")
    .trim();
}
