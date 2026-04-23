import type { Workflow, WfNode } from "./schema";

/**
 * Tool-policy post-processors run after the generator emits a workflow and
 * BEFORE it's returned to the client. They enforce structural invariants
 * the LLM cannot be trusted to apply consistently — purity of image-feeding
 * prompts, edge minimality, etc.
 *
 * Each transform is pure (returns a new workflow) and idempotent (running
 * it twice has the same effect as running it once).
 */

export const PURITY_PREAMBLE = `OUTPUT-ONLY (PROMPT-CANVAS POLICY, OVERRIDES ACTIVE SKILLS):
You are emitting text that will be substituted verbatim into a downstream
imageGen node's prompt. Your entire reply must be the cleaned image-
generation prompt as a single English flowing paragraph (≤280 words).
NO Markdown headers, NO score sections, NO audit lists, NO German preamble,
NO quotes around the prompt, NO commentary before or after. Apply any
active-skill checklists as INTERNAL evaluation criteria — never as visible
output structure. The first character of your reply is the first character
of the image prompt.`;

/**
 * For every prompt-node whose output is consumed by an imageGen node via
 * "{{<id>}}" placeholder, prepend the purity preamble to its systemPrompt.
 *
 * Detection: an edge from prompt-node `P` to imageGen `G` AND `G.config.prompt`
 * literally contains "{{<P.id>}}". The edge alone isn't enough — Cowork
 * sometimes wires an extra context-edge that doesn't actually substitute.
 */
export function applyImagePromptPurity(wf: Workflow): Workflow {
  const nodesById = new Map(wf.nodes.map((n) => [n.id, n]));
  const nodesNeedingPurity = new Set<string>();

  for (const edge of wf.edges) {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    if (!source || !target) continue;
    if (source.type !== "prompt") continue;
    if (target.type !== "imageGen") continue;
    const placeholder = `{{${source.id}}}`;
    if (target.config.prompt.includes(placeholder)) {
      nodesNeedingPurity.add(source.id);
    }
  }

  if (nodesNeedingPurity.size === 0) return wf;

  const nodes: WfNode[] = wf.nodes.map((n) => {
    if (n.type !== "prompt" || !nodesNeedingPurity.has(n.id)) return n;
    const existing = n.config.systemPrompt?.trim() ?? "";
    // Idempotent: don't re-prepend if our preamble is already present.
    if (existing.startsWith(PURITY_PREAMBLE)) return n;
    const merged = existing
      ? `${PURITY_PREAMBLE}\n\n${existing}`
      : PURITY_PREAMBLE;
    return {
      ...n,
      config: { ...n.config, systemPrompt: merged },
    };
  });

  return { nodes, edges: wf.edges };
}

/**
 * Drop redundant edges to terminal sinks when an intermediate critic node
 * already routes the same upstream artifact.
 *
 * Pattern: if the graph contains both
 *   bild-X → critic-X → final
 *   bild-X → final          (redundant)
 * then `bild-X → final` is removed. The critic's iteration is the
 * authoritative final state; routing the pre-iteration image to the same
 * sink either misleads (shows pre-critic artifact) or duplicates.
 *
 * Idempotent.
 */
export function dedupCriticOutputEdges(wf: Workflow): Workflow {
  const nodesById = new Map(wf.nodes.map((n) => [n.id, n]));
  const edgesToDrop = new Set<number>();

  for (let i = 0; i < wf.edges.length; i++) {
    const edge = wf.edges[i];
    const sink = nodesById.get(edge.target);
    if (!sink || sink.type !== "output") continue;

    // Look for: edge.source -> some critic node -> edge.target
    const hasCriticBypass = wf.edges.some((e1) => {
      if (e1.source !== edge.source) return false;
      const intermediate = nodesById.get(e1.target);
      if (!intermediate || intermediate.type !== "critic") return false;
      return wf.edges.some(
        (e2) => e2.source === intermediate.id && e2.target === edge.target
      );
    });
    if (hasCriticBypass) {
      edgesToDrop.add(i);
    }
  }

  if (edgesToDrop.size === 0) return wf;
  return {
    nodes: wf.nodes,
    edges: wf.edges.filter((_, i) => !edgesToDrop.has(i)),
  };
}

/**
 * Run all generator post-processors in dependency order.
 * Caller passes the freshly parsed workflow; the returned object is what
 * the client / canvas mapper sees.
 */
export function applyGeneratorPolicies(wf: Workflow): Workflow {
  return dedupCriticOutputEdges(applyImagePromptPurity(wf));
}
