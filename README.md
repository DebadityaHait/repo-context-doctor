# Repo Context Doctor

[![npm version](https://img.shields.io/npm/v/repo-context-doctor?logo=npm)](https://www.npmjs.com/package/repo-context-doctor)
[![CI](https://github.com/DebadityaHait/repo-context-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/DebadityaHait/repo-context-doctor/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/node/v/repo-context-doctor)](https://nodejs.org/)
[![License](https://img.shields.io/npm/l/repo-context-doctor)](./LICENSE)

Map the instruction files a coding agent can inherit, then find conflicts, stale references, duplicated rules, unsafe guidance, and context pressure before they change agent behavior.

Repo Context Doctor is a read-only repository linter and graph inspector. It does not generate rules, package a codebase, call an LLM, or upload source content. That boundary is intentional: [Rulesync](https://github.com/dyoshikawa/rulesync) synchronizes agent configuration, [Repomix](https://github.com/yamadashy/repomix) packages repositories for model input, and [DheerG/context-doctor](https://github.com/DheerG/context-doctor) provides interactive context diagnosis. This tool verifies the instruction surface itself.

> The executable is named `repo-context-doctor` (or `rctx-doctor`) to avoid colliding with the established [`context-doctor`](https://www.npmjs.com/package/context-doctor) package, which profiles and optimizes LLM conversation windows.

## Install

```bash
npm install --save-dev repo-context-doctor
npx repo-context-doctor check .
```

Node.js 20 or newer is required.

## What it discovers

| Ecosystem | Sources | Activation evidence |
| --- | --- | --- |
| OpenAI Codex | `AGENTS.md`, `AGENTS.override.md` | repository and nested-directory scope |
| Claude Code | `CLAUDE.md`, `CLAUDE.local.md` | project/local-style override layers |
| Cursor | `.cursorrules`, `.cursor/rules/**/*.mdc` | rule files and Cursor rule scope |
| Gemini CLI | `GEMINI.md` | project and ancestor files |
| GitHub Copilot | `.github/copilot-instructions.md` | repository instruction file |
| Windsurf | `.windsurfrules`, `.windsurf/rules/**/*.md` | rule files and rule scope |

Use `--include-global` to include ancestor files above the project root. Without it, scanning stays inside the selected repository.

## Checks

- `CTX001` contradictory package-manager, test, lint, or build guidance
- `CTX002` references to missing files
- `CTX003` missing `npm run` scripts
- `CTX004` duplicated directives loaded from multiple sources
- `CTX005` provider context approaching its configured budget
- `CTX008` unsafe shell, secret-handling, or safety-bypass guidance

Every finding includes evidence paths and line numbers. JSON redacts directive bodies; SARIF points back to source files; Mermaid shows provider-to-source and override relationships.

## Commands

```bash
# Human report; exits 1 for errors
npx repo-context-doctor check .

# Inspect a nested service and one provider
npx repo-context-doctor check . --cwd services/payments --agent codex

# Include ancestor instruction files explicitly
npx repo-context-doctor check . --include-global --json > context-report.json

# Pull-request annotations and graph visualization
npx repo-context-doctor check . --sarif > context.sarif
npx repo-context-doctor graph . --mermaid > context.mmd

# Treat warnings as blocking in a strict CI gate
npx repo-context-doctor check . --strict
```

Exit codes are `0` for a clean report, `1` for an actionable finding (or a warning under `--strict`), and `3` when the scanner cannot complete. The JSON schema is versioned and contains no instruction bodies.

## Library API

```ts
import { scan } from "repo-context-doctor";

const report = await scan(process.cwd(), ".", undefined, { includeGlobal: true });
console.log(report.sources, report.findings, report.edges);
```

## Privacy and limits

- Offline and read-only; no subprocesses, model calls, network access, or file writes.
- Source paths, line numbers, normalized metadata, and graph edges are retained; instruction bodies are omitted from JSON reports.
- Natural-language interpretation and undocumented provider precedence cannot be proven statically.
- Findings are evidence for review, not a guarantee of what a closed-source agent will do.

## Development

```bash
npm install
npm run lint
npm test
npm run test:cli
npm pack --dry-run
```

Issues and pull requests are welcome in the [GitHub repository](https://github.com/DebadityaHait/repo-context-doctor).

## License

MIT © Debaditya Hait
