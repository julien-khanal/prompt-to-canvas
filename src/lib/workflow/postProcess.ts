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
 * Run all generator post-processors in dependency order.
 * Caller passes the freshly parsed workflow; the returned object is what
 * the client / canvas mapper sees.
 *
 * Note: an earlier dedupCriticOutputEdges() ran here that dropped the
 * direct bild-X → final edge whenever a bild-X → critic-X → final
 * triangle existed. Removed because the user couldn't see the data flow
 * — visually the image source vanished. The runtime now dedupes
 * collection in gatherInputs() instead, so we keep both visual edges
 * AND avoid double-counting images.
 */
export function applyGeneratorPolicies(wf: Workflow): Workflow {
  return applyImagePromptPurity(wf);
}
