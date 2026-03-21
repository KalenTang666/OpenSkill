/**
 * Claude Platform Adapter
 *
 * Imports/exports assets from Claude Code configuration:
 * - CLAUDE.md files (preferences + skills)
 * - Memory (claude memory JSON)
 * - Project-level .claude/ directories
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { PlatformAdapter, WalletAsset, AssetType, PushResult } from '../core/types.js';

export class ClaudeAdapter implements PlatformAdapter {
  readonly platform = 'claude';
  readonly displayName = 'Claude Code';

  private readonly paths = {
    globalClaude: join(homedir(), 'CLAUDE.md'),
    claudeDir: join(homedir(), '.claude'),
    memoryJson: join(homedir(), '.claude', 'memory.json'),
    settingsJson: join(homedir(), '.claude', 'settings.json'),
  };

  async detect(): Promise<boolean> {
    return existsSync(this.paths.globalClaude) || existsSync(this.paths.claudeDir);
  }

  async pull(assetType?: AssetType): Promise<WalletAsset[]> {
    const assets: WalletAsset[] = [];

    if (!assetType || assetType === 'preference') {
      // Pull CLAUDE.md as a preference asset
      if (existsSync(this.paths.globalClaude)) {
        const content = readFileSync(this.paths.globalClaude, 'utf-8');
        assets.push(this.createAsset({
          type: 'preference',
          level: 2,
          name: 'Claude Global Rules (CLAUDE.md)',
          tags: ['claude', 'rules', 'global'],
          format: 'markdown',
          body: content,
        }));
      }
    }

    if (!assetType || assetType === 'memory') {
      // Pull memory.json as a memory asset
      if (existsSync(this.paths.memoryJson)) {
        const content = readFileSync(this.paths.memoryJson, 'utf-8');
        assets.push(this.createAsset({
          type: 'memory',
          level: 2,
          name: 'Claude Memory Store',
          tags: ['claude', 'memory', 'knowledge-graph'],
          format: 'json',
          body: content,
        }));
      }
    }

    if (!assetType || assetType === 'skill') {
      // Pull skills from .claude/skills/ if exists
      const skillsDir = join(this.paths.claudeDir, 'skills');
      if (existsSync(skillsDir)) {
        const { readdirSync } = await import('node:fs');
        for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            const skillMd = join(skillsDir, entry.name, 'SKILL.md');
            if (existsSync(skillMd)) {
              const content = readFileSync(skillMd, 'utf-8');
              assets.push(this.createAsset({
                type: 'skill',
                level: 2,
                name: `Claude Skill: ${entry.name}`,
                tags: ['claude', 'skill', entry.name],
                format: 'markdown',
                body: content,
              }));
            }
          }
        }
      }
    }

    return assets;
  }

  async push(asset: WalletAsset): Promise<PushResult> {
    try {
      const native = await this.toNative(asset);

      if (asset.type === 'preference' && asset.tags.includes('claude')) {
        writeFileSync(this.paths.globalClaude, native, 'utf-8');
        return { success: true, platform: this.platform, asset_id: asset.id, message: 'Updated CLAUDE.md' };
      }

      if (asset.type === 'memory') {
        writeFileSync(this.paths.memoryJson, native, 'utf-8');
        return { success: true, platform: this.platform, asset_id: asset.id, message: 'Updated memory.json' };
      }

      return { success: false, platform: this.platform, asset_id: asset.id, message: 'Unsupported asset type for push' };
    } catch (err) {
      return { success: false, platform: this.platform, asset_id: asset.id, message: String(err) };
    }
  }

  async toNative(asset: WalletAsset): Promise<string> {
    // For L2 assets, content body is already in native format
    if (asset.level === 2) return asset.content.body;

    // For L1 assets, transform to CLAUDE.md section format
    if (asset.level === 1 && asset.type === 'preference') {
      return `## ${asset.name}\n\n${asset.content.body}\n`;
    }

    return asset.content.body;
  }

  async fromNative(raw: string, type: AssetType): Promise<WalletAsset> {
    return this.createAsset({
      type,
      level: 2,
      name: `Claude imported ${type}`,
      tags: ['claude', 'imported'],
      format: type === 'memory' ? 'json' : 'markdown',
      body: raw,
    });
  }

  // ── Helpers ────────────────────────────────────────────

  private createAsset(params: {
    type: AssetType;
    level: 0 | 1 | 2;
    name: string;
    tags: string[];
    format: string;
    body: string;
  }): WalletAsset {
    const now = new Date().toISOString();
    return {
      id: `hw-${params.type.slice(0, 3)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      type: params.type,
      level: params.level,
      name: params.name,
      version: '1.0.0',
      created_at: now,
      updated_at: now,
      author: { id: 'imported-claude' },
      tags: params.tags,
      compatibility: ['claude'],
      content: {
        format: params.format,
        body: params.body,
        metadata: { source: 'claude-adapter', imported_at: now },
      },
      sync: {
        strategy: 'manual',
        last_synced: { claude: now },
        conflict_resolution: 'user-decides',
      },
    };
  }
}
