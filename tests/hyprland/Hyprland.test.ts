import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { FloatAppError, Hyprland } from "../../src/hyprland/Hyprland.js";
import type { HyprlandClient } from "../../src/hyprland/model.js";
import { CommandExecutor } from "../../src/services/CommandExecutor.js";

const client: HyprlandClient = {
  address: "0x123",
  stableId: "42",
  mapped: true,
  hidden: false,
  at: [10, 20],
  size: [800, 600],
  class: "Example",
  initialClass: "Example",
  title: "Example window",
  initialTitle: "Example window",
  pid: 123,
  xwayland: false,
};

function layerFor(stdout: string) {
  return Hyprland.layer.pipe(
    Layer.provide(
      Layer.succeed(
        CommandExecutor,
        CommandExecutor.of({
          run: (command) =>
            Effect.succeed({
              stdout: command === "slurp" ? "42\n" : stdout,
              stderr: "",
            }),
          exists: () => Effect.succeed(true),
        }),
      ),
    ),
  );
}

describe("Hyprland response decoding", () => {
  test.each(["focused", "pick"] as const)(
    "%s decodes a valid client",
    async (method) => {
      const selected = await Effect.runPromise(
        Effect.flatMap(Hyprland, (hyprland) => hyprland[method]()).pipe(
          Effect.provide(
            layerFor(JSON.stringify(method === "pick" ? [client] : client)),
          ),
        ),
      );

      expect(selected).toEqual(client);
    },
  );

  test.each(["{}", "[]"])(
    "reports no focused window for %s",
    async (stdout) => {
      const failure = await Effect.runPromise(
        Effect.flatMap(Hyprland, (hyprland) => hyprland.focused()).pipe(
          Effect.flip,
          Effect.provide(layerFor(stdout)),
        ),
      );

      expect(failure).toBeInstanceOf(FloatAppError);
      expect(failure.message).toBe("No Hyprland window is focused");
    },
  );

  for (const method of ["focused", "pick"] as const) {
    test.each([
      "null",
      "false",
      "1",
      '""',
      '{"address": 1}',
      '[{"address": 1}]',
    ])(`${method} rejects invalid client data %s`, async (stdout) => {
      const failure = await Effect.runPromise(
        Effect.flatMap(Hyprland, (hyprland) => hyprland[method]()).pipe(
          Effect.flip,
          Effect.provide(layerFor(stdout)),
        ),
      );

      expect(failure).toBeInstanceOf(FloatAppError);
      expect(failure.message).toStartWith(
        `Invalid hyprctl ${method === "focused" ? "activewindow" : "client"} data:`,
      );
    });

    test(`${method} distinguishes invalid JSON from invalid client data`, async () => {
      const failure = await Effect.runPromise(
        Effect.flatMap(Hyprland, (hyprland) => hyprland[method]()).pipe(
          Effect.flip,
          Effect.provide(layerFor("{")),
        ),
      );

      expect(failure).toBeInstanceOf(FloatAppError);
      expect(failure.message).toStartWith("Invalid hyprctl JSON:");
    });
  }
});
