import { test, expect } from "@playwright/test";
const origin = "http://127.0.0.1:3100";
test("ProofMe task overview, effort attachment, bottom submit, dashboard and teacher evidence", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await page.request.post("/api/teacher/login", {
    headers: { origin },
    data: { password: "pilot-test-password-only" },
  });
  const { assignment } = await (
    await page.request.post("/api/assignments", {
      headers: { origin },
      data: {
        title: "ProofMe 다섯 가지 증거 체험",
        description: "입장과 근거를 연결하고 달라진 생각을 써보세요.",
        policy: "COACH",
        minRead: 2,
        fullRead: false,
        questions: [],
        dueAt: Date.now() + 86400000,
        contentPriorities: ["perspective", "argument"],
      },
    })
  ).json();
  const context = await browser.newContext();
  const student = await context.newPage();
  await student.goto(`/join/${assignment.id}?code=${assignment.joinCode}`);
  await student
    .getByLabel("선생님이 알아볼 이름 또는 별명")
    .fill("ProofMe 시험 학생");
  await student.getByLabel("작성과정 기록 안내를 읽었어요.").check();
  await student.getByRole("button", { name: "과제 확인 · 참여하기" }).click();
  await expect(student).toHaveURL(/\/task\//);
  await expect(
    student.getByRole("heading", { name: assignment.title }),
  ).toBeVisible();
  await student.screenshot({
    path: "test-results/proofme-task.png",
    fullPage: true,
  });
  await student.getByRole("link", { name: "글쓰기 시작 · 이어쓰기" }).click();
  await student
    .getByLabel("글 제목", { exact: true })
    .fill("생각이 달라진 이유");
  await student
    .getByLabel("과제 본문", { exact: true })
    .fill(
      "처음에는 결과만 중요하다고 생각했다. 하지만 이제는 시도하며 배우는 과정도 중요하다.\n왜냐하면 친구의 발표를 도우면서 실수에서 배우는 사례를 보았기 때문이다.",
    );
  await student
    .getByRole("button", { name: "제출 확인하기", exact: true })
    .click();
  await expect(
    student.getByRole("button", { name: "제출하기", exact: true }),
  ).toBeDisabled();
  await student
    .getByRole("button", { name: "노력의 증거 작성하러 가기" })
    .click();
  await student
    .getByLabel("무엇을 해보았나요?")
    .fill("발표 사례를 찾아 비교한 뒤, 결과만 중요하다는 주장을 고쳤어요.");
  const pdf = Buffer.from("%PDF-1.4\n% fictional effort note\n%%EOF");
  await student.getByLabel("노력 자료 첨부").setInputFiles({
    name: "노력-메모.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await expect(
    student.getByRole("link", { name: "노력-메모.pdf" }),
  ).toBeVisible();
  await student.getByRole("button", { name: "지금 저장", exact: true }).click();
  await expect(
    student.getByText("모든 변경사항 저장됨", { exact: true }),
  ).toBeVisible();
  await student.reload();
  await expect(student.getByLabel("무엇을 해보았나요?")).toHaveValue(
    /발표 사례/,
  );
  await expect(
    student.getByRole("link", { name: "노력-메모.pdf" }),
  ).toBeVisible();
  const id = student.url().split("/").at(-1)!;
  await student.setViewportSize({ width: 390, height: 844 });
  await student
    .getByRole("button", { name: "제출 확인하기", exact: true })
    .scrollIntoViewIfNeeded();
  expect(
    await student.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await student.screenshot({
    path: "test-results/proofme-submit-mobile.png",
    fullPage: true,
  });
  await student
    .getByRole("button", { name: "제출 확인하기", exact: true })
    .click();
  await student.getByRole("button", { name: "제출하기", exact: true }).click();
  await expect(
    student.getByRole("heading", { name: "생각과 과정을 함께 전했어요." }),
  ).toBeVisible();
  const submitted = (
    await (await student.request.get(`/api/submissions/${id}`)).json()
  ).submission;
  expect(submitted.pick).toBeNull();
  expect(submitted.submittedAt).toBeGreaterThan(0);
  expect(submitted.effort.attachments[0].size).toBe(pdf.length);
  await student.getByRole("link", { name: "내 과제로 돌아가기" }).click();
  await student
    .getByRole("button", { name: "제출한 과제", exact: true })
    .click();
  await expect(
    student.getByRole("heading", { name: assignment.title }),
  ).toBeVisible();
  await student.getByRole("button", { name: "나의 과정", exact: true }).click();
  await expect(
    student.getByRole("heading", { name: "노력의 증거", exact: true }),
  ).toBeVisible();
  await student.screenshot({
    path: "test-results/proofme-process-mobile.png",
    fullPage: true,
  });
  const anonymous = await browser.newContext();
  const anonymousTasks = await (
    await anonymous.request.get(`${origin}/api/student`)
  ).json();
  expect(anonymousTasks.tasks).toEqual([]);
  expect(
    (
      await anonymous.request.post(
        `${origin}/api/assignments/${assignment.id}/settings`,
        { headers: { origin }, data: { contentPriorities: ["logic"] } },
      )
    ).status(),
  ).toBe(401);
  // A second submitted student exercises the saved-review → next-student flow.
  const second = await browser.newContext();
  const secondPage = await second.newPage();
  const joined = await (
    await second.request.post(`${origin}/api/join/${assignment.id}`, {
      headers: { origin },
      data: { code: assignment.joinCode, alias: "다음 학생", consent: true },
    })
  ).json();
  await secondPage.goto(`/write/${joined.id}`);
  await secondPage
    .getByLabel("글 제목", { exact: true })
    .fill("다음 학생의 글");
  await secondPage
    .getByLabel("과제 본문", { exact: true })
    .fill("나는 시도할 때마다 배우는 것이 있다고 생각한다.");
  await secondPage
    .getByLabel("무엇을 해보았나요?")
    .fill("첫 문장을 두 번 다시 써보았습니다.");
  await secondPage
    .getByRole("button", { name: "제출 확인하기", exact: true })
    .click();
  await secondPage
    .getByRole("button", { name: "제출하기", exact: true })
    .click();
  await expect(
    secondPage.getByRole("heading", { name: "생각과 과정을 함께 전했어요." }),
  ).toBeVisible();
  const roster = await (
    await page.request.get(`/api/assignments/${assignment.id}`)
  ).json();
  const row = roster.submissions.find((r: { id: string }) => r.id === id);
  expect(row.score.total).toBeGreaterThan(0);
  expect(row.score.availableMax).toBe(75);
  expect(row.reading.fulfilled).toBe(false);
  await page.goto("/teacher");
  await expect(
    page.getByRole("columnheader", { name: "과정기록 종합점수" }),
  ).toBeVisible();
  await page.getByLabel("학생·글 제목 검색").fill("ProofMe 시험 학생");
  await expect(
    page.getByRole("button", { name: "다음 학생", exact: true }),
  ).not.toBeVisible();
  await page.getByLabel("학생 목록 정렬").selectOption("name");
  await page.screenshot({
    path: "test-results/proofme-score-roster.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "ProofMe 시험 학생", exact: true })
    .click();
  await expect(page.locator(".score-large")).not.toBeVisible();
  await page
    .getByRole("button", { name: "다섯 가지 증거", exact: true })
    .click();
  const scorePanel = page.getByRole("region", { name: "과정기록 종합점수" });
  await expect(scorePanel.locator(".score-large")).toContainText(
    String(row.score.total),
  );
  await scorePanel
    .getByText("점수의 근거와 계산 펼치기", { exact: true })
    .click();
  await expect(
    scorePanel.getByText("리듬 항목은 해당 없음입니다.", { exact: false }),
  ).toBeVisible();
  await expect(
    scorePanel.getByText("입력 습관 비교", { exact: false }),
  ).toBeVisible();
  for (const title of [
    "생각의 증거",
    "집중의 증거",
    "성실의 증거",
    "노력의 증거",
    "나라는 증거",
  ])
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  await expect(page.getByRole("link", { name: "노력-메모.pdf" })).toBeVisible();
  await page.screenshot({
    path: "test-results/proofme-teacher-evidence.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "읽기 안내", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "관점 변화 · 읽기 후보" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "앞뒤 맥락·전체 글 보기" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "선택한 대목의 앞뒤 맥락" }),
  ).toBeVisible();
  const complete = page.getByRole("button", {
    name: "피드백 전달",
    exact: true,
  });
  await page.getByLabel("함께 볼 대목").fill("본문에 없는 인용");
  await page
    .getByLabel("잘된 점과 그 이유")
    .fill("결과와 과정을 비교해서 관점의 변화가 드러납니다.");
  await page
    .getByLabel("다음에 해볼 수정 한 가지")
    .fill("친구를 도왔던 구체적인 장면을 더해보세요.");
  await page.getByLabel("전체 글을 읽었어요").check();
  await expect(complete).toBeDisabled();
  await expect(
    page.getByText("본문에 있는 표현을 그대로 가져와주세요."),
  ).toBeVisible();
  await page
    .getByLabel("함께 볼 대목")
    .fill("처음에는 결과만 중요하다고 생각했다.");
  await complete.click();
  await expect(page.getByText("피드백을 학생에게 전했습니다.")).toBeVisible();
  await page.getByRole("button", { name: /다음 읽기 대기 학생/ }).click();
  await expect(
    page.getByRole("heading", { name: "다음 학생의 글", level: 1 }),
  ).toBeVisible();
  await expect(page.getByLabel("함께 볼 대목")).toHaveValue("");
  await expect(page.getByLabel("전체 글을 읽었어요")).not.toBeChecked();
  await expect(complete).toBeDisabled();
  await page.getByRole("button", { name: "학생 목록", exact: true }).click();
  await page.getByLabel("학생·글 제목 검색").fill("");
  await page.getByLabel("제출 필터").selectOption("reviewed");
  await expect(
    page.getByRole("button", { name: "ProofMe 시험 학생", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "다음 학생", exact: true }),
  ).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/proofme-score-roster-mobile.png",
    fullPage: true,
  });
  await second.close();
  await context.close();
  await anonymous.close();
});
