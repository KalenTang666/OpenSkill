/**
 * Windsurf Adapter (Phase 2)
 * Imports/exports: .windsurfrules, .windsurf/ directory
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PlatformAdapter, WalletAsset, AssetType, PushResult } from '../core/types.js';

export class WindsurfAdapter implements PlatformAdapter {
  readonly platform = 'windsurf';
  readonly displayName = 'Windsurf';

  private readonly paths = {
    rules: join(process.cwd(), '.windsurfrules'),
    globalRules: join(process.cwd(), '.windsurf', 'rules'),
  };

  async detect(): Promise<boolean> {
    return existsSync(this.paths.rules) || existsSync(this.paths.globalRules);
  }

  async pull(assetType?: AssetType): Promise<WalletAsset[]> {
    const assets: WalletAsset[] = [];
    if (!assetType || assetType === 'preference') {
      if (existsSync(this.paths.rules)) {
        assets.push(this.makeAsset('preference', 2, 'Windsurf Rules (.windsurfrules)',
          ['windsurf', 'rules'], 'markdown', readFileSync(this.paths.rules, 'utf-8')));
      }
    }
    return assets;
  }

  async push(asset: WalletAsset): Promise<PushResult> {
    try {
      if (asset.type === 'preference' && asset.tags.includes('windsurf')) {
        writeFileSync(this.paths.rules, await this.toNative(asset), 'utf-8');
        return { success: true, platform: this.platform, asset_id: asset.id, message: 'Updated .windsurfrules' };
      }
      return { success: false, platform: this.platform, asset_id: asset.id, message: 'Unsupported push type' };
    } catch (err) {
      return { success: false, platform: this.platform, asset_id: asset.id, message: String(err) };
    }
  }

  async toNative(asset: WalletAsset): Promise<string> { return asset.content.body; }
  async fromNative(raw: string, type: AssetType): Promise<WalletAsset> {
    return this.makeAsset(type, 2, `Windsurf imported ${type}`, ['windsurf', 'imported'], 'markdown', raw);
  }

  private makeAsset(type: AssetType, level: 0|1|2, name: string, tags: string[], format: string, body: string): WalletAsset {
    const now = new Date().toISOString();
    return {
      id: `hw-${type.slice(0,3)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,
      type, level, name, version: '1.0.0', created_at: now, updated_at: now,
      author: { id: 'imported-windsurf' }, tags, compatibility: ['windsurf'],
      content: { format, body, metadata: { source: 'windsurf-adapter', imported_at: now } },
      sync: { strategy: 'manual', last_synced: { windsurf: now }, conflict_resolution: 'user-decides' },
    };
  }
}
