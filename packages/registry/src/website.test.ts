import { describe, expect, it } from "vitest";
import { checkWebsite } from "./website";

const problems = (url: string) => checkWebsite(url).problems;

describe("checkWebsite", () => {
  it.each([
    "https://fastapi.tiangolo.com",
    "https://threejs.org/",
    "https://docs.example-project.dev/guide?x=1#top",
  ])("accepts %s", (url) => {
    expect(problems(url)).toEqual([]);
  });

  it.each([
    ["plain http", "http://fastapi.tiangolo.com", /https/],
    ["a script scheme", "javascript:alert(1)", /https/],
    ["a data scheme", "data:text/html,hi", /https/],
    ["no scheme", "fastapi.tiangolo.com", /valid web address/],
    ["credentials", "https://user:pass@site.dev", /username or password/],
    ["a username only", "https://user@site.dev", /username or password/],
    ["an IPv4 address", "https://93.184.216.34", /domain name/],
    ["an IPv6 address", "https://[::1]/", /domain name/],
    ["an integer address", "https://2130706433/", /domain name/],
    ["a hex address", "https://0x7f000001/", /domain name/],
    ["localhost", "https://localhost", /public domain/],
    ["a single label host", "https://intranet", /public domain/],
    ["a .local host", "https://printer.local", /public domain/],
    ["a placeholder host", "https://example.com", /placeholder/],
    ["a link shortener", "https://bit.ly/abc", /shortener/],
    ["spaces", "https://site.dev/a b", /spaces/],
    ["too long", `https://site.dev/${"a".repeat(200)}`, /longer than/],
  ])("rejects %s", (_name, url, message) => {
    expect(problems(url).join(" ")).toMatch(message);
  });

  it("warns about internationalized domains", () => {
    expect(checkWebsite("https://xn--e1afmkfd.xn--p1ai").warnings.join(" ")).toContain(
      "internationalized",
    );
  });

  it("warns about unusual ports", () => {
    expect(checkWebsite("https://site.dev:8443").warnings.join(" ")).toContain("port");
  });
});
