# Gitick - Desktop Task Manager

Gitick is a privacy-first, minimalist task manager inspired by developer workflows.

## Features

- Smart parsing (`!high`, `#work`, `today`)
- Focus mode timer
- Git-style completion history graph
- Local-first storage (`localStorage`)

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

## License

MIT
