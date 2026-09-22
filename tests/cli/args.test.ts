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

  test("does not return option values for flags or missing options", () => {
    const args = parseCliArgs(["add", "--initial-class"]);

    expect(optionValue(args, "--initial-class")).toBeUndefined();
    expect(optionValue(args, "--config")).toBeUndefined();
    expect(
      optionValue(
        {
          command: args.command,
          positionals: args.positionals,
          help: args.help,
          options: new Map([["--initial-class", false]]),
        },
        "--initial-class",
      ),
    ).toBeUndefined();
  });
});
