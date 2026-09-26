"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Header, Notice, time } from "./Shell";
import { LearningFocus } from "./LearningFocus";
import { api } from "../core/api";
import {
  POLICIES,
  CONTENT_PRIORITIES,
  DEFAULT_PRIORITIES,
  type Assignment,
  type Submission,
} from "../core/model";
import { EvidencePanel } from "./EvidencePanel";
import { fiveEvidence } from "../core/proof/five-evidence";
export default function TaskOverview({ id }: { id: string }) {
  const [data, setData] = useState<{
    submission: Submission;
    assignment: Omit<Assignment, "joinCode">;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ submission: Submission; assignment: Omit<Assignment, "joinCode"> }>(
      `/api/submissions/${id}`,
    )
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);
  return (
    <>
      <Header />
      <main className="student-home">
        <Link className="text-link" href="/student">
          ← 내 과제
        </Link>
        {error && <Notice error>{error}</Notice>}
        {!data && !error && <p>과제 안내를 불러오고 있어요…</p>}
        {data && (
          <>
            <section className="task-intro">
              <p className="overline">ASSIGNMENT · 과제 제출</p>
              <h1>{data.assignment.title}</h1>
              <div className="task-meta">
                <span>
                  {data.submission.status === "submitted"
                    ? "제출 완료"
                    : data.submission.events.length
                      ? "작성 중"
                      : "작성 전"}
                </span>
                <span>
                  {data.assignment.dueAt
                    ? `마감 ${time(data.assignment.dueAt)}`
                    : "마감일 미설정"}
                </span>
                <span>{data.submission.alias}</span>
              </div>
              <p className="pre-wrap">
                {data.assignment.description || "별도 안내가 없는 과제입니다."}
              </p>
              <LearningFocus assignment={data.assignment} />
              <p className="muted">
                함께 읽을 내용 ·{" "}
                {(data.assignment.contentPriorities || DEFAULT_PRIORITIES)
                  .map((p) => CONTENT_PRIORITIES[p])
                  .join(" / ")}
              </p>
              <p className="policy-inline">
                {POLICIES[data.assignment.policy]}
              </p>
              <Link className="button primary" href={`/write/${id}`}>
                {data.submission.status === "submitted"
                  ? "제출 내역·피드백 확인"
                  : "글쓰기 시작 · 이어쓰기"}{" "}
                →
              </Link>
            </section>
            <ol className="writing-steps">
              <li>
                <b>1. 글쓰기</b>
                <span>작성과 수정 과정 자동 기록</span>
              </li>
              <li>
                <b>2. 노력의 증거</b>
                <span>해본 일 또는 자료 남기기</span>
              </li>
              <li>
                <b>3. 제출 확인</b>
                <span>자동 저장과 제출은 별도</span>
              </li>
            </ol>
            <EvidencePanel
              axes={fiveEvidence(data.submission, data.assignment)}
            />
          </>
        )}
      </main>
    </>
  );
}
