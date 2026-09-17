import { describe, it, expect, beforeEach } from 'vitest';
import { eventBus } from '@/lib/orchestration/events';

describe('orchestration event bus (section 47)', () => {
  beforeEach(() => {
    eventBus.reset();
  });

  it('runs registered handlers for the emitted event type', async () => {
    let received: unknown = null;
    eventBus.on('lead.created', (payload) => {
      received = payload;
    });

    const result = await eventBus.emit('lead.created', { leadId: 'lead-1' });

    expect(received).toEqual({ leadId: 'lead-1' });
    expect(result.handled).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('never wakes handlers registered for a different event type', async () => {
    let calls = 0;
    eventBus.on('lead.created', () => {
      calls += 1;
    });

    await eventBus.emit('quote.approved', { leadId: 'lead-1', quoteId: 'quote-1' });

    expect(calls).toBe(0);
  });

  it('runs multiple handlers for the same event in registration order', async () => {
    const order: number[] = [];
    eventBus.on('scope.changed', () => {
      order.push(1);
    });
    eventBus.on('scope.changed', () => {
      order.push(2);
    });

    await eventBus.emit('scope.changed', { leadId: 'lead-1' });

    expect(order).toEqual([1, 2]);
  });

  it('collects a failing handler error without stopping other handlers', async () => {
    let secondRan = false;
    eventBus.on('job.completed', () => {
      throw new Error('boom');
    });
    eventBus.on('job.completed', () => {
      secondRan = true;
    });

    const result = await eventBus.emit('job.completed', { leadId: 'lead-1', jobId: 'job-1' });

    expect(secondRan).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe('boom');
  });

  it('reports zero handled events when nothing is subscribed', async () => {
    const result = await eventBus.emit('message.received', {
      leadId: 'lead-1',
      threadId: 'thread-1',
      messageId: 'message-1',
    });
    expect(result.handled).toBe(0);
    expect(eventBus.listenerCount('message.received')).toBe(0);
  });
});
