/**
 * OpenClaw Platform Adapter
 * Imports/exports: .openclaw/ config, Skills (SKILL.md), Memory, AGENTS.md
 */
import { readFileSync, existsSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { PlatformAdapter, WalletAsset, AssetType, PushResult } from '../core/types.js';

export class OpenClawAdapter implements PlatformAdapter {
  readonly platform = 'openclaw';
  readonly displayName = 'OpenClaw';

  private readonly paths = {
    configDir: join(homedir(), '.openclaw'),
    agentsMd: join(process.cwd(), 'AGENTS.md'),
    skillsDir: join(homedir(), '.openclaw', 'skills'),
    memoryDir: join(homedir(), '.openclaw', 'memory'),
    settingsYaml: join(homedir(), '.openclaw', 'settings.yaml'),
  };

  async detect(): Promise<boolean> {
    return existsSync(this.paths.configDir) || existsSync(this.paths.agentsMd);
  }

  async pull(assetType?: AssetType): Promise<WalletAsset[]> {
    const assets: WalletAsset[] = [];

    if (!assetType || assetType === 'preference') {
      if (existsSync(this.paths.agentsMd)) {
        assets.push(this.makeAsset('preference', 2, 'OpenClaw AGENTS.md', ['openclaw', 'agents', 'rules'],
          'markdown', readFileSync(this.paths.agentsMd, 'utf-8')));
      }
      if (existsSync(this.paths.settingsYaml)) {
        assets.push(this.makeAsset('preference', 2, 'OpenClaw Settings', ['openclaw', 'settings'],
          'yaml', readFileSync(this.paths.settingsYaml, 'utf-8')));
      }
    }

    if (!assetType || assetType === 'skill') {
      if (existsSync(this.paths.skillsDir)) {
        for (const entry of readdirSync(this.paths.skillsDir, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            const skillMd = join(this.paths.skillsDir, entry.name, 'SKILL.md');
            if (existsSync(skillMd)) {
              assets.push(this.makeAsset('skill', 2, `OpenClaw Skill: ${entry.name}`,
                ['openclaw', 'skill', entry.name], 'markdown', readFileSync(skillMd, 'utf-8')));
            }
          }
        }
      }
    }

    if (!assetType || assetType === 'memory') {
      if (existsSync(this.paths.memoryDir)) {
        for (const file of readdirSync(this.paths.memoryDir)) {
          if (file.endsWith('.json') || file.endsWith('.jsonl')) {
            const content = readFileSync(join(this.paths.memoryDir, file), 'utf-8');
            assets.push(this.makeAsset('memory', 2, `OpenClaw Memory: ${file}`,
              ['openclaw', 'memory'], 'json', content));
          }
        }
      }
    }

    return assets;
  }

  async push(asset: WalletAsset): Promise<PushResult> {
    try {
      const native = await this.toNative(asset);
      if (asset.type === 'preference' && asset.tags.includes('agents')) {
        writeFileSync(this.paths.agentsMd, native, 'utf-8');
        return { success: true, platform: this.platform, asset_id: asset.id, message: 'Updated AGENTS.md' };
      }
      if (asset.type === 'skill') {
        const skillName = asset.name.replace(/^OpenClaw Skill: /, '').replace(/[^a-zA-Z0-9-_]/g, '-');
        const skillDir = join(this.paths.skillsDir, skillName);
        if (!existsSync(skillDir)) mkdirSync(skillDir, { recursive: true });
        writeFileSync(join(skillDir, 'SKILL.md'), native, 'utf-8');
        return { success: true, platform: this.platform, asset_id: asset.id, message: `Wrote skill: ${skillName}` };
      }
      return { success: false, platform: this.platform, asset_id: asset.id, message: 'Unsupported push type' };
    } catch (err) {
      return { success: false, platform: this.platform, asset_id: asset.id, message: String(err) };
    }
  }

  async toNative(asset: WalletAsset): Promise<string> { return asset.content.body; }
  async fromNative(raw: string, type: AssetType): Promise<WalletAsset> {
    return this.makeAsset(type, 2, `OpenClaw imported ${type}`, ['openclaw', 'imported'], type === 'memory' ? 'json' : 'markdown', raw);
  }

  private makeAsset(type: AssetType, level: 0|1|2, name: string, tags: string[], format: string, body: string): WalletAsset {
    const now = new Date().toISOString();
    return {
      id: `hw-${type.slice(0,3)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,
      type, level, name, version: '1.0.0', created_at: now, updated_at: now,
      author: { id: 'imported-openclaw' }, tags, compatibility: ['openclaw'],
      content: { format, body, metadata: { source: 'openclaw-adapter', imported_at: now } },
      sync: { strategy: 'manual', last_synced: { openclaw: now }, conflict_resolution: 'user-decides' },
    };
  }
}
