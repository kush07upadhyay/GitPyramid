import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dependabot = readFileSync(join(root, ".github", "dependabot.yml"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  engines: { node: string };
  devDependencies: Record<string, string>;
};

// Each "- package-ecosystem:" entry is one block. No YAML parser is installed, so split on text.
function block(ecosystem: string): string {
  const found = dependabot
    .split(/^ {2}- (?=package-ecosystem:)/m)
    .find((part) => part.startsWith(`package-ecosystem: ${ecosystem}\n`));
  if (found === undefined) {
    throw new RangeError(`.github/dependabot.yml has no ${ecosystem} entry`);
  }
  return found;
}

describe("dependabot config", () => {
  it("ignores major updates of @types/node in the npm entry", () => {
    expect(block("npm")).toMatch(
      /ignore:\n\s+- dependency-name: "@types\/node"\n\s+update-types: \["version-update:semver-major"\]/,
    );
  });

  it("does not ignore minor or patch updates of anything", () => {
    expect(dependabot).not.toMatch(/semver-minor|semver-patch/);
  });

  it("keeps the github-actions entry free of ignore rules", () => {
    expect(block("github-actions")).not.toContain("ignore:");
  });

  it("keeps the @types/node major equal to the minimum Node major in engines", () => {
    const engineMajor = /(\d+)/.exec(pkg.engines.node)?.[1];
    const typesMajor = /(\d+)/.exec(pkg.devDependencies["@types/node"] ?? "")?.[1];
    expect(engineMajor).toBeDefined();
    expect(typesMajor).toBe(engineMajor);
  });
});
