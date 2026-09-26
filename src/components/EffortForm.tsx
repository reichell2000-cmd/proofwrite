"use client";
import { useRef, useState } from "react";
import {
  EMPTY_EFFORT,
  type EffortEvidence,
  type EffortAttachment,
} from "../core/model";
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
}: {
  value?: EffortEvidence;
  onChange: (value: EffortEvidence) => void;
  disabled?: boolean;
  onLoading?: (loading: boolean) => void;
}) {
  const effort = value || EMPTY_EFFORT;
  const latest = useRef(effort);
  latest.current = effort;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <section className="panel effort-form" id="effort-evidence">
      <p className="overline">04 · YOUR EFFORT</p>
      <h2>노력의 증거</h2>
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
          onChange={(e) => onChange({ ...effort, difficulty: e.target.value })}
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
      <label>
        노력 자료 첨부{" "}
        <small>(선택 · PDF, PNG, JPEG, WebP · 각 512KB 이하, 최대 3개)</small>
        <input
          type="file"
          disabled={disabled || loading || effort.attachments.length >= 3}
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (
              file.size > 524288 ||
              file.size === 0 ||
              ![
                "application/pdf",
                "image/png",
                "image/jpeg",
                "image/webp",
              ].includes(file.type)
            ) {
              setError("512KB 이하의 PDF·PNG·JPEG·WebP 파일을 선택해주세요.");
              return;
            }
            setLoading(true);
            onLoading?.(true);
            setError("");
            try {
              const data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              onChange({
                ...latest.current,
                attachments: [
                  ...latest.current.attachments,
                  {
                    id: crypto.randomUUID(),
                    name: file.name.slice(0, 180),
                    mime: file.type as EffortAttachment["mime"],
                    size: file.size,
                    data,
                  },
                ],
              });
            } catch {
              setError("첨부자료를 읽지 못했습니다. 다시 선택해주세요.");
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
      {error && <Notice error>{error}</Notice>}
    </section>
  );
}
