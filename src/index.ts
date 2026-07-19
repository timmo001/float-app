import { NodeRuntime } from "@effect/platform-node";
import { Cause, Effect, Exit, Layer, Runtime } from "effect";
import {
  hasOption,
  optionValue,
  parseCliArgs,
  UsageError,
  type ParsedCliArgs,
} from "./cli/args.js";
import { isShell, renderCompletions, shells } from "./cli/completions.js";
import { renderHelp } from "./cli/help.js";
import { Hyprland } from "./hyprland/Hyprland.js";
import type { FloatingRule, HyprlandClient } from "./hyprland/model.js";
import { CommandExecutor } from "./services/CommandExecutor.js";

const version = "0.0.0";

function printClient(client: HyprlandClient, json: boolean) {
  return Effect.sync(() =>
    console.log(
      json
        ? JSON.stringify(client, null, 2)
        : [
            `class: ${client.class}`,
            `initialClass: ${client.initialClass}`,
            `title: ${client.title}`,
            `xwayland: ${client.xwayland}`,
            `address: ${client.address}`,
          ].join("\n"),
    ),
  );
}

function runCommand(args: ParsedCliArgs) {
  return Effect.gen(function* () {
    if (!args.command) {
      console.log(renderHelp());
      return;
    }
    if (args.help) {
      console.log(renderHelp(args.command.name));
      return;
    }
    const hyprland = yield* Hyprland;
    switch (args.command.name) {
      case "pick":
        yield* printClient(yield* hyprland.pick(), hasOption(args, "--json"));
        return;
      case "detect":
        yield* printClient(
          yield* hyprland.focused(),
          hasOption(args, "--json"),
        );
        return;
      case "list": {
        const registry = yield* hyprland.list();
        console.log(
          hasOption(args, "--json")
            ? JSON.stringify(registry, null, 2)
            : registry.rules.length
              ? registry.rules
                  .map((rule) => `${rule.field}: ${rule.class}`)
                  .join("\n")
              : "No floating applications configured.",
        );
        return;
      }
      case "add": {
        const explicitClass = args.positionals[0];
        const client = yield* hasOption(args, "--focused")
          ? hyprland.focused()
          : explicitClass
            ? Effect.void
            : hyprland.pick();
        const className =
          explicitClass ??
          (hasOption(args, "--initial-class")
            ? client!.initialClass
            : client!.class);
        const field = hasOption(args, "--initial-class")
          ? "initial_class"
          : "class";
        const registry = yield* hyprland.list();
        const rule: FloatingRule = { class: className, field };
        const rules = registry.rules.some(
          (existing) =>
            existing.class === className && existing.field === field,
        )
          ? registry.rules
          : [...registry.rules, rule];
        yield* hyprland.save(rules, optionValue(args, "--config"));
        if (client) yield* hyprland.apply(client);
        console.log(`Added ${field} ${className}`);
        return;
      }
      case "remove": {
        const className = args.positionals[0];
        if (!className) {
          return yield* new UsageError({
            message: "float-app remove: class is required",
          });
        }
        const field = hasOption(args, "--initial-class")
          ? "initial_class"
          : "class";
        const registry = yield* hyprland.list();
        yield* hyprland.save(
          registry.rules.filter(
            (rule) => rule.class !== className || rule.field !== field,
          ),
          optionValue(args, "--config"),
        );
        console.log(`Removed ${className}`);
        return;
      }
      case "completions": {
        const shell = args.positionals[0] ?? "zsh";
        if (!isShell(shell)) {
          return yield* new UsageError({
            message: `Unsupported shell '${shell}' (expected: ${shells.join(", ")})`,
          });
        }
        process.stdout.write(renderCompletions(shell));
        return;
      }
      case "help":
        console.log(renderHelp(args.positionals[0]));
        return;
    }
  });
}

function report(cause: Cause.Cause<unknown>) {
  if (Cause.hasInterruptsOnly(cause)) return Effect.failCause(cause);
  const failure = Cause.squash(cause);
  return Effect.sync(() => {
    console.error(failure instanceof Error ? failure.message : String(failure));
    process.exitCode = 1;
  });
}

if (process.argv.includes("--version")) {
  console.log(version);
} else {
  const layers = Hyprland.layer.pipe(Layer.provide(CommandExecutor.layer));
  const teardown: Runtime.Teardown = (exit, onExit) =>
    Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)
      ? Runtime.defaultTeardown(exit, onExit)
      : onExit(0);
  Effect.try({
    try: () => parseCliArgs(process.argv.slice(2)),
    catch: (cause) =>
      cause instanceof UsageError
        ? cause
        : new UsageError({ message: String(cause) }),
  }).pipe(
    Effect.flatMap(runCommand),
    Effect.provide(layers),
    Effect.catchCause(report),
    (program) =>
      NodeRuntime.runMain(program, {
        disableErrorReporting: true,
        teardown,
      }),
  );
}
