/**
 * OpenSkill Hook System — Event-driven automation layer
 * 
 * Aligns with Extension Layer (扩展层) of the 4-layer architecture:
 * - Commands (手动触发) → CLI commands
 * - Skills (自动发现) → skill-hub.ts
 * - SubAgents (任务分发) → hook orchestration
 * - Hooks (事件驱动) → THIS MODULE
 * 
 * Inspired by: OpenClaw ContextEngine lifecycle hooks, Claude Code event system
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ─── Types ───────────────────────────────────────────────

export type HookEvent =
  | 'skill:installed' | 'skill:removed' | 'skill:updated'
  | 'asset:created'   | 'asset:deleted'  | 'asset:synced'
  | 'scan:completed'  | 'scan:failed'
  | 'migrate:started' | 'migrate:completed'
  | 'backup:created'  | 'backup:restored'
  | 'platform:detected' | 'platform:changed'
  | 'xp:earned'       | 'level:up'       | 'achievement:unlocked'
  | 'health:checked'  | 'drift:detected'
  | 'device:connected' | 'device:synced';

export interface Hook {
  id: string;
  event: HookEvent;
  action: 'notify' | 'script' | 'sync' | 'log' | 'webhook';
  config: Record<string, string>;
  enabled: boolean;
  created_at: string;
}

export interface HookExecution {
  hook_id: string;
  event: HookEvent;
  timestamp: string;
  payload: Record<string, unknown>;
  result: 'success' | 'error';
  message?: string;
}

// ─── Hook Engine ─────────────────────────────────────────

const HOOKS_DIR = join(homedir(), '.openskill', 'hooks');
const HOOKS_FILE = join(HOOKS_DIR, 'hooks.json');
const LOG_FILE = join(HOOKS_DIR, 'executions.jsonl');

function ensureDir(): void {
  if (!existsSync(HOOKS_DIR)) mkdirSync(HOOKS_DIR, { recursive: true });
}

export function getHooks(): Hook[] {
  ensureDir();
  if (!existsSync(HOOKS_FILE)) return [];
  return JSON.parse(readFileSync(HOOKS_FILE, 'utf-8'));
}

export function saveHooks(hooks: Hook[]): void {
  ensureDir();
  writeFileSync(HOOKS_FILE, JSON.stringify(hooks, null, 2));
}

export function registerHook(event: HookEvent, action: Hook['action'], config: Record<string, string> = {}): Hook {
  const hooks = getHooks();
  const hook: Hook = {
    id: `hook-${Date.now().toString(36)}`,
    event, action, config, enabled: true,
    created_at: new Date().toISOString(),
  };
  hooks.push(hook);
  saveHooks(hooks);
  return hook;
}

export function removeHook(hookId: string): boolean {
  const hooks = getHooks();
  const filtered = hooks.filter(h => h.id !== hookId);
  if (filtered.length === hooks.length) return false;
  saveHooks(filtered);
  return true;
}

export function toggleHook(hookId: string, enabled: boolean): boolean {
  const hooks = getHooks();
  const hook = hooks.find(h => h.id === hookId);
  if (!hook) return false;
  hook.enabled = enabled;
  saveHooks(hooks);
  return true;
}

/** Fire an event — all matching hooks execute */
export function emit(event: HookEvent, payload: Record<string, unknown> = {}): HookExecution[] {
  const hooks = getHooks().filter(h => h.event === event && h.enabled);
  const results: HookExecution[] = [];

  for (const hook of hooks) {
    const exec: HookExecution = {
      hook_id: hook.id, event, timestamp: new Date().toISOString(), payload, result: 'success',
    };

    try {
      switch (hook.action) {
        case 'log':
          exec.message = `[${event}] ${JSON.stringify(payload).slice(0, 200)}`;
          break;
        case 'notify':
          exec.message = `Notification: ${hook.config.message || event}`;
          break;
        case 'sync':
          exec.message = `Sync triggered for ${hook.config.target || 'all platforms'}`;
          break;
        case 'webhook':
          exec.message = `Webhook: ${hook.config.url || 'not configured'}`;
          // In production: fetch(hook.config.url, { method: 'POST', body: JSON.stringify(payload) })
          break;
        case 'script':
          exec.message = `Script: ${hook.config.path || 'not configured'}`;
          // In production: execSync(hook.config.path)
          break;
      }
    } catch (e) {
      exec.result = 'error';
      exec.message = String(e);
    }

    results.push(exec);
    // Append to log
    try {
      ensureDir();
      const line = JSON.stringify(exec) + '\n';
      writeFileSync(LOG_FILE, existsSync(LOG_FILE) ? readFileSync(LOG_FILE, 'utf-8') + line : line);
    } catch { /* ignore log errors */ }
  }

  return results;
}

/** Get recent hook executions */
export function getExecutionLog(limit: number = 20): HookExecution[] {
  ensureDir();
  if (!existsSync(LOG_FILE)) return [];
  const lines = readFileSync(LOG_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  return lines.slice(-limit).map(l => JSON.parse(l)).reverse();
}

/** Get available hook events */
export function getAvailableEvents(): HookEvent[] {
  return [
    'skill:installed', 'skill:removed', 'skill:updated',
    'asset:created', 'asset:deleted', 'asset:synced',
    'scan:completed', 'scan:failed',
    'migrate:started', 'migrate:completed',
    'backup:created', 'backup:restored',
    'platform:detected', 'platform:changed',
    'xp:earned', 'level:up', 'achievement:unlocked',
    'health:checked', 'drift:detected',
    'device:connected', 'device:synced',
  ];
}
