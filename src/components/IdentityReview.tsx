"use client";
import { useEffect, useState } from "react";
import { api } from "../core/api";
import type { TypingRegistration } from "../core/identity";
import { Notice, time } from "./Shell";
export function IdentityReview({ id }: { id: string }) {
  const [rows, setRows] = useState<TypingRegistration[]>([]),
    [witnessed, setWitnessed] = useState<string[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ registrations: TypingRegistration[] }>(
      `/api/submissions/${id}/identity`,
    )
      .then((r) => setRows(r.registrations))
      .catch((e) => setMessage(e.message));
  }, [id]);
  return (
    <section className="panel">
      <h3>학생의 타자 기준 확인</h3>
      <p>
        학생이 실제로 타자 기준을 등록하는 모습을 직접 본 경우에만 확인해주세요.
        이름이나 유사도만으로 본인임을 확정하지 않습니다.
      </p>
      {!rows.length && <p>학생이 연결한 타자 기준이 없습니다.</p>}
      {rows.map((r) => (
        <div className="identity-registration" key={r.id}>
          <b>
            {r.deviceLabel} ·{" "}
            {r.mode === "composition" ? "조합 입력" : "일반 입력"}
          </b>
          <p>
            {time(r.registeredAt)} ·{" "}
            {r.verifiedAt ? "등록 모습 확인 완료" : "교사 확인 전"}
          </p>
          {!r.verifiedAt && (
            <>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={witnessed.includes(r.id)}
                  onChange={(e) =>
                    setWitnessed(
                      e.target.checked
                        ? [...witnessed, r.id]
                        : witnessed.filter((x) => x !== r.id),
                    )
                  }
                />
                이 학생이 타자 기준을 등록하는 모습을 직접 확인했습니다.
              </label>
              <button
                disabled={busy || !witnessed.includes(r.id)}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const result = await api<{
                      registrations: TypingRegistration[];
                    }>(`/api/submissions/${id}/identity`, {
                      registrationId: r.id,
                      witnessed: true,
                    });
                    setRows(result.registrations);
                    setMessage("등록 모습 확인을 저장했습니다.");
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                등록 확인 저장
              </button>
            </>
          )}
        </div>
      ))}
      {message && <Notice>{message}</Notice>}
    </section>
  );
}
