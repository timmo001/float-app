---
title: Rules and Config
description: How float-app stores rules and updates Hyprland configuration.
---

## Managed Files

`float-app` stores its registry at `~/.config/float-app/config.json`. The registry records the selected Hyprland config and the managed rules.

Rules are generated beside your Hyprland configuration as `~/.config/hypr/float-app.lua` or `~/.config/hypr/float-app.conf`. Do not edit this generated file by hand.

The selected config receives a marked include block. Existing blocks are updated rather than duplicated. If that config is a symlink, `float-app` writes through to its target instead of replacing the link.

## Config Selection

The selected config must be a `.lua` or `.conf` file under `~/.config/hypr`. `float-app` remembers the first selection. Pass `--config <path>` to select another file when adding or removing a rule.

## Matching

Rules match either `class` or `initial_class` exactly. Application classes are escaped before being written as RE2 patterns, so punctuation is treated literally.

Each match adds the `floating-window` tag. Unless an existing Omarchy floating-window rule is detected, the generated file also floats, centres, and sizes tagged windows to `875` by `600`.
