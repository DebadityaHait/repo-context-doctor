import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { scan } from "../scan.js";
import { json } from "../report.js";
test("discovers providers and reports conflicts, missing scripts, and duplicates", async () => { const root = await mkdtemp(join(tmpdir(), "context-doctor-")); try { await mkdir(join(root, ".cursor/rules"), { recursive: true }); await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node test.js" } })); await writeFile(join(root, "AGENTS.md"), "Must use pnpm.\nRun npm run verify.\n"); await writeFile(join(root, "CLAUDE.md"), "Must use pnpm.\nRun npm run verify.\n"); await writeFile(join(root, ".cursor/rules/project.mdc"), "Must use npm.\n"); const result = await scan(root); assert.equal(result.sources.length, 3); assert.ok(result.findings.some((f) => f.id === "CTX001")); assert.ok(result.findings.some((f) => f.id === "CTX003")); assert.ok(result.findings.some((f) => f.id === "CTX004")); } finally { await rm(root, { recursive: true, force: true }); } });

test("discovers modern provider instruction files and optional ancestor context", async () => {
  const parent = await mkdtemp(join(tmpdir(), "context-doctor-parent-"));
  const root = join(parent, "repo");
  try {
    await mkdir(join(root, ".windsurf/rules"), { recursive: true });
    await mkdir(join(root, ".github"), { recursive: true });
    await writeFile(join(parent, "AGENTS.md"), "Always use npm.");
    await writeFile(join(root, "GEMINI.md"), "Prefer npm run test.");
    await writeFile(join(root, ".github/copilot-instructions.md"), "Always run npm test.");
    await writeFile(join(root, ".windsurfrules"), "Must keep checks enabled.");
    await writeFile(join(root, ".windsurf/rules/release.md"), "Must run npm run build.");
    const local = await scan(root);
    assert.deepEqual(new Set(local.sources.map((source) => source.provider)), new Set(["gemini", "copilot", "windsurf"]));
    const withGlobal = await scan(root, ".", undefined, { includeGlobal: true });
    assert.ok(withGlobal.sources.some((source) => source.path.replaceAll("\\", "/").endsWith("/AGENTS.md")));
  } finally { await rm(parent, { recursive: true, force: true }); }
});
test("does not print instruction bodies in JSON", async () => { const root = await mkdtemp(join(tmpdir(), "context-doctor-")); try { await writeFile(join(root, "AGENTS.md"), "The canary-secret must never appear in output.\n"); assert.doesNotMatch(json(await scan(root)), /canary-secret/); } finally { await rm(root, { recursive: true, force: true }); } });
