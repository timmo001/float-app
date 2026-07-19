---
title: Install
description: Install float-app from a release, package, or the AUR.
---

`float-app` requires Hyprland. Interactive window picking also requires `slurp`; commands that use the focused window do not.

## Release Archive

Replace `<version>` and `<architecture>` with a published version and either `x86_64` or `aarch64`:

```bash
curl -LO "https://github.com/timmo001/float-app/releases/download/<version>/float-app-<version>-linux-<architecture>.tar.gz"
tar -xzf "float-app-<version>-linux-<architecture>.tar.gz"
install -Dm755 float-app ~/.local/bin/float-app
```

Stable versions use `YYYYMMDD.N`, where `N` increments for releases made on the same UTC day.

## Debian and RPM Packages

Download the package for your architecture from the matching GitHub Release, then install it:

```bash
sudo apt install ./float-app_<version>_<architecture>.deb
sudo dnf install ./float-app-<version>-1.<architecture>.rpm
```

## Arch Linux

Install the prebuilt release package:

```bash
yay -S float-app-bin
```

Use `float-app-git` to build the current `main` branch instead.

## Build Locally

The repository pins Node and Bun through mise:

```bash
mise run install
mise run build
./dist/float-app help
```
