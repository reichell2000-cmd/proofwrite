import type { EvidenceEvent } from "../evidence/types";
export type TimelineKind =
  | "writing"
  | "pause"
  | "paste"
  | "major_revision"
  | "focus_exit"
  | "snapshot"
  | "session"
  | "submit"
  | "structure";
export interface TimelineMarker {
  at: number;
  kind: TimelineKind;
  label: string;
  eventSeq: number;
}
export function buildTimeline(events: EvidenceEvent[]): TimelineMarker[] {
  const out: TimelineMarker[] = [];
  let previous: EvidenceEvent | undefined;
  for (const e of events) {
    if (
      previous &&
      previous.sessionId === e.sessionId &&
      e.at - previous.at >= 60000
    )
      out.push({
        at: previous.at,
        kind: "pause",
        label: `${Math.round((e.at - previous.at) / 60000)}분 기록 간격`,
        eventSeq: previous.seq,
      });
    const add = (kind: TimelineKind, label: string) =>
      out.push({ at: e.at, kind, label, eventSeq: e.seq });
    if (e.type === "session_start" || e.type === "session_end")
      add(
        "session",
        e.type === "session_start" ? "작성 세션 시작" : "작성 세션 마침",
      );
    else if (e.type === "paste")
      add("paste", `붙여넣기 ${e.insertedChars ?? 0}자`);
    else if (e.type === "submit") add("submit", "제출");
    else if (e.type === "snapshot") add("snapshot", "문서 버전 저장");
    else if (e.type === "blur" || e.type === "visibility_hidden")
      add("focus_exit", "창 이탈 (중립적 기록)");
    else if (
      (e.deletedChars ?? 0) > 0 &&
      (e.insertedChars ?? 0) + (e.deletedChars ?? 0) >= 120
    )
      add("major_revision", "큰 폭의 수정");
    else if (
      [
        "table_change",
        "image_insert",
        "link_insert",
        "paragraph_move",
        "format",
      ].includes(e.type)
    )
      add(
        "structure",
        (
          {
            table_change: "표 변경",
            image_insert: "이미지 삽입",
            link_insert: "링크 삽입",
            paragraph_move: "문단 이동",
            format: "서식 변경",
          } as Record<string, string>
        )[e.type],
      );
    else if (e.payload?.steps) {
      const last = out.at(-1);
      if (last?.kind === "writing" && e.at - last.at < 5000)
        last.eventSeq = e.seq;
      else add("writing", e.type === "insert" ? "작성" : "수정");
    }
    previous = e;
  }
  return out;
}
