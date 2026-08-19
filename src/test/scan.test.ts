import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { scan } from "../scan.js";
import { json } from "../report.js";
test("discovers providers and reports conflicts, missing scripts, and duplicates", async () => { const root = await mkdtemp(join(tmpdir(), "context-doctor-")); try { await mkdir(join(root, ".cursor/rules"), { recursive: true }); await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node test.js" } })); await writeFile(join(root, "AGENTS.md"), "Must use pnpm.\nRun npm run verify.\n"); await writeFile(join(root, "CLAUDE.md"), "Must use pnpm.\nRun npm run verify.\n"); await writeFile(join(root, ".cursor/rules/project.mdc"), "Must use npm.\n"); const result = await scan(root); assert.equal(result.sources.length, 3); assert.ok(result.findings.some((f) => f.id === "CTX001")); assert.ok(result.findings.some((f) => f.id === "CTX003")); assert.ok(result.findings.some((f) => f.id === "CTX004")); } finally { await rm(root, { recursive: true, force: true }); } });
test("does not print instruction bodies in JSON", async () => { const root = await mkdtemp(join(tmpdir(), "context-doctor-")); try { await writeFile(join(root, "AGENTS.md"), "The canary-secret must never appear in output.\n"); assert.doesNotMatch(json(await scan(root)), /canary-secret/); } finally { await rm(root, { recursive: true, force: true }); } });
