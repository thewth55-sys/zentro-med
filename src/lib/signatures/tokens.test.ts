import { describe, it, expect } from "vitest";
import {
  generateSignatureToken,
  hashSignatureToken,
  generateOtpCode,
  hashOtpCode,
  maskEmail,
  signatureUrl,
} from "./tokens";

describe("generateSignatureToken", () => {
  it("produces a token whose hash matches hashSignatureToken", () => {
    const { token, hash } = generateSignatureToken();
    expect(hashSignatureToken(token)).toBe(hash);
  });

  it("produces different tokens on each call", () => {
    const a = generateSignatureToken();
    const b = generateSignatureToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("hashSignatureToken", () => {
  it("is deterministic", () => {
    expect(hashSignatureToken("abc")).toBe(hashSignatureToken("abc"));
  });

  it("differs for different input", () => {
    expect(hashSignatureToken("abc")).not.toBe(hashSignatureToken("abd"));
  });
});

describe("generateOtpCode", () => {
  it("always returns a 6-digit numeric string", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashOtpCode", () => {
  it("is deterministic and matches a fresh hash of the same code", () => {
    const code = generateOtpCode();
    expect(hashOtpCode(code)).toBe(hashOtpCode(code));
  });
});

describe("maskEmail", () => {
  it("keeps the first two characters and masks the rest of the local part", () => {
    expect(maskEmail("juana@example.com")).toBe("ju***@example.com");
  });

  it("handles a one-character local part without throwing", () => {
    expect(maskEmail("j@example.com")).toBe("j***@example.com");
  });

  it("returns the input unchanged when there's no @", () => {
    expect(maskEmail("not-an-email")).toBe("not-an-email");
  });
});

describe("signatureUrl", () => {
  it("builds the /firmar/<token> path", () => {
    expect(signatureUrl("tok123", "https://med.zentrolabs.com")).toBe(
      "https://med.zentrolabs.com/firmar/tok123",
    );
  });

  it("tolerates a trailing slash on baseUrl", () => {
    expect(signatureUrl("tok123", "https://med.zentrolabs.com/")).toBe(
      "https://med.zentrolabs.com/firmar/tok123",
    );
  });
});
