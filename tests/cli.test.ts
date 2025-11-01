import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

describe("CLI command", () => {
  it("runs export without crashing", () => {
    const output = execSync("node ./dist/cli/index.js export --help", {
      cwd: process.cwd()
    }).toString();
    expect(output).toContain("Usage");
  });
});
