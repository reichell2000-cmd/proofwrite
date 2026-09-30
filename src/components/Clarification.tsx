"use client";
import { useState } from "react";
import { api } from "../core/api";
import { Notice } from "./Shell";
export function Clarification({
  id,
  initial = "",
}: {
  id: string;
  initial?: string;
}) {
  const [text, setText] = useState(initial),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <h3>작성 기록에 대한 설명·재확인 요청</h3>
      <p>
        입력 환경이나 기록에 관해 선생님께 전할 내용이 있으면 남겨주세요. 제출한
        원문과 평가는 바뀌지 않습니다.
      </p>
      <textarea
        aria-label="작성 기록 재확인 설명"
        maxLength={2000}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        disabled={busy || !text.trim()}
        onClick={async () => {
          setBusy(true);
          try {
            await api(`/api/submissions/${id}/clarification`, { text });
            setMessage("선생님께 보여줄 설명을 저장했습니다.");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        설명 저장
      </button>
      {message && <Notice>{message}</Notice>}
    </section>
  );
}
