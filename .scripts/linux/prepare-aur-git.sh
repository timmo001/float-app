#!/usr/bin/env bash
set -euo pipefail

output="${1:?output directory is required}"
rm -rf "$output"
mkdir -p "$output"
cp .scripts/linux/PKGBUILD.git "$output/PKGBUILD"
