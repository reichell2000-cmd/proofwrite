import {
  CONTENT_PRIORITIES,
  DEFAULT_PRIORITIES,
  type ContentPriority,
  type Doc,
} from "../model";
import { features } from "../features";
import type { EvidenceEvent, WritingSnapshot } from "../evidence/types";
import { replayAt, textOf } from "../evidence/replay";
export interface ReadingGuideItem {
  id: string;
  reason:
    | "student_pick"
    | "content_priority"
    | "discovery"
    | "major_revision"
    | "paste_transformation"
    | "late_revision";
  title: string;
  detail: string;
  excerpt: string;
  eventSeq?: number;
  snapshotSeq?: number;
  paragraphIndex?: number;
  question?: string;
}
export function buildReadingGuide(
  events: EvidenceEvent[],
  snapshots: WritingSnapshot[],
  studentPick?: string,
  options?: { doc?: Doc; priorities?: ContentPriority[] },
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
  // Transparent lexical cues nominate reading candidates; they do not grade meaning.
  const finalText = options?.doc
    ? textOf(options.doc)
    : snapshots.at(-1)?.text || "";
  const paragraphs = finalText
    .split("\n")
    .filter((p) => p.trim())
    .map((p) => p.trim());
  const cues: Record<ContentPriority, { terms: string[]; question: string }> = {
    argument: {
      terms: ["왜냐", "때문", "근거", "예를", "사례", "따라서", "주장"],
      question: "근거나 사례가 이 주장을 실제로 뒷받침하나요?",
    },
    perspective: {
      terms: ["처음", "하지만", "그러나", "반면", "이제", "달라", "이전"],
      question: "처음 관점에서 무엇이 달라졌고, 그 이유가 드러나나요?",
    },
    interpretation: {
      terms: ["나는", "내가", "나에게", "생각", "의미", "해석", "느꼈"],
      question: "자료의 말에 학생 자신의 해석이 어떻게 더해졌나요?",
    },
    logic: {
      terms: ["따라서", "그러므로", "만약", "반례", "그러나", "결론", "조건"],
      question: "앞뒤 주장과 결론이 연결되나요? 사실과 가정을 구분했나요?",
    },
    application: {
      terms: ["배웠", "깨달", "적용", "실천", "앞으로", "다음", "해보"],
      question: "배운 내용을 어떤 상황에 적용하려 하나요?",
    },
  };
  if (options)
    for (const priority of options.priorities || DEFAULT_PRIORITIES) {
      const rule = cues[priority];
      const ranked = paragraphs
        .map((p, index) => ({
          p,
          index,
          hits: rule.terms.filter((term) => p.includes(term)),
        }))
        .filter(
          (p) =>
            p.hits.length &&
            !items.some(
              (i) =>
                i.excerpt.replace(/\s+/g, " ") === p.p.replace(/\s+/g, " "),
            ),
        )
        .sort((a, b) => b.hits.length - a.hits.length || a.index - b.index);
      const best = ranked[0];
      if (!best) continue;
      items.push({
        id: `content-${priority}-${best.index}`,
        reason: "content_priority",
        title: `${CONTENT_PRIORITIES[priority]} · 읽기 후보`,
        detail: `완성본 ${best.index + 1}번째 대목에 ‘${best.hits.join("’, ‘")}’ 표현이 있어 골랐습니다. 표현 단서에 따른 후보이며 내용의 우수성 판정은 아닙니다.`,
        excerpt: best.p.slice(0, 1200),
        paragraphIndex: best.index,
        question: rule.question,
      });
      if (items.filter((i) => i.reason === "content_priority").length >= 3)
        break;
    }
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
      excerpt: p.trim().slice(0, 1200),
      paragraphIndex: index,
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
