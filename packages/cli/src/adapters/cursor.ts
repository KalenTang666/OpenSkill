/**
 * Cursor Platform Adapter
 * Imports/exports: .cursorrules, .cursor/ directory
 */
import { readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { PlatformAdapter, WalletAsset, AssetType, PushResult } from '../core/types.js';

export class CursorAdapter implements PlatformAdapter {
  readonly platform = 'cursor';
  readonly displayName = 'Cursor';

  private readonly paths = {
    cursorRules: join(process.cwd(), '.cursorrules'),
    cursorDir: join(process.cwd(), '.cursor'),
    globalRules: join(homedir(), '.cursor', 'rules'),
  };

  async detect(): Promise<boolean> {
    return existsSync(this.paths.cursorRules) || existsSync(this.paths.cursorDir) || existsSync(this.paths.globalRules);
  }

  async pull(assetType?: AssetType): Promise<WalletAsset[]> {
    const assets: WalletAsset[] = [];

    if (!assetType || assetType === 'preference') {
      if (existsSync(this.paths.cursorRules)) {
        assets.push(this.makeAsset('preference', 2, 'Cursor Rules (.cursorrules)',
          ['cursor', 'rules'], 'markdown', readFileSync(this.paths.cursorRules, 'utf-8')));
      }
      if (existsSync(this.paths.globalRules)) {
        for (const file of readdirSync(this.paths.globalRules).filter(f => f.endsWith('.md') || f.endsWith('.mdc'))) {
          assets.push(this.makeAsset('preference', 2, `Cursor Global Rule: ${file}`,
            ['cursor', 'rules', 'global'], 'markdown', readFileSync(join(this.paths.globalRules, file), 'utf-8')));
        }
      }
    }

    return assets;
  }

  async push(asset: WalletAsset): Promise<PushResult> {
    try {
      if (asset.type === 'preference' && asset.tags.includes('cursor')) {
        writeFileSync(this.paths.cursorRules, await this.toNative(asset), 'utf-8');
        return { success: true, platform: this.platform, asset_id: asset.id, message: 'Updated .cursorrules' };
      }
      return { success: false, platform: this.platform, asset_id: asset.id, message: 'Unsupported push type' };
    } catch (err) {
      return { success: false, platform: this.platform, asset_id: asset.id, message: String(err) };
    }
  }

  async toNative(asset: WalletAsset): Promise<string> { return asset.content.body; }
  async fromNative(raw: string, type: AssetType): Promise<WalletAsset> {
    return this.makeAsset(type, 2, `Cursor imported ${type}`, ['cursor', 'imported'], 'markdown', raw);
  }

  private makeAsset(type: AssetType, level: 0|1|2, name: string, tags: string[], format: string, body: string): WalletAsset {
    const now = new Date().toISOString();
    return {
      id: `hw-${type.slice(0,3)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,
      type, level, name, version: '1.0.0', created_at: now, updated_at: now,
      author: { id: 'imported-cursor' }, tags, compatibility: ['cursor'],
      content: { format, body, metadata: { source: 'cursor-adapter', imported_at: now } },
      sync: { strategy: 'manual', last_synced: { cursor: now }, conflict_resolution: 'user-decides' },
    };
  }
}
