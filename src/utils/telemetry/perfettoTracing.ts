/**
 * Perfetto Tracing — stubbed for fork deployment.
 *
 * The original implementation emitted Chrome Trace Event format
 * traces for ant-only debugging of agent swarms, LLM requests,
 * tool executions, and user-input waits. In the fork there is no
 * tracing endpoint — every entry point is a no-op that preserves
 * the original public surface (types + function signatures).
 *
 * External call sites in src/utils/swarm/* and
 * packages/builtin-tools/src/tools/AgentTool/runAgent.ts keep
 * compiling unchanged.
 */

/**
 * Chrome Trace Event phase. Type-kept for source-compat.
 */
export type TraceEventPhase = 'B' | 'E' | 'X' | 'i' | 'C'

/**
 * A single Chrome Trace Event. Type-kept for source-compat.
 */
export type TraceEvent = {
  name: string
  phase: TraceEventPhase
  ts: number
  dur?: number
  pid?: number
  tid?: number
  cat?: string
  id?: string
  args?: Record<string, unknown>
}

/**
 * Initialize Perfetto tracing. No-op in the fork.
 */
export function initializePerfettoTracing(): void {
  // No-op.
}

/**
 * Check if Perfetto tracing is enabled. Always false in the fork.
 */
export function isPerfettoTracingEnabled(): boolean {
  return false
}

/**
 * Register an agent. No-op in the fork.
 */
export function registerAgent(
  _agentId: string,
  _name?: string,
  _parentId?: string,
): void {
  // No-op.
}

/**
 * Unregister an agent. No-op in the fork.
 */
export function unregisterAgent(_agentId: string): void {
  // No-op.
}

/**
 * Start an LLM request span. No-op in the fork.
 */
export function startLLMRequestPerfettoSpan(_args: {
  model: string
  querySource?: string
  messageId?: string
}): string {
  return ''
}

/**
 * End an LLM request span. No-op in the fork.
 */
export function endLLMRequestPerfettoSpan(
  _spanId: string,
  _metadata?: {
    ttftMs?: number
    ttltMs?: number
    promptTokens?: number
    outputTokens?: number
    cacheReadTokens?: number
    cacheCreationTokens?: number
    success?: boolean
    error?: string
    requestSetupMs?: number
    attemptStartTimes?: number[]
  },
): void {
  // No-op.
}

/**
 * Start a tool span. No-op in the fork.
 */
export function startToolPerfettoSpan(
  _toolName: string,
  _attributes?: Record<string, unknown>,
): string {
  return ''
}

/**
 * End a tool span. No-op in the fork.
 */
export function endToolPerfettoSpan(
  _spanId: string,
  _metadata?: { success?: boolean; resultTokens?: number },
): void {
  // No-op.
}

/**
 * Start a user-input span. No-op in the fork.
 */
export function startUserInputPerfettoSpan(_context?: string): string {
  return ''
}

/**
 * End a user-input span. No-op in the fork.
 */
export function endUserInputPerfettoSpan(
  _spanId: string,
  _metadata?: { decision?: string; source?: string },
): void {
  // No-op.
}

/**
 * Emit a Perfetto instant event. No-op in the fork.
 */
export function emitPerfettoInstant(
  _name: string,
  _args?: Record<string, unknown>,
): void {
  // No-op.
}

/**
 * Emit a Perfetto counter event. No-op in the fork.
 */
export function emitPerfettoCounter(
  _name: string,
  _value: number,
  _args?: Record<string, unknown>,
): void {
  // No-op.
}

/**
 * Start an interaction span. No-op in the fork.
 */
export function startInteractionPerfettoSpan(_userPrompt?: string): string {
  return ''
}

/**
 * End an interaction span. No-op in the fork.
 */
export function endInteractionPerfettoSpan(_spanId: string): void {
  // No-op.
}

/**
 * Get all collected Perfetto events. Returns an empty array in the fork.
 */
export function getPerfettoEvents(): TraceEvent[] {
  return []
}

/**
 * Reset the Perfetto tracer. No-op in the fork.
 */
export function resetPerfettoTracer(): void {
  // No-op.
}

/**
 * Trigger a periodic write for testing. No-op in the fork.
 */
export async function triggerPeriodicWriteForTesting(): Promise<void> {
  // No-op.
}

/**
 * Evict stale spans (testing helper). No-op in the fork.
 */
export function evictStaleSpansForTesting(): void {
  // No-op.
}

/**
 * Maximum number of events held in memory (testing). 0 in the fork.
 */
export const MAX_EVENTS_FOR_TESTING = 0

/**
 * Evict oldest events (testing helper). No-op in the fork.
 */
export function evictOldestEventsForTesting(): void {
  // No-op.
}
