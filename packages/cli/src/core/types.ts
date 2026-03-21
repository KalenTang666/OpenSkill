/**
 * OpenSkill — Core Type Definitions v0.2.0
 * Phase 1 + Phase 2: Full type system
 */

// ─── Asset Types ─────────────────────────────────────────

export type AssetType = 'skill' | 'memory' | 'preference';
export type AssetLevel = 0 | 1 | 2;
export type SyncStrategy = 'auto' | 'manual' | 'on-change';
export type ConflictResolution = 'user-decides' | 'latest-wins' | 'merge';

// ─── Asset Schema v0.2 ──────────────────────────────────

export interface WalletAsset {
  id: string;
  type: AssetType;
  level: AssetLevel;
  name: string;
  version: string;
  created_at: string;
  updated_at: string;
  author: AssetAuthor;
  tags: string[];
  compatibility: string[];
  content: AssetContent;
  sync: SyncConfig;
  /** Phase 2: Team/org ownership */
  team?: string;
  /** Phase 2: Marketplace visibility */
  marketplace?: MarketplaceInfo;
}

export interface AssetAuthor {
  id: string;
  signature?: string;
}

export interface AssetContent {
  format: string;
  body: string;
  metadata: Record<string, unknown>;
}

export interface SyncConfig {
  strategy: SyncStrategy;
  last_synced: Record<string, string>;
  conflict_resolution: ConflictResolution;
}

/** Phase 2: Marketplace metadata */
export interface MarketplaceInfo {
  published: boolean;
  downloads: number;
  rating: number;
  price: 'free' | number;
  description: string;
}

// ─── Wallet Config ───────────────────────────────────────

export interface WalletConfig {
  schema_version: string;
  user: { id: string; name?: string; email?: string };
  adapters: Record<string, AdapterConfig>;
  defaults: {
    sync_strategy: SyncStrategy;
    conflict_resolution: ConflictResolution;
  };
  /** Phase 2: Teams this user belongs to */
  teams?: TeamConfig[];
}

export interface AdapterConfig {
  platform: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

/** Phase 2: Team wallet config */
export interface TeamConfig {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  shared_assets_dir: string;
}

// ─── Platform Adapter Interface ──────────────────────────

export interface PlatformAdapter {
  readonly platform: string;
  readonly displayName: string;
  detect(): Promise<boolean>;
  pull(assetType?: AssetType): Promise<WalletAsset[]>;
  push(asset: WalletAsset): Promise<PushResult>;
  toNative(asset: WalletAsset): Promise<string>;
  fromNative(raw: string, type: AssetType): Promise<WalletAsset>;
}

export interface PushResult {
  success: boolean;
  platform: string;
  asset_id: string;
  message?: string;
}

// ─── Diff & Conflict ─────────────────────────────────────

export interface AssetDiff {
  asset_id: string;
  field: string;
  local_value: string;
  remote_value: string;
  diff_type: 'added' | 'removed' | 'modified';
}

export interface ConflictReport {
  asset_id: string;
  platform: string;
  diffs: AssetDiff[];
  suggested_resolution: ConflictResolution;
  resolved: boolean;
}

export interface SyncResult {
  platform: string;
  pulled: number;
  pushed: number;
  conflicts: ConflictReport[];
  timestamp: string;
}

// ─── MCP ─────────────────────────────────────────────────

export interface MCPToolResult {
  content: Array<{ type: 'text'; text: string }>;
}
