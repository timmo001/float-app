import { homedir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { Context, Effect, FileSystem, Layer, Schema } from "effect";
import { CommandError, CommandExecutor } from "../services/CommandExecutor.js";
import {
  HyprlandClient,
  HyprlandClients,
  Registry,
  type FloatingRule,
} from "./model.js";
import { includeLine, renderConf, renderLua, upsertInclude } from "./render.js";

export class FloatAppError extends Schema.TaggedError<FloatAppError>()(
  "FloatAppError",
  { message: Schema.String },
) {}

export interface HyprlandService {
  readonly focused: () => Effect.Effect<
    HyprlandClient,
    FloatAppError | CommandError
  >;
  readonly pick: () => Effect.Effect<
    HyprlandClient,
    FloatAppError | CommandError
  >;
  readonly list: () => Effect.Effect<Registry, FloatAppError>;
  readonly save: (
    rules: readonly FloatingRule[],
    requestedConfig?: string,
  ) => Effect.Effect<Registry, FloatAppError | CommandError>;
  readonly apply: (
    client: HyprlandClient,
  ) => Effect.Effect<void, FloatAppError | CommandError>;
}

const configRoot = join(homedir(), ".config", "hypr");

const stateRoot = join(homedir(), ".config", "float-app");

const registryPath = join(stateRoot, "config.json");

function error(message: string) {
  return new FloatAppError({ message });
}

const NoFocusedWindow = Schema.ObjectKeyword.check(
  Schema.makeFilter((value) => Object.keys(value).length === 0),
);

function atomicWrite(fs: FileSystem.FileSystem, path: string, content: string) {
  return Effect.gen(function* () {
    yield* fs.makeDirectory(dirname(path), { recursive: true });

    const isSymlink = yield* fs.readLink(path).pipe(
      Effect.as(true),
      Effect.orElseSucceed(() => false),
    );

    const target = isSymlink
      ? yield* fs
          .realPath(path)
          .pipe(
            Effect.mapError(() =>
              error(`Refusing to replace dangling symlink ${path}`),
            ),
          )
      : path;

    const temporary = `${target}.tmp-${process.pid}`;
    yield* fs.writeFileString(temporary, content);
    yield* fs.rename(temporary, target);
  }).pipe(
    Effect.mapError((cause) =>
      cause instanceof FloatAppError
        ? cause
        : error(`Could not write ${path}: ${String(cause)}`),
    ),
  );
}

function loadRegistry(fs: FileSystem.FileSystem) {
  return Effect.gen(function* () {
    const exists = yield* fs
      .exists(registryPath)
      .pipe(
        Effect.mapError((cause) =>
          error(`Could not read ${registryPath}: ${String(cause)}`),
        ),
      );

    if (!exists) return { version: 1 as const, rules: [] };

    const text = yield* fs
      .readFileString(registryPath)
      .pipe(
        Effect.mapError((cause) =>
          error(`Could not read ${registryPath}: ${String(cause)}`),
        ),
      );

    return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Registry))(
      text,
    ).pipe(
      Effect.mapError((cause) => error(`Invalid registry: ${String(cause)}`)),
    );
  });
}

const isHyprlandConfigFile = (name: string) =>
  [".lua", ".conf"].includes(extname(name)) &&
  name !== "float-app.lua" &&
  name !== "float-app.conf";

const isRegularFile = (fs: FileSystem.FileSystem, path: string) =>
  fs.stat(path).pipe(
    Effect.map((info) => info.type === "File"),
    Effect.orElseSucceed(() => false),
  );

