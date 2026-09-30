import { test, expect } from "@playwright/test";
import {
  CATEGORY_IDS,
  CATEGORIES,
  recommendedPlan,
  scoreCriteria,
} from "../src/core/assessment";
import type { Assignment, Submission } from "../src/core/model";
const origin = "http://127.0.0.1:3100";
test("teacher publishes adjusted rubric → student format and effort exclusion → teacher confirms manual grades", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  await page.request.post("/api/teacher/login", {
    headers: { origin },
    data: { password: "pilot-test-password-only" },
  });
  await page.goto("/teacher");
  await page.getByRole("button", { name: "새 과제", exact: true }).click();
  await page
    .getByLabel("과제 제목", { exact: true })
    .fill("환경 조사 · 평가 흐름 모의시험");
  await page
    .getByLabel("학생에게 전할 안내")
    .fill("지역 환경 자료를 비교하고 개선안을 제안하세요.");
  await page
    .getByLabel("이번 글의 배움 목표")
    .fill("자료의 신뢰성을 확인하고 근거를 설명하기");
  await page.getByLabel("과제 유형", { exact: true }).selectOption("research");
  await page.getByText("평가 항목·배점 조정", { exact: true }).click();
  await page
    .getByLabel("노력의 증거 사용", { exact: true })
    .selectOption("exclude");
  await page.getByLabel("생각의 증거 배점 고정", { exact: true }).check();
  await page
    .getByRole("button", { name: "교사 항목 추가", exact: true })
    .click();
  const custom = page.locator(".criterion-row").last();
  await custom
    .getByRole("textbox", { name: /항목 이름/ })
    .fill("현장 질문의 적절성");
  await custom.getByText("판단 기준 확인·수정", { exact: true }).click();
  await page
    .getByLabel("현장 질문의 적절성 판단 기준", { exact: true })
    .fill("교사가 직접 들은 현장 질문이 탐구 목적과 연결되는가");
  await page.getByLabel("현장 질문의 적절성 배점", { exact: true }).fill("20");
  await page
    .getByLabel("현장 질문의 적절성 배점 고정", { exact: true })
    .check();
  await expect(
    page.getByRole("button", { name: "과제 만들기", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "남은 배점 자동 배분 미리보기" })
    .click();
  await expect(page.locator(".allocation-preview")).toContainText(
    "생각의 증거: 10 → 10점",
  );
  await page.getByRole("button", { name: "배분 적용", exact: true }).click();
  await expect(
    page.getByText("배점 합계 100 / 100점", { exact: true }),
  ).toBeVisible();
  const created = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/assignments") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "과제 만들기", exact: true }).click();
  const { assignment: a }: { assignment: Assignment } = await (
    await created
  ).json();
  expect(a.assessment!.category).toBe("research");
  expect(a.publishedAt).toBeGreaterThan(0);
  const ctx = await browser.newContext();
  const student = await ctx.newPage();
  await student.goto(`/join/${a.id}?code=${a.joinCode}`);
  await student
    .getByLabel("선생님이 알아볼 이름 또는 별명")
    .fill("배점 시험 학생");
  await student.getByLabel("작성과정 기록 안내를 읽었어요.").check();
  await student.getByRole("button", { name: "과제 확인 · 참여하기" }).click();
  await expect(student.getByLabel("확정된 평가 기준")).toContainText(
    "현장 질문의 적절성",
  );
  await student.getByRole("link", { name: "글쓰기 시작 · 이어쓰기" }).click();
  const editor = student.getByLabel("과제 본문", { exact: true });
  await expect(editor).toContainText("탐구 질문");
  await expect(editor.locator("table")).toBeVisible();
  await student
    .getByLabel("글 제목", { exact: true })
    .fill("쓰레기를 줄이는 방법");
  await student
    .getByRole("button", { name: "제출 확인하기", exact: true })
    .click();
  await expect(
    student.getByRole("button", { name: "제출하기", exact: true }),
  ).toBeDisabled();
  await student
    .getByRole("button", { name: "글로 돌아가기", exact: true })
    .click();
  const text =
    "나는 분리수거 안내를 바꾸어야 한다고 생각한다.\n왜냐하면 학교 앞 두 장소를 비교했을 때 설명이 있는 곳에서 분리수거가 잘 되었기 때문이다.\n다만 하루만 관찰했으므로 다른 요일에도 살펴볼 필요가 있다.";
  await editor.fill(text);
  await expect(student.getByLabel("무엇을 해보았나요?")).toHaveCount(0);
  await student.getByLabel("과제 자료 첨부").setInputFiles({
    name: "관찰.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nfixture\n%%EOF"),
  });
  await student.getByRole("button", { name: "지금 저장", exact: true }).click();
  await expect(
    student.getByText("모든 변경사항 저장됨", { exact: true }),
  ).toBeVisible();
  await student.reload();
  await expect(editor).toContainText("분리수거 안내");
  await expect(editor).not.toContainText("탐구 질문");
  await student.setViewportSize({ width: 390, height: 844 });
  expect(
    await student.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await student.getByLabel("확정된 평가 기준").scrollIntoViewIfNeeded();
  expect(
    (await student.getByLabel("확정된 평가 기준").boundingBox())!.width,
  ).toBeGreaterThan(300);
  await student.screenshot({
    path: "test-results/assessment-student-mobile.png",
  });
  await student
    .getByRole("button", { name: "제출 확인하기", exact: true })
    .click();
  await student.getByRole("button", { name: "제출하기", exact: true }).click();
  await expect(
    student.getByRole("heading", { name: "생각과 과정을 함께 전했어요." }),
  ).toBeVisible();
  const id = student.url().split("/").at(-1)!;
  const { submission: s }: { submission: Submission } = await (
    await student.request.get(`/api/submissions/${id}`)
  ).json();
  expect(s.assessment).toEqual(a.assessment);
  expect(s.effort?.attempt || "").toBe("");
  expect(s.attachments?.length).toBe(1);
  const revised = await page.request.post(`/api/assignments/${a.id}/settings`, {
    headers: { origin },
    data: { contentPriorities: ["logic"] },
  });
  expect(revised.status()).toBe(409);
  const forbidden = await student.request.post(
    `/api/submissions/${id}/review-draft`,
    { headers: { origin }, data: {} },
  );
  expect(forbidden.status()).toBe(401);
  await page.getByRole("button", { name: "새로고침", exact: true }).click();
  await page
    .getByRole("button", { name: "배점 시험 학생", exact: true })
    .click();
  await expect(page.getByText(/AI 연결 전/)).toBeVisible();
  await page
    .getByRole("button", { name: "초안을 평가란에 반영", exact: true })
    .click();
  await page.getByLabel("전체 글을 읽었어요").check();
  await page
    .getByLabel("잘된 점과 그 이유")
    .fill("관찰 사실과 한계를 구분하여 주장의 범위를 설명했어요.");
  await page
    .getByLabel("다음에 해볼 수정 한 가지")
    .fill("비교한 두 장소와 관찰 날짜를 구체적으로 덧붙여보세요.");
  const scored = scoreCriteria(a.assessment!);
  for (const c of scored.filter((c) => c.source !== "custom")) {
    await page
      .getByLabel(`${c.label} 평가 점수`, { exact: true })
      .fill(String(c.weight));
    if (c.source === "proof")
      await page
        .getByLabel(`${c.label} 확인 근거`, { exact: true })
        .fill("제출 내용과 기록에서 설명 및 수행 일정을 확인했습니다.");
  }
  await page.getByLabel("평가와 근거 최종 확인").check();
  const finish = page.getByRole("button", {
    name: "평가 확정·피드백 전달",
    exact: true,
  });
  await expect(finish).toBeDisabled();
  await page.getByRole("button", { name: "중간 저장", exact: true }).click();
  await expect(
    page.getByText("중간 저장했습니다. 학생에게는 아직 보이지 않습니다."),
  ).toBeVisible();
  const hidden = await (
    await student.request.get(`/api/submissions/${id}`)
  ).json();
  expect(hidden.submission.review.assessment).toBeUndefined();
  const saved = await (await page.request.get(`/api/submissions/${id}`)).json();
  const payload = {
    passages: saved.submission.review.passages,
    fullRead: true,
    reaction: "",
    completed: true,
    feedback: saved.submission.review.feedback,
    assessment: saved.submission.review.assessment,
    baseReviewUpdatedAt: saved.submission.review.updatedAt,
  };
  expect(
    (
      await page.request.post(`/api/submissions/${id}/review`, {
        headers: { origin },
        data: payload,
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post(`/api/submissions/${id}/review`, {
        headers: { origin },
        data: { ...payload, completed: false, baseReviewUpdatedAt: 0 },
      })
    ).status(),
  ).toBe(409);
  await page
    .getByLabel("현장 질문의 적절성 평가 점수", { exact: true })
    .fill("15");
  await page
    .getByLabel("현장 질문의 적절성 확인 근거", { exact: true })
    .fill("현장 질문은 적절했지만 관찰 조건을 묻는 후속 질문이 부족했습니다.");
  await page.getByLabel("평가와 근거 최종 확인").check();
  await expect(finish).toBeEnabled();
  await finish.click();
  await expect(page.getByText("피드백을 학생에게 전했습니다.")).toBeVisible();
  await page.locator(".evaluation-editor").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/assessment-teacher-desktop.png",
  });
  await student.reload();
  await expect(
    student.getByRole("heading", { name: "선생님이 확정한 평가 95 / 100점" }),
  ).toBeVisible();
  await expect(
    student.getByText(
      "현장 질문은 적절했지만 관찰 조건을 묻는 후속 질문이 부족했습니다.",
    ),
  ).toBeVisible();
  // A teacher can revise a published grade; the server recomputes the total.
  await page
    .getByLabel("현장 질문의 적절성 평가 점수", { exact: true })
    .fill("14");
  await page.getByLabel("평가와 근거 최종 확인").check();
  await finish.click();
  await expect(page.getByText("피드백을 학생에게 전했습니다.")).toBeVisible();
  await student.reload();
  await expect(
    student.getByRole("heading", { name: "선생님이 확정한 평가 94 / 100점" }),
  ).toBeVisible();
  await ctx.close();
});

