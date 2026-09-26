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
  await student
    .getByLabel("노력 자료 첨부")
    .setInputFiles({
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
  await page.goto("/teacher");
  await page
    .getByRole("button", { name: "ProofMe 시험 학생", exact: true })
    .click();
  await page
    .getByRole("button", { name: "다섯 가지 증거", exact: true })
    .click();
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
  await context.close();
  await anonymous.close();
});
