# Turborepo watchUsingTaskInputs persistent task repro

Minimal reproduction for a `turbo watch` issue with `watchUsingTaskInputs`, `persistent`, and `interruptible` tasks.

## Expected model

- `demo#dev` starts once and stays alive.
- Changes in `apps/demo/src/**` are handled by the dev process itself.
- `turbo watch` should not stop or restart `demo#dev` for app source changes, because app source is not part of `dev.inputs`.
- Changes in workspace dependencies, for example `packages/framework/src/**`, should rebuild `^build` and restart `demo#dev`.

## Relevant config

```json
{
  "futureFlags": {
    "watchUsingTaskInputs": true
  },
  "tasks": {
    "dev": {
      "dependsOn": ["^build"],
      "inputs": ["dev.config.json"],
      "cache": false,
      "persistent": true,
      "interruptible": true
    }
  }
}
```

`apps/demo/src/app-source.txt` is intentionally not in `demo#dev.inputs`.

## Setup

```bash
cd reproductions/turbo-watch-persistent-inputs
pnpm install
pnpm turbo run dev --filter=demo --dry=json
```

In the dry-run output, `demo#dev.inputs` should contain only:

- `dev.config.json`
- `package.json`

It should not contain `src/app-source.txt`.

## Automated repro

```bash
pnpm run repro
```

The script:

1. Starts `turbo watch dev --filter=demo`.
2. Waits for `[demo-dev] DEV_READY`.
3. Appends to `apps/demo/src/app-source.txt`.
4. Checks whether the dev process receives `SIGINT` or port `41731` closes.

Expected output:

```text
[demo-dev] APP_SOURCE_CHANGED ...
[repro] dev server stayed alive after app source change
```

Actual buggy output:

```text
[demo-dev] DEV_SIGNAL signal=SIGINT
[repro] BUG REPRODUCED: dev task was interrupted after app source change.
```

## Manual repro

Terminal 1:

```bash
pnpm run dev
```

Wait for:

```text
[demo-dev] DEV_READY pid=... port=41731
```

Terminal 2:

```bash
pnpm run change:app
curl http://localhost:41731
```

Expected:

- `demo:dev` logs `[demo-dev] APP_SOURCE_CHANGED ...`.
- `curl` still succeeds.
- `turbo watch` remains alive.
- `demo#dev` is not interrupted.

Actual buggy behavior:

- `demo:dev` logs `[demo-dev] DEV_SIGNAL signal=SIGINT`.
- Port `41731` closes.
- `turbo watch` remains alive.
- `demo#dev` is not restarted.

## Control case

Framework dependency changes should restart the dev task:

```bash
pnpm run change:framework
```

That change affects `packages/framework`, so `^build` should rerun and `demo#dev` should restart.

## Environment where this was observed

- `turbo`: `2.9.18`
- `pnpm`: `11.8.0`
- macOS

