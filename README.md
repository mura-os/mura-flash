# Mura Flash

Host-side inspection and installation tooling for Mura target headsets.

Version 0 remains **inspection-only**. Version 1 adds typed target records and
machine-executable procedure graphs shared by Python and JavaScript. Procedures
can be planned and deterministically replayed, but all current state-changing
operations remain test-only, unqualified, and disabled.

## Run

```sh
nix run github:mura-os/mura-flash
nix run github:mura-os/mura-flash -- targets
nix run github:mura-os/mura-flash -- procedures
nix run github:mura-os/mura-flash -- plan \
  samsung-galaxy-xr-ayke-to-ayia-rollback-unlock \
  --flow simulation-only-unqualified-ayke-rollback-unlock-disabled-plan
nix run github:mura-os/mura-flash -- replay \
  samsung-galaxy-xr-ayke-to-ayia-rollback-unlock \
  --scenario replay/scenarios/samsung/samsung-ayke-rollback-unverified.json
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
python tools/check_replay_parity.py
nix flake check
```

Inspection recipes under `recipes/targets/` and executable procedure graphs
under `recipes/procedures/` are consumed by both implementations. The
machine-readable contracts under `contracts/` define stable IDs, limits, error
codes, operation semantics, CLI grammar, and the JavaScript export surface.
Target records, evidence manifests, shared record schemas, and replay scenarios
live under `catalog/`, `evidence/`, `records/`, and `replay/`.

## Safety boundary

Recipes are research evidence, not hardware qualification. Every shipped
procedure is test-only, unqualified, and write-disabled. Destructive flows can
only be simulated; live policy refusal occurs before an adapter is created.
Device inspection is restricted to compiled-in read-only probes.

The Galaxy XR procedure preserves the unproven `AYKE` (`U1`) to `AYIA` (`U1`)
rollback shape as disabled plan data, but execution stops at an evidence gate
before any write. Launch unlock eligibility is community-reported and requires
independent post-reboot lock-state observation in simulation. No Samsung
firmware, Odin command, package layout, or successful rollback is invented.
`U2` and later builds refuse the `U1` rollback without executing writes.
