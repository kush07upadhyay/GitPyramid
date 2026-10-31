// Checks for contributor-written text. Everything here is pure and deterministic.

export type TextKind = "sentence" | "name";

export interface TextIssue {
  code: string;
  message: string;
}

// Control, format (zero-width, bidirectional overrides, tag characters, BOM, soft hyphen), private
// use, unassigned and lone surrogate code points. Tag characters can hide instructions from people
// but not from a model.
const INVISIBLE_OR_CONTROL = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Cs}]/u;
const LONG_DASH = /[\u2012\u2013\u2014\u2015]/;
const SCHEME_URL = /(?:[a-z][a-z0-9+.-]*:\/\/|\bwww\.)/i;
const DOMAIN_LIKE = /\b[a-z0-9-]+\.(?:com|org|net|io|dev|app|ai|co)\b/i;
const MARKUP = /[<>`]|\]\(|\*\*/;
const MARKER_PLACEHOLDER = /\b(?:TODO|TBD|FIXME)\b/;
const PHRASE_PLACEHOLDER = /lorem ipsum|replace this/i;

const MARKETING = [
  "best",
  "ultimate",
  "amazing",
  "awesome",
  "revolutionary",
  "world-class",
  "cutting-edge",
  "next-generation",
  "game-changing",
  "blazing",
  "seamless",
];

const INJECTION_PATTERNS: RegExp[] = [
  /\b(?:ignore|disregard|forget)\b.{0,40}\b(?:previous|prior|above|earlier|all|any)\b.{0,30}\b(?:instruction|prompt|rule|message|context)s?\b/i,
  /\bsystem prompt\b/i,
  /\byou are (?:now |an? )?(?:an? )?(?:ai|assistant|chatgpt|llm|language model|helpful)\b/i,
  /\b(?:jailbreak|developer mode|do anything now)\b/i,
  /\b(?:reveal|print|show)\b.{0,20}\b(?:your|the)\b.{0,20}\b(?:prompt|instructions)\b/i,
];

/** Problems that must block a pull request. */
export function plainTextProblems(text: string, field: string, kind: TextKind): TextIssue[] {
  const problems: TextIssue[] = [];
  if (INVISIBLE_OR_CONTROL.test(text)) {
    problems.push({
      code: "TEXT_UNSAFE",
      message: `${field} contains an invisible or control character (for example a zero-width space, a bidirectional override or a tab). Retype the text by hand.`,
    });
  }
  if (LONG_DASH.test(text)) {
    problems.push({
      code: "TEXT_STYLE",
      message: `${field} contains a long dash. Use a plain hyphen, or write two sentences.`,
    });
  }
  if (SCHEME_URL.test(text) || (kind === "sentence" && DOMAIN_LIKE.test(text))) {
    problems.push({
      code: "TEXT_STYLE",
      message: `${field} contains a web address. Put links in the website field instead.`,
    });
  }
  if (MARKUP.test(text)) {
    problems.push({
      code: "TEXT_STYLE",
      message: `${field} contains markup characters such as < > or backticks. Use plain text only.`,
    });
  }
  if (MARKER_PLACEHOLDER.test(text) || PHRASE_PLACEHOLDER.test(text)) {
    problems.push({
      code: "TEXT_PLACEHOLDER",
      message: `${field} still contains placeholder text (TODO or similar). Write the real text.`,
    });
  }
  if (text !== text.trim() || /\s{2,}/.test(text) || /[\r\n]/.test(text)) {
    problems.push({
      code: "TEXT_STYLE",
      message: `${field} has leading, trailing, repeated or line-break whitespace. Use single spaces on one line.`,
    });
  }
  return problems;
}

/** Hints that should make a reviewer look closer but do not block. */
export function plainTextWarnings(text: string, field: string, kind: TextKind): TextIssue[] {
  const warnings: TextIssue[] = [];
  if (kind === "sentence") {
    const found = MARKETING.filter((word) => new RegExp(`\\b${word}\\b`, "i").test(text));
    if (found.length > 0) {
      warnings.push({
        code: "TEXT_STYLE",
        message: `${field} uses promotional wording (${found.join(", ")}). State what the project does instead.`,
      });
    }
    if (text.includes("!")) {
      warnings.push({ code: "TEXT_STYLE", message: `${field} contains an exclamation mark.` });
    }
    const letters = text.replace(/[^\p{L}]/gu, "");
    const upper = letters.replace(/[^\p{Lu}]/gu, "");
    if (letters.length >= 12 && upper.length / letters.length > 0.4) {
      warnings.push({ code: "TEXT_STYLE", message: `${field} has a lot of capital letters.` });
    }
  }
  if (/\p{Script=Latin}/u.test(text) && /[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(text)) {
    warnings.push({
      code: "TEXT_MIXED_SCRIPT",
      message: `${field} mixes Latin letters with Cyrillic or Greek letters. This can be used to imitate another name.`,
    });
  }
  if (INJECTION_PATTERNS.some((pattern) => pattern.test(text))) {
    warnings.push({
      code: "TEXT_INJECTION",
      message: `${field} reads like an instruction to an AI model. A reviewer should look at it closely.`,
    });
  }
  return warnings;
}
