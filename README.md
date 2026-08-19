# Repo Context Doctor

[![npm version](https://img.shields.io/npm/v/repo-context-doctor?logo=npm)](https://www.npmjs.com/package/repo-context-doctor)
[![npm downloads](https://img.shields.io/npm/dm/repo-context-doctor?logo=npm)](https://www.npmjs.com/package/repo-context-doctor)
[![CI](https://github.com/DebadityaHait/repo-context-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/DebadityaHait/repo-context-doctor/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/node/v/repo-context-doctor)](https://nodejs.org/)
[![License](https://img.shields.io/npm/l/repo-context-doctor)](./LICENSE)

See the instruction surface a coding agent actually inherits from a repository.

```console
$ npx repo-context-doctor check .
Repo Context Doctor

Sources: 7  |  Codex 2  |  Claude 3  |  Cursor 2
Findings: 2  |  Confidence: 91/100

WARNING CTX002  CLAUDE.md references missing docs/release.md
ERROR   CTX001  project guidance disagrees about the package manager
```

## Why this exists

Rule generators such as [Rulesync](https://github.com/dyoshikawa/rulesync) create or synchronize files. Context packers such as [Repomix](https://github.com/yamadashy/repomix) assemble code for model input. Repo Context Doctor answers a different question: which instruction files are in scope, what loads them, and where the guidance is contradictory or stale?

It is a read-only linter and graph inspector. It does not rewrite rules, call an LLM, or upload repository content.

## What it understands

| Provider | Files discovered | Scope metadata |
| --- | --- | --- |
| OpenAI Codex | `AGENTS.md`, `AGENTS.override.md` | repository and nested directory scope |
| Claude Code | `CLAUDE.md`, `CLAUDE.local.md` | user/project/local-style overrides |
| Cursor | `.cursorrules`, `.cursor/rules/**/*.mdc` | rule source and cursor activation marker |

The file names and scope model follow the providers’ published configuration conventions: [Claude settings and precedence](https://code.claude.com/docs/en/settings), [Cursor rules](https://docs.cursor.com/en/cli/using), and the [Agent Skills/instruction ecosystem](https://github.com/agentskills/agentskills).

## Checks and outputs

- `CTX001` contradictory commands or tool guidance
- `CTX002` references to files that do not exist
- `CTX003` references to missing `npm run` scripts
- `CTX004` duplicated directives loaded from multiple sources
- `CTX005` context budget pressure
- `CTX008` risky destructive or secret-handling guidance
- source-to-rule graph edges, scope, precedence, and load conditions
- terminal, redacted JSON, SARIF 2.1.0, and Mermaid graph output

```bash
# Human report; exits 1 for errors/warnings
npx repo-context-doctor check .

# Inspect only Codex guidance for a nested service
npx repo-context-doctor check . --agent codex --cwd services/payments

# CI-friendly machine output
npx repo-context-doctor check . --json > context.json
npx repo-context-doctor check . --sarif > context.sarif

# Visualize the source graph in Mermaid-compatible tooling
npx repo-context-doctor graph . --mermaid > context.mmd

# Make warnings blocking in a stricter repository gate
npx repo-context-doctor check . --strict
```

JSON is schema-versioned and omits instruction bodies. SARIF locations point back to the source file and line so a pull request reviewer can fix the real rule rather than a generated copy.

## Exit codes

| Code | Meaning |
| ---: | --- |
| `0` | clean report, or graph generation |
| `1` | actionable finding (or warning under `--strict`) |
| `3` | scanner/tool failure |

## Deliberate limits

This tool reports declared instruction files; it cannot prove how a closed-source agent will interpret ambiguous prose or undocumented precedence. It does not replace provider-native diagnostics or permission controls. Review `SECURITY.md` before sharing a report.

## Install as a library

```bash
npm install repo-context-doctor
```

```ts
import { scan } from "repo-context-doctor";
const result = await scan(process.cwd());
```

Requires Node.js 20 or newer. MIT licensed.
