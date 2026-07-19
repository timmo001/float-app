import { describe, expect, test } from "bun:test";
import {
  hasOption,
  optionValue,
  parseCliArgs,
  UsageError,
} from "../../src/cli/args.js";

describe("CLI arguments", () => {
  test("parses add selection options", () => {
    const args = parseCliArgs([
      "add",
      "Example",
      "--initial-class",
      "--config",
      "/tmp/hypr.conf",
    ]);
    expect(args.positionals).toEqual(["Example"]);
    expect(hasOption(args, "--initial-class")).toBe(true);
    expect(optionValue(args, "--config")).toBe("/tmp/hypr.conf");
  });

  test("rejects unknown options", () => {
    expect(() => parseCliArgs(["add", "--wat"])).toThrow(UsageError);
  });
});
