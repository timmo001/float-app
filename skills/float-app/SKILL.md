---
name: float-app
description: List, add and remove the applications Hyprland floats by default, and read a window's class through float-app. Use when asked which apps float, to make an app float or tile again, or to find a window's class for a rule.
---

# float-app

float-app has no Code Mode namespace or MCP server yet, so use the CLI, with
`--json` wherever it's offered (`pick`, `detect`, `list`).

1. Read with `list --json` before changing anything.
2. To find an app's class, `detect --json` reads the focused window, and
   `pick --json` has the person click one. Ask before running `pick`, since it
   needs them at the screen.
3. `add <class>` and `remove <class>` write a rules file under the user's
   Hyprland config directory. Name the class explicitly, and use
   `--initial-class` when the app's class changes after it opens. Ask the
   person before each.
4. Check with `list --json` afterwards. float-app reloads Hyprland itself after
   a change.
