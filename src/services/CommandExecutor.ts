import { Context, Effect, Layer, Schema } from "effect";

export class CommandError extends Schema.TaggedErrorClass<CommandError>()(
  "CommandError",
  {
    command: Schema.String,
    message: Schema.String,
    exitCode: Schema.optional(Schema.Number),
  },
) {}

export const CommandResult = Schema.Struct({
  stdout: Schema.String,
  stderr: Schema.String,
});
export interface CommandResult extends Schema.Schema.Type<
  typeof CommandResult
> {}

export interface CommandExecutorService {
  readonly run: (
    command: string,
    args?: readonly string[],
    input?: string,
  ) => Effect.Effect<CommandResult, CommandError>;
  readonly exists: (command: string) => Effect.Effect<boolean>;
}

export class CommandExecutor extends Context.Service<
  CommandExecutor,
  CommandExecutorService
>()("float-app/CommandExecutor") {
  static readonly layer = Layer.succeed(
    CommandExecutor,
    CommandExecutor.of({
      run: Effect.fn("CommandExecutor.run")(function* (
        command,
        args = [],
        input,
      ) {
        const process = yield* Effect.try({
          try: () =>
            Bun.spawn([command, ...args], {
              stdin: input === undefined ? "ignore" : new Blob([input]),
              stdout: "pipe",
              stderr: "pipe",
            }),
          catch: (error) =>
            new CommandError({ command, message: String(error) }),
        });
        const [exitCode, stdout, stderr] = yield* Effect.promise(() =>
          Promise.all([
            process.exited,
            new Response(process.stdout).text(),
            new Response(process.stderr).text(),
          ]),
        );
        if (exitCode !== 0) {
          return yield* new CommandError({
            command,
            message: stderr.trim() || `Exited with status ${exitCode}`,
            exitCode,
          });
        }
        return { stdout, stderr };
      }),
      exists: (command) =>
        Effect.promise(async () => {
          const process = Bun.spawn(
            ["sh", "-c", 'command -v "$1"', "sh", command],
            {
              stdout: "ignore",
              stderr: "ignore",
            },
          );
          return (await process.exited) === 0;
        }),
    }),
  );
}
