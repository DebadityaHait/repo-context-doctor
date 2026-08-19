import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Directive, Finding, GraphEdge, Provider, Scan, Source } from "./model.js";

const ignored = new Set([".git", "node_modules", "dist", "build", "coverage"]);
const names = new Map<string, Provider>([["AGENTS.md", "codex"], ["AGENTS.override.md", "codex"], ["CLAUDE.md", "claude"], ["CLAUDE.local.md", "claude"], [".cursorrules", "cursor"]]);
const limits: Record<Provider, number> = { codex: 32_000, claude: 64_000, cursor: 64_000 };

async function walk(root: string, dir = root, result: string[] = []): Promise<string[]> {
  let entries; try { entries = await readdir(dir, { withFileTypes: true }); } catch { return result; }
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(root, full, result);
    else if (entry.isFile() && (names.has(entry.name) || (entry.name.endsWith(".mdc") && full.replaceAll("\\", "/").includes("/.cursor/")))) result.push(full.slice(root.length + 1).replaceAll("\\", "/"));
  }
  return result;
}

const normalize = (raw: string) => raw.toLowerCase().replace(/[`*_#]/g, "").replace(/\s+/g, " ").trim();
function directives(text: string, path: string): Directive[] {
  return text.split(/\r?\n/).flatMap((raw, i) => {
    const trimmed = raw.trim(); if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("---") || trimmed.startsWith("```") || trimmed.startsWith("-") || trimmed.startsWith("*")) return [];
    const normalized = normalize(trimmed);
    const modality: Directive["modality"] = /^(never|do not|don't)\b/i.test(trimmed) ? "never" : /^(must|required|always)\b/i.test(trimmed) ? "must" : /^(should|prefer)\b/i.test(trimmed) ? "should" : "info";
    const subject = /\b(?:use|run|keep|write|format|test|install|never)\s+([^,.;]+)/i.exec(trimmed)?.[1]?.trim().toLowerCase() ?? normalized.slice(0, 80);
    return [{ source: path, line: i + 1, raw: trimmed, normalized, subject, modality, scope: path.includes(".cursor/") ? "cursor-rule" : undefined, confidence: modality === "info" ? 0.5 : 0.9 }];
  });
}
function provider(path: string): Provider { return path.includes(".cursor/") || path.endsWith(".cursorrules") ? "cursor" : path.endsWith("CLAUDE.md") || path.endsWith("CLAUDE.local.md") ? "claude" : "codex"; }
function inScope(file: string, cwd: string): boolean { const scope = cwd.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, ""); if (!scope || scope === ".") return true; const dir = file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : "."; return file.startsWith(`${scope}/`) || scope === dir || scope.startsWith(`${dir}/`) || file.includes(".cursor/"); }
function conflictFindings(sources: Source[]): Finding[] { const out: Finding[] = []; const candidates = sources.flatMap((source) => source.directives.map((directive) => ({ source, directive }))).filter(({ directive }) => directive.confidence >= 0.8); for (const category of ["pnpm", "npm", "yarn", "bun", "npm test", "pnpm test", "yarn test", "npm run build", "pnpm build", "prettier", "eslint"]) { const matches = candidates.filter(({ directive }) => directive.normalized.includes(category)); const families = new Set(matches.map(({ directive }) => directive.normalized.replace(/\b(?:use|run|always|must|should|prefer)\b/g, "").trim())); if (families.size > 1 && matches.length > 1) out.push({ id: "CTX001", severity: "error", message: `Conflicting project guidance mentions ${category}.`, nextAction: "Choose one effective command and remove or scope the contradictory directive.", evidence: matches.map(({ directive }) => ({ path: directive.source, line: directive.line })) }); } return out; }
async function referenceFindings(root: string, sources: Source[]): Promise<Finding[]> { const out: Finding[] = []; let pkg: { scripts?: Record<string, string> } = {}; try { pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as typeof pkg; } catch { /* optional */ } for (const source of sources) for (const directive of source.directives) { const script = /npm\s+run\s+([\w:-]+)/i.exec(directive.raw)?.[1]; if (script && !pkg.scripts?.[script]) out.push({ id: "CTX003", severity: "warning", message: `Instruction references missing package script: ${script}.`, nextAction: "Add the script or update the instruction.", evidence: [{ path: directive.source, line: directive.line }] }); const ref = /(?:^|\s)([\w./-]+\.(?:md|json|ts|js|yml|yaml))(?:\s|$|[),])/i.exec(directive.raw)?.[1]; if (ref && !await stat(join(root, ref)).then(() => true).catch(() => false)) out.push({ id: "CTX002", severity: "warning", message: `Instruction references a path that does not exist: ${ref}.`, nextAction: "Correct the path or remove the stale reference.", evidence: [{ path: directive.source, line: directive.line }] }); if (/rm\s+-rf|dangerously|disable\s+(?:all\s+)?safety|print\s+(?:the\s+)?secret/i.test(directive.raw)) out.push({ id: "CTX008", severity: "warning", message: "Instruction contains a potentially unsafe command or secret-handling directive.", nextAction: "Replace it with a narrowly scoped, reviewable instruction.", evidence: [{ path: directive.source, line: directive.line }] }); } return out; }
function duplicateFindings(sources: Source[]): Finding[] { const map = new Map<string, Array<{ path: string; line?: number }>>(); for (const source of sources) for (const directive of source.directives) map.set(directive.normalized, [...(map.get(directive.normalized) ?? []), { path: directive.source, line: directive.line }]); return [...map.values()].filter((evidence) => evidence.length > 1).map((evidence) => ({ id: "CTX004", severity: "info" as const, message: "The same directive is loaded from multiple instruction sources.", nextAction: "Keep one canonical directive or scope the copies intentionally.", evidence })); }

