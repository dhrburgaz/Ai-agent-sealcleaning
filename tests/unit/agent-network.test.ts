import { describe, it, expect } from 'vitest';
import { AGENT_DEFINITIONS } from '@/lib/agents/definitions';
import { AGENT_GROUPS } from '@/lib/agents/agent-groups';

describe('Agent Network grouping (redesign instruction #7)', () => {
  it('covers all 20 agent definitions exactly once between the orbit groups and the center (agent01)', () => {
    const groupedKeys = Object.values(AGENT_GROUPS).flatMap((g) => g.agentKeys);
    const allKeys = ['agent01_orchestrator', ...groupedKeys];

    expect(AGENT_DEFINITIONS).toHaveLength(20);
    expect(allKeys).toHaveLength(20);
    expect(new Set(allKeys).size).toBe(20); // no duplicates

    const definedKeys = new Set(AGENT_DEFINITIONS.map((a) => a.key));
    for (const key of allKeys) {
      expect(definedKeys.has(key)).toBe(true);
    }
  });
});
