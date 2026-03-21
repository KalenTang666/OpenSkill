/**
 * OpenAI Codex CLI Adapter
 * Imports/exports: ~/.codex/skills/, instructions.md
 */
import { readFileSync, existsSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { PlatformAdapter, WalletAsset, AssetType, PushResult } from '../core/types.js';

export class CodexAdapter implements PlatformAdapter {
  readonly platform = 'codex';
  readonly displayName = 'Codex CLI';

  private readonly paths = {
    codexDir: join(homedir(), '.codex'),
    skillsDir: join(homedir(), '.codex', 'skills'),
    systemSkills: join(homedir(), '.codex', 'skills', '.system'),
    instructions: join(process.cwd(), 'AGENTS.md'),
  };

  async detect(): Promise<boolean> {
    return existsSync(this.paths.codexDir) || existsSync(this.paths.instructions);
  }

  async pull(assetType?: AssetType): Promise<WalletAsset[]> {
    const assets: WalletAsset[] = [];
    if (!assetType || assetType === 'skill') {
      for (const dir of [this.paths.skillsDir, this.paths.systemSkills]) {
        if (!existsSync(dir)) continue;
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory()) {
            const sm = join(dir, e.name, 'SKILL.md');
            if (existsSync(sm)) assets.push(this.mk('skill', 2, `Codex Skill: ${e.name}`, ['codex', 'skill', e.name], 'markdown', readFileSync(sm, 'utf-8')));
          }
        }
      }
    }
    if (!assetType || assetType === 'preference') {
      if (existsSync(this.paths.instructions))
        assets.push(this.mk('preference', 2, 'Codex Instructions', ['codex', 'instructions'], 'markdown', readFileSync(this.paths.instructions, 'utf-8')));
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
  async fromNative(raw: string, type: AssetType): Promise<WalletAsset> { return this.mk(type, 2, `Codex imported ${type}`, ['codex'], 'markdown', raw); }

  private mk(type: AssetType, level: 0|1|2, name: string, tags: string[], fmt: string, body: string): WalletAsset {
    const now = new Date().toISOString();
    return { id: `hw-${type.slice(0,3)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`, type, level, name, version: '1.0.0', created_at: now, updated_at: now, author: { id: 'imported-codex' }, tags, compatibility: ['codex'], content: { format: fmt, body, metadata: { source: 'codex-adapter' } }, sync: { strategy: 'manual', last_synced: { codex: now }, conflict_resolution: 'user-decides' } };
  }
}
