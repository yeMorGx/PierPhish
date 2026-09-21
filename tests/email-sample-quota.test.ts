import { describe, expect, it } from "vitest";
import {
  canFitEmailSample,
  summarizeEmailSampleStorage,
} from "@/lib/email-sample-quota";

describe("email sample quota", () => {
  it("summarizes usage without exceeding the workspace limit", () => {
    expect(summarizeEmailSampleStorage([40, 30, -5], 100)).toEqual({
      usedBytes: 70,
      maxBytes: 100,
      remainingBytes: 30,
      usedPercentage: 70,
    });
  });

  it("accounts for the previous file during replacement", () => {
    const usage = summarizeEmailSampleStorage([80], 100);
    expect(canFitEmailSample(usage, 95, 80)).toBe(true);
    expect(canFitEmailSample(usage, 121, 80)).toBe(false);
  });
});
