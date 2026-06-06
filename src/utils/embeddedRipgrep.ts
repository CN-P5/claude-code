/**
 * Embedded ripgrep binary — packed into single-file executables via
 * `import ... with { type: 'file' }`.
 *
 * When the binary is built with `Bun.build({ compile: ... })`, the
 * import path becomes a `$bunfs/...` internal path at runtime, and
 * the file is bundled inside the executable. The previous `embedded`
 * mode (process.execPath + argv0='rg') relied on Bun statically
 * compiling ripgrep into its own binary, which is not the case for
 * user-built executables — so we ship our own copy.
 *
 * Platform-specific files: only the matching `${arch}-${platform}/rg[.exe]`
 * needs to exist at build time. For cross-compiled targets (e.g.
 * building a Windows binary on a Linux dev box) the build script
 * must `cp` the right platform binary into place before calling
 * `Bun.build()`. The `import ... with { type: 'file' }` syntax
 * requires the file to exist on disk at the import path.
 *
 * Resolution order in `getRipgrepConfig()` (src/utils/ripgrep.ts):
 *   1. `USE_BUILTIN_RIPGREP=0` and `rg` on PATH → 'system'
 *   2. Compiled binary with embedded ripgrep → extract to temp, 'embedded'
 *   3. Otherwise → 'builtin' (use ${distRoot}/vendor/ripgrep/${arch}-${plat}/rg)
 */
import { execFileSync } from 'child_process'
import { randomBytes } from 'crypto'
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { getPlatform } from './platform.js'

// `with { type: 'file' }` makes Bun bundle the binary into the compiled
// executable. In dev / unbundled builds the value is the literal
// import path; `Bun.embeddedFiles.length > 0` distinguishes the two
// `with { type: 'file' }` makes Bun bundle the binary into the compiled
// executable. In dev / unbundled builds the value is the literal
// import path; `Bun.embeddedFiles.length > 0` distinguishes the two
// cases (only true in compiled mode).
//
// Only the Windows binary is currently vendored
// (src/utils/vendor/ripgrep/x64-win32/rg.exe). To extend to other
// platforms, drop the matching `${arch}-${platform}/rg[.exe]` into
// the source tree, add the import below, and extend
// `pickEmbeddedRgPath()`'s switch. The build script (`build-binary.ts`)
// already cross-compiles per target; staging the right binary is
// the build script's job (see TODO in that file).
import embeddedRgWindows from './vendor/ripgrep/x64-win32/rg.exe' with {
  type: 'file',
}

/**
 * Pick the right embedded rg path for the current platform. The
 * static-import list above gives a stable build-time reference for
 * each platform; the import value is a `$bunfs/...` string in
 * compiled mode and a real path string otherwise. The file may be
 * missing on this build host (e.g. building a Windows binary on a
 * Mac without a Windows ripgrep copy) — in that case we return null
 * and the runtime falls through to the on-disk `builtin` resolver.
 */
function pickEmbeddedRgPath(): { path: string; ext: '.exe' | '' } | null {
  // Only Windows is currently vendored. Other platforms fall through
  // to the on-disk `builtin` resolver in ripgrep.ts:64-68.
  if (getPlatform() !== 'windows' || process.arch !== 'x64') return null
  const path = embeddedRgWindows
  const ext: '.exe' | '' = '.exe'

  // Dev / `build.ts` (uncompiled bundle): the value is the source-tree
  // path; the file may not exist on this build host's filesystem
  // (e.g. building for Windows from a Mac). Skip embedded extraction
  // and let the 'builtin' resolver try the on-disk `vendor/ripgrep/`
  // copy instead.
  if (path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)) {
    if (!existsSync(path)) return null
    return { path, ext }
  }
  return { path, ext }
}

let cachedExtractedPath: string | null = null

/**
 * Synchronously extract the embedded ripgrep binary to a temp file
 * and return the path. The result is memoized — written once per
 * process and reused for every spawn. On Windows the .exe extension
 * must be preserved so CreateProcess can run it; on Unix the
 * extension is irrelevant but harmless to keep.
 *
 * The temp dir (`<tmpdir>/claude-code-ripgrep/`) is created lazily
 * and is not cleaned up on exit — the binary is unlinked by the
 * kernel on reboot on Linux; on Windows the file is small (~5 MB)
 * and harmless to leave behind. The `randomBytes` suffix avoids
 * collisions when multiple `claude` processes launch concurrently.
 *
 * Returns null when the binary is not extractable (e.g. running on
 * a host without a matching vendored copy, or the build script
 * didn't stage the right platform's file).
 */
export function extractEmbeddedRgSync(): string | null {
  if (cachedExtractedPath !== null) {
    if (existsSync(cachedExtractedPath)) return cachedExtractedPath
    cachedExtractedPath = null
  }

  const picked = pickEmbeddedRgPath()
  if (!picked) return null

  const dir = join(tmpdir(), 'claude-code-ripgrep')
  mkdirSync(dir, { recursive: true })
  const outPath = join(dir, `rg-${randomBytes(8).toString('hex')}${picked.ext}`)

  // Read the embedded file synchronously. In compiled mode the path
  // starts with `$bunfs/`; Bun's runtime transparently routes
  // readFileSync through the embedded FS so this works for both
  // $bunfs/ and regular disk paths. The file is ~5 MB so blocking
  // for a few ms on first call is acceptable.
  const buf = readFileSync(picked.path)
  if (buf.length === 0) return null
  writeFileSync(outPath, buf)
  return outPath
}

/**
 * Self-test for the embedded ripgrep: run `rg --version` and return
 * the result. Used by `getRipgrepStatus()` to report working state to
 * `/doctor`. Returns null when the binary is not extractable.
 */
export function testEmbeddedRg(): { code: number; stdout: string } | null {
  const rgPath = extractEmbeddedRgSync()
  if (!rgPath) return null
  try {
    const stdout = execFileSync(rgPath, ['--version']).toString().trim()
    return { code: 0, stdout }
  } catch (err) {
    const e = err as {
      status?: number | null
      stdout?: Buffer | string
      message?: string
    }
    return {
      code: typeof e.status === 'number' ? e.status : -1,
      stdout:
        typeof e.stdout === 'string'
          ? e.stdout
          : (e.stdout?.toString() ?? e.message ?? ''),
    }
  }
}
