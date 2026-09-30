"use client";
import { useEffect, useState } from "react";
import type { LearningResponse, Submission } from "../core/model";
import { api } from "../core/api";
import { Notice } from "./Shell";

export function LearningFeedback({ submission }: { submission: Submission }) {
  const { review } = submission;
  const [response, setResponse] = useState(submission.learningResponse);
  const [excerpt, setExcerpt] = useState(response?.revisedExcerpt || "");
  const [explanation, setExplanation] = useState(response?.explanation || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const dirty =
    excerpt !== (response?.revisedExcerpt || "") ||
    explanation !== (response?.explanation || "");
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  if (!review.completed)
    return (
      <Notice>
        선생님의 피드백을 기다리고 있어요. 이 페이지를 다시 열면 확인할 수
        있어요.
      </Notice>
    );
  const feedback = review.feedback;
  if (!feedback)
    return review.reaction ? (
      <Notice>선생님의 반응: {review.reaction}</Notice>
    ) : null;
  return (
    <section className="panel text-left learning-feedback">
      <p className="overline">READ · THINK · TRY AGAIN</p>
      <h2>선생님과 한 번 더 생각해요</h2>
      <p className="muted">
        {review.fullRead
          ? "전체 글을 읽고 남긴 피드백"
          : "읽은 대목에 대해 남긴 피드백"}
      </p>
      {review.reaction && <p>선생님의 반응: {review.reaction}</p>}
      <h3>함께 볼 대목</h3>
      <blockquote className="pre-wrap">{feedback.quote}</blockquote>
      <h3>잘된 점과 그 이유</h3>
      <p className="pre-wrap">{feedback.strength}</p>
      {feedback.question && (
        <>
          <h3>생각을 넓히는 질문</h3>
          <p className="pre-wrap">{feedback.question}</p>
        </>
      )}
      <h3>다음에 해볼 수정 한 가지</h3>
      <p className="pre-wrap">{feedback.nextStep}</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          setSaved(false);
          try {
            const result = await api<{ learningResponse: LearningResponse }>(
              `/api/submissions/${submission.id}/learning-response`,
              {
                reviewUpdatedAt: review.updatedAt,
                baseVersion: response?.version ?? 0,
                revisedExcerpt: excerpt,
                explanation,
              },
            );
            setResponse(result.learningResponse);
            setExcerpt(result.learningResponse.revisedExcerpt);
            setExplanation(result.learningResponse.explanation);
            setSaved(true);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>내가 선택한 다음 시도</h3>
        <p className="muted">
          한 대목만 다시 써보세요. 다른 생각이 있다면 이유를 설명하거나 질문해도
          좋아요. 제출한 원문은 그대로 보관됩니다.
        </p>
        {response && response.reviewUpdatedAt !== review.updatedAt && (
          <Notice>
            아래 답은 이전 피드백에 쓴 답이에요. 새 피드백을 읽고 다시
            저장해주세요.
          </Notice>
        )}
        <label>
          다시 써본 대목 <small>(선택)</small>
          <textarea
            rows={5}
            maxLength={3000}
            value={excerpt}
            disabled={busy}
            onChange={(e) => {
              setExcerpt(e.target.value);
              setSaved(false);
            }}
            placeholder="선생님이 짚어주신 대목을 내 생각으로 다듬어보세요."
          />
        </label>
        <label>
          내가 고친 점·선택한 이유 또는 질문
          <textarea
            rows={3}
            maxLength={2000}
            required
            value={explanation}
            disabled={busy}
            onChange={(e) => {
              setExplanation(e.target.value);
              setSaved(false);
            }}
            placeholder="무엇을 왜 바꿨나요? 아직 바꾸기 어렵거나 다른 생각이 있다면 이야기해주세요."
          />
        </label>
        <p className="fine-print">
          선택 활동이며 점수에 반영되지 않아요. 아래 버튼을 눌러 저장해주세요.
        </p>
        {error && (
          <Notice error>{error} 입력한 답은 이 화면에 남아 있어요.</Notice>
        )}
        {saved && <Notice>다음 시도를 선생님께 전했어요.</Notice>}
        <button className="primary" disabled={busy || !explanation.trim()}>
          {busy ? "저장 중…" : "다음 시도 저장"}
        </button>
        {dirty && <small role="status"> 아직 저장하지 않은 답이 있어요.</small>}
      </form>
    </section>
  );
}
