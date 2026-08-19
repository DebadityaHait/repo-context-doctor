export type Provider = "codex" | "claude" | "cursor";
export type Modality = "must" | "should" | "never" | "info";
export type Source = { provider: Provider; path: string; scopeRoot: string; precedence: number; bytes: number; loadCondition?: string; directives: Directive[] };
export type Directive = { source: string; line: number; raw: string; normalized: string; subject: string; modality: Modality; scope?: string; confidence: number };
export type Finding = { id: string; severity: "error" | "warning" | "info"; message: string; nextAction: string; evidence: Array<{ path: string; line?: number }> };
export type GraphEdge = { from: string; to: string; relation: "loads" | "contains" | "overrides" };
export type Scan = { schemaVersion: 2; root: string; cwd: string; sources: Source[]; edges: GraphEdge[]; findings: Finding[]; contextBytes: Record<Provider, number>; confidence: number };
