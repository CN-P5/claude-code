/**
 * Beta Session Tracing — stubbed for fork deployment.
 *
 * The original implementation maintained per-agent message tracking,
 * system-prompt deduplication, hook-execution spans, and detailed
 * new_context attributes for LLM requests. In the fork there is no
 * remote tracing endpoint — every entry point is a no-op that preserves
 * the public shape.
 */

/**
 * Track hashes we've already logged this session.
 * Preserved as a module-level Set for type compatibility.
 */
const seenHashes = new Set<string>()

/**
 * Clear tracking state after compaction. No-op in the fork.
 */
export function clearBetaTracingState(): void {
  seenHashes.clear()
}

const MAX_CONTENT_SIZE = 60 * 1024 // 60KB (matches the original cap)

/**
 * Check if beta detailed tracing is enabled.
 * Always returns false in the fork.
 */
export function isBetaTracingEnabled(): boolean {
  return false
}

/**
 * Truncate content to fit within the Honeycomb limit.
 * Pure utility — kept unchanged.
 */
export function truncateContent(
  content: string,
  maxSize: number = MAX_CONTENT_SIZE,
): { content: string; truncated: boolean } {
  if (content.length <= maxSize) {
    return { content, truncated: false }
  }

  return {
    content:
      content.slice(0, maxSize) +
      '\n\n[TRUNCATED - Content exceeds 60KB limit]',
    truncated: true,
  }
}

/**
 * Per-agent context attached to a LLM request span.
 * Type kept for callers that construct it.
 */
export interface LLMRequestNewContext {
  /** System prompt (typically only on first request or if changed) */
  systemPrompt?: string
  /** Query source identifying the agent/purpose (e.g., 'repl_main_thread', 'agent:builtin') */
  querySource?: string
  /** Tool schemas sent with the request */
  tools?: string
}

/**
 * Add beta attributes to an interaction span. No-op in the fork.
 */
export function addBetaInteractionAttributes(
  _span: unknown,
  _userPrompt: string,
): void {
  // No-op.
}

/**
 * Add beta attributes to an LLM request span. No-op in the fork.
 */
export function addBetaLLMRequestAttributes(
  _span: unknown,
  _newContext?: LLMRequestNewContext,
  _messagesForAPI?: unknown[],
): void {
  // No-op.
}

/**
 * Add beta attributes to end an LLM request span. No-op in the fork.
 */
export function addBetaLLMResponseAttributes(
  _endAttributes: Record<string, string | number | boolean>,
  _metadata?: {
    modelOutput?: string
    thinkingOutput?: string
  },
): void {
  // No-op.
}

/**
 * Add beta attributes to start a tool span. No-op in the fork.
 */
export function addBetaToolInputAttributes(
  _span: unknown,
  _toolName: string,
  _toolInput: string,
): void {
  // No-op.
}

/**
 * Add beta attributes to end a tool span. No-op in the fork.
 */
export function addBetaToolResultAttributes(
  _endAttributes: Record<string, string | number | boolean>,
  _toolName: string | number | boolean,
  _toolResult: string,
): void {
  // No-op.
}
