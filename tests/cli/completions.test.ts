import { describe, expect, test } from "bun:test";
import { isShell } from "../../src/cli/completions.js";

describe("completion shells", () => {
  test.each(["bash", "fish", "zsh"])("accepts %s", (shell) => {
    expect(isShell(shell)).toBe(true);
  });

  test.each(["", "sh", "BASH", "bash "])("rejects %j", (shell) => {
    expect(isShell(shell)).toBe(false);
  });
});
