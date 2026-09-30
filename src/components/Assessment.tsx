"use client";
import { useState } from "react";
import {
  CATEGORIES,
  GRADE_BANDS,
  sectionsFor,
  categoryGuidance,
  recommendedRevision,
  gradeAvailableMax,
  CATEGORY_IDS,
  COMMON_CRITERIA,
  recommendedPlan,
  redistribute,
  scoreCriteria,
  planError,
  blankEvaluation,
  gradeTotal,
  type AssessmentPlan,
  type CategoryId,
  type Criterion,
  type Evaluation,
} from "../core/assessment";

export function AssessmentBuilder({
  value,
  onChange,
  goal,
}: {
  value: AssessmentPlan;
  onChange: (plan: AssessmentPlan) => void;
  goal: string;
}) {
  const [preview, setPreview] = useState<Criterion[] | null>(null);
  const [rubricOpen, setRubricOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [common, setCommon] = useState<string>("creativity");
  const change = (plan: AssessmentPlan) => {
    setPreview(null);
    setMessage("");
    onChange(plan);
  };
  const patch = (id: string, changes: Partial<Criterion>) =>
    change({
      ...value,
      criteria: value.criteria.map((c) =>
        c.id === id ? { ...c, ...changes } : c,
      ),
    });
  const issue = planError(value);
  return (
    <section className="assessment-builder" aria-label="과제 유형과 평가 설정">
      <div className="form-grid">
        <label>
          활용 목적
          <select
            aria-label="활용 목적"
            value={value.purpose}
            onChange={(e) =>
              change({
                ...value,
                purpose: e.target.value as AssessmentPlan["purpose"],
              })
            }
          >
            <option value="assignment">과제 제출</option>
            <option value="classroom">수업 중 활동</option>
            <option value="practice">자율 학습·기록</option>
          </select>
        </label>
        <label>
          과제 유형
          <select
            aria-label="과제 유형"
            value={value.category}
            onChange={(e) =>
              change({
                ...recommendedPlan(e.target.value as CategoryId, goal),
                purpose: value.purpose,
                gradeBand: value.gradeBand,
                emphasis: value.emphasis,
              })
            }
          >
            {CATEGORY_IDS.map((id) => (
              <option key={id} value={id}>
                {CATEGORIES[id].label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          대상 학년
          <select
            aria-label="대상 학년"
            value={value.gradeBand || "middle"}
            onChange={(e) =>
              change({
                ...value,
                gradeBand: e.target.value as AssessmentPlan["gradeBand"],
              })
            }
          >
            {Object.entries(GRADE_BANDS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          중요하게 볼 기준
          <select
            aria-label="중요하게 볼 기준"
            value={value.emphasis || "balanced"}
            onChange={(e) =>
              change({
                ...value,
                emphasis: e.target.value as AssessmentPlan["emphasis"],
              })
            }
          >
            <option value="balanced">유형별 균형</option>
            <option value="creativity">창의적 발상</option>
            <option value="evidence">근거 활용</option>
          </select>
        </label>
      </div>
      <p>{CATEGORIES[value.category].goal}</p>
      <p className="scope-note">{categoryGuidance(value.category)}</p>
      {CATEGORIES[value.category].boundary && (
        <p className="scope-note">{CATEGORIES[value.category].boundary}</p>
      )}
      <details className="template-preview">
        <summary>학생 작성 양식 미리보기</summary>
        <ol>
          {sectionsFor(value.category, value.gradeBand).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p>
          글·표·이미지·링크와 함께 작성합니다. 게시한 기준과 배점을 학생에게
          먼저 보여줍니다.
        </p>
      </details>
      <div className="assessment-actions">
        <button
          type="button"
          onClick={() => {
            try {
              setPreview(recommendedRevision(value).criteria);
              setRubricOpen(true);
              setMessage("");
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          유형·목표로 추천 다시 적용
        </button>
        <label>
          평가 방식
          <select
            aria-label="평가 방식"
            value={value.grading}
            onChange={(e) =>
              change({
                ...value,
                grading: e.target.value as AssessmentPlan["grading"],
              })
            }
          >
            <option value="score">100점 평가와 피드백</option>
            <option value="feedback">점수 없이 피드백</option>
          </select>
        </label>
      </div>
      <p className="fine-print">
        유형별 기본 비율에 선택한 중점을 반영하는 추천 양식입니다. 수정하지
        않으면 아래 추천값으로 게시됩니다. 추천값은 검증된 자동 채점 기준이
        아닙니다.
      </p>
      <details
        className="rubric-settings"
        open={rubricOpen}
        onToggle={(e) => setRubricOpen(e.currentTarget.open)}
      >
        <summary>평가 항목·배점 조정</summary>
        <div className="criterion-list">
          {value.criteria.map((c) => (
            <fieldset className="criterion-row" key={c.id}>
              <legend>
                {c.label}{" "}
                <small>
                  {c.source === "proof"
                    ? "과정 증거"
                    : c.source === "custom"
                      ? "교사 직접 평가"
                      : "내용 기준"}
                </small>
              </legend>
              {c.source === "custom" && (
                <label>
                  항목 이름
                  <input
                    aria-label={`${c.id} 항목 이름`}
                    value={c.label}
                    maxLength={80}
                    onChange={(e) => patch(c.id, { label: e.target.value })}
                  />
                </label>
              )}
              <details>
                <summary>판단 기준 확인·수정</summary>
                <textarea
                  aria-label={`${c.label} 판단 기준`}
                  value={c.description}
                  maxLength={500}
                  onChange={(e) => patch(c.id, { description: e.target.value })}
                />
                <p className="fine-print">
                  충분: 기준을 구체적인 근거로 충족 / 부분: 일부 충족하나
                  연결·설명이 부족 / 보완: 핵심 근거·설명이 필요. 제출 후 학생의
                  실제 내용으로 판단합니다.
                </p>
              </details>
              <div className="criterion-controls">
                <label>
                  사용
                  <select
                    aria-label={`${c.label} 사용`}
                    value={c.mode}
                    onChange={(e) =>
                      patch(c.id, {
                        mode: e.target.value as Criterion["mode"],
                        weight: e.target.value === "score" ? c.weight || 10 : 0,
                      })
                    }
                  >
                    <option value="score">평가 포함</option>
                    <option value="reference">참고만 보기</option>
                    <option value="exclude">이번 과제에서 제외</option>
                  </select>
                </label>
                {c.mode === "score" && value.grading === "score" && (
                  <>
                    <label>
                      배점
                      <input
                        aria-label={`${c.label} 배점`}
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        value={c.weight}
                        onChange={(e) =>
                          patch(c.id, { weight: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label className="check-label">
                      <input
                        aria-label={`${c.label} 배점 고정`}
                        type="checkbox"
                        checked={c.locked}
                        onChange={(e) =>
                          patch(c.id, { locked: e.target.checked })
                        }
                      />
                      고정
                    </label>
                  </>
                )}
                {c.source === "custom" && (
                  <button
                    type="button"
                    onClick={() =>
                      change({
                        ...value,
                        criteria: value.criteria.filter((x) => x.id !== c.id),
                      })
                    }
                  >
                    항목 삭제
                  </button>
                )}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="assessment-actions">
          <label>
            공통 내용 항목
            <select
              aria-label="추가할 공통 항목"
              value={common}
              onChange={(e) => setCommon(e.target.value)}
            >
              {COMMON_CRITERIA.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={value.criteria.some(
              (c) =>
                c.id === `common:${common}` ||
                c.label === COMMON_CRITERIA.find((x) => x[0] === common)?.[1],
            )}
            onClick={() => {
              const entry = COMMON_CRITERIA.find((c) => c[0] === common)!;
              change({
                ...value,
                criteria: [
                  ...value.criteria,
                  {
                    id: `common:${common}`,
                    label: entry[1],
                    description: entry[2],
                    source: "content",
                    mode: value.grading === "score" ? "score" : "reference",
                    weight: value.grading === "score" ? 10 : 0,
                    locked: false,
                  },
                ],
              });
            }}
          >
            공통 항목 추가
          </button>
          <button
            type="button"
            disabled={
              value.criteria.filter((c) => c.source === "custom").length >= 3
            }
            onClick={() =>
              change({
                ...value,
                criteria: [
                  ...value.criteria,
                  {
                    id: `custom:${crypto.randomUUID()}`,
                    label: "직접 평가 항목",
                    description: "교사가 직접 읽거나 관찰할 기준을 적어주세요.",
                    source: "custom",
                    mode: value.grading === "score" ? "score" : "reference",
                    weight: value.grading === "score" ? 10 : 0,
                    locked: false,
                  },
                ],
              })
            }
          >
            교사 항목 추가
          </button>
        </div>
        {value.grading === "score" && (
          <>
            <p className="rubric-total" role="status">
              배점 합계 {scoreCriteria(value).reduce((n, c) => n + c.weight, 0)}{" "}
              / 100점
            </p>
            <button
              type="button"
              onClick={() => {
                try {
                  setPreview(redistribute(value.criteria));
                  setMessage("");
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              남은 배점 자동 배분 미리보기
            </button>
          </>
        )}
        {preview && (
          <div className="allocation-preview">
            <h4>배분 결과 · 고정한 배점은 유지</h4>
            {preview
              .filter((c) => c.mode === "score")
              .map((c) => (
                <p key={c.id}>
                  {c.label}: {value.criteria.find((x) => x.id === c.id)?.weight}{" "}
                  → <b>{c.weight}점</b>
                </p>
              ))}
            <button
              type="button"
              onClick={() => change({ ...value, criteria: preview })}
            >
              배분 적용
            </button>
          </div>
        )}
      </details>
      <p className="fine-print">
        추천 평가:{" "}
        {scoreCriteria(value)
          .map((c) => `${c.label} ${c.weight}점`)
          .join(" · ") || "점수 없이 피드백"}
      </p>
      {(issue || message) && (
        <p className="feedback-quote-error" role="alert">
          {message || issue}
        </p>
      )}
      <p className="fine-print">
        게시하면 학생에게 보인 유형과 평가 기준이 고정됩니다. 다른 기준은 새
        과제로 안내합니다. 노력의 증거를 제외하면 학생에게 별도 노력 입력을
        요구하지 않습니다.
      </p>
    </section>
  );
}

export function AssessmentSummary({ plan }: { plan?: AssessmentPlan }) {
  if (!plan) return null;
  return (
    <section className="panel assessment-summary" aria-label="확정된 평가 기준">
      <p className="overline">
        {CATEGORIES[plan.category].label} · 게시한 기준
      </p>
      <h3>선생님이 중요하게 볼 내용</h3>
      <p>
        {plan.grading === "score"
          ? "총 100점 · 아래 기준에 따라 과제를 수행하세요."
          : "점수 없이 읽고 피드백하는 과제입니다."}
      </p>
      {plan.criteria
        .filter((c) => c.mode === "score" && plan.grading === "score")
        .map((c) => (
          <div className="rubric-item" key={c.id}>
            <b>
              {c.label} <span>{c.weight}점</span>
            </b>
            <p>{c.description}</p>
            {c.source === "custom" && <small>교사가 직접 확인하는 항목</small>}
          </div>
        ))}
      <details open={plan.grading === "feedback"}>
        <summary>참고하는 증거·기준</summary>
        {plan.criteria
          .filter(
            (c) =>
              c.mode === "reference" ||
              (plan.grading === "feedback" && c.mode === "score"),
          )
          .map((c) => (
            <p key={c.id}>
              <b>{c.label}</b> · {c.description}
            </p>
          ))}
      </details>
      {plan.criteria.find((c) => c.id === "proof:effort")?.mode ===
        "exclude" && (
        <p className="fine-print">
          이번 과제는 별도 노력의 증거를 제출하지 않아도 됩니다.
        </p>
      )}
    </section>
  );
}

export function AssignmentFormat({
  plan,
  onInsert,
}: {
  plan?: AssessmentPlan;
  onInsert?: () => void;
}) {
  if (!plan) return null;
  const category = CATEGORIES[plan.category];
  return (
    <section className="panel assignment-format">
      <h3>{category.label} 작성 안내</h3>
      <ol>
        {sectionsFor(plan.category, plan.gradeBand).map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ol>
      {category.table &&
        plan.gradeBand !== "lowerPrimary" &&
        plan.gradeBand !== "middlePrimary" && (
          <p>자료를 비교·관찰하는 표를 양식에 포함했습니다.</p>
        )}
      {category.boundary && <p className="scope-note">{category.boundary}</p>}
      {onInsert && (
        <button type="button" onClick={onInsert}>
          본문에 작성 양식 넣기
        </button>
      )}
      <p className="fine-print">
        양식은 안내입니다. 자신의 내용에 맞게 제목·순서를 다듬어도 됩니다.
      </p>
    </section>
  );
}

export function EvaluationEditor({
  plan,
  value,
  onChange,
  disabled,
}: {
  plan: AssessmentPlan;
  value?: Evaluation;
  onChange: (value: Evaluation) => void;
  disabled: boolean;
}) {
  const v = value ?? blankEvaluation(plan);
  const set = (id: string, changes: Partial<Evaluation["scores"][number]>) =>
    onChange({
      ...v,
      confirmed: false,
      scores: scoreCriteria(plan).map((c) => {
        const old = v.scores.find((s) => s.id === c.id) ?? {
          id: c.id,
          value: null,
          note: "",
        };
        return c.id === id ? { ...old, ...changes } : old;
      }),
    });
  return (
    <section className="evaluation-editor">
      <h3>교사 최종 평가</h3>
      {scoreCriteria(plan).map((c) => {
        const row = v.scores.find((s) => s.id === c.id);
        return (
          <div className="rubric-item" key={c.id}>
            <b>
              {c.label} · {c.weight}점
            </b>
            <p>{c.description}</p>
            <label className="check-label">
              <input
                type="checkbox"
                aria-label={`${c.label} 자료 부족`}
                disabled={disabled}
                checked={!!row?.unavailable}
                onChange={(e) =>
                  set(c.id, { unavailable: e.target.checked, value: null })
                }
              />
              자료 부족 · 계산에서 제외하고 사유 남기기
            </label>
            <label>
              점수
              <input
                aria-label={`${c.label} 평가 점수`}
                type="number"
                min={0}
                max={c.weight}
                step="0.5"
                disabled={disabled || !!row?.unavailable}
                value={row?.value ?? ""}
                placeholder="평가 대기"
                onChange={(e) =>
                  set(c.id, {
                    value:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              확인 근거{" "}
              {c.source !== "content" || c.id === "common:response"
                ? "(필수 · 직접 확인)"
                : "(선택)"}
              <textarea
                aria-label={`${c.label} 확인 근거`}
                rows={2}
                maxLength={2000}
                disabled={disabled}
                value={row?.note ?? ""}
                onChange={(e) => set(c.id, { note: e.target.value })}
              />
            </label>
          </div>
        );
      })}
      <p role="status">
        {plan.grading === "feedback"
          ? "점수 없는 피드백"
          : gradeTotal(v, plan) === null
            ? "점수 입력을 기다리는 항목이 있습니다."
            : `평가 합계 ${gradeTotal(v, plan)} / 100점 (자료가 있는 ${gradeAvailableMax(plan, v)}점 만점에서 환산)`}
      </p>
      <label className="check-label">
        <input
          type="checkbox"
          aria-label="평가와 근거 최종 확인"
          checked={v.confirmed}
          disabled={disabled}
          onChange={(e) => onChange({ ...v, confirmed: e.target.checked })}
        />
        학생의 내용과 근거를 읽고 이 평가를 확인했습니다.
      </label>
    </section>
  );
}

export function EvaluationResult({
  plan,
  value,
}: {
  plan?: AssessmentPlan;
  value?: Evaluation;
}) {
  if (!plan || !value) return null;
  return (
    <section className="panel evaluation-result">
      <h3>
        선생님이 확정한 평가{" "}
        {plan.grading === "score"
          ? `${value.total ?? gradeTotal(value, plan)} / 100점`
          : "· 피드백"}
      </h3>
      {plan.grading === "score" && (
        <p>
          자료가 있는 {value.availableMax ?? gradeAvailableMax(plan, value)}점
          만점에서 100점으로 환산합니다.
        </p>
      )}
      {scoreCriteria(plan).map((c) => {
        const row = value.scores.find((s) => s.id === c.id);
        return (
          <div className="rubric-item" key={c.id}>
            <b>
              {c.label} ·{" "}
              {row?.unavailable
                ? "자료 부족 · 계산 제외"
                : `${row?.value ?? "평가 대기"} / ${c.weight}점`}
            </b>
            {row?.note && <p>{row.note}</p>}
          </div>
        );
      })}
    </section>
  );
}
