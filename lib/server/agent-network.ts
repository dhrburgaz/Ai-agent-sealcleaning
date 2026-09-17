/**
 * Agent Network visualization data (redesign instruction #7). Derives each
 * of the exactly-20 agents' current visual state from real `agent_runs`
 * rows — never a decorative/fake "always busy" simulation. With no runs at
 * all yet (a brand-new install), every agent honestly shows "idle", not a
 * fabricated flurry of activity.
 */
import { desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { agentRuns } from '@/db/schema';
import { AGENT_DEFINITIONS, type AgentDefinition } from '@/lib/agents/definitions';

export type AgentNetworkState = 'idle' | 'working' | 'waiting' | 'blocked' | 'error';

export interface AgentNetworkNode {
  definition: AgentDefinition;
  state: AgentNetworkState;
  lastRun: {
    createdAt: Date;
    triggeredBy: string | null;
    status: string;
    outputSummary: Record<string, unknown> | null;
    confidence: number | null;
    provider: string;
    modelCostEur: number;
    cacheHit: boolean;
  } | null;
}

const RECENT_WORKING_WINDOW_MS = 60_000;

function deriveState(run: AgentNetworkNode['lastRun']): AgentNetworkState {
  if (!run) return 'idle';
  if (run.status === 'failed') return 'error';
  if (run.status === 'blocked') return 'blocked';

  const out = run.outputSummary ?? {};
  if (out.blocked === true) return 'waiting';
  if (out.sent === false && 'sent' in out) return 'waiting';

  if (Date.now() - run.createdAt.getTime() < RECENT_WORKING_WINDOW_MS) return 'working';
  return 'idle';
}

export async function buildAgentNetwork(): Promise<AgentNetworkNode[]> {
  const allRuns = await db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt));
  const latestByAgent = new Map<string, (typeof allRuns)[number]>();
  for (const run of allRuns) {
    if (!latestByAgent.has(run.agentKey)) latestByAgent.set(run.agentKey, run);
  }

  return AGENT_DEFINITIONS.map((definition) => {
    const run = latestByAgent.get(definition.key);
    const lastRun = run
      ? {
          createdAt: run.createdAt,
          triggeredBy: run.triggeredBy,
          status: run.status,
          outputSummary: run.outputSummary,
          confidence: run.confidence,
          provider: run.provider,
          modelCostEur: run.modelCostEur ?? 0,
          cacheHit: run.cacheHit,
        }
      : null;
    return { definition, lastRun, state: deriveState(lastRun) };
  });
}
