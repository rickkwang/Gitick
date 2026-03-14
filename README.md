# Gitick - Desktop Task Manager

Gitick is a privacy-first, minimalist task manager inspired by developer workflows.

## Features

- Smart parsing (`!high`, `#work`, `today`)
- Focus mode timer
- Git-style completion history graph
- Local-first storage (`localStorage`)

## Architecture

- `App.tsx`: application shell + core state orchestration
- `components/`: UI building blocks (sidebar, task list, focus mode, graph)
- `utils/`: pure utilities (task sanitize/view/date/storage)
- `hooks/`: runtime hooks (desktop updater bridge)
- `electron/`: main/preload process for desktop runtime
- `scripts/`: release verification and publishing scripts

## Development

```bash
npm install
npm run dev
```

## Desktop (Electron)

### Run desktop dev mode

```bash
npm run desktop:dev
```

### Build macOS packages

```bash
npm run desktop:dmg
```

### Publish release with updater artifacts

```bash
npm run desktop:release
```

This publishes the required updater assets:

- `Gitick-<version>-arm64.dmg`
- `Gitick-<version>-arm64.dmg.blockmap`
- `Gitick-<version>-arm64.zip`
- `Gitick-<version>-arm64.zip.blockmap`
- `Gitick-<version>-x64.dmg`
- `Gitick-<version>-x64.dmg.blockmap`
- `Gitick-<version>-x64.zip`
- `Gitick-<version>-x64.zip.blockmap`
- `latest-mac.yml`

## Quality Gates

```bash
npm run typecheck
npm run build
npm run ci:local
```

## macOS Updater Troubleshooting

- Install Gitick under `/Applications` before using in-app update.
- If app is translocated (`AppTranslocation` path), move it to `/Applications` and reopen.
- Ensure release artifacts include both `dmg` and `zip` + blockmaps + `latest-mac.yml`.
- If signature checks fail, rebuild/re-sign before publishing.

## Package Manager Policy

- Primary package manager: **npm**
- Lockfile policy: keep `package-lock.json` as source of truth
- `bun.lock` is ignored to avoid mixed-lock drift

## License

MIT
