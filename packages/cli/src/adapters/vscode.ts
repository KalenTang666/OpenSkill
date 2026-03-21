/**
 * VS Code Adapter (Phase 2)
 * Imports/exports: .vscode/settings.json, extensions, snippets, Copilot instructions
 */
import { readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { PlatformAdapter, WalletAsset, AssetType, PushResult } from '../core/types.js';

export class VSCodeAdapter implements PlatformAdapter {
  readonly platform = 'vscode';
  readonly displayName = 'VS Code';

  private readonly paths = {
    settings: join(process.cwd(), '.vscode', 'settings.json'),
    extensions: join(process.cwd(), '.vscode', 'extensions.json'),
    snippetsDir: join(homedir(), process.platform === 'darwin' ? 'Library/Application Support/Code/User/snippets' : '.config/Code/User/snippets'),
    copilotInstructions: join(process.cwd(), '.github', 'copilot-instructions.md'),
  };

  async detect(): Promise<boolean> {
    return existsSync(join(process.cwd(), '.vscode')) || existsSync(this.paths.copilotInstructions);
  }

  async pull(assetType?: AssetType): Promise<WalletAsset[]> {
    const assets: WalletAsset[] = [];

    if (!assetType || assetType === 'preference') {
      if (existsSync(this.paths.settings)) {
        assets.push(this.makeAsset('preference', 2, 'VS Code Settings', ['vscode', 'settings'], 'json',
          readFileSync(this.paths.settings, 'utf-8')));
      }
      if (existsSync(this.paths.copilotInstructions)) {
        assets.push(this.makeAsset('preference', 2, 'GitHub Copilot Instructions', ['vscode', 'copilot', 'instructions'],
          'markdown', readFileSync(this.paths.copilotInstructions, 'utf-8')));
      }
    }

    if (!assetType || assetType === 'skill') {
      if (existsSync(this.paths.snippetsDir)) {
        for (const file of readdirSync(this.paths.snippetsDir).filter(f => f.endsWith('.json'))) {
          assets.push(this.makeAsset('skill', 2, `VS Code Snippet: ${file.replace('.json','')}`, ['vscode', 'snippet'],
            'json', readFileSync(join(this.paths.snippetsDir, file), 'utf-8')));
        }
      }
    }

    return assets;
  }

  async push(asset: WalletAsset): Promise<PushResult> {
    try {
      if (asset.type === 'preference' && asset.tags.includes('copilot')) {
        writeFileSync(this.paths.copilotInstructions, await this.toNative(asset), 'utf-8');
        return { success: true, platform: this.platform, asset_id: asset.id, message: 'Updated copilot-instructions.md' };
      }
      if (asset.type === 'preference' && asset.tags.includes('settings')) {
        writeFileSync(this.paths.settings, await this.toNative(asset), 'utf-8');
        return { success: true, platform: this.platform, asset_id: asset.id, message: 'Updated .vscode/settings.json' };
      }
      return { success: false, platform: this.platform, asset_id: asset.id, message: 'Unsupported push type' };
    } catch (err) {
      return { success: false, platform: this.platform, asset_id: asset.id, message: String(err) };
    }
  }

  async toNative(asset: WalletAsset): Promise<string> { return asset.content.body; }
  async fromNative(raw: string, type: AssetType): Promise<WalletAsset> {
    return this.makeAsset(type, 2, `VS Code imported ${type}`, ['vscode', 'imported'], 'json', raw);
  }

  private makeAsset(type: AssetType, level: 0|1|2, name: string, tags: string[], format: string, body: string): WalletAsset {
    const now = new Date().toISOString();
    return {
      id: `hw-${type.slice(0,3)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,
      type, level, name, version: '1.0.0', created_at: now, updated_at: now,
      author: { id: 'imported-vscode' }, tags, compatibility: ['vscode'],
      content: { format, body, metadata: { source: 'vscode-adapter', imported_at: now } },
      sync: { strategy: 'manual', last_synced: { vscode: now }, conflict_resolution: 'user-decides' },
    };
  }
}
