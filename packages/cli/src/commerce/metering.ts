/**
 * Agent Commerce — Paid Skills, Usage Metering, Revenue Share
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const COMMERCE_DIR = join(homedir(), '.openskill', 'commerce');
const METERING_FILE = join(COMMERCE_DIR, 'metering.json');
const REVENUE_FILE = join(COMMERCE_DIR, 'revenue.json');

export interface PricingTier {
  type: 'free' | 'one-time' | 'subscription' | 'per-use';
  amount?: number;       // in cents
  currency?: string;     // default: USD
  per_use_rate?: number; // cents per invocation
}

export interface UsageRecord {
  asset_id: string;
  user_id: string;
  timestamp: string;
  action: 'install' | 'invoke' | 'sync';
}

export interface RevenueEntry {
  asset_id: string;
  creator_id: string;
  amount: number;
  creator_share: number;  // after platform cut
  platform_share: number;
  timestamp: string;
}

export interface MeteringData {
  records: UsageRecord[];
  total_invocations: Record<string, number>; // asset_id -> count
}

export interface RevenueData {
  entries: RevenueEntry[];
  creator_split_pct: number; // default 70
}

/** Initialize commerce data */
function ensureCommerce(): { metering: MeteringData; revenue: RevenueData } {
  if (!existsSync(COMMERCE_DIR)) mkdirSync(COMMERCE_DIR, { recursive: true });

  let metering: MeteringData;
  if (existsSync(METERING_FILE)) {
    metering = JSON.parse(readFileSync(METERING_FILE, 'utf-8'));
  } else {
    metering = { records: [], total_invocations: {} };
  }

  let revenue: RevenueData;
  if (existsSync(REVENUE_FILE)) {
    revenue = JSON.parse(readFileSync(REVENUE_FILE, 'utf-8'));
  } else {
    revenue = { entries: [], creator_split_pct: 70 };
  }

  return { metering, revenue };
}

/** Record a usage event */
export function recordUsage(assetId: string, userId: string, action: UsageRecord['action']): void {
  const { metering } = ensureCommerce();
  metering.records.push({ asset_id: assetId, user_id: userId, timestamp: new Date().toISOString(), action });
  metering.total_invocations[assetId] = (metering.total_invocations[assetId] ?? 0) + 1;
  writeFileSync(METERING_FILE, JSON.stringify(metering, null, 2), 'utf-8');
}

/** Get usage stats for an asset */
export function getUsageStats(assetId: string): { total: number; last_30_days: number; unique_users: number } {
  const { metering } = ensureCommerce();
  const records = metering.records.filter(r => r.asset_id === assetId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const recent = records.filter(r => r.timestamp >= thirtyDaysAgo);
  const uniqueUsers = new Set(records.map(r => r.user_id)).size;
  return { total: records.length, last_30_days: recent.length, unique_users: uniqueUsers };
}

/** Record a revenue event */
export function recordRevenue(assetId: string, creatorId: string, amount: number): RevenueEntry {
  const { revenue } = ensureCommerce();
  const splitPct = revenue.creator_split_pct / 100;
  const entry: RevenueEntry = {
    asset_id: assetId, creator_id: creatorId, amount,
    creator_share: Math.round(amount * splitPct),
    platform_share: Math.round(amount * (1 - splitPct)),
    timestamp: new Date().toISOString(),
  };
  revenue.entries.push(entry);
  writeFileSync(REVENUE_FILE, JSON.stringify(revenue, null, 2), 'utf-8');
  return entry;
}

/** Get creator earnings summary */
export function getCreatorEarnings(creatorId: string): { total_earned: number; total_share: number; asset_count: number } {
  const { revenue } = ensureCommerce();
  const entries = revenue.entries.filter(e => e.creator_id === creatorId);
  return {
    total_earned: entries.reduce((s, e) => s + e.amount, 0),
    total_share: entries.reduce((s, e) => s + e.creator_share, 0),
    asset_count: new Set(entries.map(e => e.asset_id)).size,
  };
}

/** Set creator revenue split percentage */
export function setCreatorSplit(pct: number): void {
  const { revenue } = ensureCommerce();
  revenue.creator_split_pct = Math.max(0, Math.min(100, pct));
  writeFileSync(REVENUE_FILE, JSON.stringify(revenue, null, 2), 'utf-8');
}
