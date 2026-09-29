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
  freeText: string;
  copySamples: RhythmSample[];
  freeSamples: RhythmSample[];
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
  if (
    normalize(input.copyText) !== normalize(TYPING_TEXT[c.language]) ||
    input.freeText.trim().length < 40
  )
    throw new HttpError(
      400,
      "따라 치기 문장과 자유 입력 40자 이상을 확인해주세요.",
    );
  const copy = comparableRhythm(input.copySamples),
    free = comparableRhythm(input.freeSamples);
  const all = [...input.copySamples, ...input.freeSamples];
  if (
    copy.mode !== free.mode ||
    copy.samples.length < 80 ||
    free.samples.length < 80 ||
    all.some(
      (s) => s.deviceId !== input.deviceId || s.at < c.at || s.at > now + 1000,
    ) ||
    [input.copySamples, input.freeSamples].some(
      (xs) => xs.at(-1)!.at - xs[0].at < 2000,
    )
  )
    throw new HttpError(
      400,
      "같은 기기와 입력 방식으로 각 단계에서 유효 간격 80개 이상을 남겨주세요.",
    );
  const registration: TypingRegistration = {
    id: randomUUID(),
    deviceId: input.deviceId,
    deviceLabel: input.deviceLabel,
    mode: copy.mode,
    profile: buildRhythmProfile(free.samples),
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
