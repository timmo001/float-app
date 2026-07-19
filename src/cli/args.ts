import { Schema } from "effect";
import { CliCommandSpec, getCliCommand } from "./spec.js";

export class UsageError extends Schema.TaggedErrorClass<UsageError>()(
  "UsageError",
  { message: Schema.String },
) {}

export const ParsedCliArgs = Schema.Struct({
  command: Schema.optional(CliCommandSpec),
  options: Schema.ReadonlyMap(
    Schema.String,
    Schema.Union([Schema.Boolean, Schema.String]),
  ),
  positionals: Schema.Array(Schema.String),
  help: Schema.Boolean,
});
export interface ParsedCliArgs extends Schema.Schema.Type<
  typeof ParsedCliArgs
> {}

function fail(message: string): never {
  throw new UsageError({ message });
}

export function parseCliArgs(args: readonly string[]): ParsedCliArgs {
  const [commandName, ...tokens] = args;
  if (!commandName || commandName === "--help" || commandName === "-h") {
    return {
      command: undefined,
      options: new Map(),
      positionals: [],
      help: true,
    };
  }
  const command = getCliCommand(commandName);
  if (!command) fail(`float-app: unknown command '${commandName}'`);

  const lookup = new Map<
    string,
    NonNullable<CliCommandSpec["options"]>[number]
  >(
    (command.options ?? []).flatMap((option) => [
      [option.name, option] as const,
      ...(option.short ? ([[option.short, option]] as const) : []),
    ]),
  );
  const options = new Map<string, true | string>();
  const positionals: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("-")) {
      positionals.push(token);
      continue;
    }
    const option = lookup.get(token);
    if (!option) fail(`float-app ${command.name}: unknown option '${token}'`);
    if (options.has(option.name)) {
      fail(
        `float-app ${command.name}: option '${option.name}' specified twice`,
      );
    }
    if (!option.valueName) {
      options.set(option.name, true);
      continue;
    }
    const value = tokens[index + 1];
    if (!value || value.startsWith("-")) {
      fail(
        `float-app ${command.name}: option '${option.name}' requires a value`,
      );
    }
    options.set(option.name, value);
    index += 1;
  }
  if (positionals.length > (command.arguments?.length ?? 0)) {
    fail(
      `float-app ${command.name}: unexpected argument '${positionals.at(-1)}'`,
    );
  }
  return {
    command,
    options,
    positionals,
    help: options.has("--help"),
  };
}

export function hasOption(args: ParsedCliArgs, name: `--${string}`): boolean {
  return args.options.has(name);
}

export function optionValue(
  args: ParsedCliArgs,
  name: `--${string}`,
): string | undefined {
  const value = args.options.get(name);
  return typeof value === "string" ? value : undefined;
}
