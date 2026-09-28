import { describe, it, expect, vi, afterEach } from "vitest";
import { checkedDraft, prepareReviewDraft } from "./review-draft";
import { recommendedPlan } from "../core/assessment";
import type { Assignment, Submission } from "../core/model";
const a = {
  assessment: recommendedPlan("argument"),
  learningGoal: "근거 설명",
  description: "생각과 이유",
} as Assignment;
const s = {
  id: "fixture",
  doc: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "나는 도서관이 필요하다고 생각한다. 누구나 책을 읽을 수 있기 때문이다.",
          },
        ],
      },
    ],
  },
  events: [],
  snapshots: [],
  revision: 3,
  sources: "",
  pick: null,
  assessment: a.assessment,
} as unknown as Submission;
const contentId = a.assessment!.criteria.find(
  (c) => c.source === "content",
)!.id;
const valid = {
  summary: "도서관의 필요성을 주장하는 글",
  feedback: {
    quote: "나는 도서관이 필요하다고 생각한다.",
    strength: "자신의 주장이 분명함",
    question: "누구의 경험을 더할까요?",
    nextStep: "구체적인 사례를 더해보세요.",
  },
  suggestions: [
    {
      id: contentId,
      value: 5,
      quote: "누구나 책을 읽을 수 있기 때문이다.",
      reason: "근거를 제시함",
    },
  ],
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("teacher review draft boundaries", () => {
  it("accepts grounded content proposals but rejects invented quotes and custom/process scores", () => {
    expect(checkedDraft(valid, s, a).provider).toBe("ai");
    expect(() =>
      checkedDraft(
        { ...valid, feedback: { ...valid.feedback, quote: "없는 문장" } },
        s,
        a,
      ),
    ).toThrow();
    for (const id of [
      "proof:identity",
      "proof:effort",
      "custom:1",
      "common:response",
    ]) {
      expect(() =>
        checkedDraft(
          { ...valid, suggestions: [{ ...valid.suggestions[0], id }] },
          s,
          a,
        ),
      ).toThrow();
    }
    expect(() =>
      checkedDraft(
        { ...valid, suggestions: [{ ...valid.suggestions[0], value: 100 }] },
        s,
        a,
      ),
    ).toThrow();
  });
  it("does not fabricate AI results when configuration is absent", async () => {
    vi.stubEnv("PROOFWRITE_AI_API_KEY", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const draft = await prepareReviewDraft(s, a);
    expect(draft.provider).toBe("guide");
    expect(draft.suggestions).toEqual([]);
    expect(draft.feedback.strength).toBe("");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("parses a mocked completed Responses API result and sends only eligible criteria", async () => {
    vi.stubEnv("PROOFWRITE_AI_API_KEY", "test-only");
    vi.stubEnv("PROOFWRITE_AI_MODEL", "configured-model");
    const mock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "completed",
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: JSON.stringify(valid) }],
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", mock);
    const draft = await prepareReviewDraft({ ...s, id: "mock-response" }, a);
    expect(draft.provider).toBe("ai");
    const request = JSON.parse(mock.mock.calls[0][1].body);
    expect(request.store).toBe(false);
    expect(
      JSON.parse(request.input).eligibleCriteria.every(
        (c: { source: string }) => c.source === "content",
      ),
    ).toBe(true);
  });
  it("falls back visibly when the AI response is incomplete", async () => {
    vi.stubEnv("PROOFWRITE_AI_API_KEY", "test-only");
    vi.stubEnv("PROOFWRITE_AI_MODEL", "configured-model");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({ status: "incomplete", output: [] }),
        }),
    );
    const draft = await prepareReviewDraft(
      { ...s, id: "incomplete-response" },
      a,
    );
    expect(draft.provider).toBe("guide");
    expect(draft.message).toContain("완료하지 못해");
  });
});
