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
export const CONTENT_PRIORITIES = {
  argument: "주장·근거",
  perspective: "관점 변화",
  interpretation: "자기 해석",
  logic: "정확성·논리",
  application: "배움·적용",
} as const;
export type ContentPriority = keyof typeof CONTENT_PRIORITIES;
export const DEFAULT_PRIORITIES: ContentPriority[] = [
  "argument",
  "perspective",
  "interpretation",
];
export interface EffortAttachment {
  id: string;
  name: string;
  mime: "application/pdf" | "image/png" | "image/jpeg" | "image/webp";
  size: number;
  data: string;
}
export interface EffortEvidence {
  difficulty: string;
  attempt: string;
  outcome: string;
  attachments: EffortAttachment[];
}
export const EMPTY_EFFORT: EffortEvidence = {
  difficulty: "",
  attempt: "",
  outcome: "",
  attachments: [],
};
export const hasEffort = (effort?: EffortEvidence) =>
  !!(effort?.attempt.trim() || effort?.attachments.length);
export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueAt?: number | null;
  contentPriorities?: ContentPriority[];
  learningGoal?: string;
  successCriteria?: string[];
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
  feedback?: TeacherFeedback;
}
export interface TeacherFeedback {
  quote: string;
  strength: string;
  question: string;
  nextStep: string;
}
export const EMPTY_FEEDBACK: TeacherFeedback = {
  quote: "",
  strength: "",
  question: "",
  nextStep: "",
};
export interface LearningResponse {
  reviewUpdatedAt: number;
  revisedExcerpt: string;
  explanation: string;
  version: number;
  updatedAt: number;
}
export interface Submission {
  rhythmBaseline?: {
    mode?: "direct" | "composition";
    profile: import("./my-proof/rhythm").RhythmProfile;
    submissionId: string;
    capturedAt: number;
  };
  id: string;
  assignmentId: string;
  alias: string;
  title: string;
  sources: string;
  effort?: EffortEvidence;
  doc: Doc;
  events: EvidenceEvent[];
  snapshots: WritingSnapshot[];
  rhythm: RhythmSample[];
  rhythmOptIn: boolean;
  pick: StudentPick | null;
  reflections: string[];
  submittedAt?: number;
  status: "draft" | "submitted";
  createdAt: number;
  updatedAt: number;
  review: Review;
  learningResponse?: LearningResponse;
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
  effort?: EffortEvidence;
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
