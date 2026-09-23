import type {
  EvidenceEvent,
  RhythmSample,
  WritingSnapshot,
} from "./evidence/types";
export type Doc = Record<string, unknown>;
export const EMPTY_DOC: Doc = { type: "doc", content: [{ type: "paragraph" }] };
export const POLICIES = {
  SOLO: "AI 사용 불가",
  RESEARCH: "검색·자료조사만",
  COACH: "질문·피드백 허용",
  COLLAB: "AI 공동작업 허용",
} as const;
export type Policy = keyof typeof POLICIES;
export const REFLECTIONS = [
  "이번 과제에서 가장 안 풀렸던 부분은 무엇이었나요?",
  "그것을 해결하기 위해 어떤 노력을 했나요?",
  "처음 생각과 지금 생각에서 달라진 것이 있나요?",
  "이 과제를 통해 새롭게 배운 것은 무엇인가요?",
];
export interface Assignment {
  id: string;
  title: string;
  description: string;
  policy: Policy;
  minRead: number;
  fullRead: boolean;
  questions: string[];
  joinCode: string;
  createdAt: number;
}
export interface StudentPick {
  text: string;
  why: string;
  from: number;
  to: number;
}
export interface Review {
  passages: string[];
  fullRead: boolean;
  reaction: string;
  completed: boolean;
  updatedAt: number;
}
export interface Submission {
  id: string;
  assignmentId: string;
  alias: string;
  title: string;
  sources: string;
  doc: Doc;
  events: EvidenceEvent[];
  snapshots: WritingSnapshot[];
  rhythm: RhythmSample[];
  rhythmOptIn: boolean;
  pick: StudentPick | null;
  reflections: string[];
  status: "draft" | "submitted";
  createdAt: number;
  updatedAt: number;
  review: Review;
  revision: number;
}
export interface SyncBody {
  baseRevision: number;
  events: EvidenceEvent[];
  snapshots: WritingSnapshot[];
  rhythm: RhythmSample[];
  rhythmOptIn: boolean;
  title: string;
  sources: string;
  pick: StudentPick | null;
  reflections: string[];
  submit: boolean;
}
export interface LocalDraft {
  submission: Submission;
  ackSeq: number;
  revision: number;
  rhythmAck?: number;
  savedAt: number;
}
