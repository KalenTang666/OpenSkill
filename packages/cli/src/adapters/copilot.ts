/**
 * GitHub Copilot Adapter
 * Imports/exports: .github/copilot-instructions.md, .github/skills/
 */
import { readFileSync, existsSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { PlatformAdapter, WalletAsset, AssetType, PushResult } from '../core/types.js';

export class CopilotAdapter implements PlatformAdapter {
  readonly platform = 'copilot';
  readonly displayName = 'GitHub Copilot';

  private readonly paths = {
    instructions: join(process.cwd(), '.github', 'copilot-instructions.md'),
    skillsDir: join(process.cwd(), '.github', 'skills'),
  };

  async detect(): Promise<boolean> {
    return existsSync(this.paths.instructions) || existsSync(this.paths.skillsDir);
  }

  async pull(assetType?: AssetType): Promise<WalletAsset[]> {
    const assets: WalletAsset[] = [];
    if (!assetType || assetType === 'preference') {
      if (existsSync(this.paths.instructions))
        assets.push(this.mk('preference', 2, 'Copilot Instructions', ['copilot', 'instructions'], 'markdown', readFileSync(this.paths.instructions, 'utf-8')));
    }
    if (!assetType || assetType === 'skill') {
      if (existsSync(this.paths.skillsDir)) {
        for (const e of readdirSync(this.paths.skillsDir, { withFileTypes: true })) {
          if (e.isDirectory()) {
            const sm = join(this.paths.skillsDir, e.name, 'SKILL.md');
            if (existsSync(sm)) assets.push(this.mk('skill', 2, `Copilot Skill: ${e.name}`, ['copilot', 'skill', e.name], 'markdown', readFileSync(sm, 'utf-8')));
          }
        }
      }
    }
    return assets;
  }

  async push(asset: WalletAsset): Promise<PushResult> {
    try {
      if (asset.type === 'preference' && asset.tags.includes('copilot')) {
        const dir = join(process.cwd(), '.github');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(this.paths.instructions, await this.toNative(asset), 'utf-8');
        return { success: true, platform: this.platform, asset_id: asset.id, message: 'Updated copilot-instructions.md' };
      }
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
  async fromNative(raw: string, type: AssetType): Promise<WalletAsset> { return this.mk(type, 2, `Copilot imported ${type}`, ['copilot'], 'markdown', raw); }

  private mk(type: AssetType, level: 0|1|2, name: string, tags: string[], fmt: string, body: string): WalletAsset {
    const now = new Date().toISOString();
    return { id: `hw-${type.slice(0,3)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`, type, level, name, version: '1.0.0', created_at: now, updated_at: now, author: { id: 'imported-copilot' }, tags, compatibility: ['copilot'], content: { format: fmt, body, metadata: { source: 'copilot-adapter' } }, sync: { strategy: 'manual', last_synced: { copilot: now }, conflict_resolution: 'user-decides' } };
  }
}
