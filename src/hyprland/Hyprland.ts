import { homedir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import {
  lstat,
  mkdir,
  readdir,
  realpath,
  rename,
  writeFile,
} from "node:fs/promises";
import { Context, Effect, Layer, Schema } from "effect";
import { CommandError, CommandExecutor } from "../services/CommandExecutor.js";
import {
  HyprlandClient,
  HyprlandClients,
  Registry,
  type FloatingRule,
} from "./model.js";
import { includeLine, renderConf, renderLua, upsertInclude } from "./render.js";

export class FloatAppError extends Schema.TaggedErrorClass<FloatAppError>()(
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

function readJsonFile(path: string) {
  return Effect.tryPromise({
    try: () => Bun.file(path).json(),
    catch: (cause) => error(`Could not read ${path}: ${String(cause)}`),
  });
}

function decodeClients(value: unknown) {
  return Schema.decodeUnknownEffect(HyprlandClients)(value).pipe(
    Effect.mapError((cause) => error(`Invalid hyprctl client data: ${cause}`)),
  );
}

function decodeClient(value: unknown) {
  return Schema.decodeUnknownEffect(HyprlandClient)(value).pipe(
    Effect.mapError((cause) =>
      error(`Invalid hyprctl activewindow data: ${cause}`),
    ),
  );
}

function atomicWrite(path: string, content: string) {
  return Effect.tryPromise({
    try: async () => {
      await mkdir(dirname(path), { recursive: true });
      let target = path;
      try {
        if ((await lstat(path)).isSymbolicLink()) target = await realpath(path);
      } catch (cause) {
        if (
          cause instanceof Error &&
          "code" in cause &&
          cause.code === "ENOENT"
        ) {
          try {
            if ((await lstat(path)).isSymbolicLink()) {
              throw new Error(`Refusing to replace dangling symlink ${path}`);
            }
          } catch (linkCause) {
            if (!(
              linkCause instanceof Error &&
              "code" in linkCause &&
              linkCause.code === "ENOENT"
            ))
              throw linkCause;
          }
        } else throw cause;
      }
      const temporary = `${target}.tmp-${process.pid}`;
      await writeFile(temporary, content);
      await rename(temporary, target);
    },
    catch: (cause) => error(`Could not write ${path}: ${String(cause)}`),
  });
}

function loadRegistry() {
  return Effect.gen(function* () {
    if (!(yield* Effect.promise(() => Bun.file(registryPath).exists()))) {
      return { version: 1 as const, rules: [] };
    }
    return yield* readJsonFile(registryPath).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Registry)),
      Effect.mapError((cause) => error(`Invalid registry: ${cause}`)),
    );
  });
}

function destinationCandidates() {
  return Effect.tryPromise({
    try: async () => {
      const paths = (await readdir(configRoot, { withFileTypes: true }))
        .filter(
          (entry) =>
            (entry.isFile() || entry.isSymbolicLink()) &&
            [".lua", ".conf"].includes(extname(entry.name)) &&
            entry.name !== "float-app.lua" &&
            entry.name !== "float-app.conf",
        )
        .map((entry) => join(configRoot, entry.name));
      const preferred = [
        "looknfeel.lua",
        "looknfeel.conf",
        "hyprland.lua",
        "hyprland.conf",
      ];
      const rank = (path: string) => {
        const index = preferred.indexOf(path.split("/").at(-1)!);
        return index === -1 ? preferred.length : index;
      };
      return paths.sort(
        (left, right) => rank(left) - rank(right) || left.localeCompare(right),
      );
    },
    catch: (cause) =>
      error(`Could not inspect ${configRoot}: ${String(cause)}`),
  });
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

function hasOmarchyFloatingRules() {
  return Effect.tryPromise({
    try: async () => {
      const entries = await readdir(configRoot, {
        recursive: true,
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (
          !(entry.isFile() || entry.isSymbolicLink()) ||
          ![".lua", ".conf"].includes(extname(entry.name)) ||
          entry.name === "float-app.lua" ||
          entry.name === "float-app.conf"
        )
          continue;
        const content = await Bun.file(
          join(entry.parentPath, entry.name),
        ).text();
        if (/float on[^\n]*match:tag floating-window/.test(content))
          return true;
        if (
          /match\s*=\s*\{\s*tag\s*=\s*["']floating-window["'][\s\S]{0,200}?float\s*=\s*true/.test(
            content,
          )
        )
          return true;
      }
      return false;
    },
    catch: (cause) =>
      error(`Could not inspect Omarchy rules: ${String(cause)}`),
  });
}

export class Hyprland extends Context.Service<Hyprland, HyprlandService>()(
  "float-app/Hyprland",
) {
  static readonly layer = Layer.effect(
    Hyprland,
    Effect.gen(function* () {
      const commands = yield* CommandExecutor;
      const clients = commands.run("hyprctl", ["-j", "clients"]).pipe(
        Effect.flatMap(({ stdout }) =>
          Effect.try({
            try: () => JSON.parse(stdout) as unknown,
            catch: (cause) => error(`Invalid hyprctl JSON: ${String(cause)}`),
          }),
        ),
        Effect.flatMap(decodeClients),
      );
      const focused = Effect.fn("Hyprland.focused")(function* () {
        const { stdout } = yield* commands.run("hyprctl", [
          "-j",
          "activewindow",
        ]);
        const value = yield* Effect.try({
          try: () => JSON.parse(stdout) as unknown,
          catch: (cause) => error(`Invalid hyprctl JSON: ${String(cause)}`),
        });
        if (
          typeof value === "object" &&
          value !== null &&
          Object.keys(value).length === 0
        ) {
          return yield* error("No Hyprland window is focused");
        }
        return yield* decodeClient(value);
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
        const registry = yield* loadRegistry();
        const selected = requestedConfig ?? registry.config;
        const config = yield* selected
          ? validateDestination(selected)
          : destinationCandidates().pipe(Effect.flatMap(promptDestination));
        const validatedConfig = yield* validateDestination(config);
        const lua = extname(validatedConfig) === ".lua";
        const generated = join(configRoot, `float-app.${lua ? "lua" : "conf"}`);
        const configText = yield* Effect.tryPromise({
          try: async () =>
            (await Bun.file(validatedConfig).exists())
              ? Bun.file(validatedConfig).text()
              : "",
          catch: (cause) =>
            error(`Could not read ${validatedConfig}: ${String(cause)}`),
        });
        const omarchy = yield* hasOmarchyFloatingRules();
        yield* atomicWrite(
          generated,
          lua ? renderLua(rules, omarchy) : renderConf(rules, omarchy),
        );
        const modulePath = relative(configRoot, generated);
        const include = includeLine(
          validatedConfig,
          lua ? modulePath : generated,
        );
        yield* atomicWrite(validatedConfig, upsertInclude(configText, include));
        const next = { version: 1 as const, config: validatedConfig, rules };
        yield* atomicWrite(registryPath, `${JSON.stringify(next, null, 2)}\n`);
        yield* commands.run("hyprctl", ["reload"]);
        return next;
      });

      return Hyprland.of({
        focused,
        pick,
        list: Effect.fn("Hyprland.list")(loadRegistry),
        save,
        apply: Effect.fn("Hyprland.apply")(function* (client) {
          const registry = yield* loadRegistry();
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
