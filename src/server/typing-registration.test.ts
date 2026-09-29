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
    freeText:
      "I learned to compare evidence and write my own ideas in my own words.",
    copySamples: samples(1000),
    freeSamples: samples(20000),
  };
  return { account, input };
}
describe("student typing enrollment", () => {
  it("retains only aggregate profiles and consumes the server challenge", () => {
    const { account, input } = fixture();
    const r = registerTyping(account, input);
    expect(r.profile.sampleCount).toBe(100);
    expect(account.challenge).toBeUndefined();
    expect(JSON.stringify(account)).not.toContain(input.freeText);
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
    f.input.freeSamples = f.input.freeSamples.slice(0, 20);
    expect(() => registerTyping(f.account, f.input)).toThrow();
    f = fixture();
    f.input.freeSamples[0].deviceId = randomUUID();
    expect(() => registerTyping(f.account, f.input)).toThrow();
    f = fixture();
    f.input.freeSamples = f.input.freeSamples.map((s) => ({
      ...s,
      mode: "composition",
    }));
    expect(() => registerTyping(f.account, f.input)).toThrow();
  });
  it("separates punctuation from the dominant Korean composition mode", () => {
    const { account, input } = fixture();
    account.challenge!.language = "ko";
    input.copyText = TYPING_TEXT.ko;
    for (const samples of [input.copySamples, input.freeSamples])
      samples.forEach((s, i) => {
        s.mode = i % 10 === 0 ? "direct" : "composition";
      });
    const r = registerTyping(account, input);
    expect(r.mode).toBe("composition");
    expect(r.profile.sampleCount).toBe(90);
  });
  it("does not substitute same-task similarity for a linked student's missing registration", () => {
    const { input } = fixture();
    const s = {
      studentId: randomUUID(),
      rhythmDeviceId: input.deviceId,
      rhythmOptIn: true,
      rhythm: [...input.copySamples, ...input.freeSamples],
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