export async function scan(root: string, cwd = ".", agent?: Provider): Promise<Scan> {
  const files = await walk(root); const sources: Source[] = [];
  for (const file of files) { const p = provider(file); if (agent && p !== agent) continue; if (!inScope(file, cwd)) continue; const content = await readFile(join(root, file), "utf8"); sources.push({ provider: p, path: file, scopeRoot: file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : ".", precedence: file.split("/").length, bytes: Buffer.byteLength(content), loadCondition: file.endsWith(".mdc") ? "cursor-rule" : file.endsWith(".local.md") || file.endsWith(".override.md") ? "local-override" : "always", directives: directives(content, file) }); }
  const edges: GraphEdge[] = []; for (const source of sources) { edges.push({ from: source.provider, to: source.path, relation: "loads" }); for (const directive of source.directives.slice(0, 200)) edges.push({ from: source.path, to: `${source.path}:${directive.line}`, relation: "contains" }); }
  for (const left of sources) for (const right of sources) if (left !== right && left.provider === right.provider && right.scopeRoot.startsWith(left.scopeRoot === "." ? "" : `${left.scopeRoot}/`)) edges.push({ from: left.path, to: right.path, relation: "overrides" });
  const findings = [...conflictFindings(sources), ...duplicateFindings(sources), ...await referenceFindings(root, sources)]; const contextBytes: Record<Provider, number> = { codex: 0, claude: 0, cursor: 0 }; for (const source of sources) contextBytes[source.provider] += source.bytes;
  for (const p of ["codex", "claude", "cursor"] as const) if (contextBytes[p] > limits[p] * 0.8) findings.push({ id: "CTX005", severity: "warning", message: `${p} instruction context is near its configured budget.`, nextAction: "Remove duplicated guidance or split provider-specific rules.", evidence: sources.filter((s) => s.provider === p).map((s) => ({ path: s.path })) });
  const unique = new Map<string, Finding>(); for (const f of findings) unique.set(`${f.id}:${f.evidence.map((e) => `${e.path}:${e.line ?? 0}`).join(",")}`, f); const all = [...unique.values()];
  return { schemaVersion: 2, root, cwd, sources, edges, findings: all, contextBytes, confidence: Math.max(0, 100 - all.filter((f) => f.severity === "error").length * 20 - all.filter((f) => f.severity === "warning").length * 5) };
}
