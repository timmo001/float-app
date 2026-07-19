---
title: Quick Start
description: Add and manage persistent floating rules.
---

Install `float-app` first, or substitute `./dist/float-app` in these examples.

## Add a Window

Run `add` without a class to select a visible window with `slurp`:

```bash
float-app add
```

On the first change, choose the `.lua` or `.conf` file under `~/.config/hypr` that should include the generated rules. To avoid the prompt, pass it explicitly:

```bash
float-app add org.gnome.Calculator --config ~/.config/hypr/hyprland.conf
```

Use the focused window instead of the picker, or match its initial class:

```bash
float-app add --focused
float-app add --initial-class
```

## Inspect Windows and Rules

```bash
float-app pick
float-app detect
float-app list
float-app list --json
```

`pick` selects a visible window without changing focus. `detect` inspects the focused window.

## Remove a Rule

```bash
float-app remove org.gnome.Calculator
float-app remove org.gnome.Calculator --initial-class
```

Changes rewrite the generated rule file and reload Hyprland.
