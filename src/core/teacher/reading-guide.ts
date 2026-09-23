import { features } from "../features";
import type { EvidenceEvent, WritingSnapshot } from "../evidence/types";
import { replayAt, textOf } from "../evidence/replay";
export interface ReadingGuideItem {
  id: string;
  reason:
    | "student_pick"
    | "discovery"
    | "major_revision"
    | "paste_transformation"
    | "late_revision";
  title: string;
  detail: string;
  excerpt: string;
  eventSeq?: number;
  snapshotSeq?: number;
}
export function buildReadingGuide(
  events: EvidenceEvent[],
  snapshots: WritingSnapshot[],
  studentPick?: string,
): ReadingGuideItem[] {
  if (!features.free.teacherReadingGuide) return [];
  const items: ReadingGuideItem[] = [];
  if (studentPick?.trim())
    items.push({
      id: "student-pick",
      reason: "student_pick",
      title: "학생이 꼭 보여주고 싶은 대목",
      detail: "학생의 목소리부터 읽어주세요.",
      excerpt: studentPick.trim(),
    });
  const excerpt = (e: EvidenceEvent) => {
    try {
      const text = textOf(replayAt(events, snapshots, e.seq));
      const at = Math.min(e.position ?? 0, text.length);
      return text
        .slice(
          Math.max(0, text.lastIndexOf("\n", at - 1) + 1),
          Math.min(text.length, at + 280),
        )
        .trim();
    } catch {
      return "";
    }
  };
  const major = events
    .filter((e) => (e.deletedChars ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.deletedChars ?? 0) +
        (b.insertedChars ?? 0) -
        (a.deletedChars ?? 0) -
        (a.insertedChars ?? 0),
    )[0];
  if (major)
    items.push({
      id: `revision-${major.seq}`,
      reason: "major_revision",
      title: "↗ 문자를 많이 수정한 시점",
      detail: `${major.deletedChars ?? 0}자 삭제, ${major.insertedChars ?? 0}자 입력. 수정 시점의 문장입니다. 생각이 깊어졌는지는 내용과 학생의 설명을 읽고 판단해주세요.`,
      excerpt: excerpt(major),
      eventSeq: major.seq,
    });
  const paste = events
    .filter((e) => e.type === "paste")
    .sort((a, b) => (b.insertedChars ?? 0) - (a.insertedChars ?? 0))[0];
  if (paste)
    items.push({
      id: `paste-${paste.seq}`,
      reason: "paste_transformation",
      title: "? 출처와 변화 함께 확인",
      detail: `${paste.insertedChars ?? 0}자 붙여넣기. 붙여넣기는 AI 사용이나 부정행위의 근거가 아닙니다.`,
      excerpt: excerpt(paste),
      eventSeq: paste.seq,
    });
  const finalText = snapshots.at(-1)?.text || "";
  for (const [index, p] of finalText
    .split("\n")
    .filter((p) => p.trim())
    .entries()) {
    if (items.some((i) => i.excerpt === p.trim())) continue;
    items.push({
      id: `passage-${index}`,
      reason: "discovery",
      title: "★ 글에서 만나볼 생각",
      detail:
        "완성된 글의 대목입니다. 내용의 우수성을 자동 판정한 추천은 아닙니다.",
      excerpt: p.trim(),
    });
    if (items.length >= 5) break;
  }
  // Repeated excerpts are one reading opportunity, not several acknowledgements.
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.excerpt.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
