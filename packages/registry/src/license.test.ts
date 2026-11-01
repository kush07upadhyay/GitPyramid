import { describe, expect, it } from "vitest";
import { checkLicense, compareWithGitHub, normalizeLicenseId } from "./license";

describe("checkLicense", () => {
  it("accepts common identifiers", () => {
    for (const id of ["MIT", "Apache-2.0", "BSD-3-Clause", "GPL-3.0-only", "MPL-2.0"]) {
      expect(checkLicense(id).problems).toEqual([]);
    }
  });

  it("accepts expressions and lists their ids once", () => {
    const result = checkLicense("MIT OR Apache-2.0");
    expect(result.problems).toEqual([]);
    expect(result.ids).toEqual(["MIT", "Apache-2.0"]);
    expect(checkLicense("MIT OR MIT").ids).toEqual(["MIT"]);
  });

  it("accepts a license with an exception", () => {
    expect(checkLicense("GPL-2.0-only WITH Linux-syscall-note").problems).toEqual([]);
  });

  it("rejects deprecated GNU identifiers and names the replacement", () => {
    expect(checkLicense("GPL-2.0").problems[0]).toContain("GPL-2.0-only");
    expect(checkLicense("AGPL-3.0").problems[0]).toContain("AGPL-3.0-only");
    expect(checkLicense("LGPL-2.1").problems[0]).toContain("LGPL-2.1-only");
  });

  it("rejects the deprecated plus syntax and names the replacement", () => {
    expect(checkLicense("GPL-2.0+").problems[0]).toContain("GPL-2.0-or-later");
  });

  it("suggests the right capitalization", () => {
    expect(checkLicense("mit").problems[0]).toContain('"MIT"');
    expect(checkLicense("apache-2.0").problems[0]).toContain('"Apache-2.0"');
  });

  it("rejects unknown identifiers", () => {
    expect(checkLicense("Totally-Made-Up").problems[0]).toContain("not a valid SPDX");
  });

  it.each(["MIT OR", "(MIT", "not a license", "", "MIT AND AND Apache-2.0"])(
    "rejects an invalid expression %j without throwing",
    (text) => {
      expect(checkLicense(text).problems.length).toBeGreaterThan(0);
    },
  );

  it("rejects stray whitespace", () => {
    expect(checkLicense(" MIT").problems[0]).toContain("extra spaces");
    expect(checkLicense("MIT  OR Apache-2.0").problems[0]).toContain("extra spaces");
  });

  it("warns, not fails, on a custom license reference", () => {
    const result = checkLicense("LicenseRef-Remotion");
    expect(result.problems).toEqual([]);
    expect(result.warnings[0]).toContain("custom license");
  });
});

describe("compareWithGitHub", () => {
  it("matches the same id", () => {
    expect(compareWithGitHub(["MIT"], "MIT")).toEqual({ kind: "match" });
  });

  it("treats deprecated and modern GNU ids as equal", () => {
    expect(compareWithGitHub(["GPL-2.0-only"], "GPL-2.0")).toEqual({ kind: "match" });
    expect(compareWithGitHub(["AGPL-3.0-only"], "AGPL-3.0")).toEqual({ kind: "match" });
  });

  it("matches when any alternative in a dual license is detected", () => {
    expect(compareWithGitHub(["MIT", "Apache-2.0"], "Apache-2.0")).toEqual({ kind: "match" });
  });

  it("reports a mismatch with the detected id", () => {
    expect(compareWithGitHub(["MIT"], "Apache-2.0")).toEqual({
      kind: "mismatch",
      detected: "Apache-2.0",
    });
  });

  it.each([null, "", "NOASSERTION"])("cannot verify when GitHub reports %j", (detected) => {
    expect(compareWithGitHub(["GPL-2.0-only"], detected).kind).toBe("unverifiable");
  });
});

describe("normalizeLicenseId", () => {
  it("leaves modern ids alone", () => {
    expect(normalizeLicenseId("MIT")).toBe("MIT");
    expect(normalizeLicenseId("GPL-3.0")).toBe("GPL-3.0-only");
  });
});