function destinationCandidates(fs: FileSystem.FileSystem) {
  return Effect.gen(function* () {
    const names = yield* fs.readDirectory(configRoot);
    const paths: string[] = [];

    for (const name of names) {
      const path = join(configRoot, name);

      if (isHyprlandConfigFile(name) && (yield* isRegularFile(fs, path)))
        paths.push(path);
    }

    const preferred = [
      "looknfeel.lua",
      "looknfeel.conf",
      "hyprland.lua",
      "hyprland.conf",
    ];

    const rank = (path: string) => {
      const index = preferred.indexOf(basename(path));

      return index === -1 ? preferred.length : index;
    };

    return paths.sort(
      (left, right) => rank(left) - rank(right) || left.localeCompare(right),
    );
  }).pipe(
    Effect.mapError((cause) =>
      error(`Could not inspect ${configRoot}: ${String(cause)}`),
    ),
  );
}

function promptDestination(candidates: readonly string[]) {
  return Effect.tryPromise({
    try: async () => {
      console.error(
        "Choose the Hyprland config that should include float-app rules:",
      );
      candidates.forEach((path, index) => {
        console.error(`  ${index + 1}. ${path}`);
      });
      console.error("  c. Enter a custom path under ~/.config/hypr");
      process.stderr.write("Selection: ");

      for await (const line of console) {
        const value = line.trim();

        if (value === "c") {
          process.stderr.write("Config path: ");

          for await (const custom of console) return custom.trim();
        }

        const selected = Number(value) - 1;

        if (candidates[selected]) return candidates[selected];
        break;
      }

      throw new Error("No config selected");
    },
    catch: (cause) => error(`Could not select a config: ${String(cause)}`),
  });
}

function validateDestination(path: string) {
  const absolute = resolve(path.replace(/^~(?=\/)/, homedir()));
  const inside = relative(configRoot, absolute);

  if (inside.startsWith("..") || resolve(configRoot, inside) !== absolute) {
    return Effect.fail(error(`Config must be under ${configRoot}`));
  }

  if (![".lua", ".conf"].includes(extname(absolute))) {
    return Effect.fail(error("Config must end in .lua or .conf"));
  }

  return Effect.succeed(absolute);
}

