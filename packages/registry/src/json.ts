import { type Node, type ParseError, parseTree, printParseErrorCode } from "jsonc-parser";

const HINTS: Record<string, string> = {
  InvalidSymbol:
    "Unexpected character. Text must be inside double quotes, not single quotes or no quotes.",
  InvalidNumberFormat: "This number is not valid.",
  PropertyNameExpected:
    "A field name in double quotes is expected here. A comma after the last item is not allowed, so remove it.",
  ValueExpected:
    "A value is expected here. If the line before ends with a comma and this is the end of a list or object, remove that comma.",
  ColonExpected: "A colon is missing between a field name and its value.",
  CommaExpected: "A comma is missing between two items. Check the end of the line before.",
  CloseBraceExpected: "A closing brace } is missing.",
  CloseBracketExpected: "A closing bracket ] is missing.",
  EndOfFileExpected:
    "There is extra text after the closing brace. A manifest is exactly one JSON object.",
  InvalidCommentToken: "Comments are not allowed in JSON. Remove them.",
  UnexpectedEndOfComment: "Comments are not allowed in JSON. Remove them.",
  UnexpectedEndOfString: "A closing double quote is missing, or text runs onto the next line.",
  UnexpectedEndOfNumber: "This number is not valid.",
  InvalidUnicode: "This unicode escape is not valid.",
  InvalidEscapeCharacter: "This escape is not valid. To write a backslash, type two of them.",
  InvalidCharacter: "Line breaks and tabs are not allowed inside text.",
};

export interface JsonError {
  offset: number;
  message: string;
}

export interface DuplicateKey {
  key: string;
  offset: number;
}

export type JsonResult =
  | { ok: true; tree: Node; value: unknown; duplicates: DuplicateKey[] }
  | { ok: false; errors: JsonError[] };

function nodeToValue(node: Node): unknown {
  switch (node.type) {
    case "object": {
      const out: Record<string, unknown> = {};
      for (const prop of node.children ?? []) {
        const [key, value] = prop.children ?? [];
        if (key && value) {
          // Define through the descriptor so a "__proto__" key stays an ordinary own property.
          Object.defineProperty(out, key.value as string, {
            value: nodeToValue(value),
            enumerable: true,
            writable: true,
            configurable: true,
          });
        }
      }
      return out;
    }
    case "array":
      return (node.children ?? []).map(nodeToValue);
    default:
      return node.value;
  }
}

function findDuplicates(node: Node, out: DuplicateKey[]): void {
  if (node.type === "object") {
    const seen = new Set<string>();
    for (const prop of node.children ?? []) {
      const keyNode = prop.children?.[0];
      if (keyNode && typeof keyNode.value === "string") {
        if (seen.has(keyNode.value)) out.push({ key: keyNode.value, offset: keyNode.offset });
        seen.add(keyNode.value);
      }
    }
  }
  for (const child of node.children ?? []) findDuplicates(child, out);
}

/** Strict JSON: no comments, no trailing commas, no empty file, errors with offsets. */
export function parseStrictJson(text: string): JsonResult {
  if (text.trim() === "") {
    return { ok: false, errors: [{ offset: 0, message: "The file is empty." }] };
  }
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, {
    allowTrailingComma: false,
    disallowComments: true,
    allowEmptyContent: false,
  });
  if (errors.length > 0 || !tree) {
    const list = errors.map((e) => ({
      offset: e.offset,
      message:
        HINTS[printParseErrorCode(e.error)] ??
        `The JSON is not valid (${printParseErrorCode(e.error)}).`,
    }));
    return {
      ok: false,
      errors: list.length > 0 ? list : [{ offset: 0, message: "The file is empty." }],
    };
  }
  const duplicates: DuplicateKey[] = [];
  findDuplicates(tree, duplicates);
  return { ok: true, tree, value: nodeToValue(tree), duplicates };
}
