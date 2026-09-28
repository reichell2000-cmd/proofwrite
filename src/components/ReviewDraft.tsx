"use client";
import { useEffect, useState } from "react";
import { api } from "../core/api";
import type { ReviewDraft as Draft } from "../core/review-draft";
export function ReviewDraft({
  id,
  revision,
  labels,
  onApply,
  onRead,
}: {
  id: string;
  revision: number;
  labels: Record<string, string>;
  onApply: (draft: Draft) => void;
  onRead: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [request, setRequest] = useState(0);
  useEffect(() => {
    let canceled = false;
    setBusy(true);
    setError("");
    api<{ draft: Draft }>(`/api/submissions/${id}/review-draft`, {})
      .then((r) => {
        if (!canceled) setDraft(r.draft);
      })
      .catch((e) => {
        if (!canceled) setError(e.message);
      })
      .finally(() => {
        if (!canceled) setBusy(false);
      });
    return () => {
      canceled = true;
    };
  }, [id, revision, request]);
  return (
    <section className="panel review-draft">
      <h3>함께 검토할 내용</h3>
      {busy && <p role="status">검토 초안을 준비하고 있어요…</p>}
      {error && <p role="alert">{error}</p>}
      {draft && (
        <>
          <p className="fine-print">{draft.message}</p>
          <p>{draft.summary}</p>
          <blockquote>{draft.feedback.quote}</blockquote>
          {draft.feedback.strength && (
            <p>
              <b>강점 후보</b> · {draft.feedback.strength}
            </p>
          )}
          {draft.feedback.question && (
            <p>
              <b>확인 질문</b> · {draft.feedback.question}
            </p>
          )}
          {draft.feedback.nextStep && (
            <p>
              <b>다음 수정</b> · {draft.feedback.nextStep}
            </p>
          )}
          {draft.suggestions.map((s) => (
            <p key={s.id}>
              <b>{labels[s.id]}</b> ·{" "}
              {s.value === null ? "판단 자료 부족" : `추천 ${s.value}점`} ·{" "}
              {s.reason}
            </p>
          ))}
          <div className="actions">
            <button type="button" onClick={onRead}>
              원문 읽기
            </button>
            <button
              type="button"
              disabled={busy || draft.revision !== revision}
              onClick={() => onApply(draft)}
            >
              초안을 평가란에 반영
            </button>
          </div>
          <p className="fine-print">
            반영 후 수정할 수 있습니다. 읽기 확인과 교사의 평가 확정은 별도로
            필요합니다.
          </p>
        </>
      )}
      <button
        type="button"
        className="subtle"
        disabled={busy}
        onClick={() => setRequest((n) => n + 1)}
      >
        초안 다시 확인
      </button>
    </section>
  );
}