function hasOmarchyFloatingRules(fs: FileSystem.FileSystem) {
  return Effect.gen(function* () {
    const entries = yield* fs.readDirectory(configRoot, { recursive: true });

    for (const entry of entries) {
      const path = join(configRoot, entry);

      if (!isHyprlandConfigFile(basename(entry))) continue;

      if (!(yield* isRegularFile(fs, path))) continue;

      const content = yield* fs.readFileString(path);

      if (/float on[^\n]*match:tag floating-window/.test(content)) return true;

      if (
        /match\s*=\s*\{\s*tag\s*=\s*["']floating-window["'][\s\S]{0,200}?float\s*=\s*true/.test(
          content,
        )
      )
        return true;
    }

    return false;
  }).pipe(
    Effect.mapError((cause) =>
      error(`Could not inspect Omarchy rules: ${String(cause)}`),
    ),
  );
}

export class Hyprland extends Context.Service<Hyprland, HyprlandService>()(
  "float-app/Hyprland",
) {
  static readonly layer = Layer.effect(
    Hyprland,
    Effect.gen(function* () {
      const commands = yield* CommandExecutor;
      const fs = yield* FileSystem.FileSystem;

      const clients = commands.run("hyprctl", ["-j", "clients"]).pipe(
        Effect.flatMap(({ stdout }) =>
          Effect.try({
            try: () =>
              Schema.decodeUnknownEffect(HyprlandClients)(
                JSON.parse(stdout),
              ).pipe(
                Effect.mapError((cause) =>
                  error(`Invalid hyprctl client data: ${String(cause)}`),
                ),
              ),
            catch: (cause) => error(`Invalid hyprctl JSON: ${String(cause)}`),
          }),
        ),
        Effect.flatten,
      );

      const focused = Effect.fn("Hyprland.focused")(function* () {
        const { stdout } = yield* commands.run("hyprctl", [
          "-j",
          "activewindow",
        ]);

        return yield* Effect.try({
          try: () => {
            const value: unknown = JSON.parse(stdout);

            if (Schema.is(NoFocusedWindow)(value)) {
              return Effect.fail(error("No Hyprland window is focused"));
            }

            return Schema.decodeUnknownEffect(HyprlandClient)(value).pipe(
              Effect.mapError((cause) =>
                error(`Invalid hyprctl activewindow data: ${String(cause)}`),
              ),
            );
          },
          catch: (cause) => error(`Invalid hyprctl JSON: ${String(cause)}`),
        }).pipe(Effect.flatten);
      });

      const pick = Effect.fn("Hyprland.pick")(function* () {
        if (!(yield* commands.exists("slurp"))) {
          return yield* error(
            "Window picking requires slurp. Install it with 'sudo pacman -S slurp', or use --focused.",
          );
        }

        const visible = yield* clients;

        const selectable = visible.filter(
          (client) => client.mapped && !client.hidden && client.stableId,
        );

        const regions = selectable
          .map(
            (client) =>
              `${client.at[0]},${client.at[1]} ${client.size[0]}x${client.size[1]} ${client.stableId}`,
          )
          .join("\n");

        if (!regions) return yield* error("No visible Hyprland windows found");

        const { stdout } = yield* commands
          .run("slurp", ["-r", "-f", "%l"], `${regions}\n`)
          .pipe(
            Effect.mapError((cause) =>
              cause.exitCode === 1
                ? error("Window selection cancelled")
                : cause,
            ),
          );

        const stableId = stdout.trim();

        const selected = selectable.find(
          (client) => client.stableId === stableId,
        );

        if (!selected)
          return yield* error("Selected window is no longer available");

        return selected;
      });

      const save = Effect.fn("Hyprland.save")(function* (
        rules: readonly FloatingRule[],
        requestedConfig?: string,
      ) {
        const registry = yield* loadRegistry(fs);
        const selected = requestedConfig ?? registry.config;

        const config = yield* selected
          ? validateDestination(selected)
          : destinationCandidates(fs).pipe(Effect.flatMap(promptDestination));

        const validatedConfig = yield* validateDestination(config);
        const lua = extname(validatedConfig) === ".lua";
        const generated = join(configRoot, `float-app.${lua ? "lua" : "conf"}`);

        const configText = yield* fs.exists(validatedConfig).pipe(
          Effect.flatMap((exists) =>
            exists ? fs.readFileString(validatedConfig) : Effect.succeed(""),
          ),
          Effect.mapError((cause) =>
            error(`Could not read ${validatedConfig}: ${String(cause)}`),
          ),
        );

        const omarchy = yield* hasOmarchyFloatingRules(fs);
        yield* atomicWrite(
          fs,
          generated,
          lua ? renderLua(rules, omarchy) : renderConf(rules, omarchy),
        );
        const modulePath = relative(configRoot, generated);

        const include = includeLine(
          validatedConfig,
          lua ? modulePath : generated,
        );

        yield* atomicWrite(
          fs,
          validatedConfig,
          upsertInclude(configText, include),
        );
        const next = { version: 1 as const, config: validatedConfig, rules };
        yield* atomicWrite(
          fs,
          registryPath,
          `${JSON.stringify(next, null, 2)}\n`,
        );
        yield* commands.run("hyprctl", ["reload"]);

        return next;
      });

      return Hyprland.of({
        focused,
        pick,
        list: Effect.fn("Hyprland.list")(() => loadRegistry(fs)),
        save,
        apply: Effect.fn("Hyprland.apply")(function* (client) {
          const registry = yield* loadRegistry(fs);
          const lua = registry.config?.endsWith(".lua") ?? false;

          const dispatcher = lua
            ? `hl.dsp.window.float({ action = "enable", window = "address:${client.address}" })`
            : "setfloating";

          const args = lua
            ? ["dispatch", dispatcher]
            : ["dispatch", dispatcher, `address:${client.address}`];

          yield* commands.run("hyprctl", args);
        }),
      });
    }),
  );
}
