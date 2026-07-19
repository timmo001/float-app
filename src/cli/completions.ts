import { cliCommands } from "./spec.js";

export const shells = ["bash", "fish", "zsh"] as const;
export type Shell = (typeof shells)[number];

export function isShell(value: string): value is Shell {
  return shells.includes(value as Shell);
}

export function renderCompletions(shell: Shell): string {
  const commands = cliCommands.map(({ name }) => name).join(" ");
  switch (shell) {
    case "bash":
      return `complete -W '${commands}' float-app\n`;
    case "fish":
      return cliCommands
        .map(
          ({ name, summary }) =>
            `complete -c float-app -n '__fish_use_subcommand' -a '${name}' -d '${summary.replaceAll("'", "\\'")}'`,
        )
        .join("\n");
    case "zsh":
      return `#compdef float-app\n_arguments '1:command:(${commands})'\n`;
  }
}
