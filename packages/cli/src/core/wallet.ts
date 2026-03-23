/**
 * Wallet Core v0.2.0 — Phase 1 + Phase 2
 * Full implementation: CRUD, versioning, conflict resolution, teams, marketplace
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { WalletAsset, WalletConfig, AssetType, AssetLevel, SyncStrategy, ConflictResolution, AssetDiff, ConflictReport, SyncResult, TeamConfig, MarketplaceInfo, PlatformAdapter } from './types.js';

const WALLET_DIR = join(homedir(), '.openskill');
const ASSETS_DIR = join(WALLET_DIR, 'assets');
const HISTORY_DIR = join(WALLET_DIR, 'history');
const TEAMS_DIR = join(WALLET_DIR, 'teams');
const MARKETPLACE_DIR = join(WALLET_DIR, 'marketplace');
const CONFIG_FILE = join(WALLET_DIR, 'config.json');
const SCHEMA_VERSION = '0.2.0';

export class Wallet {
  private config: WalletConfig;

  constructor(customDir?: string) {
    const configPath = customDir ? join(customDir, 'config.json') : CONFIG_FILE;
    if (!existsSync(configPath)) {
      throw new Error('Wallet not initialized. Run `oski init` first.');
    }
    this.config = JSON.parse(readFileSync(configPath, 'utf-8'));
  }

  static get walletDir(): string { return WALLET_DIR; }

  static isInitialized(): boolean { return existsSync(CONFIG_FILE); }

  static initialize(userId?: string, userName?: string): Wallet {
    const dirs = [
      WALLET_DIR, ASSETS_DIR, HISTORY_DIR, TEAMS_DIR, MARKETPLACE_DIR,
      join(ASSETS_DIR, 'skills'), join(ASSETS_DIR, 'memories'), join(ASSETS_DIR, 'preferences'),
    ];
    for (const dir of dirs) {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    }
    const config: WalletConfig = {
      schema_version: SCHEMA_VERSION,
      user: { id: userId ?? `user-${Date.now().toString(36)}`, name: userName },
      adapters: {},
      defaults: { sync_strategy: 'manual', conflict_resolution: 'user-decides' },
      teams: [],
    };
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return new Wallet();
  }

  getConfig(): WalletConfig { return { ...this.config }; }

  // ── Asset Directories ──────────────────────────────────

  private assetDir(type: AssetType): string {
    return join(ASSETS_DIR, { skill: 'skills', memory: 'memories', preference: 'preferences' }[type]);
  }

  private assetPath(asset: { type: AssetType; id: string }): string {
    return join(this.assetDir(asset.type as AssetType), `${asset.id}.json`);
  }

  // ── CRUD ───────────────────────────────────────────────

  createAsset(params: {
    type: AssetType; level: AssetLevel; name: string; tags: string[];
    compatibility: string[]; content: { format: string; body: string; metadata?: Record<string, unknown> };
    sync_strategy?: SyncStrategy; conflict_resolution?: ConflictResolution;
    team?: string; marketplace?: MarketplaceInfo;
  }): WalletAsset {
    const now = new Date().toISOString();
    const asset: WalletAsset = {
      id: `hw-${params.type.slice(0, 3)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      type: params.type, level: params.level, name: params.name,
      version: '1.0.0', created_at: now, updated_at: now,
      author: { id: this.config.user.id },
      tags: params.tags, compatibility: params.compatibility,
      content: { format: params.content.format, body: params.content.body, metadata: params.content.metadata ?? {} },
      sync: {
        strategy: params.sync_strategy ?? this.config.defaults.sync_strategy,
        last_synced: {},
        conflict_resolution: params.conflict_resolution ?? this.config.defaults.conflict_resolution,
      },
      team: params.team, marketplace: params.marketplace,
    };
    writeFileSync(this.assetPath(asset), JSON.stringify(asset, null, 2), 'utf-8');
    this.saveHistory(asset, 'create');
    return asset;
  }

  getAsset(id: string): WalletAsset | null {
    for (const type of ['skill', 'memory', 'preference'] as AssetType[]) {
      const path = join(this.assetDir(type), `${id}.json`);
      if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'));
    }
    return null;
  }

  listAssets(filter?: { type?: AssetType; tags?: string[]; level?: AssetLevel; search?: string; team?: string }): WalletAsset[] {
    const types: AssetType[] = filter?.type ? [filter.type] : ['skill', 'memory', 'preference'];
    const assets: WalletAsset[] = [];
    for (const type of types) {
      const dir = this.assetDir(type);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir)) {
        if (!file.endsWith('.json')) continue;
        try {
          const asset: WalletAsset = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
          if (filter?.level !== undefined && asset.level !== filter.level) continue;
          if (filter?.tags?.length && !filter.tags.some(t => asset.tags.includes(t))) continue;
          if (filter?.team && asset.team !== filter.team) continue;
          if (filter?.search) {
            const q = filter.search.toLowerCase();
            if (!asset.name.toLowerCase().includes(q) &&
                !asset.tags.some(t => t.toLowerCase().includes(q)) &&
                !asset.content.body.toLowerCase().includes(q)) continue;
          }
          assets.push(asset);
        } catch { /* skip invalid */ }
      }
    }
    return assets.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  updateAsset(id: string, updates: Partial<Pick<WalletAsset, 'name' | 'tags' | 'content' | 'compatibility' | 'marketplace'>>): WalletAsset | null {
    const asset = this.getAsset(id);
    if (!asset) return null;
    const updated: WalletAsset = { ...asset, ...updates, updated_at: new Date().toISOString(), version: this.bumpVersion(asset.version) };
    writeFileSync(this.assetPath(updated), JSON.stringify(updated, null, 2), 'utf-8');
    this.saveHistory(updated, 'update');
    return updated;
  }

  deleteAsset(id: string): boolean {
    const asset = this.getAsset(id);
    if (!asset) return false;
    const path = this.assetPath(asset);
    if (existsSync(path)) { unlinkSync(path); return true; }
    return false;
  }

  // ── Version Control ────────────────────────────────────

  private bumpVersion(version: string, type: 'patch' | 'minor' | 'major' = 'patch'): string {
    const [major, minor, patch] = version.split('.').map(Number);
    if (type === 'major') return `${major + 1}.0.0`;
    if (type === 'minor') return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
  }

  private saveHistory(asset: WalletAsset, action: string): void {
    const histDir = join(HISTORY_DIR, asset.id);
    if (!existsSync(histDir)) mkdirSync(histDir, { recursive: true });
    const entry = { ...asset, _action: action, _timestamp: new Date().toISOString() };
    writeFileSync(join(histDir, `${asset.version}.json`), JSON.stringify(entry, null, 2), 'utf-8');
  }

  getHistory(id: string): Array<{ version: string; action: string; timestamp: string }> {
    const histDir = join(HISTORY_DIR, id);
    if (!existsSync(histDir)) return [];
    return readdirSync(histDir).filter(f => f.endsWith('.json')).map(f => {
      const data = JSON.parse(readFileSync(join(histDir, f), 'utf-8'));
      return { version: data.version, action: data._action, timestamp: data._timestamp };
    }).sort((a, b) => a.version.localeCompare(b.version));
  }

  // ── Conflict Resolution ────────────────────────────────

  diff(localAsset: WalletAsset, remoteAsset: WalletAsset): AssetDiff[] {
    const diffs: AssetDiff[] = [];
    if (localAsset.name !== remoteAsset.name)
      diffs.push({ asset_id: localAsset.id, field: 'name', local_value: localAsset.name, remote_value: remoteAsset.name, diff_type: 'modified' });
    if (localAsset.content.body !== remoteAsset.content.body)
      diffs.push({ asset_id: localAsset.id, field: 'content.body', local_value: `${localAsset.content.body.length} chars`, remote_value: `${remoteAsset.content.body.length} chars`, diff_type: 'modified' });
    if (JSON.stringify(localAsset.tags) !== JSON.stringify(remoteAsset.tags))
      diffs.push({ asset_id: localAsset.id, field: 'tags', local_value: localAsset.tags.join(','), remote_value: remoteAsset.tags.join(','), diff_type: 'modified' });
    if (localAsset.version !== remoteAsset.version)
      diffs.push({ asset_id: localAsset.id, field: 'version', local_value: localAsset.version, remote_value: remoteAsset.version, diff_type: 'modified' });
    return diffs;
  }

  resolveConflict(local: WalletAsset, remote: WalletAsset, strategy: ConflictResolution): WalletAsset {
    if (strategy === 'latest-wins') {
      return new Date(local.updated_at) >= new Date(remote.updated_at) ? local : remote;
    }
    if (strategy === 'merge') {
      return {
        ...local,
        tags: [...new Set([...local.tags, ...remote.tags])],
        compatibility: [...new Set([...local.compatibility, ...remote.compatibility])],
        content: { ...local.content, body: local.content.body.length >= remote.content.body.length ? local.content.body : remote.content.body },
        updated_at: new Date().toISOString(),
        version: this.bumpVersion(local.version, 'minor'),
      };
    }
    return local; // user-decides default: keep local
  }

  // ── Sync Engine ────────────────────────────────────────

  async syncWithPlatform(adapter: PlatformAdapter, direction: 'pull' | 'push' | 'both' = 'both'): Promise<SyncResult> {
    const result: SyncResult = { platform: adapter.platform, pulled: 0, pushed: 0, conflicts: [], timestamp: new Date().toISOString() };

    if (direction === 'pull' || direction === 'both') {
      const remoteAssets = await adapter.pull();
      for (const remote of remoteAssets) {
        const local = this.listAssets({ search: remote.name }).find(a => a.name === remote.name);
        if (!local) {
          this.createAsset({ type: remote.type, level: remote.level, name: remote.name, tags: remote.tags, compatibility: remote.compatibility, content: remote.content });
          result.pulled++;
        } else {
          const diffs = this.diff(local, remote);
          if (diffs.length > 0) {
            const resolved = this.resolveConflict(local, remote, local.sync.conflict_resolution);
            this.updateAsset(local.id, { name: resolved.name, tags: resolved.tags, content: resolved.content, compatibility: resolved.compatibility });
            result.conflicts.push({ asset_id: local.id, platform: adapter.platform, diffs, suggested_resolution: local.sync.conflict_resolution, resolved: true });
            result.pulled++;
          }
        }
      }
    }

    if (direction === 'push' || direction === 'both') {
      const localAssets = this.listAssets();
      for (const asset of localAssets) {
        if (asset.compatibility.includes(adapter.platform)) {
          const pushResult = await adapter.push(asset);
          if (pushResult.success) result.pushed++;
        }
      }
    }

    return result;
  }

  // ── Team Wallets (Phase 2) ─────────────────────────────

  createTeam(teamId: string, teamName: string): TeamConfig {
    const teamDir = join(TEAMS_DIR, teamId);
    for (const sub of [teamDir, join(teamDir, 'skills'), join(teamDir, 'memories'), join(teamDir, 'preferences')]) {
      if (!existsSync(sub)) mkdirSync(sub, { recursive: true });
    }
    const team: TeamConfig = { id: teamId, name: teamName, role: 'owner', shared_assets_dir: teamDir };
    if (!this.config.teams) this.config.teams = [];
    this.config.teams.push(team);
    writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
    return team;
  }

  listTeams(): TeamConfig[] { return this.config.teams ?? []; }

  shareAssetToTeam(assetId: string, teamId: string): boolean {
    const asset = this.getAsset(assetId);
    if (!asset) return false;
    const teamDir = join(TEAMS_DIR, teamId, { skill: 'skills', memory: 'memories', preference: 'preferences' }[asset.type]);
    if (!existsSync(teamDir)) return false;
    const shared = { ...asset, team: teamId, updated_at: new Date().toISOString() };
    writeFileSync(join(teamDir, `${asset.id}.json`), JSON.stringify(shared, null, 2), 'utf-8');
    return true;
  }

  listTeamAssets(teamId: string): WalletAsset[] {
    const assets: WalletAsset[] = [];
    const teamDir = join(TEAMS_DIR, teamId);
    if (!existsSync(teamDir)) return assets;
    for (const sub of ['skills', 'memories', 'preferences']) {
      const dir = join(teamDir, sub);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir)) {
        if (!file.endsWith('.json')) continue;
        try { assets.push(JSON.parse(readFileSync(join(dir, file), 'utf-8'))); } catch {}
      }
    }
    return assets;
  }

  // ── Marketplace (Phase 2) ──────────────────────────────

  publishToMarketplace(assetId: string, description: string, price: 'free' | number = 'free'): WalletAsset | null {
    const asset = this.getAsset(assetId);
    if (!asset) return null;
    const info: MarketplaceInfo = { published: true, downloads: 0, rating: 0, price, description };
    const updated = this.updateAsset(assetId, { marketplace: info });
    if (updated) {
      const mpDir = join(MARKETPLACE_DIR, updated.type + 's');
      if (!existsSync(mpDir)) mkdirSync(mpDir, { recursive: true });
      writeFileSync(join(mpDir, `${updated.id}.json`), JSON.stringify(updated, null, 2), 'utf-8');
    }
    return updated;
  }

  listMarketplace(type?: AssetType): WalletAsset[] {
    const assets: WalletAsset[] = [];
    const dirs = type ? [`${type}s`] : ['skills', 'memories', 'preferences'];
    for (const sub of dirs) {
      const dir = join(MARKETPLACE_DIR, sub);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir)) {
        if (!file.endsWith('.json')) continue;
        try { assets.push(JSON.parse(readFileSync(join(dir, file), 'utf-8'))); } catch {}
      }
    }
    return assets;
  }

  // ── Stats ──────────────────────────────────────────────

  stats(): { skills: number; memories: number; preferences: number; total: number; teams: number; marketplace: number } {
    const skills = this.listAssets({ type: 'skill' }).length;
    const memories = this.listAssets({ type: 'memory' }).length;
    const preferences = this.listAssets({ type: 'preference' }).length;
    const teams = (this.config.teams ?? []).length;
    const marketplace = this.listMarketplace().length;
    return { skills, memories, preferences, total: skills + memories + preferences, teams, marketplace };
  }
}
