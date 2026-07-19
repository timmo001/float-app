import { Schema } from "effect";

export const CliArgumentSpec = Schema.Struct({
  name: Schema.String,
  description: Schema.optionalKey(Schema.String),
  choices: Schema.optionalKey(Schema.Array(Schema.String)),
});
export interface CliArgumentSpec extends Schema.Schema.Type<
  typeof CliArgumentSpec
> {}

export const CliOptionSpec = Schema.Struct({
  name: Schema.TemplateLiteral(["--", Schema.String]),
  short: Schema.optionalKey(Schema.TemplateLiteral(["-", Schema.String])),
  description: Schema.String,
  valueName: Schema.optionalKey(Schema.String),
});
export interface CliOptionSpec extends Schema.Schema.Type<
  typeof CliOptionSpec
> {}

export const CliCommandSpec = Schema.Struct({
  name: Schema.String,
  summary: Schema.String,
  usage: Schema.optionalKey(Schema.String),
  description: Schema.optionalKey(Schema.Array(Schema.String)),
  arguments: Schema.optionalKey(Schema.Array(CliArgumentSpec)),
  options: Schema.optionalKey(Schema.Array(CliOptionSpec)),
  examples: Schema.optionalKey(Schema.Array(Schema.String)),
});
export interface CliCommandSpec extends Schema.Schema.Type<
  typeof CliCommandSpec
> {}

const helpOption = {
  name: "--help",
  short: "-h",
  description: "Show this help message",
} satisfies CliOptionSpec;

const jsonOption = {
  name: "--json",
  description: "Emit JSON",
} satisfies CliOptionSpec;

const configOption = {
  name: "--config",
  description: "Hyprland config file that should include float-app rules",
  valueName: "path",
} satisfies CliOptionSpec;

export const cliCommands: readonly CliCommandSpec[] = [
  {
    name: "pick",
    summary: "Click a window and print its Hyprland metadata",
    usage: "[options]",
    description: [
      "Uses slurp to select any visible window without changing focus.",
    ],
    options: [jsonOption, helpOption],
    examples: ["float-app pick", "float-app pick --json"],
  },
  {
    name: "detect",
    summary: "Print the focused window's Hyprland metadata",
    usage: "[options]",
    options: [jsonOption, helpOption],
    examples: ["float-app detect"],
  },
  {
    name: "add",
    summary: "Make an application float by default",
    usage: "[class] [options]",
    arguments: [{ name: "class", description: "Exact application class" }],
    options: [
      {
        name: "--focused",
        description: "Use the focused window instead of opening the picker",
      },
      {
        name: "--initial-class",
        description: "Match initialClass instead of class",
      },
      configOption,
      helpOption,
    ],
    examples: [
      "float-app add",
      "float-app add --focused",
      "float-app add org.gnome.Calculator",
    ],
  },
  {
    name: "remove",
    summary: "Remove an application's floating rule",
    usage: "<class> [options]",
    arguments: [{ name: "class", description: "Exact application class" }],
    options: [
      {
        name: "--initial-class",
        description: "Remove an initialClass rule instead of a class rule",
      },
      configOption,
      helpOption,
    ],
    examples: ["float-app remove org.gnome.Calculator"],
  },
  {
    name: "list",
    summary: "List configured floating applications",
    usage: "[options]",
    options: [jsonOption, helpOption],
    examples: ["float-app list"],
  },
  {
    name: "completions",
    summary: "Generate shell completions",
    usage: "[bash|fish|zsh]",
    arguments: [{ name: "shell", choices: ["bash", "fish", "zsh"] }],
    options: [helpOption],
  },
  {
    name: "help",
    summary: "Show float-app help",
    usage: "[command]",
    arguments: [{ name: "command" }],
    options: [helpOption],
  },
];

export function getCliCommand(name: string): CliCommandSpec | undefined {
  return cliCommands.find((command) => command.name === name);
}
