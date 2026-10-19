# Obsidian Sports Plugin

An Obsidian plugin developed by [Trainvent](https://github.com/trainvent).

## Status

Early development. The plugin currently contains the Obsidian sample commands,
modal, ribbon icon, and settings tab. Sports-specific features are still to be built.
The sample also displays a notice on document clicks.

## Development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

The development build watches `src/` and writes `main.js` in this folder.
Reload Obsidian after changes and enable **Sports Plugin** under
**Settings → Community plugins**.

```sh
npm run build
npm run lint
```

GitHub Actions runs the build and lint checks on pushes and pull requests.

## Manual installation

Copy `main.js`, `manifest.json`, and `styles.css` into
`<vault>/.obsidian/plugins/obsidian-sports-plugin/`, then reload Obsidian.
The existing manifest ID, `sports-plugin`, is preserved to retain plugin identity.

## Releases

Update the version with `npm version patch`, `npm version minor`, or
`npm version major`. The version script updates `manifest.json` and `versions.json`.
Push the commit and its version tag to GitHub. Tags must match the manifest version
exactly, without a `v` prefix; for example, `1.0.1`.
The release workflow builds the plugin and creates a draft release containing
`main.js`, `manifest.json`, and `styles.css`. Review and publish the draft on GitHub.

## Privacy

The current sample implementation runs locally and makes no external service calls.
Local plugin settings (`data.json`), dependencies, environment files, and compiled
output are excluded from version control.

## License and attribution

Based on the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).
The original copyright notice and 0-BSD license are retained in [LICENSE](LICENSE).
