# float-app

Persistently float selected Hyprland windows. Rules are written to the selected
Hyprland configuration while preserving stowed symlinks and existing Omarchy
rules.

## Requirements

- Hyprland
- `slurp` for interactive window picking

## Installation

Rolling prereleases use `YYYYMMDD.N`, where `N` increments for releases made on
the same UTC day. Each release records its source commit and publishes
`SHA256SUMS`.

Install a release archive, replacing `<version>` and `<architecture>` with the
published version and either `x86_64` or `aarch64`:

```sh
curl -LO "https://github.com/timmo001/float-app/releases/download/<version>/float-app-<version>-linux-<architecture>.tar.gz"
tar -xzf "float-app-<version>-linux-<architecture>.tar.gz"
install -Dm755 float-app ~/.local/bin/float-app
```

Install the matching deb or RPM package:

```sh
sudo apt install ./float-app_<version>_<architecture>.deb
sudo dnf install ./float-app-<version>-1.<architecture>.rpm
```

On Arch Linux, install the prebuilt package from the AUR:

```sh
yay -S float-app-bin
```

Use `float-app-git` to build the current `main` branch instead.
The git package updates after rolling releases; the binary package updates only
when a stable GitHub Release is published.

## Usage

```sh
float-app pick
float-app add
float-app list
float-app remove org.example.App
```

Run `float-app help` for all commands and options.
