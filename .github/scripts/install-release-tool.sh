#!/usr/bin/env bash
# Reviewed upstream release assets. Verify before extracting or executing.
set -euo pipefail

case "${1:-}" in
  gitleaks)
    version=8.28.0
    binary=gitleaks
    asset="gitleaks_${version}_linux_x64.tar.gz"
    url="https://github.com/gitleaks/gitleaks/releases/download/v${version}/${asset}"
    sha256=a65b5253807a68ac0cafa4414031fd740aeb55f54fb7e55f386acb52e6a840eb
    ;;
  mcp-publisher)
    version=1.8.1
    binary=mcp-publisher
    asset=mcp-publisher_linux_amd64.tar.gz
    url="https://github.com/modelcontextprotocol/registry/releases/download/v${version}/${asset}"
    sha256=a06c9096dcb9727c13555b6be26c7effa707b01f06a4c561ba7a3635443cf2cc
    ;;
  *) echo 'usage: install-release-tool.sh {gitleaks|mcp-publisher}' >&2; exit 2 ;;
esac

staging=$(mktemp -d)
trap 'rm -f -- "$staging/$asset" "$staging/$binary"; rmdir -- "$staging"' EXIT
curl --fail --show-error --silent --location --retry 3 \
  --connect-timeout 10 --max-time 120 "$url" --output "$staging/$asset"
printf '%s  %s\n' "$sha256" "$staging/$asset" | sha256sum --check --strict
tar -xzf "$staging/$asset" -C "$staging" "$binary"
install -m 755 "$staging/$binary" "./$binary"
