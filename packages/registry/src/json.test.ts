import { describe, expect, it } from "vitest";
import { parseStrictJson } from "./json";
import { LineIndex } from "./positions";

const where = (text: string) => {
  const result = parseStrictJson(text);
  if (result.ok) throw new Error("expected a parse error");
  return new LineIndex(text).positionAt((result.errors[0] as { offset: number }).offset);
};

describe("parseStrictJson", () => {
  it("parses an object", () => {
    const result = parseStrictJson('{"a": 1}');
    expect(result.ok && result.value).toEqual({ a: 1 });
  });

  it("points at a trailing comma", () => {
    const pos = where('{\n  "a": 1,\n}\n');
    expect(pos.line).toBe(3);
  });

  it("explains a trailing comma", () => {
    const result = parseStrictJson('{\n  "a": 1,\n}\n');
    expect(!result.ok && result.errors[0]?.message).toMatch(/comma/);
  });

  it("points at a missing comma", () => {
    expect(where('{\n  "a": 1\n  "b": 2\n}').line).toBe(3);
  });

  it("rejects single quotes", () => {
    expect(parseStrictJson("{'a': 1}").ok).toBe(false);
  });

  it("rejects comments", () => {
    expect(parseStrictJson('{\n  // note\n  "a": 1\n}').ok).toBe(false);
    expect(parseStrictJson('{"a": 1 /* x */}').ok).toBe(false);
  });

  it("rejects an empty file with a clear message", () => {
    const result = parseStrictJson("");
    expect(!result.ok && result.errors[0]?.message).toMatch(/empty/);
  });

  it("rejects text after the object", () => {
    expect(parseStrictJson('{"a": 1} extra').ok).toBe(false);
  });

  it("rejects an unterminated string", () => {
    expect(parseStrictJson('{"a": "oops}').ok).toBe(false);
  });

  it("finds duplicate keys at any depth", () => {
    const result = parseStrictJson('{"a": 1, "a": 2, "b": {"c": 1, "c": 2}}');
    expect(result.ok && result.duplicates.map((d) => d.key)).toEqual(["a", "c"]);
  });

  it("keeps a __proto__ key as an ordinary property and does not pollute", () => {
    const result = parseStrictJson('{"__proto__": {"polluted": true}, "a": 1}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const value = result.value as Record<string, unknown>;
      expect(Object.hasOwn(value, "__proto__")).toBe(true);
      expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("LineIndex", () => {
  it("maps offsets to 1-based lines and columns", () => {
    const index = new LineIndex("ab\ncd\n\nef");
    expect(index.positionAt(0)).toEqual({ line: 1, column: 1 });
    expect(index.positionAt(1)).toEqual({ line: 1, column: 2 });
    expect(index.positionAt(3)).toEqual({ line: 2, column: 1 });
    expect(index.positionAt(6)).toEqual({ line: 3, column: 1 });
    expect(index.positionAt(7)).toEqual({ line: 4, column: 1 });
  });
});
