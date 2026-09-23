"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Feather } from "lucide-react";
import { Header, Notice } from "./Shell";
import { api } from "../core/api";
import { type Assignment, POLICIES } from "../core/model";
export default function Join({
  assignment,
  code,
}: {
  assignment: Omit<Assignment, "joinCode">;
  code: string;
}) {
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Header />
      <main className="narrow join">
        <span className="feature-icon">
          <Feather />
        </span>
        <p className="overline">YOUR NEXT THOUGHT</p>
        <h1>{assignment.title}</h1>
        <p className="pre-wrap muted">{assignment.description}</p>
        <div className="policy">
          <b>{assignment.policy}</b>
          <span>{POLICIES[assignment.policy]}</span>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const resumeId =
                localStorage.getItem(`pw-join-${assignment.id}`) || undefined;
              const result = await api<{ id: string }>(
                `/api/join/${assignment.id}`,
                { alias, code, consent, resumeId },
              );
              localStorage.setItem(`pw-join-${assignment.id}`, result.id);
              router.push(`/write/${result.id}`);
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          <label>
            선생님이 알아볼 이름 또는 별명
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={60}
              required
              placeholder="예: 3반 12번"
              autoComplete="off"
            />
          </label>
          <div className="consent-box">
            <h3>글과 함께 작성과정을 남겨요</h3>
            <p>
              이 편집기에서 작성·수정한 내용과 이전 버전, 붙여넣기, 작성 시간,
              창 이탈 기록을 선생님이 볼 수 있어요. 삭제한 문장도 과정 기록에
              남습니다.
            </p>
            <p>
              다른 앱의 키 입력이나 화면은 수집하지 않아요. 작성 리듬 연구
              참여는 편집기에서 별도로 선택할 수 있어요.
            </p>
            <p>
              같은 브라우저에서 이어 쓸 수 있습니다. 공용 기기에서는 사용 후
              브라우저 데이터를 지워주세요.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
              />{" "}
              작성과정 기록 안내를 읽었어요.
            </label>
          </div>
          {error && <Notice error>{error}</Notice>}
          <button className="primary wide" disabled={busy || !consent}>
            {busy ? "준비 중…" : "글쓰기 시작 · 이어쓰기"}{" "}
            <ArrowRight size={17} />
          </button>
        </form>
      </main>
    </>
  );
}
