/**
 * OpenSkill File Watcher — Real-time config change detection
 *
 * Monitors AI platform config files and triggers hooks on changes.
 * Supports: CLAUDE.md, .cursorrules, AGENTS.md, .windsurfrules, etc.
 */
import { existsSync, watchFile, unwatchFile, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

export interface WatchTarget {
  platform: string;
  path: string;
  hash: string;
  size: number;
  lastModified: string;
}

export interface WatchEvent {
  type: 'created' | 'modified' | 'deleted';
  platform: string;
  path: string;
  timestamp: string;
  oldHash?: string;
  newHash?: string;
}

type WatchCallback = (event: WatchEvent) => void;

const WATCH_TARGETS: Array<{ platform: string; path: string }> = [
  { platform: 'claude', path: join(homedir(), 'CLAUDE.md') },
  { platform: 'claude', path: join(homedir(), '.claude', 'settings.json') },
  { platform: 'cursor', path: join(process.cwd(), '.cursorrules') },
  { platform: 'codex', path: join(process.cwd(), 'AGENTS.md') },
  { platform: 'windsurf', path: join(process.cwd(), '.windsurfrules') },
  { platform: 'copilot', path: join(process.cwd(), '.github', 'copilot-instructions.md') },
  { platform: 'vscode', path: join(process.cwd(), '.vscode', 'settings.json') },
  { platform: 'gemini', path: join(homedir(), '.gemini', 'settings.json') },
];

let activeWatchers: Map<string, { target: WatchTarget; callback: WatchCallback }> = new Map();

function hashFile(path: string): string {
  if (!existsSync(path)) return '';
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
}

/** Start watching all known platform config files */
export function startWatching(callback: WatchCallback, intervalMs: number = 2000): WatchTarget[] {
  const targets: WatchTarget[] = [];

  for (const t of WATCH_TARGETS) {
    if (!existsSync(t.path)) continue;

    const stat = statSync(t.path);
    const target: WatchTarget = {
      platform: t.platform,
      path: t.path,
      hash: hashFile(t.path),
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
    };
    targets.push(target);

    watchFile(t.path, { interval: intervalMs }, (curr, prev) => {
      const existing = activeWatchers.get(t.path);
      if (!existing) return;

      if (curr.size === 0 && prev.size > 0) {
        callback({ type: 'deleted', platform: t.platform, path: t.path, timestamp: new Date().toISOString(), oldHash: existing.target.hash });
      } else if (curr.mtimeMs !== prev.mtimeMs) {
        const newHash = hashFile(t.path);
        if (newHash !== existing.target.hash) {
          callback({ type: 'modified', platform: t.platform, path: t.path, timestamp: new Date().toISOString(), oldHash: existing.target.hash, newHash });
          existing.target.hash = newHash;
          existing.target.size = curr.size;
          existing.target.lastModified = curr.mtime.toISOString();
        }
      }
    });

    activeWatchers.set(t.path, { target, callback });
  }

  return targets;
}

/** Stop watching all files */
export function stopWatching(): number {
  let count = 0;
  for (const [path] of activeWatchers) {
    unwatchFile(path);
    count++;
  }
  activeWatchers.clear();
  return count;
}

/** Get current watch status */
export function getWatchStatus(): { watching: number; targets: WatchTarget[] } {
  return {
    watching: activeWatchers.size,
    targets: [...activeWatchers.values()].map(w => w.target),
  };
}

/** One-shot scan for changes since last known state */
export function scanForChanges(knownHashes: Record<string, string>): WatchEvent[] {
  const events: WatchEvent[] = [];
  for (const t of WATCH_TARGETS) {
    const currentHash = hashFile(t.path);
    const knownHash = knownHashes[t.path] || '';

    if (!knownHash && currentHash) {
      events.push({ type: 'created', platform: t.platform, path: t.path, timestamp: new Date().toISOString(), newHash: currentHash });
    } else if (knownHash && !currentHash) {
      events.push({ type: 'deleted', platform: t.platform, path: t.path, timestamp: new Date().toISOString(), oldHash: knownHash });
    } else if (knownHash && currentHash && knownHash !== currentHash) {
      events.push({ type: 'modified', platform: t.platform, path: t.path, timestamp: new Date().toISOString(), oldHash: knownHash, newHash: currentHash });
    }
  }
  return events;
}
