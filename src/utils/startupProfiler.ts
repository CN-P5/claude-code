/**
 * Startup profiling utility for measuring and reporting time spent in
 * various initialization phases.
 *
 * The original implementation supported two modes:
 *   1. Sampled logging to Statsig (100% ant, 0.5% external)
 *   2. Detailed profiling via CLAUDE_CODE_PROFILE_STARTUP=1
 *
 * The Statsig sampling path has been removed; only the local
 * perf.mark()/writeFile report path remains. profileCheckpoint is
 * still a no-op when profiling is disabled so hot paths stay cheap.
 */

import { dirname, join } from 'path'
import { getSessionId } from 'src/bootstrap/state.js'
import { logForDebugging } from './debug.js'
import { getClaudeConfigHomeDir, isEnvTruthy } from './envUtils.js'
import { getFsImplementation } from './fsOperations.js'
import { formatMs, formatTimelineLine, getPerformance } from './profilerBase.js'
import { writeFileSync_DEPRECATED } from './slowOperations.js'

// Module-level state - decided once at module load
// eslint-disable-next-line custom-rules/no-process-env-top-level
const DETAILED_PROFILING = isEnvTruthy(process.env.CLAUDE_CODE_PROFILE_STARTUP)

// Enable profiling if detailed mode is on.
const SHOULD_PROFILE = DETAILED_PROFILING

// Track memory snapshots separately (perf_hooks doesn't track memory).
// Only used when DETAILED_PROFILING is enabled.
const memorySnapshots: NodeJS.MemoryUsage[] = []

// Phase definitions used by the detailed report (kept for the
// detailed-profiling output, even though Statsig logging is gone).
const PHASE_DEFINITIONS = {
  import_time: ['cli_entry', 'main_tsx_imports_loaded'],
  init_time: ['init_function_start', 'init_function_end'],
  settings_time: ['eagerLoadSettings_start', 'eagerLoadSettings_end'],
  total_time: ['cli_entry', 'main_after_run'],
} as const

// Record initial checkpoint if profiling is enabled
if (SHOULD_PROFILE) {
  // eslint-disable-next-line custom-rules/no-top-level-side-effects
  profileCheckpoint('profiler_initialized')
}

/**
 * Record a checkpoint with the given name
 */
export function profileCheckpoint(name: string): void {
  if (!SHOULD_PROFILE) return

  const perf = getPerformance()
  perf.mark(name)

  // Only capture memory when detailed profiling enabled (env var)
  if (DETAILED_PROFILING) {
    memorySnapshots.push(process.memoryUsage())
  }
}

/**
 * Get a formatted report of all checkpoints
 * Only available when DETAILED_PROFILING is enabled
 */
function getReport(): string {
  if (!DETAILED_PROFILING) {
    return 'Startup profiling not enabled'
  }

  const perf = getPerformance()
  const marks = perf.getEntriesByType('mark')
  if (marks.length === 0) {
    return 'No profiling checkpoints recorded'
  }

  const lines: string[] = []
  lines.push('='.repeat(80))
  lines.push('STARTUP PROFILING REPORT')
  lines.push('='.repeat(80))
  lines.push('')

  let prevTime = 0
  for (const [i, mark] of marks.entries()) {
    lines.push(
      formatTimelineLine(
        mark.startTime,
        mark.startTime - prevTime,
        mark.name,
        memorySnapshots[i],
        8,
        7,
      ),
    )
    prevTime = mark.startTime
  }

  const lastMark = marks[marks.length - 1]
  lines.push('')
  lines.push(`Total startup time: ${formatMs(lastMark?.startTime ?? 0)}ms`)
  lines.push('='.repeat(80))

  return lines.join('\n')
}

let reported = false

export function profileReport(): void {
  if (reported) return
  reported = true

  // Statsig sampling path removed — logStartupPerf is now a no-op.
  logStartupPerf()

  // Output detailed report if CLAUDE_CODE_PROFILE_STARTUP=1
  if (DETAILED_PROFILING) {
    // Write to file
    const path = getStartupPerfLogPath()
    const dir = dirname(path)
    const fs = getFsImplementation()
    fs.mkdirSync(dir)
    writeFileSync_DEPRECATED(path, getReport(), {
      encoding: 'utf8',
      flush: true,
    })

    logForDebugging('Startup profiling report:')
    logForDebugging(getReport())
  }

  // Clear startup marks to prevent PerformanceMark accumulation in long-lived
  // processes (daemon, cron).
  const perf = getPerformance()
  perf.clearMarks()
  memorySnapshots.length = 0
}

export function isDetailedProfilingEnabled(): boolean {
  return DETAILED_PROFILING
}

export function getStartupPerfLogPath(): string {
  return join(getClaudeConfigHomeDir(), 'startup-perf', `${getSessionId()}.txt`)
}

/**
 * Log startup performance phases to Statsig.
 * No-op in the fork (Statsig sampling path removed).
 */
export function logStartupPerf(): void {
  // No-op: Statsig sampling is disabled in the fork.
}

// Suppress unused-var warning for PHASE_DEFINITIONS — preserved for the
// detailed report output and for any future reader that wants the
// per-phase timings.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _phases = PHASE_DEFINITIONS
