import { cliCommands, getCliCommand, type CliCommandSpec } from "./spec.js";

function rows(values: readonly [string, string][]): string[] {
  const width = Math.max(...values.map(([label]) => label.length));
  return values.map(
    ([label, description]) => `  ${label.padEnd(width)}  ${description}`,
  );
}

function commandHelp(command: CliCommandSpec): string {
  const lines = [
    `Usage: float-app ${command.name}${command.usage ? ` ${command.usage}` : ""}`,
    "",
  ];
  if (command.description) lines.push(...command.description, "");
  if (command.options?.length) {
    lines.push(
      "Options:",
      ...rows(
        command.options.map((option) => [
          `${option.name}${option.short ? `, ${option.short}` : ""}${option.valueName ? ` <${option.valueName}>` : ""}`,
          option.description,
        ]),
      ),
      "",
    );
  }
  if (command.examples) {
    lines.push(
      "Examples:",
      ...command.examples.map((example) => `  ${example}`),
    );
  }
  return lines.join("\n").trimEnd();
}

export function renderHelp(commandName?: string): string {
  if (commandName) {
    return commandHelp(getCliCommand(commandName) ?? getCliCommand("help")!);
  }
  return [
    "Usage: float-app <command> [options]",
    "",
    "Make applications float by default under tiling window managers.",
    "",
    "Commands:",
    ...rows(cliCommands.map((command) => [command.name, command.summary])),
    "",
    "Run 'float-app <command> --help' for command-specific options.",
  ].join("\n");
}
