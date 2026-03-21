/**
 * OpenSkill Live Sync — Real-time two-way platform sync
 *
 * Watches for changes on any platform and propagates to others.
 * Conflict resolution: latest-wins | merge | user-decides
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

export interface SyncPair {
  source: string;
  target: string;
  strategy: 'latest-wins' | 'merge' | 'user-decides';
  lastSynced: string;
  status: 'idle' | 'syncing' | 'conflict' | 'error';
}

export interface SyncResult {
  pair: SyncPair;
  filesChanged: number;
  conflicts: number;
  duration_ms: number;
  timestamp: string;
}

const SYNC_DIR = join(homedir(), '.openskill', 'sync');
const SYNC_STATE_FILE = join(SYNC_DIR, 'state.json');

const PLATFORM_RULES: Record<string, string> = {
  claude: join(homedir(), 'CLAUDE.md'),
  cursor: '.cursorrules',
  codex: 'AGENTS.md',
  windsurf: '.windsurfrules',
  copilot: join('.github', 'copilot-instructions.md'),
};

function ensureDir(): void {
  if (!existsSync(SYNC_DIR)) mkdirSync(SYNC_DIR, { recursive: true });
}

function fileHash(path: string): string {
  if (!existsSync(path)) return '';
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
}

/** Get all configured sync pairs */
export function getSyncPairs(): SyncPair[] {
  ensureDir();
  if (!existsSync(SYNC_STATE_FILE)) return [];
  return JSON.parse(readFileSync(SYNC_STATE_FILE, 'utf-8'));
}

/** Add a sync pair */
export function addSyncPair(source: string, target: string, strategy: SyncPair['strategy'] = 'latest-wins'): SyncPair {
  ensureDir();
  const pairs = getSyncPairs();
  const pair: SyncPair = { source, target, strategy, lastSynced: '', status: 'idle' };
  pairs.push(pair);
  writeFileSync(SYNC_STATE_FILE, JSON.stringify(pairs, null, 2));
  return pair;
}

/** Remove a sync pair */
export function removeSyncPair(source: string, target: string): boolean {
  const pairs = getSyncPairs();
  const filtered = pairs.filter(p => !(p.source === source && p.target === target));
  if (filtered.length === pairs.length) return false;
  writeFileSync(SYNC_STATE_FILE, JSON.stringify(filtered, null, 2));
  return true;
}

/** Execute sync for a pair */
export function executeSync(pair: SyncPair): SyncResult {
  const start = Date.now();
  let filesChanged = 0;
  let conflicts = 0;

  const srcPath = PLATFORM_RULES[pair.source];
  const tgtPath = PLATFORM_RULES[pair.target];

  if (!srcPath || !tgtPath) {
    return { pair: { ...pair, status: 'error' }, filesChanged: 0, conflicts: 0, duration_ms: Date.now() - start, timestamp: new Date().toISOString() };
  }

  if (existsSync(srcPath) && existsSync(tgtPath)) {
    const srcHash = fileHash(srcPath);
    const tgtHash = fileHash(tgtPath);

    if (srcHash !== tgtHash) {
      if (pair.strategy === 'latest-wins') {
        const srcStat = existsSync(srcPath) ? require('fs').statSync(srcPath) : null;
        const tgtStat = existsSync(tgtPath) ? require('fs').statSync(tgtPath) : null;
        if (srcStat && tgtStat) {
          if (srcStat.mtimeMs >= tgtStat.mtimeMs) {
            writeFileSync(tgtPath, readFileSync(srcPath));
          } else {
            writeFileSync(srcPath, readFileSync(tgtPath));
          }
          filesChanged = 1;
        }
      } else if (pair.strategy === 'merge') {
        // Simple merge: append unique lines from source to target
        const srcLines = new Set(readFileSync(srcPath, 'utf-8').split('\n'));
        const tgtLines = readFileSync(tgtPath, 'utf-8').split('\n');
        const merged = [...tgtLines];
        for (const line of srcLines) {
          if (!tgtLines.includes(line) && line.trim()) merged.push(line);
        }
        writeFileSync(tgtPath, merged.join('\n'));
        filesChanged = 1;
      } else {
        conflicts = 1;
        pair.status = 'conflict';
      }
    }
  } else if (existsSync(srcPath) && !existsSync(tgtPath)) {
    const dir = require('path').dirname(tgtPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(tgtPath, readFileSync(srcPath));
    filesChanged = 1;
  }

  pair.lastSynced = new Date().toISOString();
  pair.status = conflicts > 0 ? 'conflict' : 'idle';

  // Update state
  const pairs = getSyncPairs();
  const idx = pairs.findIndex(p => p.source === pair.source && p.target === pair.target);
  if (idx >= 0) pairs[idx] = pair;
  writeFileSync(SYNC_STATE_FILE, JSON.stringify(pairs, null, 2));

  return { pair, filesChanged, conflicts, duration_ms: Date.now() - start, timestamp: new Date().toISOString() };
}

/** Sync all configured pairs */
export function syncAll(): SyncResult[] {
  return getSyncPairs().map(executeSync);
}
