import { test, expect, type Page } from "@playwright/test";
import {
  recommendedPlan,
  redistribute,
  blankEvaluation,
  scoreCriteria,
} from "../src/core/assessment";
import { TYPING_TEXT } from "../src/core/identity";
import { fiveEvidence } from "../src/core/proof/five-evidence";
import type { Assignment, Submission } from "../src/core/model";
const origin = "http://127.0.0.1:3100";
async function create(page: Page, assessment = recommendedPlan("reflection")) {
  await page.request.post("/api/teacher/login", {
    headers: { origin },
    data: { password: "pilot-test-password-only" },
  });
  const r = await page.request.post("/api/assignments", {
    headers: { origin },
    data: {
      title: "무료 완성 기능 검증",
      description: "내 생각을 설명하기",
      policy: "COACH",
      minRead: 1,
      fullRead: false,
      questions: [],
      assessment,
    },
  });
  expect(r.ok()).toBe(true);
  return (await r.json()).assignment as Assignment;
}
async function submit(page: Page) {
  await page
    .getByRole("button", { name: "제출 확인하기", exact: true })
    .click();
  await page.getByRole("button", { name: "제출하기", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "생각과 과정을 함께 전했어요." }),
  ).toBeVisible();
}
test("identity enrollment, teacher witness, writing comparison, report and private recovery", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  const a = await create(page),
    ctx = await browser.newContext(),
    student = await ctx.newPage();
  const { id } = await (
    await ctx.request.post(`${origin}/api/join/${a.id}`, {
      headers: { origin },
      data: { code: a.joinCode, alias: "기준 등록 학생", consent: true },
    })
  ).json();
  await student.goto(
    `/student/identity?returnTo=${encodeURIComponent(`/task/${id}`)}`,
  );
  await student
    .getByLabel("이름 또는 별명", { exact: true })
    .fill("기준 등록 학생");
  await student
    .getByLabel("이 브라우저의 기존 과제가 모두 내 과제이며 함께 연결합니다.")
    .check();
  await student
    .getByLabel("학생 연결과 비밀 연결 코드 보관 안내를 확인했습니다.")
    .check();
  const created = student.waitForResponse(
    (r) =>
      r.url().endsWith("/api/student/account") &&
      r.request().method() === "POST",
  );
  await student
    .getByRole("button", { name: "학생 연결 만들기", exact: true })
    .click();
  const account = await (await created).json();
  expect(account.claimed).toBe(1);
  expect(account.code).toBeTruthy();
  expect(account.student.recoveryHash).toBeUndefined();
  await student.getByLabel("따라 치기 언어").selectOption("en");
  await student
    .getByLabel(
      "입력 습관 기준을 등록하고 과제 작성 기록과 비교하는 데 동의합니다.",
    )
    .check();
  await student.getByRole("button", { name: "타자 기준 등록 시작" }).click();
  await student
    .getByLabel("따라 치기 입력", { exact: true })
    .pressSequentially(TYPING_TEXT.en, { delay: 15 });
  await student.getByRole("button", { name: "자유 입력으로 이동" }).click();
  const text =
    "I believed the first answer was always the best answer. After reading two examples I compared the evidence and changed my explanation. I learned to show my reasons clearly so that another person can understand my choices.";
  await student
    .getByLabel("자유 입력", { exact: true })
    .pressSequentially(text, { delay: 15 });
  const saved = student.waitForResponse(
    (r) =>
      r.url().endsWith("/api/student/typing") &&
      r.request().postDataJSON()?.action === "save",
  );
  await student
    .getByRole("button", { name: "타자 기준 저장", exact: true })
    .click();
  const savedResponse = await saved;
  expect(savedResponse.ok()).toBe(true);
  const registration = (await savedResponse.json()).student.registrations[0];
  expect(
    (
      await ctx.request.post(`${origin}/api/student/typing`, {
        headers: { origin },
        data: savedResponse.request().postDataJSON(),
      })
    ).status(),
  ).toBe(400);
  expect(JSON.stringify(registration)).not.toContain(text);
  await student.setViewportSize({ width: 390, height: 844 });
  expect(
    await student.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await student.screenshot({
    path: "test-results/free-typing-mobile.png",
    fullPage: true,
  });
  await page.goto("/teacher");
  await page
    .getByRole("button", { name: "기준 등록 학생", exact: true })
    .click();
  await page
    .getByRole("button", { name: "다섯 가지 증거", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "등록 확인 저장" }),
  ).toBeDisabled();
  await page
    .getByLabel("이 학생이 타자 기준을 등록하는 모습을 직접 확인했습니다.")
    .check();
  await page.getByRole("button", { name: "등록 확인 저장" }).click();
  await expect(page.getByText("등록 모습 확인을 저장했습니다.")).toBeVisible();
  await student.goto(`/write/${id}`);
  await student
    .getByLabel("글 제목", { exact: true })
    .fill("나의 생각을 설명하는 방법");
  await student.getByText("작성 리듬 연구 설정", { exact: true }).click();
  await student.getByLabel("타이핑 습관 비교에 참여", { exact: true }).check();
  await student
    .getByLabel("작성 환경 설명 (선택)")
    .fill("같은 교실 키보드에서 입력했습니다.");
  const editor = student.getByLabel("과제 본문", { exact: true });
  await editor.click();
  await student.keyboard.press("Control+End");
  await editor.pressSequentially(text, { delay: 15 });
  await submit(student);
  const s: Submission = (
    await (await ctx.request.get(`${origin}/api/submissions/${id}`)).json()
  ).submission;
  expect(s.rhythmBaseline?.registrationId).toBe(registration.id);
  expect(s.rhythmBaseline?.verifiedAt).toBeGreaterThan(0);
  expect(fiveEvidence(s)[4].available).toBe(true);
  await student
    .getByLabel("작성 기록 재확인 설명")
    .fill("종이에 먼저 구상한 내용도 있습니다. 함께 확인해주세요.");
  await student.getByRole("button", { name: "설명 저장" }).click();
  await expect(
    student.getByText("선생님께 보여줄 설명을 저장했습니다."),
  ).toBeVisible();
  await student
    .getByRole("link", { name: "나의 증명 보고서", exact: true })
    .click();
  await expect(
    student.getByRole("heading", { name: "나의 증명 보고서", exact: true }),
  ).toBeVisible();
  await expect(
    student.getByText("등록한 나의 타자 기준과 비교", { exact: true }),
  ).toBeVisible();
  await student.setViewportSize({ width: 1280, height: 900 });
  await student.screenshot({
    path: "test-results/free-proof-report.png",
    fullPage: true,
  });
  const other = await browser.newContext();
  await other.request.post(`${origin}/api/student/account`, {
    headers: { origin },
    data: {
      action: "create",
      alias: "기준 등록 학생",
      consent: true,
      claimExisting: false,
    },
  });
  expect(
    (await other.request.get(`${origin}/api/submissions/${id}`)).status(),
  ).toBe(403);
  await other.close();
  const recovered = await browser.newContext();
  expect(
    (
      await recovered.request.post(`${origin}/api/student/account`, {
        headers: { origin },
        data: { action: "recover", code: account.code },
      })
    ).ok(),
  ).toBe(true);
  const tasks = await (
    await recovered.request.get(`${origin}/api/student`)
  ).json();
  expect(tasks.tasks.some((t: { id: string }) => t.id === id)).toBe(true);
  const resumed = await (
    await recovered.request.post(`${origin}/api/join/${a.id}`, {
      headers: { origin },
      data: { code: a.joinCode, alias: "다른 표시 이름", consent: true },
    })
  ).json();
  expect(resumed.id).toBe(id);
  const rotated = await (
    await recovered.request.post(`${origin}/api/student/account`, {
      headers: { origin },
      data: { action: "rotate" },
    })
  ).json();
  expect(rotated.code).not.toBe(account.code);
  expect(
    (await ctx.request.get(`${origin}/api/submissions/${id}`)).status(),
  ).toBe(403);
  expect(
    (
      await ctx.request.post(`${origin}/api/student/account`, {
        headers: { origin },
        data: { action: "recover", code: account.code },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await recovered.request.post(`${origin}/api/student/typing`, {
        headers: { origin },
        data: { action: "delete", registrationId: registration.id },
      })
    ).ok(),
  ).toBe(true);
  const after = (
    await (
      await recovered.request.get(`${origin}/api/submissions/${id}`)
    ).json()
  ).submission;
  expect(after.rhythmBaseline).toBeUndefined();
  expect(after.doc).toEqual(s.doc);
  await recovered.close();
  await ctx.close();
});

test("recommendation preview keeps teacher weights, exclusions and feedback settings", async ({
  page,
}) => {
  await create(page);
  await page.goto("/teacher");
  await page.getByRole("button", { name: "새 과제", exact: true }).click();
  await page.getByLabel("과제 유형", { exact: true }).selectOption("research");
  await page
    .getByLabel("이번 글의 배움 목표")
    .fill("창의력은 이번에 평가하지 않습니다.");
  await page
    .getByLabel("대상 학년", { exact: true })
    .selectOption("middlePrimary");
  await page.getByText("학생 작성 양식 미리보기", { exact: true }).click();
  await expect(page.locator(".template-preview li")).toHaveCount(3);
  await page.getByText("평가 항목·배점 조정", { exact: true }).click();
  await page
    .getByLabel("노력의 증거 사용", { exact: true })
    .selectOption("exclude");
  await page
    .getByRole("button", { name: "교사 항목 추가", exact: true })
    .click();
  const custom = page.locator(".criterion-row").last();
  await custom.getByRole("textbox", { name: /항목 이름/ }).fill("직접 관찰");
  await page.getByLabel("직접 관찰 배점", { exact: true }).fill("30");
  await page.getByLabel("직접 관찰 배점 고정", { exact: true }).check();
  await page
    .getByRole("button", { name: "유형·목표로 추천 다시 적용" })
    .click();
  await expect(page.locator(".allocation-preview")).toContainText(
    "직접 관찰: 30 → 30점",
  );
  await page.getByRole("button", { name: "배분 적용", exact: true }).click();
  await expect(page.getByLabel("직접 관찰 배점", { exact: true })).toHaveValue(
    "30",
  );
  await expect(
    page.getByLabel("노력의 증거 사용", { exact: true }),
  ).toHaveValue("exclude");
  await expect(
    page.getByLabel("창의적 발상 사용", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("평가 방식", { exact: true }).selectOption("feedback");
  await page.getByLabel("평가 방식", { exact: true }).selectOption("score");
  await expect(page.getByLabel("직접 관찰 배점", { exact: true })).toHaveValue(
    "30",
  );
  await expect(
    page.getByText("배점 합계 100 / 100점", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/free-rubric-preservation.png" });
});

test("photo compression, separate attachments, and unavailable evidence grading", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const plan = recommendedPlan("reflection");
  plan.criteria = redistribute(
    plan.criteria.map((c) =>
      c.id === "proof:identity" ? { ...c, mode: "score", weight: 10 } : c,
    ),
  );
  const a = await create(page, plan),
    ctx = await browser.newContext(),
    student = await ctx.newPage();
  const { id } = await (
    await ctx.request.post(`${origin}/api/join/${a.id}`, {
      headers: { origin },
      data: { code: a.joinCode, alias: "첨부 시험", consent: true },
    })
  ).json();
  await student.goto(`/write/${id}`);
  await student.getByLabel("글 제목", { exact: true }).fill("관찰과 근거");
  await student
    .getByLabel("과제 본문", { exact: true })
    .fill("나는 관찰한 내용을 비교하고 나의 설명을 바꾸었다.");
  const png = await student.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1200;
    const c = canvas.getContext("2d")!,
      d = c.createImageData(1200, 1200);
    let state = 42;
    for (let i = 0; i < d.data.length; i += 4) {
      for (let k = 0; k < 3; k++) {
        state = (state * 1664525 + 1013904223) >>> 0;
        d.data[i + k] = state >>> 24;
      }
      d.data[i + 3] = 255;
    }
    c.putImageData(d, 0, 0);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const buffer = Buffer.from(png, "base64");
  expect(buffer.length).toBeGreaterThan(2 * 1024 * 1024);
  await student
    .getByLabel("과제 자료 첨부")
    .setInputFiles({ name: "large.png", mimeType: "image/png", buffer });
  await expect(
    student.getByText("사진을 2MB 이하로 줄였어요.", { exact: false }),
  ).toBeVisible();
  await submit(student);
  const s: Submission = (
    await (await ctx.request.get(`${origin}/api/submissions/${id}`)).json()
  ).submission;
  expect(s.attachments![0].size).toBeLessThanOrEqual(2 * 1024 * 1024);
  expect(s.attachments![0].mime).toBe("image/jpeg");
  await page.goto("/teacher");
  await page.getByRole("button", { name: "첨부 시험", exact: true }).click();
  await page
    .getByRole("button", { name: "다섯 가지 증거", exact: true })
    .click();
  const files = page
    .locator("section.panel")
    .filter({
      has: page.getByRole("heading", { name: "과제 첨부자료", exact: true }),
    });
  await expect(files.getByRole("link", { name: "large.jpg" })).toBeVisible();
  await expect(page.getByText("노력 첨부자료가 없습니다.")).toBeVisible();
  const ev = blankEvaluation(plan);
  ev.confirmed = true;
  ev.scores = ev.scores.map((row) => ({
    ...row,
    value: plan.criteria.find((c) => c.id === row.id)!.weight,
    note: "제출 자료에서 직접 확인",
  }));
  const payload = {
    baseReviewUpdatedAt: 0,
    passages: [],
    fullRead: true,
    reaction: "",
    completed: true,
    feedback: {
      quote: "나는 관찰한 내용을 비교하고 나의 설명을 바꾸었다.",
      strength: "관찰과 변화의 연결을 설명했습니다.",
      question: "",
      nextStep: "구체적인 관찰 사례를 더해보세요.",
    },
    assessment: ev,
  };
  expect(
    (
      await page.request.post(`/api/submissions/${id}/review`, {
        headers: { origin },
        data: payload,
      })
    ).status(),
  ).toBe(400);
  const missing = fiveEvidence(s, a)
    .filter((axis) => !axis.available)
    .map((axis) => `proof:${axis.id}`);
  ev.scores = ev.scores.map((row) =>
    missing.includes(row.id)
      ? {
          ...row,
          value: null,
          unavailable: true,
          note: "직접 비교할 관찰 자료가 부족합니다.",
        }
      : row,
  );
  const response = await page.request.post(`/api/submissions/${id}/review`, {
    headers: { origin },
    data: { ...payload, assessment: ev },
  });
  expect(response.ok()).toBe(true);
  const result = (await response.json()).review.assessment;
  expect(result.total).toBe(100);
  expect(result.availableMax).toBeLessThan(100);
  await student.reload();
  await expect(
    student.getByRole("heading", { name: "선생님이 확정한 평가 100 / 100점" }),
  ).toBeVisible();
  await ctx.close();
});
