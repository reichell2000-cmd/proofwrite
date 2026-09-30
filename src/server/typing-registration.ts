import { randomUUID } from "node:crypto";
import type { StudentAccount, TypingRegistration } from "../core/identity";
import { TYPING_TEXT } from "../core/identity";
import type { RhythmSample } from "../core/evidence/types";
import { buildRhythmProfile, comparableRhythm } from "../core/my-proof/rhythm";
import { HttpError } from "./store";
export interface RegistrationInput {
  challengeId: string;
  deviceId: string;
  deviceLabel: string;
  copyText: string;
  copySamples: RhythmSample[];
}
export function registerTyping(
  account: StudentAccount,
  input: RegistrationInput,
  now = Date.now(),
): TypingRegistration {
  const c = account.challenge;
  if (!c || c.id !== input.challengeId || now - c.at > 30 * 60000)
    throw new HttpError(400, "타자 등록을 다시 시작해주세요.");
  const normalize = (s: string) =>
    s.normalize("NFC").replace(/\s+/g, " ").trim();
  if (normalize(input.copyText) !== normalize(TYPING_TEXT[c.language]))
    throw new HttpError(400, "안내 문장과 똑같이 따라 쳤는지 확인해주세요.");
  const copy = comparableRhythm(input.copySamples);
  if (
    copy.samples.length < 80 ||
    input.copySamples.some(
      (s) => s.deviceId !== input.deviceId || s.at < c.at || s.at > now + 1000,
    ) ||
    input.copySamples.at(-1)!.at - input.copySamples[0].at < 2000
  )
    throw new HttpError(
      400,
      "입력 습관 기록이 부족하거나 기기가 달라졌어요. 같은 키보드로 문장을 다시 따라 쳐주세요.",
    );
  const registration: TypingRegistration = {
    id: randomUUID(),
    deviceId: input.deviceId,
    deviceLabel: input.deviceLabel,
    mode: copy.mode,
    profile: buildRhythmProfile(copy.samples),
    copyProfile: buildRhythmProfile(copy.samples),
    registeredAt: now,
  };
  const kept = account.registrations.filter(
    (r) => r.deviceId !== input.deviceId || r.mode !== copy.mode,
  );
  if (kept.length >= 10)
    throw new HttpError(
      400,
      "사용하지 않는 타자 기준을 삭제해주세요. 최대 10개까지 보관합니다.",
    );
  account.registrations = [...kept, registration];
  delete account.challenge;
  return registration;
}
