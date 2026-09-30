import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { registerTyping } from "./typing-registration";
import { TYPING_TEXT, type StudentAccount } from "../core/identity";
import { observeRhythm } from "../core/my-proof/observation";
import {
  buildRhythmProfile,
  registeredContinuity,
} from "../core/my-proof/rhythm";
import type { RhythmSample } from "../core/evidence/types";
function fixture() {
  const start = Date.now() - 60000,
    deviceId = randomUUID();
  const account: StudentAccount = {
    id: randomUUID(),
    alias: "sample",
    createdAt: start,
    recoveryHash: "",
    sessionVersion: 1,
    registrations: [],
    challenge: { id: randomUUID(), at: start, language: "en" },
  };
  const samples = (offset: number): RhythmSample[] =>
    Array.from({ length: 100 }, (_, i) => ({
      at: start + offset + i * 100,
      deviceId,
      mode: "direct",
      flightMs: 100,
      dwellMs: 60,
      burstLength: 20,
    }));
  const input = {
    challengeId: account.challenge!.id,
    deviceId,
    deviceLabel: "keyboard",
    copyText: TYPING_TEXT.en,
    copySamples: samples(1000),
  };
  return { account, input };
}
describe("student typing enrollment", () => {
  it("retains only aggregate profiles and consumes the server challenge", () => {
    const { account, input } = fixture();
    const r = registerTyping(account, input);
    expect(r.profile.sampleCount).toBe(100);
    expect(account.challenge).toBeUndefined();
    expect(r.profile).toEqual(buildRhythmProfile(input.copySamples));
    expect(JSON.stringify(account)).not.toContain(input.copyText);
    expect(JSON.stringify(account)).not.toContain("copySamples");
    expect(() => registerTyping(account, input)).toThrow();
  });
  it("rejects expired, copied-text mismatch, short and mixed-device input", () => {
    let f = fixture();
    f.account.challenge!.at -= 3600000;
    expect(() => registerTyping(f.account, f.input)).toThrow();
    f = fixture();
    f.input.copyText = "paste";
    expect(() => registerTyping(f.account, f.input)).toThrow();
    f = fixture();
    f.input.copySamples = f.input.copySamples.slice(0, 20);
    expect(() => registerTyping(f.account, f.input)).toThrow();
    f = fixture();
    f.input.copySamples[0].deviceId = randomUUID();
    expect(() => registerTyping(f.account, f.input)).toThrow();
    f = fixture();
    f.input.copySamples = f.input.copySamples.map((s, i) => ({
      ...s,
      mode: i % 2 === 0 ? "composition" : "direct",
    }));
    expect(() => registerTyping(f.account, f.input)).toThrow();
    f = fixture();
    f.input.copySamples[0].at = Date.now() + 60000;
    expect(() => registerTyping(f.account, f.input)).toThrow();
    f = fixture();
    f.input.copySamples = f.input.copySamples.map((s, i) => ({
      ...s,
      at: f.account.challenge!.at + i,
    }));
    expect(() => registerTyping(f.account, f.input)).toThrow();
  });
  it("separates punctuation from the dominant Korean composition mode", () => {
    const { account, input } = fixture();
    account.challenge!.language = "ko";
    input.copyText = TYPING_TEXT.ko;
    input.copySamples.forEach((s, i) => {
      s.mode = i % 10 === 0 ? "direct" : "composition";
    });
    const r = registerTyping(account, input);
    expect(r.mode).toBe("composition");
    expect(r.profile.sampleCount).toBe(90);
  });
  it("keeps existing registrations and only replaces the matching device without teacher verification", () => {
    const { account, input } = fixture();
    const challenge = { ...account.challenge! };
    const original = registerTyping(account, input);
    original.verifiedAt = Date.now();
    original.verifiedAssignmentId = randomUUID();
    const otherDevice = {
      ...original,
      id: randomUUID(),
      deviceId: randomUUID(),
    };
    account.registrations.push(otherDevice);
    account.challenge = { ...challenge, id: randomUUID() };
    const updated = registerTyping(account, {
      ...input,
      challengeId: account.challenge.id,
    });
    expect(account.registrations).toEqual([otherDevice, updated]);
    expect(updated.id).not.toBe(original.id);
    expect(updated.verifiedAt).toBeUndefined();
    expect(updated.verifiedAssignmentId).toBeUndefined();
  });
  it("does not substitute same-task similarity for a linked student's missing registration", () => {
    const { input } = fixture();
    const s = {
      studentId: randomUUID(),
      rhythmDeviceId: input.deviceId,
      rhythmOptIn: true,
      rhythm: input.copySamples,
    };
    expect(observeRhythm(s).continuity).toBeNull();
    const baseline = {
      profile: buildRhythmProfile(input.copySamples),
      registrationId: randomUUID(),
      deviceId: input.deviceId,
      mode: "direct" as const,
      submissionId: randomUUID(),
      capturedAt: Date.now(),
    };
    expect(observeRhythm({ ...s, rhythmBaseline: baseline }).continuity).toBe(
      1,
    );
    expect(
      observeRhythm({
        ...s,
        rhythmDeviceId: randomUUID(),
        rhythmBaseline: baseline,
      }).continuity,
    ).toBeNull();
  });
  it("compares more than median flight and requires enough observable metrics", () => {
    const a = buildRhythmProfile(fixture().input.copySamples);
    expect(
      registeredContinuity(a, {
        ...a,
        medianDwellMs: 400,
        medianBurstLength: 2,
      }),
    ).toBeLessThan(1);
    expect(
      registeredContinuity(
        {
          ...a,
          p90FlightMs: null,
          medianDwellMs: null,
          medianBurstLength: null,
        },
        a,
      ),
    ).toBeNull();
  });
});
