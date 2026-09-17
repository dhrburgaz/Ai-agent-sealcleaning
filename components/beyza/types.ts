/**
 * Shared state vocabulary for BEYZA's visual/voice presence (Agent 01 —
 * Command Orchestrator). One state enum drives the AI Core, the call-mode
 * screen, and the boot sequence, so "is Beyza listening/thinking/speaking"
 * is a single source of truth instead of three separate booleans drifting
 * out of sync.
 */
export const BEYZA_CORE_STATES = [
  'sleeping',
  'initializing',
  'ready',
  'listening',
  'thinking',
  'executing',
  'speaking',
  'warning',
  'error',
] as const;

export type BeyzaCoreState = (typeof BEYZA_CORE_STATES)[number];
