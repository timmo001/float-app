import { renderCompletions, shells } from "../src/cli/completions.js";

const outputPaths = {
  bash: ".scripts/linux/completions/float-app.bash",
  fish: ".scripts/linux/completions/float-app.fish",
  zsh: ".scripts/linux/completions/_float-app",
} as const;

const check = process.argv.includes("--check");

for (const shell of shells) {
  const path = outputPaths[shell];
  const expected = renderCompletions(shell);
  if (check) {
    const actual = await Bun.file(path)
      .text()
      .catch(() => "");
    if (actual !== expected) {
      console.error(`${path} is out of date. Run 'mise run completions'.`);
      process.exitCode = 1;
    }
  } else {
    await Bun.write(path, expected);
  }
}
