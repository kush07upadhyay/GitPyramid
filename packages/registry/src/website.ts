import { LIMITS } from "./schema";

const SHORTENERS = new Set([
  "bit.ly",
  "t.co",
  "tinyurl.com",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
]);

const PLACEHOLDER_HOSTS = new Set(["example.com", "example.org", "example.net", "localhost"]);

export interface WebsiteCheck {
  problems: string[];
  warnings: string[];
}

function isIpLiteral(host: string): boolean {
  if (host.startsWith("[") || host.includes(":")) return true;
  return (
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || /^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)
  );
}

export function checkWebsite(value: string): WebsiteCheck {
  const problems: string[] = [];
  const warnings: string[] = [];
  if (value.length > LIMITS.websiteMax) {
    problems.push(`website is longer than ${LIMITS.websiteMax} characters.`);
    return { problems, warnings };
  }
  if (value !== value.trim() || /\s/.test(value)) {
    problems.push("website contains spaces. Remove them.");
    return { problems, warnings };
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    problems.push(
      'website is not a valid web address. Write it like "https://example-project.dev".',
    );
    return { problems, warnings };
  }
  if (url.protocol !== "https:") {
    problems.push("website must start with https://.");
    return { problems, warnings };
  }
  if (url.username !== "" || url.password !== "") {
    problems.push("website must not contain a username or password.");
  }
  const host = url.hostname.toLowerCase();
  if (isIpLiteral(host)) {
    problems.push("website must use a domain name, not an IP address.");
  } else if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal")) {
    problems.push("website must be a public domain name.");
  } else if (PLACEHOLDER_HOSTS.has(host) || host.endsWith(".example.com")) {
    problems.push(
      "website is still a placeholder address. Use the project's real site or remove the field.",
    );
  } else if (SHORTENERS.has(host)) {
    problems.push("website must be the project's own address, not a link shortener.");
  }
  if (host.split(".").some((label) => label.startsWith("xn--"))) {
    warnings.push(
      "website uses an internationalized domain name. A reviewer should check it carefully.",
    );
  }
  if (url.port !== "") {
    warnings.push("website uses a non-standard port.");
  }
  return { problems, warnings };
}