test("all eight published categories reach the matching student workspace without changing saved work", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  await page.request.post("/api/teacher/login", {
    headers: { origin },
    data: { password: "pilot-test-password-only" },
  });
  const ctx = await browser.newContext();
  const student = await ctx.newPage();
  for (const category of CATEGORY_IDS) {
    const plan = recommendedPlan(category);
    const response = await page.request.post("/api/assignments", {
      headers: { origin },
      data: {
        title: `양식 점검 ${category}`,
        description: "유형별 학생 화면 점검",
        policy: "COACH",
        minRead: 1,
        fullRead: false,
        questions: [],
        assessment: plan,
      },
    });
    expect(response.status()).toBe(200);
    const { assignment: a } = await response.json();
    const joined = await ctx.request.post(`${origin}/api/join/${a.id}`, {
      headers: { origin },
      data: { code: a.joinCode, alias: `양식 ${category}`, consent: true },
    });
    const { id } = await joined.json();
    await student.goto(`/write/${id}`);
    const editor = student.getByLabel("과제 본문", { exact: true });
    await expect(editor).toContainText(CATEGORIES[category].sections[0]);
    await expect(student.getByLabel("확정된 평가 기준")).toContainText(
      CATEGORIES[category].label,
    );
    const read = await (
      await ctx.request.get(`${origin}/api/submissions/${id}`)
    ).json();
    expect(read.submission.assessment).toEqual(plan);
    if (CATEGORIES[category].table)
      await expect(editor.locator("table")).toBeVisible();
    if (category === "presentation")
      await expect(student.locator(".assignment-format")).toContainText(
        "PPT·영상은 외부에서 제작",
      );
  }
  await ctx.close();
});
