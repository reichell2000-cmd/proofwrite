import type { TeacherFeedback } from "./model";
export interface ReviewDraft {
  provider: "ai" | "guide";
  message: string;
  summary: string;
  feedback: TeacherFeedback;
  suggestions: {
    id: string;
    value: number | null;
    quote: string;
    reason: string;
  }[];
  revision: number;
}
