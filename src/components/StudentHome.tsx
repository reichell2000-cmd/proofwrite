"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Header, Notice, time } from "./Shell";
import { api } from "../core/api";
import type { EvidenceAxis } from "../core/proof/five-evidence";
import { EvidencePanel } from "./EvidencePanel";
interface Task {
  id: string;
  title: string;
  alias: string;
  status: string;
  updatedAt: number;
  dueAt?: number;
  feedbackReady: boolean;
  responded: boolean;
  axes: EvidenceAxis[];
}
export default function StudentHome() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [tab, setTab] = useState("tasks");
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ tasks: Task[] }>("/api/student")
      .then((r) => setTasks(r.tasks))
      .catch((e) => setError(e.message));
  }, []);
  const shown = tasks?.filter((t) =>
    tab === "submitted"
      ? t.status === "submitted"
      : tab === "feedback"
        ? t.feedbackReady
        : true,
  );
  return (
    <>
      <Header />
      <main className="student-home">
        <div className="page-heading">
          <div>
            <p className="overline">PROOFME · MY LEARNING</p>
            <h1>내 과제</h1>
            <p className="muted">
              과제를 확인하고, 생각과 과정을 차근차근 남겨보세요.
            </p>
          </div>
        </div>
        <nav className="tabs" aria-label="학생 공간">
          {[
            ["tasks", "내 과제"],
            ["submitted", "제출한 과제"],
            ["feedback", "피드백·다시쓰기"],
            ["process", "나의 과정"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        {error && <Notice error>{error}</Notice>}
        {!tasks && !error && <p>과제를 불러오고 있어요…</p>}
        {shown?.length === 0 && (
          <section className="panel empty-state">
            <h2>
              {tab === "feedback"
                ? "아직 도착한 피드백이 없어요."
                : tab === "submitted"
                  ? "아직 제출한 과제가 없어요."
                  : "선생님의 과제 참여 링크를 열어주세요."}
            </h2>
            <p>
              같은 브라우저에서 참여한 과제를 이곳에서 다시 확인할 수 있어요.
            </p>
          </section>
        )}
        <div className="task-list">
          {shown?.map((task) => (
            <article className="panel task-card" key={task.id}>
              <div className="task-card-top">
                <span className="evidence-status">
                  {task.feedbackReady
                    ? task.responded
                      ? "다시쓰기 기록 완료"
                      : "피드백 도착"
                    : task.status === "submitted"
                      ? "제출 완료"
                      : "작성 중"}
                </span>
                <small>
                  {task.dueAt ? `마감 ${time(task.dueAt)}` : "마감일 미설정"}
                </small>
              </div>
              <h2>{task.title}</h2>
              <p className="muted">
                {task.alias} · 최근 저장 {time(task.updatedAt)}
              </p>
              <Link
                className="button primary"
                href={
                  tab === "feedback" ? `/write/${task.id}` : `/task/${task.id}`
                }
              >
                {task.feedbackReady
                  ? "피드백 확인·다시쓰기"
                  : task.status === "submitted"
                    ? "제출 내역 보기"
                    : "과제 확인·이어쓰기"}{" "}
                →
              </Link>
              {tab === "process" && <EvidencePanel axes={task.axes} />}
            </article>
          ))}
        </div>
        <p className="fine-print">
          이 브라우저의 참여 권한으로 표시됩니다. 다른 기기나 권한 만료 후에는
          기존 과제가 보이지 않을 수 있어요.
        </p>
      </main>
    </>
  );
}
