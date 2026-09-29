"use client";
import { useRef, useState } from "react";
import { EMPTY_EFFORT, type EffortEvidence } from "../core/model";
import { prepareAttachment } from "../core/attachments";
import { Notice } from "./Shell";
export function EffortAttachments({ effort }: { effort?: EffortEvidence }) {
  return (
    <ul className="attachment-list">
      {effort?.attachments.map((file) => (
        <li key={file.id}>
          <a href={file.data} download={file.name}>
            {file.name}
          </a>
          <small>{Math.ceil(file.size / 1024)} KB</small>
        </li>
      ))}
    </ul>
  );
}
export function EffortForm({
  value,
  onChange,
  disabled = false,
  onLoading,
  attachmentsOnly = false,
  required = true,
}: {
  value?: EffortEvidence;
  attachmentsOnly?: boolean;
  required?: boolean;
  onChange: (value: EffortEvidence) => void;
  disabled?: boolean;
  onLoading?: (loading: boolean) => void;
}) {
  const effort = value || EMPTY_EFFORT;
  const latest = useRef(effort);
  latest.current = effort;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section
      className="panel effort-form"
      id={attachmentsOnly ? "assignment-attachments" : "effort-evidence"}
    >
      <p className="overline">
        {attachmentsOnly ? "ASSIGNMENT FILES" : "04 · YOUR EFFORT"}
      </p>
      <h2>{attachmentsOnly ? "과제 첨부자료" : "노력의 증거"}</h2>
      {!attachmentsOnly && !required && (
        <p>선택 항목 · 참고용이며 제출하지 않아도 됩니다.</p>
      )}
      {attachmentsOnly ? (
        <p className="muted">
          외부 결과물이나 참고자료를 첨부할 수 있어요. 큰 파일·PPT·영상은
          본문이나 출처에 링크와 설명을 남겨주세요.
        </p>
      ) : (
        <>
          <p className="muted">
            글을 완성하기 위해 해본 일을 한 가지 적거나, 메모·초안·자료를
            첨부해주세요. 다른 네 기준은 작성 기록에서 자동으로 살펴봅니다.
          </p>
          <label>
            무엇이 어려웠나요? <small>(선택)</small>
            <textarea
              rows={2}
              maxLength={2000}
              disabled={disabled}
              value={effort.difficulty}
              onChange={(e) =>
                onChange({ ...effort, difficulty: e.target.value })
              }
            />
          </label>
          <label>
            무엇을 해보았나요?
            <textarea
              rows={3}
              maxLength={3000}
              disabled={disabled}
              value={effort.attempt}
              placeholder="예: 주장을 뒷받침할 사례를 찾아 비교하고, 근거가 약한 문단을 다시 썼어요."
              onChange={(e) => onChange({ ...effort, attempt: e.target.value })}
            />
          </label>
          <label>
            무엇이 달라졌나요? <small>(선택)</small>
            <textarea
              rows={2}
              maxLength={2000}
              disabled={disabled}
              value={effort.outcome}
              onChange={(e) => onChange({ ...effort, outcome: e.target.value })}
            />
          </label>
        </>
      )}
      <label>
        {attachmentsOnly ? "과제 자료 첨부" : "노력 자료 첨부"}{" "}
        <small>
          (선택 · PDF, PNG, JPEG, WebP · PDF 2MB · 사진 12MB까지 선택, 저장 2MB
          · 최대 3개)
        </small>
        <input
          type="file"
          disabled={disabled || loading || effort.attachments.length >= 3}
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setLoading(true);
            onLoading?.(true);
            setError("");
            setMessage("");
            try {
              const { attachment, resized } = await prepareAttachment(file);
              onChange({
                ...latest.current,
                attachments: [...latest.current.attachments, attachment],
              });
              if (resized)
                setMessage(
                  "사진을 2MB 이하로 줄였어요. 제출 전에 글씨와 그림이 잘 보이는지 확인해주세요.",
                );
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "첨부자료를 읽지 못했습니다.",
              );
            } finally {
              setLoading(false);
              onLoading?.(false);
            }
          }}
        />
      </label>
      {loading && <p role="status">첨부자료를 준비하고 있어요…</p>}
      <ul className="attachment-list">
        {effort.attachments.map((file) => (
          <li key={file.id}>
            <a href={file.data} download={file.name}>
              {file.name}
            </a>
            <button
              type="button"
              className="subtle"
              disabled={disabled || loading}
              aria-label={`${file.name} 삭제`}
              onClick={() =>
                onChange({
                  ...effort,
                  attachments: effort.attachments.filter(
                    (f) => f.id !== file.id,
                  ),
                })
              }
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
      {message && <Notice>{message}</Notice>}
      {error && <Notice error>{error}</Notice>}
    </section>
  );
}
