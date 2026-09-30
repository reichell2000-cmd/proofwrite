"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../core/api";
import type { Assignment, Submission } from "../core/model";
import { Header, Notice, time } from "./Shell";
import { ProcessScore } from "./ProcessScore";
import { EvidencePanel } from "./EvidencePanel";
import { fiveEvidence } from "../core/proof/five-evidence";
import { EvaluationResult } from "./Assessment";
import { RichDocument } from "./RichDocument";
export default function ProofReport({ id }: { id: string }) {
  const [data, setData] = useState<{
      submission: Submission;
      assignment: Omit<Assignment, "joinCode">;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<{ submission: Submission; assignment: Omit<Assignment, "joinCode"> }>(
      `/api/submissions/${id}`,
    )
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);
  const s = data?.submission,
    a = data?.assignment;
  return (
    <>
      <Header />
      <main className="student-home proof-report">
        <div className="report-actions">
          <Link className="button outline" href={`/task/${id}`}>
            과제 안내
          </Link>
          <button
            className="primary"
            disabled={!data}
            onClick={() => window.print()}
          >
            보고서 인쇄·PDF 저장
          </button>
        </div>
        <p className="overline">PROOFME · FIVE EVIDENCES</p>
        <h1>나의 증명 보고서</h1>
        {error && <Notice error>{error}</Notice>}
        {!data && !error && <p>기록을 불러오고 있어요…</p>}
        {s && a && (
          <>
            <section className="panel">
              <h2>{s.title || a.title}</h2>
              <p>
                {s.alias} · {a.title}
              </p>
              <p>
                {s.status === "submitted"
                  ? `제출 완료 · ${s.submittedAt ? time(s.submittedAt) : "이전 제출"}`
                  : "작성 중 · 임시 보고서"}
              </p>
              <small>접수번호 {s.id}</small>
              <p>교사 확인: {s.review.completed ? "평가 완료" : "평가 대기"}</p>
            </section>
            <ProcessScore submission={s} />
            {s.review.completed && (
              <EvaluationResult
                plan={s.assessment || a.assessment}
                value={s.review.assessment}
              />
            )}
            <EvidencePanel axes={fiveEvidence(s, a)} />
            <p className="fine-print">
              이번 평가에서 제외한 항목:{" "}
              {s.assessment?.criteria
                .filter((c) => c.mode === "exclude")
                .map((c) => c.label)
                .join(", ") || "없음"}
              . 보고서에는 다섯 증거의 수집 여부를 함께 표시합니다.
            </p>
            {(s.authorshipNote || s.clarification) && (
              <section className="panel">
                <h3>작성자의 설명</h3>
                <p className="pre-wrap">{s.authorshipNote}</p>
                {s.clarification && (
                  <p className="pre-wrap">
                    제출 후 재확인 요청: {s.clarification.text}
                  </p>
                )}
              </section>
            )}
            {s.snapshots.length > 0 && (
              <section className="panel">
                <h3>주요 작성 버전</h3>
                {[
                  s.snapshots[0],
                  ...(s.snapshots.length > 1 ? [s.snapshots.at(-1)!] : []),
                ].map((v, i) => (
                  <div key={v.id}>
                    <b>
                      {i === 0 ? "처음 남긴 버전" : "마지막 남긴 버전"} ·{" "}
                      {time(v.at)}
                    </b>
                    <p className="pre-wrap">
                      {v.text.slice(0, 1500) || "내용 입력 전"}
                      {v.text.length > 1500 ? "… (발췌)" : ""}
                    </p>
                  </div>
                ))}
              </section>
            )}
            {s.review.completed && s.review.feedback && (
              <section className="panel">
                <h3>선생님의 피드백</h3>
                <blockquote>{s.review.feedback.quote}</blockquote>
                <p>{s.review.feedback.strength}</p>
                <p>{s.review.feedback.question}</p>
                <p>{s.review.feedback.nextStep}</p>
              </section>
            )}
            <section className="panel">
              <h3>제출 내용</h3>
              <RichDocument doc={s.doc} />
              <h4>출처·도움 기록</h4>
              <p className="pre-wrap">{s.sources || "별도 기록 없음"}</p>
              <h4>과제 첨부자료</h4>
              <p>{s.attachments?.map((f) => f.name).join(", ") || "없음"}</p>
              <h4>노력 첨부자료</h4>
              <p>
                {s.effort?.attachments.map((f) => f.name).join(", ") || "없음"}
              </p>
            </section>
            <p className="fine-print">
              이 보고서는 ProofMe에 남긴 수행 기록과 교사 평가를 정리한
              기록물입니다. 프로그램 밖의 활동이나 실제 작성자의 신원을 보증하는
              인증서는 아닙니다.
            </p>
          </>
        )}
      </main>
    </>
  );
}
