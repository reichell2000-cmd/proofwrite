import type { RhythmProfile } from "./my-proof/rhythm";
export interface TypingRegistration {
  id: string;
  deviceId: string;
  deviceLabel: string;
  mode: "direct" | "composition";
  profile: RhythmProfile;
  copyProfile: RhythmProfile;
  registeredAt: number;
  verifiedAt?: number;
  verifiedAssignmentId?: string;
}
export interface StudentAccount {
  id: string;
  alias: string;
  createdAt: number;
  recoveryHash: string;
  sessionVersion: number;
  registrations: TypingRegistration[];
  challenge?: { id: string; at: number; language: "ko" | "en" };
}
export type PublicStudent = Pick<
  StudentAccount,
  "id" | "alias" | "createdAt" | "registrations"
>;
export const publicStudent = (s: StudentAccount): PublicStudent => ({
  id: s.id,
  alias: s.alias,
  createdAt: s.createdAt,
  registrations: s.registrations,
});
export const TYPING_TEXT = {
  ko: "나는 나의 생각을 천천히 글로 표현합니다. 처음에는 잘 떠오르지 않아도 쓰고 고치면서 조금씩 나의 생각을 발견합니다. 다른 사람의 의견을 읽고 내가 직접 경험한 일과 비교해 봅니다. 중요한 것은 빠르게 쓰는 것이 아니라 나에게 편안한 방식으로 생각을 이어 가는 것입니다.",
  en: "I express my thoughts in my own words. When an idea is not clear, I take time to write and revise it. I compare what I read with my own experience. I do not need to type quickly. I can pause, think, and continue at a pace that feels comfortable to me.",
};
export function inputDeviceId(reset = false) {
  const key = "proofme-input-device";
  let id = reset ? null : localStorage.getItem(key);
  if (!id || !/^[a-f0-9-]{36}$/.test(id)) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
