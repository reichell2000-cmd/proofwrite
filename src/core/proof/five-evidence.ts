import type { Assignment, Submission } from "../model";
import { hasEffort } from "../model";
import { summarizeEvidence } from "../evidence/summarize";
import {
  buildRhythmProfile,
  rhythmContinuity,
  comparableRhythm,
} from "../my-proof/rhythm";
export interface EvidenceAxis {
  id: string;
  title: string;
  source: "자동 기록" | "작성자 제공";
  status: string;
  facts: string[];
  note: string;
  available: boolean;
}
const duration = (ms: number) =>
  `${Math.floor(ms / 60000)}분 ${Math.round((ms % 60000) / 1000)}초`;
const date = (at: number) =>
  new Date(at).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function fiveEvidence(
  s: Submission,
  assignment: Pick<Assignment, "dueAt"> = {},
): EvidenceAxis[] {
  const summary = summarizeEvidence(s.events);
  const typing = s.events.filter(
    (e) =>
      ["keyboard", "composition"].includes(e.source || "") &&
      (e.insertedChars || 0) + (e.deletedChars || 0) > 0,
  );
  let longest = 0,
    run = 0,
    active = 0,
    longPauses = 0,
    previous: (typeof typing)[number] | undefined;
  const typingSeqs = new Set(typing.map((e) => e.seq));
  for (const e of s.events) {
    if (
      ["session_start", "session_end", "blur", "visibility_hidden"].includes(
        e.type,
      )
    ) {
      previous = undefined;
      run = 0;
    }
    if (!typingSeqs.has(e.seq)) continue;
    const gap =
      previous && previous.sessionId === e.sessionId ? e.at - previous.at : -1;
    if (gap >= 0 && gap <= 60000) {
      run += gap;
      active += gap;
    } else {
      if (gap > 60000) longPauses++;
      run = 0;
    }
    longest = Math.max(longest, run);
    previous = e;
  }
  const writing = s.events.filter(
    (e) => (e.insertedChars || 0) + (e.deletedChars || 0) > 0,
  );
  const days = new Set(
    writing.map((e) =>
      new Date(e.at).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }),
    ),
  );
  const { samples, mode } = comparableRhythm(s.rhythm);
  const midpoint = Math.floor(samples.length / 2);
  const before = buildRhythmProfile(samples.slice(0, midpoint));
  const after = buildRhythmProfile(samples.slice(midpoint));
  const baseline =
    (s.rhythmBaseline?.mode || "direct") === mode
      ? s.rhythmBaseline?.profile
      : undefined;
  const continuity = s.rhythmOptIn
    ? baseline && samples.length >= 80
      ? rhythmContinuity(baseline, buildRhythmProfile(samples))
      : rhythmContinuity(before, after)
    : null;
  const effort = s.effort,
    first = writing[0]?.at,
    last = writing.at(-1)?.at,
    submitted = s.submittedAt;
  const timing = !assignment.dueAt
    ? "마감일 미설정"
    : submitted
      ? submitted <= assignment.dueAt
        ? "마감 안에 제출"
        : "마감 후 제출"
      : s.status === "submitted"
        ? "이전 제출: 접수 시각 자료 없음"
        : `마감 ${date(assignment.dueAt)}`;
  return [
    {
      id: "thought",
      title: "생각의 증거",
      source: "자동 기록",
      available: typing.length > 0,
      status: typing.length ? "작성·수정 관찰" : "직접 입력 자료 없음",
      facts: [
        `직접 입력·수정 ${typing.length}회`,
        `삭제가 포함된 직접 입력 ${typing.filter((e) => (e.deletedChars || 0) > 0).length}회`,
        `문서 버전 ${s.snapshots.length}개 · 입력 사이 60초 넘는 공백 ${longPauses}회`,
        before.medianFlightMs && after.medianFlightMs
          ? `전반 입력 간격 ${Math.round(before.medianFlightMs)}ms → 후반 ${Math.round(after.medianFlightMs)}ms`
          : "속도 변화 비교 자료 부족",
        samples.length
          ? `키 입력 간격 중앙값 ${Math.round(buildRhythmProfile(samples).medianFlightMs || 0)}ms`
          : "세부 타이핑 간격 미수집·표본 없음",
      ],
      note: "멈춤·삭제·속도 변화와 실제 고친 문장을 함께 읽습니다. 횟수나 빠르기로 생각의 깊이를 판정하지 않습니다.",
    },
    {
      id: "focus",
      title: "집중의 증거",
      source: "자동 기록",
      available: typing.length > 1,
      status: typing.length > 1 ? "입력 지속 구간 관찰" : "지속 구간 자료 부족",
      facts: [
        `이어진 입력 구간 합계 ${duration(active)}`,
        `가장 길게 이어진 입력 ${duration(longest)}`,
        `창 이탈 ${summary.focusExitCount}회`,
      ],
      note: "입력 사이 60초 이내를 연결하고 창 이탈·새 세션에서 끊습니다. 읽기·생각·자료조사 시간은 이 수치로 알 수 없습니다.",
    },
    {
      id: "diligence",
      title: "성실의 증거",
      source: "자동 기록",
      available: writing.length > 0,
      status: writing.length ? "작성 일정 관찰" : "작성 시각 자료 없음",
      facts: [
        first ? `첫 작성 ${date(first)}` : "첫 작성 기록 없음",
        last ? `최근 작성 ${date(last)}` : "최근 작성 기록 없음",
        `${days.size}일에 걸쳐 작성 · ${summary.sessionCount}개 세션`,
        timing,
      ],
      note: "작성 시각은 한국 시간(UTC+9), 제출 시각은 서버 접수 기준입니다. 시간대·밤샘·긴 체류 자체에 가점을 주지 않습니다.",
    },
    {
      id: "effort",
      title: "노력의 증거",
      source: "작성자 제공",
      available: hasEffort(effort),
      status: hasEffort(effort) ? "근거 제출 · 교사 확인" : "근거 작성 전",
      facts: [
        effort?.attempt ? `해본 일: ${effort.attempt}` : "해본 일 설명 없음",
        effort?.difficulty ? `어려웠던 점: ${effort.difficulty}` : "",
        effort?.outcome ? `달라진 점: ${effort.outcome}` : "",
        `첨부자료 ${effort?.attachments.length || 0}개`,
      ].filter(Boolean),
      note: "학생이 직접 남긴 설명과 자료입니다. 분량보다 글과 연결되는 구체적인 시도를 확인합니다.",
    },
    {
      id: "identity",
      title: "나라는 증거",
      source: "자동 기록",
      available: continuity !== null,
      status: !s.rhythmOptIn
        ? "리듬 수집 미참여"
        : continuity === null
          ? "비교 표본 부족"
          : baseline
            ? "이전 제출의 입력 습관과 비교"
            : "이번 과제의 전·후반 비교",
      facts: !s.rhythmOptIn
        ? ["세부 타이핑 리듬 수집을 선택하지 않았습니다."]
        : [
            `${mode === "composition" ? "한글 등 조합 입력" : "일반 입력"} 간격 ${samples.length}개 / 최소 80개`,
            ...(continuity !== null
              ? [
                  baseline
                    ? `이전 제출 간격 ${Math.round(baseline.medianFlightMs!)}ms · 이번 과제 ${Math.round(buildRhythmProfile(samples).medianFlightMs!)}ms`
                    : `전반 간격 중앙값 ${Math.round(before.medianFlightMs!)}ms · 후반 ${Math.round(after.medianFlightMs!)}ms`,
                  `간격 유사도 ${Math.round(continuity * 100)}% (시범 지표)`,
                ]
              : []),
            baseline
              ? "이 브라우저에서 같은 별명으로 제출한 이전 과제를 기준으로 사용했습니다."
              : "이전 과제의 개인 기준 패턴: 아직 없음",
          ],
      note: "이전 제출 기록이 없으면 과제 전·후반을 비교합니다. 별명·브라우저는 신원을 보증하지 않으며 유사도는 본인 작성 확률이 아닙니다. 한글 조합·기기 변화로 표본이 부족하거나 차이가 날 수 있습니다.",
    },
  ];
}
