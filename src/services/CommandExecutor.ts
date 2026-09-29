import { Context, Effect, Layer, Schema, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

export class CommandError extends Schema.TaggedError<CommandError>()(
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
  static readonly layer = Layer.effect(
    CommandExecutor,
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

      const run = Effect.fn("CommandExecutor.run")(
        function* (
          command: string,
          args: readonly string[] = [],
          input?: string,
        ) {
          const handle = yield* spawner.spawn(
            ChildProcess.make(command, args, {
              stdin:
                input === undefined
                  ? "ignore"
                  : Stream.make(new TextEncoder().encode(input)),
            }),
          );

          const [exitCode, stdout, stderr] = yield* Effect.all(
            [
              handle.exitCode,
              handle.stdout.pipe(Stream.decodeText(), Stream.mkString),
              handle.stderr.pipe(Stream.decodeText(), Stream.mkString),
            ],
            { concurrency: "unbounded" },
          );

          if (exitCode !== 0) {
            return yield* new CommandError({
              command,
              message: stderr.trim() || `Exited with status ${exitCode}`,
              exitCode,
            });
          }

          return { stdout, stderr };
        },
        Effect.scoped,
        (effect, command) =>
          Effect.catchTag(effect, "PlatformError", (cause) =>
            Effect.fail(new CommandError({ command, message: String(cause) })),
          ),
      );

      const exists = (command: string) =>
        spawner
          .exitCode(
            ChildProcess.make("sh", ["-c", 'command -v "$1"', "sh", command], {
              stdin: "ignore",
              stdout: "ignore",
              stderr: "ignore",
            }),
          )
          .pipe(
            Effect.map((code) => code === 0),
            Effect.orElseSucceed(() => false),
          );

      return CommandExecutor.of({ run, exists });
    }),
  );
}
