/**
 * Section 47 — Orchestration Events. A minimal, in-process, synchronous pub/sub
 * bus. At single-owner scale there is no need for a background queue — each
 * event's handlers run (awaited, in registration order) within the same
 * request that emitted it, which keeps the mental model simple and the audit
 * trail (agent_runs) trustworthy (no "fire and forget" gap).
 *
 * Deliberately additive: existing Phase 1-3 Server Actions keep their current
 * direct calls to lib/crm, lib/pricing, etc. New code should prefer emitting
 * an event over calling handlers directly, so behavior stays observable and
 * composable, but nothing here rewires or risks the already-shipped flows.
 */

export interface OrchestrationEventMap {
  'lead.created': { leadId: string };
  'message.received': { leadId: string; threadId: string; messageId: string };
  'photo.added': { leadId: string; attachmentId: string; imageHash: string };
  'scope.changed': { leadId: string; scopeId?: string; estimateId?: string };
  'quote.approved': { leadId: string; quoteId: string };
  'job.completed': { leadId: string; jobId: string };
}

export type OrchestrationEventType = keyof OrchestrationEventMap;

type Handler<K extends OrchestrationEventType> = (
  payload: OrchestrationEventMap[K],
) => void | Promise<void>;

class EventBus {
  private handlers: { [K in OrchestrationEventType]?: Handler<K>[] } = {};

  on<K extends OrchestrationEventType>(type: K, handler: Handler<K>): void {
    const list = (this.handlers[type] ??= []) as Handler<K>[];
    list.push(handler);
  }

  /** Handlers run sequentially and their errors are collected, not thrown —
   *  one failing handler must never prevent the others from running or crash
   *  the request that emitted the event. */
  async emit<K extends OrchestrationEventType>(
    type: K,
    payload: OrchestrationEventMap[K],
  ): Promise<{ handled: number; errors: Error[] }> {
    const list = (this.handlers[type] ?? []) as Handler<K>[];
    const errors: Error[] = [];
    for (const handler of list) {
      try {
        await handler(payload);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    return { handled: list.length, errors };
  }

  /** Test/inspection helper. */
  listenerCount(type: OrchestrationEventType): number {
    return this.handlers[type]?.length ?? 0;
  }

  /** Test helper — clears all registered handlers. */
  reset(): void {
    this.handlers = {};
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __beyzaEventBus: EventBus | undefined;
}

// Reuse a single bus instance across Next.js hot reloads, same pattern as db/client.ts.
export const eventBus = globalThis.__beyzaEventBus ?? new EventBus();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__beyzaEventBus = eventBus;
}
