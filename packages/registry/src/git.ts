import { execFileSync } from "node:child_process";

const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._/@^~-]*$/;

/**
 * Manifest files added, copied, modified or renamed relative to a base ref. The ref must not start
 * with a dash, or git would read it as an option.
 */
export function changedBrickFiles(ref: string, cwd: string): string[] {
  if (!SAFE_REF.test(ref)) {
    throw new Error(`"${ref}" is not a safe git reference.`);
  }
  const out = execFileSync(
    "git",
    ["diff", "--name-only", "-z", "--diff-filter=ACMR", `${ref}...HEAD`, "--", "registry/bricks"],
    { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  return out.split("\0").filter((p) => p !== "");
}
