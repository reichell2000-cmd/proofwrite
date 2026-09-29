"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "../core/api";
import { Header, Notice, time } from "./Shell";
import { inputDeviceId, type PublicStudent } from "../core/identity";
import { EvidenceCollector } from "../core/evidence/collector";
import { comparableRhythm } from "../core/my-proof/rhythm";
import type { RhythmSample } from "../core/evidence/types";
import { clearLocalDrafts } from "../core/storage/local";
type AccountResult = {
  student: PublicStudent | null;
  code?: string;
  claimed?: number;
};
export default function StudentIdentity() {
  const [student, setStudent] = useState<PublicStudent | null>(null),
    [loaded, setLoaded] = useState(false);
  const [alias, setAlias] = useState(""),
    [consent, setConsent] = useState(false),
    [claim, setClaim] = useState(false);
  const [code, setCode] = useState(""),
    [recovery, setRecovery] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [returnTo, setReturnTo] = useState("/student"),
    [device, setDevice] = useState("");
  const [label, setLabel] = useState("내 키보드"),
    [language, setLanguage] = useState<"ko" | "en">("ko"),
    [typingConsent, setTypingConsent] = useState(false);
  const [challenge, setChallenge] = useState<{
    challengeId: string;
    text: string;
  } | null>(null);
  const [stage, setStage] = useState<"copy" | "free">("copy"),
    [copyText, setCopyText] = useState(""),
    [freeText, setFreeText] = useState("");
  const [count, setCount] = useState(0);
  const collector = useRef<EvidenceCollector | null>(null),
    copySamples = useRef<RhythmSample[]>([]);
  useEffect(() => {
    setDevice(inputDeviceId());
    const next = new URLSearchParams(location.search).get("returnTo") || "";
    if (
      /^\/task\/[a-f0-9-]{36}$/.test(next) ||
      /^\/join\/[a-f0-9-]{36}\?code=[a-f0-9]+$/.test(next)
    )
      setReturnTo(next);
    api<AccountResult>("/api/student/account")
      .then((r) => setStudent(r.student))
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function account(data: unknown, clear = false) {
    const r = await api<AccountResult>("/api/student/account", data);
    if (clear) {
      await clearLocalDrafts();
      for (const key of Object.keys(localStorage))
        if (key.startsWith("pw-join-") || key.startsWith("proofwrite-join"))
          localStorage.removeItem(key);
    }
    setStudent(r.student);
    setCode(r.code || "");
    setRecovery("");
    setChallenge(null);
    if (r.claimed !== undefined)
      setMessage(`이 브라우저의 과제 ${r.claimed}개를 연결했어요.`);
  }
  function startCollector() {
    collector.current = new EvidenceCollector(
      "enrollment",
      crypto.randomUUID(),
      () => {},
    );
    setCount(0);
  }
  function refreshCount() {
    setCount(
      comparableRhythm(collector.current?.rhythmFeatures() || []).samples
        .length,
    );
  }
  const normalized = (text: string) =>
    text.normalize("NFC").replace(/\s+/g, " ").trim();
  return (
    <>
      <Header />
      <main className="student-home identity-page">
        <Link href={returnTo}>← 과제로 돌아가기</Link>
        <p className="overline">PROOFME · MY IDENTITY</p>
        <h1>나의 타자 기준</h1>
        <p className="muted">
          나의 과제를 연결하고, 평소의 입력 습관을 기준으로 등록해요.
        </p>
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        {!loaded ? (
          <p>불러오고 있어요…</p>
        ) : !student ? (
          <>
            <section className="panel">
              <h2>처음 학생 연결 만들기</h2>
              <p>
                이름만으로 다른 사람의 과제를 찾지 않습니다. 비밀 연결 코드로
                다른 기기에서 내 과제를 이어갑니다.
              </p>
              <label>
                이름 또는 별명
                <input
                  value={alias}
                  maxLength={60}
                  onChange={(e) => setAlias(e.target.value)}
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={claim}
                  onChange={(e) => setClaim(e.target.checked)}
                />
                이 브라우저의 기존 과제가 모두 내 과제이며 함께 연결합니다.
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                학생 연결과 비밀 연결 코드 보관 안내를 확인했습니다.
              </label>
              <button
                className="primary"
                disabled={busy || !alias.trim() || !consent}
                onClick={() =>
                  run(() =>
                    account({
                      action: "create",
                      alias,
                      consent: true,
                      claimExisting: claim,
                    }),
                  )
                }
              >
                학생 연결 만들기
              </button>
            </section>
            <section className="panel">
              <h2>기존 학생 연결</h2>
              <label>
                비밀 연결 코드
                <input
                  type="password"
                  autoComplete="off"
                  value={recovery}
                  onChange={(e) => setRecovery(e.target.value)}
                />
              </label>
              <p className="fine-print">
                공용 기기라면 다른 작성 탭을 닫아주세요. 연결하면 이 기기의 임시
                초안은 지워지고 서버에 저장된 내 과제를 불러옵니다.
              </p>
              <button
                disabled={busy || !recovery.trim()}
                onClick={() =>
                  run(() =>
                    account({ action: "recover", code: recovery }, true),
                  )
                }
              >
                내 과제 연결하기
              </button>
            </section>
          </>
        ) : (
          <>
            <section className="panel">
              <h2>{student.alias} · 학생 연결 완료</h2>
              <p>
                타자 기준 등록은 선택할 수 있습니다. 등록하지 않아도 과제 작성과
                제출은 가능합니다.
              </p>
              {code && (
                <div className="notice">
                  <b>이 연결 코드는 지금만 표시됩니다.</b>
                  <p>
                    다른 사람에게 주지 말고 보관해주세요. 코드와 로그인된 기기를
                    모두 잃으면 이름만으로 복구할 수 없습니다.
                  </p>
                  <code className="recovery-code">{code}</code>
                  <button
                    onClick={() => {
                      const url = URL.createObjectURL(
                        new Blob([code], { type: "text/plain" }),
                      );
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "ProofMe-connection-code.txt";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    연결 코드 내려받기
                  </button>
                </div>
              )}
              <details>
                <summary>연결 관리</summary>
                <div className="identity-actions">
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          "현재 브라우저의 연결되지 않은 과제가 모두 본인 것인가요?",
                        )
                      )
                        run(() => account({ action: "claim" }));
                    }}
                  >
                    이 브라우저 과제 연결
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          "기존 연결 코드와 다른 기기의 로그인이 해제됩니다. 새 코드를 보관해주세요.",
                        )
                      )
                        run(() => account({ action: "rotate" }));
                    }}
                  >
                    연결 코드 재발급
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          "저장 완료를 확인하고 다른 작성 탭을 닫아주세요. 이 기기의 임시 초안과 로그인은 해제되며 서버의 과제는 유지됩니다.",
                        )
                      )
                        run(() => account({ action: "logout" }, true));
                    }}
                  >
                    이 기기에서 로그아웃
                  </button>
                </div>
              </details>
            </section>
            <section className="panel">
              <p className="overline">05 · 나라는 증거</p>
              <h2>나의 타자 기준 만들기</h2>
              <p>
                빠르기나 오타로 점수를 매기지 않아요. 평소처럼 편안하게
                입력하세요. 이 입력 칸의 시간 간격을 수집하며 등록 문장의 내용은
                기준으로 보관하지 않습니다.
              </p>
              <p className="fine-print">
                따라 치기와 자유 입력을 각각 진행합니다. 한글 조합 입력과 일반
                입력은 따로 비교합니다. 최초 등록은 선생님이 직접 지켜본 경우
                선생님 확인 표시를 남길 수 있습니다.
              </p>
              <label>
                지금 사용하는 기기·키보드 이름
                <input
                  value={label}
                  maxLength={60}
                  disabled={!!challenge}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </label>
              <button
                disabled={busy || !!challenge}
                onClick={() => {
                  setDevice(inputDeviceId(true));
                  setMessage("새 키보드의 별도 기준을 등록할 수 있어요.");
                }}
              >
                키보드를 바꿨어요 · 별도 기준 만들기
              </button>
              {!challenge ? (
                <>
                  <label>
                    따라 치기 언어
                    <select
                      value={language}
                      onChange={(e) =>
                        setLanguage(e.target.value as "ko" | "en")
                      }
                    >
                      <option value="ko">한국어</option>
                      <option value="en">영어</option>
                    </select>
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={typingConsent}
                      onChange={(e) => setTypingConsent(e.target.checked)}
                    />
                    입력 습관 기준을 등록하고 과제 작성 기록과 비교하는 데
                    동의합니다.
                  </label>
                  <button
                    className="primary"
                    disabled={busy || !typingConsent || !label.trim()}
                    onClick={() =>
                      run(async () => {
                        const c = await api<{
                          challengeId: string;
                          text: string;
                        }>("/api/student/typing", {
                          action: "start",
                          language,
                          consent: true,
                        });
                        setChallenge(c);
                        setStage("copy");
                        setCopyText("");
                        setFreeText("");
                        copySamples.current = [];
                        startCollector();
                      })
                    }
                  >
                    타자 기준 등록 시작
                  </button>
                </>
              ) : (
                <>
                  <h3>
                    {stage === "copy"
                      ? "1. 문장 따라 치기"
                      : "2. 나의 생각 자유롭게 쓰기"}
                  </h3>
                  {stage === "copy" ? (
                    <blockquote>{challenge.text}</blockquote>
                  ) : (
                    <p>
                      오늘 있었던 일이나 관심 있는 내용을 40자 이상 적어주세요.
                      유효 입력 간격 80개 이상이 필요합니다.
                    </p>
                  )}
                  <textarea
                    key={stage}
                    aria-label={
                      stage === "copy" ? "따라 치기 입력" : "자유 입력"
                    }
                    rows={7}
                    maxLength={stage === "copy" ? 2000 : 4000}
                    value={stage === "copy" ? copyText : freeText}
                    disabled={busy}
                    onChange={(e) =>
                      stage === "copy"
                        ? setCopyText(e.target.value)
                        : setFreeText(e.target.value)
                    }
                    onPaste={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                      if (
                        !e.repeat &&
                        !e.ctrlKey &&
                        !e.metaKey &&
                        !e.altKey &&
                        (e.key.length === 1 ||
                          e.key === "Backspace" ||
                          e.nativeEvent.isComposing ||
                          e.keyCode === 229)
                      ) {
                        collector.current?.keyDown(
                          performance.now(),
                          e.key === "Backspace",
                          e.nativeEvent.isComposing || e.keyCode === 229
                            ? "composition"
                            : "direct",
                          device,
                        );
                        refreshCount();
                      }
                    }}
                    onKeyUp={() => {
                      collector.current?.keyUp();
                      refreshCount();
                    }}
                    onBlur={() => collector.current?.resetRhythm()}
                  />
                  <p role="status">유효 입력 간격 {count}개 / 최소 80개</p>
                  {stage === "copy" ? (
                    <button
                      disabled={
                        busy ||
                        count < 80 ||
                        normalized(copyText) !== normalized(challenge.text)
                      }
                      onClick={() => {
                        copySamples.current =
                          collector.current?.rhythmFeatures() || [];
                        setStage("free");
                        startCollector();
                      }}
                    >
                      자유 입력으로 이동
                    </button>
                  ) : (
                    <button
                      className="primary"
                      disabled={
                        busy || count < 80 || freeText.trim().length < 40
                      }
                      onClick={() =>
                        run(async () => {
                          const r = await api<AccountResult>(
                            "/api/student/typing",
                            {
                              action: "save",
                              challengeId: challenge.challengeId,
                              deviceId: device,
                              deviceLabel: label,
                              copyText,
                              freeText,
                              copySamples: copySamples.current,
                              freeSamples:
                                collector.current?.rhythmFeatures() || [],
                            },
                          );
                          setStudent(r.student);
                          setChallenge(null);
                          collector.current = null;
                          copySamples.current = [];
                          setCopyText("");
                          setFreeText("");
                          setMessage(
                            "타자 기준을 등록했어요. 과제 작성 화면에서 타이핑 습관 비교에 참여하면 이 기준을 사용합니다.",
                          );
                        })
                      }
                    >
                      타자 기준 저장
                    </button>
                  )}
                  <button
                    disabled={busy}
                    onClick={() => {
                      setChallenge(null);
                      collector.current = null;
                      copySamples.current = [];
                      setCopyText("");
                      setFreeText("");
                    }}
                  >
                    등록 취소
                  </button>
                </>
              )}
              <h3>보관한 타자 기준</h3>
              {student.registrations.length === 0 && (
                <p>아직 등록한 기준이 없어요.</p>
              )}
              {student.registrations.map((r) => (
                <div className="identity-registration" key={r.id}>
                  <b>
                    {r.deviceLabel} ·{" "}
                    {r.mode === "composition"
                      ? "한글 등 조합 입력"
                      : "일반 입력"}
                    {r.deviceId === device ? " · 이 기기" : ""}
                  </b>
                  <p>
                    등록 {time(r.registeredAt)} ·{" "}
                    {r.verifiedAt
                      ? "교사가 등록 모습을 확인함"
                      : "본인 등록 · 교사 확인 전"}
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          "이 기기·입력 방식의 타자 기준과 저장된 비교 기준을 삭제할까요? 글과 교사 평가는 유지됩니다.",
                        )
                      )
                        run(async () => {
                          const r2 = await api<AccountResult>(
                            "/api/student/typing",
                            { action: "delete", registrationId: r.id },
                          );
                          setStudent(r2.student);
                        });
                    }}
                  >
                    타자 기준 삭제
                  </button>
                </div>
              ))}
              <p className="fine-print">
                같은 기기·입력 방식에서 재등록하면 기준을 교체하고 교사 확인은
                다시 받습니다. 기기·입력 방식이 다르거나 표본이 부족하면 비교를
                보류합니다. 비교 결과는 본인일 확률이나 부정행위 판정이
                아닙니다.
              </p>
            </section>
          </>
        )}
        <Link className="button primary" href={returnTo}>
          과제로 돌아가기 →
        </Link>
      </main>
    </>
  );
}
