# Mura Flash

Host-side inspection and installation tooling for Mura target headsets.

Version 0 is deliberately **inspection-only**. It can list and validate target
recipes and collect allowlisted, read-only ADB or fastboot facts. It cannot
download images, reboot a device, unlock a bootloader, change slots, execute a
programmer, erase, format, flash, relock, or alter rollback state.

## Run

```sh
nix run github:mura-os/mura-flash
nix run github:mura-os/mura-flash -- targets
```

The first public revision remains available by commit:

```sh
nix run github:mura-os/mura-flash/<commit>
```

## Develop

Clone recursively because the browser fastboot transport is pinned as a
submodule:

```sh
git clone --recursive https://github.com/mura-os/mura-flash.git
cd mura-flash
nix develop
```

The Python CLI is managed with `uv`. The browser library is strict TypeScript
compiled by Rollup into committed ESM files under `dist/`.

```sh
uv run pytest
npm test
npm run build
nix flake check
```

Recipes under `recipes/targets/` are consumed by both implementations. The
machine-readable contract under `contracts/` defines stable IDs, limits, error
codes, CLI grammar, and the JavaScript export surface.

## Safety boundary

Recipes are research evidence, not hardware qualification. Every shipped
recipe is test-only, unqualified, and write-disabled. Device communication is
restricted to compiled-in probes; recipes never contain executable commands.
