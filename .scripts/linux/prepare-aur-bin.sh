#!/usr/bin/env bash
set -euo pipefail

version="${1:?release version is required}"
output="${2:?output directory is required}"
base_url="https://github.com/timmo001/float-app/releases/download/$version"
checksums="$(mktemp)"
trap 'rm -f "$checksums"' EXIT

curl --fail --location --silent --show-error "$base_url/SHA256SUMS" --output "$checksums"
x86_64_checksum="$(awk -v file="float-app-${version}-linux-x86_64.tar.gz" '$2 == file { print $1 }' "$checksums")"
aarch64_checksum="$(awk -v file="float-app-${version}-linux-aarch64.tar.gz" '$2 == file { print $1 }' "$checksums")"
[[ "$x86_64_checksum" =~ ^[0-9a-f]{64}$ && "$aarch64_checksum" =~ ^[0-9a-f]{64}$ ]]

rm -rf "$output"
mkdir -p "$output"
sed \
  -e "s/^pkgver=.*/pkgver=$version/" \
  -e "s/sha256sums_x86_64=('SKIP')/sha256sums_x86_64=('$x86_64_checksum')/" \
  -e "s/sha256sums_aarch64=('SKIP')/sha256sums_aarch64=('$aarch64_checksum')/" \
  .scripts/linux/PKGBUILD.bin > "$output/PKGBUILD"
cp .scripts/linux/completions/float-app.bash "$output/float-app.bash"
cp .scripts/linux/completions/float-app.fish "$output/float-app.fish"
cp .scripts/linux/completions/_float-app "$output/_float-app"
cp LICENSE "$output/LICENSE"

for file in float-app.bash float-app.fish _float-app; do
  checksum="$(sha256sum "$output/$file" | cut -d ' ' -f 1)"
  sed -i "0,/'SKIP'/s//'$checksum'/" "$output/PKGBUILD"
done
