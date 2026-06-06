/**
 * Session Tracing — stubbed for fork deployment.
 *
 * The original implementation created real OpenTelemetry spans for
 * interactions, LLM requests, tools, hooks, etc. and fed them through
 * the configured exporter. In the fork there is no exporter — every
 * entry point returns a no-op span and skips the OTel machinery.
 *
 * The `Span` type is re-exported so callers that type-annotate spans
 * (e.g. `let span: Span | undefined`) keep compiling.
 */

import { type Span, trace } from '@opentelemetry/api'

// Re-export for callers
export type { Span }

/**
 * @deprecated Re-export of `isBetaTracingEnabled` from betaSessionTracing.
 * The fork's beta-tracing gate is always false.
 */
export {
  isBetaTracingEnabled,
  type LLMRequestNewContext,
} from './betaSessionTracing.js'

/**
 * Internal helper: returns a no-op Span.
 *
 * We rely on OTel's `trace.getTracer().startSpan('noop')` to obtain a
 * real Span instance with the no-op `setAttribute` / `end` methods.
 * Since no exporter is wired in (initializeTelemetry is a no-op), any
 * attributes/events set on the span are simply discarded.
 */
function noopSpan(): Span {
  return trace.getTracer('claude-code-noop').startSpan('noop')
}

/**
 * Check if enhanced telemetry is enabled. Always false in the fork.
 */
export function isEnhancedTelemetryEnabled(): boolean {
  return false
}

/**
 * Start an interaction span. Returns a no-op span in the fork.
 */
export function startInteractionSpan(_userPrompt: string): Span {
  return noopSpan()
}

/**
 * End an interaction span. No-op in the fork.
 */
export function endInteractionSpan(): void {
  // No-op.
}

/**
 * Start an LLM request span. Returns a no-op span in the fork.
 */
export function startLLMRequestSpan(
  _model: string,
  _newContext?: unknown,
  _messagesForAPI?: unknown[],
  _fastMode?: boolean,
): Span {
  return noopSpan()
}

/**
 * End an LLM request span. No-op in the fork.
 */
export function endLLMRequestSpan(
  _span?: Span,
  _metadata?: Record<string, unknown>,
): void {
  // No-op.
}

/**
 * Start a tool span. Returns a no-op span in the fork.
 */
export function startToolSpan(
  _toolName: string,
  _toolAttributes?: Record<string, string | number | boolean>,
  _toolInput?: string,
): Span {
  return noopSpan()
}

/**
 * Start a "tool blocked on user" span. Returns a no-op span in the fork.
 */
export function startToolBlockedOnUserSpan(): Span {
  return noopSpan()
}

/**
 * End a "tool blocked on user" span. No-op in the fork.
 */
export function endToolBlockedOnUserSpan(
  _decision?: string,
  _source?: string,
): void {
  // No-op.
}

/**
 * Start a tool-execution span. Returns a no-op span in the fork.
 */
export function startToolExecutionSpan(): Span {
  return noopSpan()
}

/**
 * End a tool-execution span. No-op in the fork.
 */
export function endToolExecutionSpan(_metadata?: {
  success?: boolean
  error?: string
}): void {
  // No-op.
}

/**
 * End a tool span. No-op in the fork.
 */
export function endToolSpan(
  _toolResult?: string,
  _resultTokens?: number,
): void {
  // No-op.
}

/**
 * Add a span event with tool content/output data. No-op in the fork.
 */
export function addToolContentEvent(
  _eventName: string,
  _attributes: Record<string, string | number | boolean>,
): void {
  // No-op.
}

/**
 * Get the currently-active span. Returns null in the fork.
 */
export function getCurrentSpan(): Span | null {
  return null
}

/**
 * Run `fn` inside a new span. Returns whatever `fn` returns.
 * The span is a no-op in the fork.
 */
export async function executeInSpan<T>(
  _spanName: string,
  fn: (span: Span) => Promise<T>,
  _attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  return fn(noopSpan())
}

/**
 * Start a hook execution span. Returns a no-op span in the fork.
 */
export function startHookSpan(
  _hookEvent: string,
  _hookName: string,
  _numHooks: number,
  _hookDefinitions: string,
): Span {
  return noopSpan()
}

/**
 * End a hook execution span. No-op in the fork.
 */
export function endHookSpan(
  _span: Span,
  _metadata?: {
    numSuccess?: number
    numBlocking?: number
    numNonBlockingError?: number
    numCancelled?: number
  },
): void {
  // No-op.
}
