{
  description = "Reproducible CLI and web builds for mura-flash";

  inputs = {
    self.submodules = true;

    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

    pyproject-nix = {
      url = "github:pyproject-nix/pyproject.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    uv2nix = {
      url = "github:pyproject-nix/uv2nix";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.pyproject-nix.follows = "pyproject-nix";
    };

    pyproject-build-systems = {
      url = "github:pyproject-nix/build-system-pkgs";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.uv2nix.follows = "uv2nix";
    };

    fastboot-js = {
      url = "github:GrapheneOS/fastboot.js/ffe7e270061b95fe0f0f3abd1aa7d3c28999d1d9";
      flake = false;
    };
  };

  outputs =
    inputs@{
      self,
      nixpkgs,
      flake-utils,
      pyproject-nix,
      uv2nix,
      pyproject-build-systems,
      fastboot-js,
      ...
    }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      workspace = uv2nix.lib.workspace.loadWorkspace { workspaceRoot = self; };
    in
    flake-utils.lib.eachSystem systems (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        inherit (pkgs) lib;

        python = pkgs.python313;
        pythonBase = pkgs.callPackage pyproject-nix.build.packages { inherit python; };
        pythonSet = pythonBase.overrideScope (
          lib.composeManyExtensions [
            pyproject-build-systems.overlays.wheel
            (workspace.mkPyprojectOverlay { sourcePreference = "wheel"; })
          ]
        );
        cli = pythonSet.mkVirtualEnv "mura-flash-env" workspace.deps.default;
        devPython = pythonSet.mkVirtualEnv "mura-flash-dev-env" workspace.deps.all;

        nodejs = pkgs.nodejs_24;
        buildNpmPackage = pkgs.buildNpmPackage.override { inherit nodejs; };
        npmDeps = pkgs.importNpmLock { npmRoot = self; };
        nodeModules = pkgs.importNpmLock.buildNodeModules {
          npmRoot = self;
          inherit nodejs;
        };
        npmCommon = {
          pname = "mura-flash-web";
          version = "0.0.0";
          src = self;
          inherit npmDeps;
          npmConfigHook = pkgs.importNpmLock.npmConfigHook;
        };

        web = buildNpmPackage (
          npmCommon
          // {
            npmBuildScript = "build";
            installPhase = ''
              runHook preInstall
              mkdir -p "$out"
              cp -r dist ${self}/contracts ${self}/recipes "$out/"
              runHook postInstall
            '';
          }
        );

        pythonCheck =
          name: command:
          pkgs.runCommand "mura-flash-${name}"
            {
              nativeBuildInputs = [ devPython ];
            }
            ''
              cp -r ${self} source
              chmod -R u+w source
              cd source
              unset PYTHONPATH
              ${command}
              touch "$out"
            '';
      in
      {
        packages = {
          default = cli;
          mura-flash = cli;
          inherit web;
        };

        apps = {
          default = {
            type = "app";
            program = "${cli}/bin/mura-flash";
          };
          mura-flash = {
            type = "app";
            program = "${cli}/bin/mura-flash";
          };
        };

        checks = {
          pytest = pythonCheck "pytest" "pytest";
          mypy = pythonCheck "mypy" "mypy";
          ruff = pythonCheck "ruff" ''
            ruff check src tests/python tools
            ruff format --check src tests/python tools
          '';

          catalog =
            pkgs.runCommand "mura-flash-catalog-check"
              {
                nativeBuildInputs = [ python ];
              }
              ''
                cp -r ${self} source
                chmod -R u+w source
                cd source
                python tools/generate_catalog.py --check
                touch "$out"
              '';

          web = buildNpmPackage (
            npmCommon
            // {
              npmBuildScript = "check";
              postBuild = ''
                diff -ru ${self}/dist dist
              '';
              installPhase = ''
                touch "$out"
              '';
            }
          );

          submodule =
            pkgs.runCommand "mura-flash-submodule-check"
              {
                nativeBuildInputs = [ pkgs.diffutils ];
              }
              ''
                diff -qr --exclude=.git ${fastboot-js} ${self}/vendor/fastboot.js
                touch "$out"
              '';

          uv-lock =
            pkgs.runCommand "mura-flash-uv-lock-check"
              {
                nativeBuildInputs = [
                  pkgs.uv
                  python
                ];
                UV_NO_SYNC = "1";
                UV_PYTHON = python.interpreter;
                UV_PYTHON_DOWNLOADS = "never";
              }
              ''
                cp ${self}/pyproject.toml ${self}/uv.lock .
                export HOME="$TMPDIR/home"
                mkdir -p "$HOME"
                uv lock --check --offline
                touch "$out"
              '';
        };

        formatter = pkgs.nixfmt;

        devShells.default = pkgs.mkShell {
          packages = [
            devPython
            pkgs.uv
            nodejs
            pkgs.android-tools
          ];
          env = {
            UV_NO_SYNC = "1";
            UV_PYTHON = python.interpreter;
            UV_PYTHON_DOWNLOADS = "never";
          };
          shellHook = ''
            unset PYTHONPATH
            if [ ! -e node_modules ]; then
              ln -s ${nodeModules}/node_modules node_modules
            fi
          '';
        };
      }
    );
}
