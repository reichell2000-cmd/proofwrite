"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Plus,
  BookOpen,
  Users,
  Check,
  Copy,
  RefreshCw,
  LogOut,
  ArrowLeft,
  FileText,
  History,
  Star,
  Download,
} from "lucide-react";
import { Header, Notice, time } from "./Shell";
import { LearningFocus } from "./LearningFocus";
import { RichDocument } from "./RichDocument";
import { Replay } from "./Replay";
import { api, ApiError } from "../core/api";
import {
  type Assignment,
  type Submission,
  type Review,
  type Policy,
  POLICIES,
  REFLECTIONS,
  EMPTY_FEEDBACK,
  type TeacherFeedback,
} from "../core/model";
import { submissionScore } from "../core/proof/submission-score";
import { summarizeEvidence } from "../core/evidence/summarize";
import { externalTransformation } from "../core/evidence/replay";
import { buildReadingGuide } from "../core/teacher/reading-guide";
type Row = {
  id: string;
  alias: string;
  title: string;
  status: string;
  updatedAt: number;
  review: Review;
  hasPick: boolean;
};
export default function Teacher() {
  const [logged, setLogged] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [active, setActive] = useState<Assignment | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [criteria, setCriteria] = useState("");
  const [policy, setPolicy] = useState<Policy>("COACH");
  const [minRead, setMinRead] = useState("2");
  const [questions, setQuestions] = useState<string[]>([REFLECTIONS[3]]);
  const [custom, setCustom] = useState("");
  async function load() {
    try {
      const result = await api<{ assignments: Assignment[] }>(
        "/api/assignments",
      );
      setAssignments(result.assignments);
      setLogged(true);
      setError("");
      if (result.assignments[0] && !active) await open(result.assignments[0]);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setLogged(false);
      else setError((e as Error).message);
    }
  }
  async function open(a: Assignment) {
    try {
      const result = await api<{ assignment: Assignment; submissions: Row[] }>(
        `/api/assignments/${a.id}`,
      );
      setActive(result.assignment);
      setRows(result.submissions);
      setSelected(null);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []); // initial authenticated load
  if (logged === false)
    return (
      <>
        <Header />
        <main className="login-layout">
          <div className="login-intro">
            <p className="overline">A CLOSER LOOK AT LEARNING</p>
            <h1>
              30개의 과제에서,
              <br />
              <em>30명의 생각</em>으로.
            </h1>
            <p>
              학생이 꼭 보여주고 싶은 문장부터
              <br />
              마지막까지 다듬은 대목까지.
              <br />
              읽어야 할 곳에서 시작하세요.
            </p>
            <div className="login-quote">
              “과제를 덜 읽게 하는 것이 아니라,
              <br />꼭 읽어야 할 생각을 찾아드립니다.”
            </div>
          </div>
          <form
            className="login-card"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api("/api/teacher/login", { password });
                setPassword("");
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <span className="feature-icon">
              <BookOpen />
            </span>
            <h2>교사 공간</h2>
            <p className="muted">Pilot 교사 비밀번호로 시작하세요.</p>
            <label>
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            {error && <Notice error>{error}</Notice>}
            <button className="primary wide" disabled={busy}>
              {busy ? "확인 중…" : "들어가기"}
              <ArrowRight size={17} />
            </button>
            <p className="fine-print">
              과제마다 독립된 학생 참여 링크가 만들어집니다.
            </p>
          </form>
        </main>
      </>
    );
  if (logged === null)
    return (
      <>
        <Header />
        <main className="narrow">
          {error ? (
            <Notice error>{error}</Notice>
          ) : (
            <p className="muted">교사 공간을 불러오고 있습니다…</p>
          )}
        </main>
      </>
    );
  const filtered = rows.filter(
    (r) =>
      filter === "all" ||
      (filter === "submitted" && r.status === "submitted") ||
      (filter === "unread" && r.status === "submitted" && !r.review.completed),
  );
  return (
    <>
      <Header>
        <span className="nav-current">교사 공간</span>
        <button
          className="subtle"
          onClick={async () => {
            await api("/api/teacher/logout", {});
            setLogged(false);
            setActive(null);
            setRows([]);
          }}
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </Header>
      <div className="teacher-layout">
        <aside className="teacher-sidebar">
          <p className="overline">MY CLASSROOM</p>
          <h3>나의 과제</h3>
          <button className="primary wide" onClick={() => setCreating(true)}>
            <Plus size={16} />새 과제
          </button>
          <div className="assignment-list">
            {assignments.map((a) => (
              <button
                className={active?.id === a.id ? "active" : ""}
                key={a.id}
                onClick={() => void open(a)}
              >
                <FileText size={17} />
                <span>
                  {a.title}
                  <small>{time(a.createdAt)}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="sidebar-note">
            <BookOpen size={21} />
            <p>
              학생의 글에서,
              <br />
              다음 배움으로.
            </p>
            <small>
              Proof는 과정증거의 충분성을
              <br />
              살펴보는 시범 지표입니다.
            </small>
          </div>
        </aside>
        <main className="teacher-main">
          {error && <Notice error>{error}</Notice>}
          {selected && active ? (
            <ReviewPanel
              id={selected}
              assignment={active}
              onBack={() => void open(active)}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="overline">READ THE THINKING</p>
                  <h1>{active?.title || "첫 과제를 만들어보세요."}</h1>
                  <p className="muted">
                    {active
                      ? "학생의 목소리에서 읽기를 시작해보세요."
                      : "주제와 AI 사용정책을 정하면 학생 참여 링크를 받을 수 있습니다."}
                  </p>
                </div>
                {active && (
                  <button
                    className="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${location.origin}/join/${active.id}?code=${active.joinCode}`,
                        );
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2500);
                      } catch {
                        setError(
                          "복사를 지원하지 않는 환경입니다. 아래 참여 링크를 선택해 복사해주세요.",
                        );
                      }
                    }}
                  >
                    <Copy size={16} />
                    {copied ? "링크를 복사했어요" : "학생 참여 링크"}
                  </button>
                )}
              </div>
              {active ? (
                <>
                  <div className="assignment-meta">
                    <span className="badge">
                      {active.policy} · {POLICIES[active.policy]}
                    </span>
                    <span>
                      기본 읽기:{" "}
                      {active.fullRead ? "전체 글" : `${active.minRead}대목`}
                    </span>
                    <details>
                      <summary>참여 링크 보기</summary>
                      <input
                        readOnly
                        aria-label="학생 참여 링크"
                        value={
                          typeof location === "undefined"
                            ? ""
                            : `${location.origin}/join/${active.id}?code=${active.joinCode}`
                        }
                        onFocus={(e) => e.target.select()}
                      />
                    </details>
                  </div>
                  <div className="stat-grid">
                    <div>
                      <Users size={19} />
                      <span>참여한 학생</span>
                      <strong>
                        {rows.length}
                        <small>명</small>
                      </strong>
                    </div>
                    <div>
                      <FileText size={19} />
                      <span>도착한 글</span>
                      <strong>
                        {rows.filter((r) => r.status === "submitted").length}
                        <small>편</small>
                      </strong>
                    </div>
                    <div>
                      <BookOpen size={19} />
                      <span>읽기를 기다리는 글</span>
                      <strong>
                        {
                          rows.filter(
                            (r) =>
                              r.status === "submitted" && !r.review.completed,
                          ).length
                        }
                        <small>편</small>
                      </strong>
                    </div>
                  </div>
                  <div className="section-heading">
                    <h2>학생의 글과 생각</h2>
                    <div className="actions">
                      <select
                        aria-label="제출 필터"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">모든 학생</option>
                        <option value="submitted">제출 완료</option>
                        <option value="unread">읽기 대기</option>
                      </select>
                      <button
                        className="subtle"
                        onClick={() => void open(active)}
                      >
                        <RefreshCw size={16} />
                        새로고침
                      </button>
                    </div>
                  </div>
                  <div className="submission-table">
                    <table>
                      <thead>
                        <tr>
                          <th>학생 · 글 제목</th>
                          <th>작성 상태</th>
                          <th>피드백</th>
                          <th>읽기 안내</th>
                          <th>교사 확인</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <button
                                className="student-link"
                                onClick={() => setSelected(r.id)}
                              >
                                {r.alias}
                                <ArrowRight size={15} />
                              </button>
                              <small>{r.title || "아직 제목이 없어요"}</small>
                            </td>
                            <td>
                              <span
                                className={
                                  r.status === "submitted"
                                    ? "badge green"
                                    : "badge"
                                }
                              >
                                {r.status === "submitted"
                                  ? "제출 완료"
                                  : "작성 중"}
                              </span>
                              <small>{time(r.updatedAt)}</small>
                            </td>
                            <td>
                              <span className="muted">
                                {r.review.completed
                                  ? "피드백 전달됨"
                                  : r.status === "submitted"
                                    ? "피드백 기다림"
                                    : "작성 중"}
                              </span>
                            </td>
                            <td>
                              {r.hasPick ? (
                                <span className="read-hint">
                                  <Star size={14} />
                                  학생이 고른 대목
                                </span>
                              ) : (
                                <span className="muted">대목 선택 대기</span>
                              )}
                            </td>
                            <td>
                              {r.review.completed ? (
                                <span className="green-text">
                                  <Check size={15} />
                                  읽기 확인
                                </span>
                              ) : (
                                <button
                                  className="subtle"
                                  onClick={() => setSelected(r.id)}
                                >
                                  {r.status === "submitted"
                                    ? "읽기 시작"
                                    : "작성 현황"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!filtered.length && (
                      <div className="empty-state">
                        <BookOpen size={34} />
                        <h3>
                          {rows.length
                            ? "조건에 맞는 글이 없어요."
                            : "학생들의 생각을 기다리고 있어요."}
                        </h3>
                        <p>
                          {rows.length
                            ? "다른 필터를 선택해주세요."
                            : "참여 링크를 학생들에게 전달해보세요."}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="fine-print">
                    Proof는 기록된 과정증거의 충분성을 요약한 시범 지표입니다.
                    글의 수준이나 노력·성실성·본인 작성 여부를 평가하지
                    않습니다. 먼저 글을 읽고, 필요할 때 작성과정을 살펴보세요.
                  </p>
                </>
              ) : (
                <div className="empty-state large">
                  <BookOpen size={48} />
                  <h2>생각을 만날 준비가 되었나요?</h2>
                  <button className="primary" onClick={() => setCreating(true)}>
                    첫 과제 만들기 <Plus size={17} />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      {creating && (
        <div className="modal-backdrop">
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const result = await api<{ assignment: Assignment }>(
                  "/api/assignments",
                  {
                    title,
                    description,
                    learningGoal,
                    successCriteria: criteria
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean),
                    policy,
                    minRead: minRead === "full" ? 2 : Number(minRead),
                    fullRead: minRead === "full",
                    questions: [
                      ...questions,
                      ...(custom.trim() ? [custom.trim()] : []),
                    ],
                  },
                );
                setAssignments((a) => [result.assignment, ...a]);
                await open(result.assignment);
                setCreating(false);
                setTitle("");
                setDescription("");
                setLearningGoal("");
                setCriteria("");
                setCustom("");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="overline">A NEW BEGINNING</p>
            <h2 id="create-title">새로운 과제</h2>
            <label>
              과제 제목
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                required
                placeholder="예: 책 속에서 발견한 나의 생각"
              />
            </label>
            <label>
              학생에게 전할 안내
              <textarea
                rows={3}
                value={description}
                maxLength={6000}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="무엇을 쓰고, 어떤 생각을 나누면 좋을까요?"
              />
            </label>
            <label>
              이번 글의 배움 목표 <small>(선택)</small>
              <textarea
                rows={2}
                maxLength={600}
                value={learningGoal}
                onChange={(e) => setLearningGoal(e.target.value)}
                placeholder="예: 친구에게 용기에 대한 내 생각을 구체적인 경험으로 설명하기"
              />
            </label>
            <label>
              내용을 함께 살펴볼 기준{" "}
              <small>(선택 · 한 줄에 하나, 최대 4개)</small>
              <textarea
                rows={3}
                maxLength={1003}
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                placeholder={
                  "내 생각이 드러나는가\n그 생각을 뒷받침하는 구체적인 경험이 있는가\n경험과 생각의 연결을 독자가 이해할 수 있는가"
                }
              />
            </label>
            <p className="fine-print">
              학년과 글의 종류에 맞게 적어주세요. 분량·속도·수정 횟수보다 글에서
              배울 내용을 기준으로 삼아주세요.
            </p>
            <div className="form-grid">
              <label>
                AI 사용정책
                <select
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value as Policy)}
                >
                  {Object.entries(POLICIES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {key} · {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                학생당 최소 읽기
                <select
                  value={minRead}
                  onChange={(e) => setMinRead(e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}대목{n === 2 ? " (권장)" : ""}
                    </option>
                  ))}
                  <option value="full">전체 글 읽기</option>
                </select>
              </label>
            </div>
            <fieldset>
              <legend>
                학생 성찰질문{" "}
                <small>모두 선택 해제하면 표시하지 않습니다.</small>
              </legend>
              {REFLECTIONS.map((q) => (
                <label className="check-label" key={q}>
                  <input
                    type="checkbox"
                    checked={questions.includes(q)}
                    onChange={(e) =>
                      setQuestions((old) =>
                        e.target.checked
                          ? [...old, q]
                          : old.filter((x) => x !== q),
                      )
                    }
                  />
                  {q}
                </label>
              ))}
            </fieldset>
            <label>
              직접 만든 성찰질문 <small>(선택)</small>
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                maxLength={250}
              />
            </label>
            {error && <Notice error>{error}</Notice>}
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setError("");
                }}
              >
                취소
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "만드는 중…" : "과제 만들기"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
function ReviewPanel({
  id,
  assignment,
  onBack,
}: {
  id: string;
  assignment: Assignment;
  onBack: () => void;
}) {
  const [s, setS] = useState<Submission | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("full");
  const [target, setTarget] = useState<number | undefined>();
  const [review, setReview] = useState<Review | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let canceled = false;
    api<{ submission: Submission }>(`/api/submissions/${id}`)
      .then((data) => {
        if (!canceled) {
          setS(data.submission);
          setReview(data.submission.review);
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      canceled = true;
    };
  }, [id]);
  const derived = useMemo(
    () =>
      s
        ? {
            summary: summarizeEvidence(s.events),
            score: submissionScore(s),
            guide: buildReadingGuide(s.events, s.snapshots, s.pick?.text),
            pastes: externalTransformation(s.events),
          }
        : null,
    [s],
  );
  if (!s || !derived || !review)
    return (
      <>
        {error ? (
          <Notice error>{error}</Notice>
        ) : (
          <p>학생의 생각을 불러오고 있어요…</p>
        )}
      </>
    );
  const { summary, score, guide, pastes } = derived;
  const feedback = review.feedback || EMPTY_FEEDBACK;
  const feedbackReady = !!(
    feedback.quote.trim() &&
    feedback.strength.trim() &&
    feedback.nextStep.trim()
  );
  const updateFeedback = (field: keyof TeacherFeedback, value: string) => {
    setSaved(false);
    setReview({
      ...review,
      completed: false,
      feedback: { ...feedback, [field]: value },
    });
  };
  const fulfilled =
    review.fullRead ||
    (!assignment.fullRead && review.passages.length >= assignment.minRead);
  const jump = (seq: number) => {
    setTarget(seq);
    setTab("replay");
  };
  const minutes = (ms: number) => `${Math.round(ms / 60000)}분`;
  async function save(completed = false) {
    if (!review) return;
    setSaving(true);
    setSaved(false);
    try {
      const result = await api<{ review: Review }>(
        `/api/submissions/${id}/review`,
        {
          passages: review.passages,
          fullRead: review.fullRead,
          reaction: review.reaction,
          feedback,
          completed,
        },
      );
      setReview(result.review);
      setSaved(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <button className="subtle back" onClick={onBack}>
        <ArrowLeft size={16} />
        학생 목록
      </button>
      <div className="page-heading">
        <div>
          <p className="overline">{s.alias}의 생각</p>
          <h1>{s.title || "작성 중인 글"}</h1>
          <p className="muted">
            {s.status === "submitted" ? "제출 완료" : "작성 중"} ·{" "}
            {time(s.updatedAt)}
          </p>
        </div>
        <button
          className="outline"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob(
                [
                  JSON.stringify(
                    {
                      assignment: { ...assignment, joinCode: undefined },
                      submission: s,
                    },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              ),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = `proofwrite-${s.id}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          <Download size={16} />
          기록 내보내기
        </button>
      </div>
      <div className="review-layout">
        <section className="review-main">
          <LearningFocus assignment={assignment} />
          {assignment.description && (
            <details className="assignment-instructions">
              <summary>과제 안내 다시 보기</summary>
              <p className="pre-wrap">{assignment.description}</p>
            </details>
          )}
          <nav className="tabs" aria-label="학생 글 검토">
            {[
              { key: "full", text: "전체 글", Icon: FileText },
              { key: "guide", text: "읽기 안내", Icon: Star },
              { key: "replay", text: "작성과정", Icon: History },
            ].map(({ key, text, Icon }) => (
              <button
                key={key}
                className={tab === key ? "active" : ""}
                onClick={() => setTab(key)}
              >
                <Icon size={16} />
                {text}
              </button>
            ))}
          </nav>
          {tab === "guide" && (
            <>
              <div className="reading-intro">
                <h2>여기에서 읽기를 시작하세요.</h2>
                <p>학생이 고른 대목과 변화가 남은 문장을 먼저 만나보세요.</p>
              </div>
              {guide.map((item) => (
                <article
                  className={`reading-card ${item.reason === "student_pick" ? "student-pick" : ""}`}
                  key={item.id}
                >
                  <span className="overline">
                    {item.reason === "student_pick"
                      ? "STUDENT’S VOICE"
                      : item.reason === "major_revision"
                        ? "THINKING IN MOTION"
                        : "A CLOSER LOOK"}
                  </span>
                  <h3>{item.title}</h3>
                  <blockquote>
                    {item.excerpt ||
                      "이 시점의 작성과정에서 변경 내용을 확인해주세요."}
                  </blockquote>
                  <p className="muted">{item.detail}</p>
                  {item.reason === "student_pick" && s.pick?.why && (
                    <div className="student-why">학생의 말 · {s.pick.why}</div>
                  )}
                  <div className="reading-actions">
                    {item.reason === "student_pick" && (
                      <button
                        className="subtle"
                        disabled={s.status !== "submitted"}
                        onClick={() => updateFeedback("quote", item.excerpt)}
                      >
                        이 대목에 피드백 쓰기
                      </button>
                    )}
                    {item.eventSeq && (
                      <button
                        className="subtle"
                        onClick={() => jump(item.eventSeq!)}
                      >
                        <History size={14} />이 시점 보기
                      </button>
                    )}
                    <label className="check-label">
                      <input
                        type="checkbox"
                        disabled={s.status !== "submitted"}
                        checked={review.passages.includes(item.id)}
                        onChange={(e) => {
                          setSaved(false);
                          setReview({
                            ...review,
                            completed: false,
                            passages: e.target.checked
                              ? [...review.passages, item.id]
                              : review.passages.filter((x) => x !== item.id),
                          });
                        }}
                      />
                      이 대목을 읽었어요
                    </label>
                  </div>
                </article>
              ))}
              {!guide.length && (
                <Notice>
                  아직 추천할 대목이 없습니다. 전체 글을 읽고 확인해주세요.
                </Notice>
              )}
              {assignment.questions.length > 0 && (
                <section className="panel">
                  <h3>학생의 돌아보기</h3>
                  {assignment.questions.map((q, i) => (
                    <div className="reflection" key={q}>
                      <b>{q}</b>
                      <p>{s.reflections[i] || "답변하지 않았어요."}</p>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          {tab === "full" && (
            <section className="panel">
              <h2>{s.title}</h2>
              <p className="fine-print">
                무슨 생각을 전하려는지, 근거가 그 생각을 어떻게 뒷받침하는지
                읽어주세요. 과정 기록만으로 글의 수준을 판단하지 않습니다.
              </p>
              <RichDocument doc={s.doc} />
              {s.pick && (
                <div className="student-why">
                  <b>학생이 보여주고 싶은 대목</b>
                  <blockquote>{s.pick.text}</blockquote>
                  {s.pick.why && <p>{s.pick.why}</p>}
                  <button
                    className="subtle"
                    disabled={s.status !== "submitted"}
                    onClick={() => updateFeedback("quote", s.pick!.text)}
                  >
                    이 대목에 피드백 쓰기
                  </button>
                </div>
              )}
              {s.sources && (
                <div className="sources">
                  <h3>참고자료 · 출처</h3>
                  <p className="pre-wrap">{s.sources}</p>
                </div>
              )}
              <label className="check-label full-read">
                <input
                  type="checkbox"
                  disabled={s.status !== "submitted"}
                  checked={review.fullRead}
                  onChange={(e) => {
                    setSaved(false);
                    setReview({
                      ...review,
                      fullRead: e.target.checked,
                      completed: false,
                    });
                  }}
                />
                전체 글을 읽었어요
              </label>
            </section>
          )}
          {tab === "replay" && (
            <>
              <Replay submission={s} target={target} />
              <section className="panel">
                <h3>외부 텍스트가 어떻게 달라졌나요?</h3>
                {pastes.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>붙여넣기</th>
                          <th>남은 문자</th>
                          <th>남지 않은 문자</th>
                          <th>겹친 수정의 입력</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastes.map((p) => (
                          <tr key={p.eventSeq}>
                            <td>
                              <button
                                className="subtle"
                                onClick={() => setTarget(p.eventSeq)}
                              >
                                {p.pasted}자
                              </button>
                            </td>
                            <td>
                              {p.approximate ? "추정 " : ""}
                              {p.remaining}자
                            </td>
                            <td>{p.deleted}자</td>
                            <td>{p.laterInserted}자</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">기록된 붙여넣기가 없습니다.</p>
                )}
                <p className="fine-print">
                  문자 위치의 변화를 추적한 값입니다. 의미상 재작성 여부를
                  판단하지 않습니다. 문단 이동이나 오래된 실행 취소가 포함되면
                  잔존량은 추정치로 표시합니다.
                </p>
              </section>
            </>
          )}
          {s.learningResponse && (
            <section className="panel learning-response">
              <h3>학생의 다음 시도</h3>
              <p className="muted">
                {s.learningResponse.reviewUpdatedAt === s.review.updatedAt
                  ? "현재 피드백에 대한 답"
                  : "이전 피드백에 대한 답"}{" "}
                · {time(s.learningResponse.updatedAt)}
              </p>
              {s.learningResponse.revisedExcerpt && (
                <>
                  <h4>다시 써본 대목</h4>
                  <blockquote className="pre-wrap">
                    {s.learningResponse.revisedExcerpt}
                  </blockquote>
                </>
              )}
              <h4>학생이 설명한 선택·질문</h4>
              <p className="pre-wrap">{s.learningResponse.explanation}</p>
              <small>
                제출 원문과 별도로 보관한 후속 연습입니다. 과정 점수에 반영하지
                않습니다.
              </small>
            </section>
          )}
        </section>
        <aside className="review-aside">
          <section className="panel compact human-check">
            <h3>읽은 대목에 피드백 남기기</h3>
            <p>
              {assignment.fullRead
                ? "전체 글 읽기"
                : `최소 ${assignment.minRead}대목 읽기`}{" "}
              ·{" "}
              {review.fullRead
                ? "전체 글 확인"
                : `${review.passages.length}대목 확인`}
            </p>
            <p className="fine-print">
              대목이 적으면 ‘전체 글’에서 읽기 확인을 할 수 있습니다.
            </p>
            <p className="fine-print">
              이 학생의 표현을 짚고, 다음 시도 한 가지만 제안해주세요.
            </p>
            <label>
              함께 볼 대목
              <textarea
                rows={3}
                maxLength={1500}
                value={feedback.quote}
                disabled={saving || s.status !== "submitted"}
                onChange={(e) => updateFeedback("quote", e.target.value)}
                placeholder="제출된 본문에서 문장이나 대목을 그대로 옮겨주세요."
              />
            </label>
            <label>
              잘된 점과 그 이유
              <textarea
                rows={3}
                maxLength={2000}
                value={feedback.strength}
                disabled={saving || s.status !== "submitted"}
                onChange={(e) => updateFeedback("strength", e.target.value)}
                placeholder="어떤 표현이 무엇을 이해하는 데 도움이 되었나요?"
              />
            </label>
            <label>
              생각을 넓히는 질문 <small>(선택)</small>
              <textarea
                rows={2}
                maxLength={1000}
                value={feedback.question}
                disabled={saving || s.status !== "submitted"}
                onChange={(e) => updateFeedback("question", e.target.value)}
                placeholder="학생이 자기 생각으로 답할 수 있는 질문 한 가지"
              />
            </label>
            <label>
              다음에 해볼 수정 한 가지
              <textarea
                rows={3}
                maxLength={2000}
                value={feedback.nextStep}
                disabled={saving || s.status !== "submitted"}
                onChange={(e) => updateFeedback("nextStep", e.target.value)}
                placeholder="어느 대목에 어떤 내용을 더하거나 바꿔보면 좋을까요?"
              />
            </label>
            <label>
              짧은 반응
              <select
                value={review.reaction}
                disabled={s.status !== "submitted"}
                onChange={(e) => {
                  setSaved(false);
                  setReview({
                    ...review,
                    completed: false,
                    reaction: e.target.value,
                  });
                }}
              >
                <option value="">반응 선택 (선택사항)</option>
                {[
                  "잘 읽었어요",
                  "좋은 생각이에요",
                  "여기 조금 더 이야기해볼까요?",
                  "수업에서 함께 이야기합시다",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            {error && <Notice error>{error}</Notice>}
            {saved && (
              <Notice>
                {review.completed
                  ? "피드백을 학생에게 전했습니다."
                  : "중간 저장했습니다. 학생에게는 아직 보이지 않습니다."}
              </Notice>
            )}
            <button
              className="primary wide"
              disabled={
                !fulfilled ||
                !feedbackReady ||
                saving ||
                s.status !== "submitted"
              }
              onClick={() => void save(true)}
            >
              <Check size={16} />
              {saving ? "저장 중…" : "피드백 전달"}
            </button>
            <button
              className="subtle wide"
              disabled={saving || s.status !== "submitted"}
              onClick={() => void save(false)}
            >
              중간 저장
            </button>
          </section>
          <details className="process-details">
            <summary>작성과정 보조 지표 펼치기</summary>
            <p className="fine-print">
              검증 전 시범 지표입니다. 글의 질·노력·성적과 연결하지 마세요.
              메모·음성 입력·보조기기·오프라인 사고는 충분히 기록되지 않을 수
              있습니다.
            </p>
            <section className="score-card">
              <p className="overline">PROCESS EVIDENCE · PILOT</p>
              <div className="score-large">
                {score.total}
                <span>/ 100</span>
              </div>
              <h3>{score.label}</h3>
              <p>
                현재 기록에 남은 작성과정
                <br />
                증거의 충분성입니다.
              </p>
              <div className="score-breakdown">
                {[
                  ["생각의 흔적", score.thoughtTrace, 30],
                  ["My Proof · 연구 시범", score.myProof, 25],
                  ["입력 기록", score.inputEvidence, 20],
                  ["수정 과정", score.revisionEvidence, 15],
                  ["과정의 연결", score.processContinuity, 10],
                ].map(([label, value, max]) => (
                  <div key={String(label)}>
                    <span>{label}</span>
                    <b>{value === null ? "해당 없음" : `${value}/${max}`}</b>
                  </div>
                ))}
              </div>
              {score.myProof === null && (
                <small>
                  리듬 미수집·표본 부족: 나머지 75점 만점을 100점으로
                  환산했습니다. 미참여로 감점하지 않습니다.
                </small>
              )}
              <details>
                <summary>점수의 의미와 확인할 사실</summary>
                <p>{score.caveat}</p>
                <ul>
                  <li>문서 버전 {summary.snapshotCount}개</li>
                  <li>수정 기록 {summary.revisionCount}회</li>
                  <li>외부 텍스트 삽입 {summary.pasteChars}자</li>
                  <li>활동 구간 추정 {minutes(summary.activeMs)}</li>
                </ul>
                <p>
                  적은 수정·짧은 글은 낮게 표시될 수 있습니다. 키보드 변경·입력
                  장치·한글 입력에 따라 리듬 신호가 달라질 수 있습니다.
                </p>
              </details>
            </section>
            <section className="panel compact">
              <h3>관찰된 기록</h3>
              <dl className="facts">
                {[
                  ["전체 경과", minutes(summary.totalElapsedMs)],
                  ["활동 구간 추정", minutes(summary.activeMs)],
                  ["기록 간격·비활동", minutes(summary.inactiveMs)],
                  ["작성 세션", `${summary.sessionCount}회`],
                  [
                    "입력 / 삭제",
                    `${summary.insertedChars} / ${summary.deletedChars}자`,
                  ],
                  [
                    "관찰된 직접입력 비율",
                    summary.observedDirectInputRatio === null
                      ? "자료 없음"
                      : `${Math.round(summary.observedDirectInputRatio * 100)}%`,
                  ],
                  [
                    "붙여넣기 / 최대",
                    `${summary.pasteCount}회 / ${summary.largestPasteChars}자`,
                  ],
                  [
                    "실행 취소 / 다시 실행",
                    `${summary.undoCount} / ${summary.redoCount}회`,
                  ],
                  [
                    "창 이탈",
                    `${summary.focusExitCount}회 · ${minutes(summary.focusAwayMs || 0)}`,
                  ],
                  [
                    "표 / 이미지 / 링크",
                    `${summary.tableChangeCount} / ${summary.imageCount} / ${summary.linkCount}회`,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <small>
                직접입력은 입력 이벤트 출처에 따른 관찰값입니다. 창 이탈과
                붙여넣기는 부정행위 근거가 아닙니다. 활동시간은 실제 집중시간이
                아닙니다.
              </small>
            </section>
          </details>
        </aside>
      </div>
    </>
  );
}
