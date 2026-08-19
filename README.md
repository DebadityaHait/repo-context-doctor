# Repo Context Doctor

[![npm version](https://img.shields.io/npm/v/repo-context-doctor?logo=npm)](https://www.npmjs.com/package/repo-context-doctor)
[![npm downloads](https://img.shields.io/npm/dm/repo-context-doctor?logo=npm)](https://www.npmjs.com/package/repo-context-doctor)
[![CI](https://img.shields.io/github/actions/workflow/status/DebadityaHait/repo-context-doctor/ci.yml?branch=main&logo=github)](https://github.com/DebadityaHait/repo-context-doctor/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/node/v/repo-context-doctor?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/npm/l/repo-context-doctor)](LICENSE)

Show the instruction graph your coding agents actually receive.

```bash
npx repo-context-doctor
npx repo-context-doctor --agent codex --cwd services/payments
npx repo-context-doctor graph --json > context.json
npx repo-context-doctor --sarif > context.sarif
```

The command discovers Codex `AGENTS.md`, Claude `CLAUDE.md`, and Cursor rules,
then reports effective sources, duplicate guidance, contradictory commands,
missing references, unsafe instructions, and context pressure. It is local,
deterministic, and read-only. Every finding includes a stable ID, source
location, and remediation.

Requires Node.js 20 or newer.

```bash
npm install
npm run lint
npm test
npm run test:cli
npm pack --dry-run
```

See [SECURITY.md](SECURITY.md) before sharing reports.

- [GitHub repository](https://github.com/DebadityaHait/repo-context-doctor)
- [npm package](https://www.npmjs.com/package/repo-context-doctor)

MIT © Debaditya Hait
