import { test, expect, type Page } from "@playwright/test";
const origin = "http://127.0.0.1:3100";
async function selectText(page: Page, text?: string) {
  await page
    .getByRole("textbox", { name: "과제 본문" })
    .evaluate((el, needle) => {
      const sel = window.getSelection()!;
      const range = document.createRange();
      if (!needle) range.selectNodeContents(el);
      else {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const at = node.textContent?.indexOf(needle) ?? -1;
          if (at >= 0) {
            range.setStart(node, at);
            range.setEnd(node, at + needle.length);
            break;
          }
        }
      }
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    }, text);
}
test("teacher → student → rich edits and IME → reload → submit → mandatory reading", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "완성된 글 너머, 생각의 과정을 봅니다.",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "교사 공간 시작하기" }).click();
  await page
    .getByLabel("비밀번호", { exact: true })
    .fill("pilot-test-password-only");
  await page.getByRole("button", { name: "들어가기" }).click();
  await page.getByRole("button", { name: "새 과제", exact: true }).click();
  await page
    .getByLabel("과제 제목", { exact: true })
    .fill("용기에 대한 나의 생각");
  await page
    .getByLabel("학생에게 전할 안내")
    .fill("처음 생각과 달라진 생각을 두 문단으로 써주세요.");
  await page.getByRole("button", { name: "과제 만들기", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "용기에 대한 나의 생각" }),
  ).toBeVisible();
  await page.getByText("참여 링크 보기", { exact: true }).click();
  const join = await page
    .getByRole("textbox", { name: "학생 참여 링크" })
    .inputValue();
  const studentContext = await browser.newContext();
  const student = await studentContext.newPage();
  student.on("pageerror", (e) => errors.push(e.message));
  await student.goto(join);
  await student.getByLabel("선생님이 알아볼 이름 또는 별명").fill("3반 12번");
  await student.getByLabel("작성과정 기록 안내를 읽었어요.").check();
  await student.getByRole("button", { name: "글쓰기 시작 · 이어쓰기" }).click();
  const body = student.getByRole("textbox", { name: "과제 본문" });
  await expect(body).toBeVisible();
  await student
    .getByRole("textbox", { name: "글 제목", exact: true })
    .fill("내가 발견한 용기");
  await body.click();
  await student.keyboard.type("A small beginning.");
  await student.keyboard.press("Enter");
  // Browser IME event sequence, not a claim of real OS keyboard coverage.
  await body.dispatchEvent("compositionstart", { data: "" });
  await student.keyboard.insertText(
    "용기란 두려워도 한 걸음 내딛는 것이라고 생각한다.",
  );
  await body.dispatchEvent("compositionend", {
    data: "용기란 두려워도 한 걸음 내딛는 것이라고 생각한다.",
  });
  await student.waitForTimeout(100);
  await student.keyboard.press("Enter");
  await body.evaluate((el) => {
    const data = new DataTransfer();
    data.setData("text/plain", "이 문장은 참고자료에서 가져왔다.");
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(body).toContainText("참고자료");
  await selectText(student, "이 문장은 참고자료에서 가져왔다.");
  await student.keyboard.insertText(
    "참고자료를 읽고 나의 경험과 연결해 보았다.",
  );
  await selectText(
    student,
    "용기란 두려워도 한 걸음 내딛는 것이라고 생각한다.",
  );
  await student.getByRole("button", { name: "굵게", exact: true }).click();
  await expect(body.locator("strong")).toHaveText(
    "용기란 두려워도 한 걸음 내딛는 것이라고 생각한다.",
  );
  await student.getByRole("button", { name: "선택한 대목 담기" }).click();
  await student
    .getByLabel("이 대목을 고른 이유")
    .fill("처음에는 몰랐던 점을 발견했기 때문이에요.");
  await student.getByRole("button", { name: "지금 저장" }).click();
  await expect(
    student.getByText("모든 변경사항 저장됨", { exact: true }),
  ).toBeVisible();
  await student.reload();
  await expect(body).toContainText("나의 경험과 연결");
  await expect(
    student.getByRole("textbox", { name: "글 제목", exact: true }),
  ).toHaveValue("내가 발견한 용기");
  await student.screenshot({
    path: "test-results/writer-desktop.png",
    fullPage: true,
  });
  const id = new URL(student.url()).pathname.split("/").at(-1)!;
  await expect
    .poll(async () => {
      const r = await student.request.get(`/api/submissions/${id}`);
      return (await r.json()).submission.events.some(
        (e: { source: string }) => e.source === "composition",
      );
    })
    .toBe(true);
  await student.getByRole("button", { name: "제출 준비" }).click();
  await student.getByRole("button", { name: "제출하기", exact: true }).click();
  await expect(
    student.getByRole("heading", { name: "생각과 과정을 함께 전했어요." }),
  ).toBeVisible();
  const data = await (
    await student.request.get(`/api/submissions/${id}`)
  ).json();
  expect(
    data.submission.events.some((e: { type: string }) => e.type === "paste"),
  ).toBe(true);
  expect(
    data.submission.events.filter(
      (e: { type: string }) => e.type === "session_start",
    ).length,
  ).toBeGreaterThanOrEqual(2);
  expect(data.submission.rhythm).toHaveLength(0);
  expect(data.submission.status).toBe("submitted");
  await page.getByRole("button", { name: "새로고침", exact: true }).click();
  await page.getByRole("button", { name: "3반 12번", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "여기에서 읽기를 시작하세요." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "읽기 완료", exact: true }),
  ).toBeDisabled();
  const checkboxes = page.getByLabel("이 대목을 읽었어요");
  await checkboxes.nth(0).check();
  await expect(
    page.getByRole("button", { name: "읽기 완료", exact: true }),
  ).toBeDisabled();
  await checkboxes.nth(1).check();
  await expect(
    page.getByRole("button", { name: "읽기 완료", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("짧은 반응").selectOption("좋은 생각이에요");
  await page.getByRole("button", { name: "읽기 완료", exact: true }).click();
  await expect(page.getByText("읽기 확인을 저장했습니다.")).toBeVisible();
  await page.screenshot({
    path: "test-results/teacher-guide-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "작성과정", exact: true }).click();
  await page
    .getByLabel("작성 시점", { exact: true })
    .fill(String(data.submission.events.at(-1).seq));
  await expect(page.locator(".replay-page")).toContainText("나의 경험과 연결");
  await page.screenshot({
    path: "test-results/replay-desktop.png",
    fullPage: true,
  });
  await student.reload();
  await expect(
    student.getByText("선생님의 반응: 좋은 생각이에요"),
  ).toBeVisible();
  const anonymous = await browser.newContext();
  const denied = await anonymous.request.get(`${origin}/api/submissions/${id}`);
  expect(denied.status()).toBe(403);
  await anonymous.close();
  await studentContext.close();
  expect(errors).toEqual([]);
});
test("authorization and invalid requests fail closed", async ({ request }) => {
  expect((await request.get("/api/assignments")).status()).toBe(401);
  expect(
    (
      await request.post("/api/teacher/login", {
        data: { password: "pilot-test-password-only" },
        headers: { origin: "https://other.example" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/teacher/login", {
        data: { password: "wrong" },
        headers: { origin },
      })
    ).status(),
  ).toBe(401);
});
test("mobile landing stays within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
});

test("offline edits, rich structures, undo/redo and tab isolation survive synchronization", async ({
  browser,
  request,
}) => {
  test.setTimeout(120000);
  await request.post("/api/teacher/login", {
    data: { password: "pilot-test-password-only" },
    headers: { origin },
  });
  const a = await (
    await request.post("/api/assignments", {
      headers: { origin },
      data: {
        title: "복구와 문서구조 시험",
        description: "",
        policy: "RESEARCH",
        minRead: 2,
        fullRead: false,
        questions: [],
      },
    })
  ).json();
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
  });
  const page = await context.newPage();
  await page.goto(`/join/${a.assignment.id}?code=${a.assignment.joinCode}`);
  await page.getByLabel("선생님이 알아볼 이름 또는 별명").fill("구조 시험");
  await page.getByLabel("작성과정 기록 안내를 읽었어요.").check();
  await page.getByRole("button", { name: "글쓰기 시작 · 이어쓰기" }).click();
  const body = page.getByRole("textbox", { name: "과제 본문" });
  await expect(body).toBeVisible();
  await page
    .getByRole("textbox", { name: "글 제목", exact: true })
    .fill("구조와 복구");
  await body.click();
  await page.keyboard.type("First paragraph.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Second paragraph.");
  await page.getByRole("button", { name: "문단 위로", exact: true }).click();
  await expect(body.locator("p").first()).toHaveText("Second paragraph.");
  await page.getByRole("button", { name: "실행 취소", exact: true }).click();
  await expect(body.locator("p").first()).toHaveText("First paragraph.");
  await page.getByRole("button", { name: "다시 실행", exact: true }).click();
  await expect(body.locator("p").first()).toHaveText("Second paragraph.");
  await body.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "표 삽입", exact: true }).click();
  await expect(body.locator("table tr")).toHaveCount(3);
  await page.getByRole("button", { name: "행 추가", exact: true }).click();
  await expect(body.locator("table tr")).toHaveCount(4);
  // External image URLs never enter the document; uploaded raster images do.
  await page.locator("input[type=file]").setInputFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(body.locator("img")).toHaveCount(1);
  await selectText(page, "First paragraph.");
  await page.getByRole("button", { name: "링크 삽입", exact: true }).click();
  await page
    .getByRole("textbox", { name: "링크 주소" })
    .fill("https://example.com/source");
  await page.getByRole("button", { name: "적용", exact: true }).click();
  await expect(body.locator("a")).toHaveAttribute(
    "href",
    "https://example.com/source",
  );
  await page.getByRole("button", { name: "지금 저장" }).click();
  await expect(
    page.getByText("모든 변경사항 저장됨", { exact: true }),
  ).toBeVisible();
  const studentUrl = page.url();
  const id = studentUrl.split("/").at(-1)!;
  const second = await context.newPage();
  await second.goto(studentUrl);
  await expect(
    second.getByRole("alert").filter({ hasText: "다른 탭" }),
  ).toContainText("다른 탭");
  await second.close();
  await context.setOffline(true);
  await body.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.type(" offline recovery");
  await expect(body).toContainText("offline recovery");
  await expect
    .poll(async () =>
      page.evaluate(async (id) => {
        return new Promise<boolean>((resolve) => {
          const r = indexedDB.open("proofwrite-v1", 1);
          r.onsuccess = () => {
            const q = r.result
              .transaction("drafts")
              .objectStore("drafts")
              .get(id);
            q.onsuccess = () => {
              resolve(
                JSON.stringify(q.result?.submission?.doc).includes(
                  "offline recovery",
                ),
              );
              r.result.close();
            };
          };
        });
      }, id),
    )
    .toBe(true);
  await context.setOffline(false);
  await page.getByRole("button", { name: "지금 저장" }).click();
  await expect(
    page.getByText("모든 변경사항 저장됨", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(body).toContainText("offline recovery");
  await expect(body.locator("table tr")).toHaveCount(4);
  await expect(body.locator("img")).toHaveCount(1);
  await expect(body.locator("a")).toHaveAttribute(
    "href",
    "https://example.com/source",
  );
  const stored = await (
    await page.request.get(`/api/submissions/${id}`)
  ).json();
  const types = stored.submission.events.map((e: { type: string }) => e.type);
  for (const type of [
    "paragraph_move",
    "undo",
    "redo",
    "table_change",
    "image_insert",
    "link_insert",
  ])
    expect(types).toContain(type);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/writer-tablet.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/writer-mobile.png",
    fullPage: true,
  });
  // A different student's capability cannot open this document.
  const other = await browser.newContext();
  await other.request.post(`/api/join/${a.assignment.id}`, {
    headers: { origin },
    data: { code: a.assignment.joinCode, alias: "다른 학생", consent: true },
  });
  expect((await other.request.get(`/api/submissions/${id}`)).status()).toBe(
    403,
  );
  await other.close();
  // A full/blocked local database must never block a working server save.
  await page.evaluate(() =>
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: {
        open() {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        },
      },
    }),
  );
  await page
    .getByRole("textbox", { name: "글 제목", exact: true })
    .fill("복구본 실패에도 서버 저장");
  await page.getByRole("button", { name: "지금 저장" }).click();
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/api/submissions/${id}`)).json())
          .submission.title,
    )
    .toBe("복구본 실패에도 서버 저장");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "이 기기에 복구본을 저장하지 못했습니다." }),
  ).toBeVisible();
  await context.close();
});
