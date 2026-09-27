import type { Submission } from "../core/model";
import { summarizeEvidence } from "../core/evidence/summarize";
import { observeRhythm } from "../core/my-proof/observation";
import { submissionScore } from "../core/proof/submission-score";

export function ProcessScore({ submission }: { submission: Submission }) {
  const score = submissionScore(submission);
  const s = summarizeEvidence(submission.events);
  const rhythm = observeRhythm(submission);
  const earned =
    score.thoughtTrace +
    (score.myProof ?? 0) +
    score.inputEvidence +
    score.revisionEvidence +
    score.processContinuity;
  const parts = [
    {
      title: "작성 흔적",
      value: score.thoughtTrace,
      max: 30,
      facts: `기록 시점 ${s.snapshotCount}개 · 입력·삭제 ${s.insertedChars + s.deletedChars}자 · ${s.sessionCount}개 세션`,
      rule: "기록 시점 × 3 (최대 15) + 입력·삭제 문자 ÷ 50 (최대 10) + 세션 × 2 (최대 5)",
    },
    {
      title: "입력 습관 비교",
      value: score.myProof,
      max: 25,
      facts:
        score.myProof === null
          ? "수집 미참여·유효 표본 부족: 계산에서 제외"
          : `${rhythm.mode === "composition" ? "조합" : "일반"} 입력 ${rhythm.samples.length}표본 · ${rhythm.baseline ? "이전 제출과 비교" : "과제 전·후반 비교"}`,
      rule: "같은 입력 방식의 간격 유사도 × 25. 최소 80개 유효 표본일 때만 계산",
    },
    {
      title: "입력 기록",
      value: score.inputEvidence,
      max: 20,
      facts: `입력 ${s.insertedChars}자 · 삭제 ${s.deletedChars}자`,
      rule: "입력·삭제 문자 ÷ 30 (최대 20). 붙여넣기나 창 이탈 자체로 감점하지 않음",
    },
    {
      title: "수정 기록",
      value: score.revisionEvidence,
      max: 15,
      facts: `수정 ${s.revisionCount}회 · 큰 수정 ${s.majorRevisionCount}회`,
      rule: "수정 × 0.7 (최대 10) + 삭제가 포함된 120자 이상 변경 (최대 5)",
    },
    {
      title: "과정 연결",
      value: score.processContinuity,
      max: 10,
      facts: `기록 시점 ${s.snapshotCount}개 · 활동 구간 추정 ${Math.round(s.activeMs / 60000)}분`,
      rule: "기록 시점 (최대 5) + 활동 구간의 분 수 (최대 5)",
    },
  ];
  return (
    <section className="process-score panel" aria-label="과정기록 종합점수">
      <div className="process-score-heading">
        <div>
          <p className="overline">PROOF SCORE · PILOT V0.1</p>
          <h2>과정기록 종합점수</h2>
          <p className="muted">
            {score.label}
            {submission.status === "draft" ? " · 작성 중인 임시 값" : ""}
          </p>
        </div>
        <div className="score-large">
          {score.total}
          <span>/ 100</span>
        </div>
      </div>
      <p>{score.caveat}</p>
      <div className="score-formula" role="note">
        {earned} ÷ {score.availableMax} × 100 = <strong>{score.total}점</strong>{" "}
        <small>(반올림)</small>
        {score.myProof === null && (
          <p>
            리듬 항목은 해당 없음입니다. 나머지 75점 만점을 100점으로
            환산합니다. 리듬을 포함한 점수와 계산 범위가 다릅니다.
          </p>
        )}
      </div>
      <details>
        <summary>점수의 근거와 계산 펼치기</summary>
        <dl className="process-score-parts">
          {parts.map((part) => (
            <div key={part.title}>
              <dt>
                {part.title}
                <b>
                  {part.value === null
                    ? "해당 없음"
                    : `${part.value} / ${part.max}`}
                </b>
              </dt>
              <dd>
                <p>{part.facts}</p>
                <small>{part.rule}</small>
              </dd>
            </div>
          ))}
        </dl>
        <p className="fine-print">
          항목별로 반올림한 뒤 합산합니다. 80점 이상 ‘과정증거 충분’, 55점 이상
          ‘확인 권장’, 그 아래 ‘과정 확인 필요’로 표시합니다. 짧은 글이나
          기록되지 않은 작업은 낮게 나올 수 있고, 기록량이 많아도 글이
          우수하다는 뜻은 아닙니다.
        </p>
      </details>
      <p className="fine-print">
        이 점수는 자동 과정 기록의 요약입니다. 아래 다섯 가지 증거에서 작성
        일정·학생의 노력 근거까지 함께 보고, 내용의 평가는 실제 글을 읽고
        남겨주세요.
      </p>
    </section>
  );
}
