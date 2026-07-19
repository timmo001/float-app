import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cliCommands,
  type CliArgumentSpec,
  type CliCommandSpec,
  type CliOptionSpec,
} from "../../src/cli/spec.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.join(root, "src/content/docs/cli/commands.md");
const lines: string[] = [];
const push = (...values: string[]) => lines.push(...(values.length ? values : [""]));
const code = (value: string) => `\`${value}\``;
const cell = (value: string) => value.replace(/\|/g, "\\|");

function renderOptions(options: readonly CliOptionSpec[]) {
  const visible = options.filter((option) => option.name !== "--help");
  if (!visible.length) return;
  push("**Options**", "", "| Option | Description |", "| --- | --- |");
  for (const option of visible) {
    const names = [code(option.name), option.short && code(option.short), option.valueName && code(`<${option.valueName}>`)].filter(Boolean).join(" ");
    push(`| ${cell(names)} | ${cell(option.description)} |`);
  }
  push();
}

function renderArguments(arguments_: readonly CliArgumentSpec[]) {
  if (!arguments_.length) return;
  push("**Arguments**", "", "| Argument | Description |", "| --- | --- |");
  for (const argument of arguments_) {
    const choices = argument.choices?.length ? ` One of: ${argument.choices.map(code).join(", ")}.` : "";
    push(`| ${code(`<${argument.name}>`)} | ${cell(`${argument.description ?? ""}${choices}`.trim())} |`);
  }
  push();
}

function renderCommand(command: CliCommandSpec) {
  push(`## ${code(`float-app ${command.name}`)}`, "", command.summary, "", "```text", `float-app ${command.name}${command.usage ? ` ${command.usage}` : ""}`, "```", "");
  if (command.description) push(...command.description, "");
  if (command.options) renderOptions(command.options);
  if (command.arguments) renderArguments(command.arguments);
  if (command.examples?.length) push("**Examples**", "", "```bash", ...command.examples, "```", "");
}

push("---", "title: Command Reference", "description: Every float-app command, option, and example, generated from the CLI registry.", "sidebar:", "  order: 2", "---", "", "<!-- Generated from src/cli/spec.ts. Do not edit by hand. -->", "", "This page is generated from the same registry that powers `float-app help`.", "");
for (const command of cliCommands) renderCommand(command);

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`);
console.log(`Wrote ${path.relative(root, outFile)}`);
