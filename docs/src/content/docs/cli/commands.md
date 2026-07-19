---
title: Command Reference
description: Every float-app command, option, and example, generated from the CLI registry.
sidebar:
  order: 2
---

<!-- Generated from src/cli/spec.ts. Do not edit by hand. -->

This page is generated from the same registry that powers `float-app help`.

## `float-app pick`

Click a window and print its Hyprland metadata

```text
float-app pick [options]
```

Uses slurp to select any visible window without changing focus.

**Options**

| Option   | Description |
| -------- | ----------- |
| `--json` | Emit JSON   |

**Examples**

```bash
float-app pick
float-app pick --json
```

## `float-app detect`

Print the focused window's Hyprland metadata

```text
float-app detect [options]
```

**Options**

| Option   | Description |
| -------- | ----------- |
| `--json` | Emit JSON   |

**Examples**

```bash
float-app detect
```

## `float-app add`

Make an application float by default

```text
float-app add [class] [options]
```

**Options**

| Option              | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `--focused`         | Use the focused window instead of opening the picker     |
| `--initial-class`   | Match initialClass instead of class                      |
| `--config` `<path>` | Hyprland config file that should include float-app rules |

**Arguments**

| Argument  | Description             |
| --------- | ----------------------- |
| `<class>` | Exact application class |

**Examples**

```bash
float-app add
float-app add --focused
float-app add org.gnome.Calculator
```

## `float-app remove`

Remove an application's floating rule

```text
float-app remove <class> [options]
```

**Options**

| Option              | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `--initial-class`   | Remove an initialClass rule instead of a class rule      |
| `--config` `<path>` | Hyprland config file that should include float-app rules |

**Arguments**

| Argument  | Description             |
| --------- | ----------------------- |
| `<class>` | Exact application class |

**Examples**

```bash
float-app remove org.gnome.Calculator
```

## `float-app list`

List configured floating applications

```text
float-app list [options]
```

**Options**

| Option   | Description |
| -------- | ----------- |
| `--json` | Emit JSON   |

**Examples**

```bash
float-app list
```

## `float-app completions`

Generate shell completions

```text
float-app completions [bash|fish|zsh]
```

**Arguments**

| Argument  | Description                    |
| --------- | ------------------------------ |
| `<shell>` | One of: `bash`, `fish`, `zsh`. |

## `float-app help`

Show float-app help

```text
float-app help [command]
```

**Arguments**

| Argument    | Description |
| ----------- | ----------- |
| `<command>` |             |
