/**
 * Gemini / Antigravity Adapter
 * Imports/exports: .gemini/ directory, AGENTS.md, skills
 */
import { readFileSync, existsSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { PlatformAdapter, WalletAsset, AssetType, PushResult } from '../core/types.js';

export class GeminiAdapter implements PlatformAdapter {
  readonly platform = 'gemini';
  readonly displayName = 'Gemini / Antigravity';

  private readonly paths = {
    geminiDir: join(homedir(), '.gemini'),
    agentsMd: join(process.cwd(), 'AGENTS.md'),
    skillsDir: join(homedir(), '.gemini', 'antigravity', 'skills'),
    settingsJson: join(homedir(), '.gemini', 'settings.json'),
  };

  async detect(): Promise<boolean> {
    return existsSync(this.paths.geminiDir) || existsSync(this.paths.agentsMd);
  }

  async pull(assetType?: AssetType): Promise<WalletAsset[]> {
    const assets: WalletAsset[] = [];
    if (!assetType || assetType === 'preference') {
      if (existsSync(this.paths.agentsMd))
        assets.push(this.mk('preference', 2, 'Gemini AGENTS.md', ['gemini', 'agents'], 'markdown', readFileSync(this.paths.agentsMd, 'utf-8')));
      if (existsSync(this.paths.settingsJson))
        assets.push(this.mk('preference', 2, 'Gemini Settings', ['gemini', 'settings'], 'json', readFileSync(this.paths.settingsJson, 'utf-8')));
    }
    if (!assetType || assetType === 'skill') {
      if (existsSync(this.paths.skillsDir)) {
        for (const e of readdirSync(this.paths.skillsDir, { withFileTypes: true })) {
          if (e.isDirectory()) {
            const sm = join(this.paths.skillsDir, e.name, 'SKILL.md');
            if (existsSync(sm)) assets.push(this.mk('skill', 2, `Gemini Skill: ${e.name}`, ['gemini', 'skill', e.name], 'markdown', readFileSync(sm, 'utf-8')));
          }
        }
      }
    }
    return assets;
  }

  async push(asset: WalletAsset): Promise<PushResult> {
    try {
      if (asset.type === 'skill') {
        const name = asset.name.replace(/.*: /, '').replace(/[^a-zA-Z0-9-_]/g, '-');
        const dir = join(this.paths.skillsDir, name);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'SKILL.md'), await this.toNative(asset), 'utf-8');
        return { success: true, platform: this.platform, asset_id: asset.id, message: `Wrote skill: ${name}` };
      }
      return { success: false, platform: this.platform, asset_id: asset.id, message: 'Unsupported type' };
    } catch (e) { return { success: false, platform: this.platform, asset_id: asset.id, message: String(e) }; }
  }

  async toNative(a: WalletAsset): Promise<string> { return a.content.body; }
  async fromNative(raw: string, type: AssetType): Promise<WalletAsset> {
    return this.mk(type, 2, `Gemini imported ${type}`, ['gemini', 'imported'], 'markdown', raw);
  }

  private mk(type: AssetType, level: 0|1|2, name: string, tags: string[], fmt: string, body: string): WalletAsset {
    const now = new Date().toISOString();
    return { id: `hw-${type.slice(0,3)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`, type, level, name, version: '1.0.0', created_at: now, updated_at: now, author: { id: 'imported-gemini' }, tags, compatibility: ['gemini'], content: { format: fmt, body, metadata: { source: 'gemini-adapter' } }, sync: { strategy: 'manual', last_synced: { gemini: now }, conflict_resolution: 'user-decides' } };
  }
}
