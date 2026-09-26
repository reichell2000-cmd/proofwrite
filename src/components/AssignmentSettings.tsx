"use client";
import { useState } from "react";
import {
  CONTENT_PRIORITIES,
  DEFAULT_PRIORITIES,
  type Assignment,
  type ContentPriority,
} from "../core/model";
import { api } from "../core/api";
import { Notice } from "./Shell";
export function PriorityChoices({
  value,
  onChange,
}: {
  value: ContentPriority[];
  onChange: (value: ContentPriority[]) => void;
}) {
  return (
    <fieldset className="priority-choices">
      <legend>
        먼저 읽고 싶은 내용 <small>(한 가지 이상)</small>
      </legend>
      {Object.entries(CONTENT_PRIORITIES).map(([key, title]) => (
        <label className="check-label" key={key}>
          <input
            type="checkbox"
            checked={value.includes(key as ContentPriority)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...value, key as ContentPriority]
                  : value.filter((p) => p !== key),
              )
            }
          />
          {title}
        </label>
      ))}
    </fieldset>
  );
}
function localDate(value?: number | null) {
  return value
    ? new Date(value - new Date(value).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
}
export function AssignmentSettings({
  assignment,
  onSave,
}: {
  assignment: Assignment;
  onSave: (assignment: Assignment) => void;
}) {
  const [priorities, setPriorities] = useState(
    assignment.contentPriorities || DEFAULT_PRIORITIES,
  );
  const [due, setDue] = useState(localDate(assignment.dueAt));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <details className="panel assignment-settings">
      <summary>마감일·읽기 기준 설정</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          try {
            const result = await api<{ assignment: Assignment }>(
              `/api/assignments/${assignment.id}/settings`,
              {
                contentPriorities: priorities,
                dueAt: due ? new Date(due).getTime() : null,
              },
            );
            onSave(result.assignment);
            setMessage("과제 설정을 저장했어요.");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          제출 마감일 <small>(선택 · 이 기기의 시간대)</small>
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <PriorityChoices value={priorities} onChange={setPriorities} />
        <p className="fine-print">
          내용의 표현 단서로 읽기 후보를 찾습니다. 이미 저장한 피드백과 제출
          원문은 유지됩니다.
        </p>
        <button className="primary" disabled={busy || !priorities.length}>
          설정 저장
        </button>
        {message && <Notice>{message}</Notice>}
        {error && <Notice error>{error}</Notice>}
      </form>
    </details>
  );
}
