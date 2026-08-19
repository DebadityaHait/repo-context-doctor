# Changelog

## 0.3.0 - 2026-08-20

- Renamed the installed executables to `repo-context-doctor` and `rctx-doctor` to avoid colliding with the established `context-doctor` npm package.
- Added Gemini, GitHub Copilot, and Windsurf instruction sources, ancestor discovery, global-scope opt-in, and schema version 3.
- Fixed option parsing when `--agent` or `--cwd` is used without an explicit path.

## 0.2.0

- Added scope-aware discovery for local/override instruction files.
- Added a source graph with Mermaid output and versioned graph edges in JSON.
- Added strict CI mode and clearer provider precedence metadata.

## 0.1.0

- Initial public release with provider discovery, deterministic findings, JSON, and SARIF output.
