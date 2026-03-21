/**
 * Enterprise Features — Audit Trail + RBAC
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const AUDIT_DIR = join(homedir(), '.openskill', 'audit');
const AUDIT_LOG = join(AUDIT_DIR, 'audit.jsonl');

export type AuditAction = 'create' | 'update' | 'delete' | 'import' | 'export' | 'sync' | 'share' | 'publish' | 'sign' | 'scan' | 'install' | 'login' | 'permission_change';

export interface AuditEntry {
  timestamp: string;
  user_id: string;
  action: AuditAction;
  asset_id?: string;
  details: string;
  ip?: string;
  platform?: string;
}

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export interface Permission {
  create: boolean; read: boolean; update: boolean; delete: boolean;
  share: boolean; publish: boolean; manage_team: boolean; view_audit: boolean;
}

const ROLE_PERMISSIONS: Record<Role, Permission> = {
  owner:  { create: true, read: true, update: true, delete: true, share: true, publish: true, manage_team: true, view_audit: true },
  admin:  { create: true, read: true, update: true, delete: true, share: true, publish: true, manage_team: true, view_audit: true },
  member: { create: true, read: true, update: true, delete: false, share: true, publish: false, manage_team: false, view_audit: false },
  viewer: { create: false, read: true, update: false, delete: false, share: false, publish: false, manage_team: false, view_audit: false },
};

/** Log an audit entry */
export function logAudit(entry: Omit<AuditEntry, 'timestamp'>): void {
  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true });
  const full: AuditEntry = { ...entry, timestamp: new Date().toISOString() };
  appendFileSync(AUDIT_LOG, JSON.stringify(full) + '\n', 'utf-8');
}

/** Read audit log */
export function readAuditLog(filter?: { user_id?: string; action?: AuditAction; since?: string }): AuditEntry[] {
  if (!existsSync(AUDIT_LOG)) return [];
  const lines = readFileSync(AUDIT_LOG, 'utf-8').trim().split('\n').filter(Boolean);
  let entries: AuditEntry[] = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  if (filter?.user_id) entries = entries.filter(e => e.user_id === filter.user_id);
  if (filter?.action) entries = entries.filter(e => e.action === filter.action);
  if (filter?.since) entries = entries.filter(e => e.timestamp >= filter.since!);

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/** Check if a role has a specific permission */
export function hasPermission(role: Role, action: keyof Permission): boolean {
  return ROLE_PERMISSIONS[role]?.[action] ?? false;
}

/** Get all permissions for a role */
export function getPermissions(role: Role): Permission {
  return { ...ROLE_PERMISSIONS[role] };
}

/** Format audit log for display */
export function formatAuditLog(entries: AuditEntry[]): string {
  if (!entries.length) return '  No audit entries.\n';
  return entries.map(e => `  [${e.timestamp.slice(0,19)}] ${e.user_id} — ${e.action}${e.asset_id ? ` (${e.asset_id})` : ''} — ${e.details}`).join('\n') + '\n';
}
