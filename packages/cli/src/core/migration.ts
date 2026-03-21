/**
 * Migration Engine — Cross-platform AI identity migration
 *
 * Features:
 * - os migrate: one-click platform-to-platform migration
 * - os backup: export full AI identity as .osp bundle
 * - os restore: import from .osp bundle to any platform
 * - os onboard: deploy wallet contents to a new platform
 * - os health: cross-platform consistency audit
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

// ─── Types ───────────────────────────────────────────────

export interface MigrationPlan {
  source: string;
  target: string;
  assets: MigrationItem[];
  warnings: string[];
  created_at: string;
}

export interface MigrationItem {
  name: string;
  type: 'skill' | 'memory' | 'preference' | 'config';
  source_path: string;
  target_path: string;
  action: 'copy' | 'transform' | 'skip';
  transform_notes?: string;
  size: number;
}

export interface MigrationResult {
  plan: MigrationPlan;
  migrated: number;
  skipped: number;
  errors: string[];
  duration_ms: number;
}

export interface BackupBundle {
  version: '1.0';
  created_at: string;
  wallet_version: string;
  platforms: string[];
  assets: BackupAsset[];
  metadata: { total_size: number; asset_count: number; hash: string };
}

export interface BackupAsset {
  id: string;
  type: string;
  name: string;
  platform: string;
  content: string;
  format: string;
  tags: string[];
}

export interface HealthReport {
  scanned_at: string;
  platforms: PlatformHealth[];
  cross_platform: CrossPlatformHealth;
  overall_score: number;
  recommendations: string[];
}

export interface PlatformHealth {
  platform: string;
  detected: boolean;
  asset_count: number;
  issues: string[];
  score: number;
}

export interface CrossPlatformHealth {
  consistency_score: number;
  duplicates: number;
  gaps: string[];
  drift_warnings: string[];
}

// ─── Platform Config Maps ────────────────────────────────

const PLATFORM_CONFIGS: Record<string, { name: string; paths: Record<string, string>; transforms: Record<string, string> }> = {
  claude: {
    name: 'Claude',
    paths: {
      rules: join(homedir(), 'CLAUDE.md'),
      memory: join(homedir(), '.claude', 'memory.json'),
      skills: join(homedir(), '.claude', 'skills'),
      settings: join(homedir(), '.claude', 'settings.json'),
    },
    transforms: { rules_format: 'markdown', memory_format: 'json' },
  },
  codex: {
    name: 'Codex CLI',
    paths: {
      rules: 'AGENTS.md',
      skills: join(homedir(), '.codex', 'skills'),
      config: join(homedir(), '.codex', 'config.toml'),
    },
    transforms: { rules_format: 'markdown', config_format: 'toml' },
  },
  cursor: {
    name: 'Cursor',
    paths: { rules: '.cursorrules', project_rules: join('.cursor', 'rules') },
    transforms: { rules_format: 'markdown' },
  },
  copilot: {
    name: 'GitHub Copilot',
    paths: {
      rules: join('.github', 'copilot-instructions.md'),
      skills: join('.github', 'skills'),
    },
    transforms: { rules_format: 'markdown' },
  },
  gemini: {
    name: 'Gemini / Antigravity',
    paths: {
      rules: 'AGENTS.md',
      skills: join(homedir(), '.gemini', 'antigravity', 'skills'),
      settings: join(homedir(), '.gemini', 'settings.json'),
    },
    transforms: { rules_format: 'markdown' },
  },
  vscode: {
    name: 'VS Code',
    paths: {
      rules: join('.github', 'copilot-instructions.md'),
      settings: join('.vscode', 'settings.json'),
    },
    transforms: { rules_format: 'markdown', settings_format: 'json' },
  },
  windsurf: {
    name: 'Windsurf',
    paths: { rules: '.windsurfrules' },
    transforms: { rules_format: 'markdown' },
  },
  openclaw: {
    name: 'OpenClaw',
    paths: {
      rules: 'AGENTS.md',
      skills: join(homedir(), '.openclaw', 'skills'),
      memory: join(homedir(), '.openclaw', 'memory'),
      settings: join(homedir(), '.openclaw', 'settings.yaml'),
    },
    transforms: { rules_format: 'markdown', settings_format: 'yaml' },
  },
};

// ─── Migration ───────────────────────────────────────────

/** Generate a migration plan from source to target platform */
export function planMigration(source: string, target: string): MigrationPlan {
  const srcCfg = PLATFORM_CONFIGS[source];
  const tgtCfg = PLATFORM_CONFIGS[target];
  if (!srcCfg) throw new Error(`Unknown source platform: ${source}`);
  if (!tgtCfg) throw new Error(`Unknown target platform: ${target}`);

  const assets: MigrationItem[] = [];
  const warnings: string[] = [];

  // Map rules file
  if (srcCfg.paths.rules && tgtCfg.paths.rules) {
    const srcPath = srcCfg.paths.rules;
    if (existsSync(srcPath)) {
      const needsTransform = srcCfg.transforms.rules_format !== tgtCfg.transforms.rules_format;
      assets.push({
        name: `${srcCfg.name} rules → ${tgtCfg.name}`,
        type: 'preference',
        source_path: srcPath,
        target_path: tgtCfg.paths.rules,
        action: needsTransform ? 'transform' : 'copy',
        transform_notes: needsTransform ? `Convert ${srcCfg.transforms.rules_format} → ${tgtCfg.transforms.rules_format}` : undefined,
        size: readFileSync(srcPath, 'utf-8').length,
      });
    }
  }

  // Map skills
  if (srcCfg.paths.skills && tgtCfg.paths.skills) {
    const srcDir = srcCfg.paths.skills;
    if (existsSync(srcDir)) {
      try {
        for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            const skillMd = join(srcDir, entry.name, 'SKILL.md');
            if (existsSync(skillMd)) {
              assets.push({
                name: `Skill: ${entry.name}`,
                type: 'skill',
                source_path: skillMd,
                target_path: join(tgtCfg.paths.skills, entry.name, 'SKILL.md'),
                action: 'copy', // Skills use Agent Skills standard — direct copy
                size: readFileSync(skillMd, 'utf-8').length,
              });
            }
          }
        }
      } catch { /* permission denied */ }
    }
  } else if (srcCfg.paths.skills && !tgtCfg.paths.skills) {
    warnings.push(`${tgtCfg.name} does not support skills directory — skills will be skipped`);
  }

  // Map memory
  if (srcCfg.paths.memory && !tgtCfg.paths.memory) {
    warnings.push(`${tgtCfg.name} does not have a memory file — memory data will be stored in wallet only`);
  }

  // Map settings
  if (srcCfg.paths.settings && tgtCfg.paths.settings) {
    const srcPath = srcCfg.paths.settings;
    if (existsSync(srcPath)) {
      assets.push({
        name: `${srcCfg.name} settings → ${tgtCfg.name}`,
        type: 'config',
        source_path: srcPath,
        target_path: tgtCfg.paths.settings,
        action: 'transform',
        transform_notes: `Convert ${srcCfg.transforms.settings_format || srcCfg.transforms.config_format || 'unknown'} → ${tgtCfg.transforms.settings_format || tgtCfg.transforms.config_format || 'unknown'}`,
        size: readFileSync(srcPath, 'utf-8').length,
      });
    }
  }

  return { source, target, assets, warnings, created_at: new Date().toISOString() };
}

/** Execute a migration plan */
export function executeMigration(plan: MigrationPlan, dryRun: boolean = false): MigrationResult {
  const start = Date.now();
  let migrated = 0, skipped = 0;
  const errors: string[] = [];

  for (const item of plan.assets) {
    if (item.action === 'skip') { skipped++; continue; }
    try {
      if (!existsSync(item.source_path)) { errors.push(`Source not found: ${item.source_path}`); skipped++; continue; }
      const content = readFileSync(item.source_path, 'utf-8');

      if (!dryRun) {
        const targetDir = join(item.target_path, '..');
        if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
        // For 'transform' actions, we'd apply format conversion here
        // For now, Agent Skills standard means most files are directly compatible
        writeFileSync(item.target_path, content, 'utf-8');
      }
      migrated++;
    } catch (e) {
      errors.push(`Failed: ${item.name} — ${e}`);
    }
  }

  return { plan, migrated, skipped, errors, duration_ms: Date.now() - start };
}

// ─── Backup / Restore ────────────────────────────────────

/** Create a full wallet backup as .osp bundle */
export function createBackup(): BackupBundle {
  const walletDir = join(homedir(), '.openskill', 'assets');
  const assets: BackupAsset[] = [];

  if (existsSync(walletDir)) {
    for (const typeDir of ['skills', 'memories', 'preferences']) {
      const dir = join(walletDir, typeDir);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
        try {
          const data = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
          assets.push({
            id: data.id || file.replace('.json', ''),
            type: data.type || typeDir.slice(0, -1),
            name: data.name || file,
            platform: data.compatibility?.[0] || 'unknown',
            content: data.content?.body || '',
            format: data.content?.format || 'text',
            tags: data.tags || [],
          });
        } catch { /* skip corrupted */ }
      }
    }
  }

  const allContent = assets.map(a => a.content).join('');
  const bundle: BackupBundle = {
    version: '1.0',
    created_at: new Date().toISOString(),
    wallet_version: '0.7.0',
    platforms: [...new Set(assets.map(a => a.platform))],
    assets,
    metadata: {
      total_size: allContent.length,
      asset_count: assets.length,
      hash: createHash('sha256').update(allContent).digest('hex').slice(0, 32),
    },
  };

  return bundle;
}

/** Save backup to file */
export function saveBackup(outputPath?: string): string {
  const bundle = createBackup();
  const filename = outputPath || `openskill-backup-${new Date().toISOString().slice(0, 10)}.osp`;
  writeFileSync(filename, JSON.stringify(bundle, null, 2), 'utf-8');
  return filename;
}

/** Restore from a .osp backup file */
export function restoreBackup(filePath: string): { restored: number; errors: string[] } {
  const bundle: BackupBundle = JSON.parse(readFileSync(filePath, 'utf-8'));
  if (bundle.version !== '1.0') throw new Error(`Unsupported backup version: ${bundle.version}`);

  const walletDir = join(homedir(), '.openskill', 'assets');
  let restored = 0;
  const errors: string[] = [];

  for (const asset of bundle.assets) {
    try {
      const typeDir = { skill: 'skills', memory: 'memories', preference: 'preferences' }[asset.type] || 'preferences';
      const dir = join(walletDir, typeDir);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      const walletAsset = {
        id: asset.id,
        type: asset.type,
        level: 2,
        name: asset.name,
        version: '1.0.0',
        created_at: bundle.created_at,
        updated_at: new Date().toISOString(),
        author: { id: 'restored' },
        tags: asset.tags,
        compatibility: [asset.platform],
        content: { format: asset.format, body: asset.content, metadata: { restored_from: filePath } },
        sync: { strategy: 'manual', last_synced: {}, conflict_resolution: 'user-decides' },
      };

      writeFileSync(join(dir, `${asset.id}.json`), JSON.stringify(walletAsset, null, 2), 'utf-8');
      restored++;
    } catch (e) {
      errors.push(`${asset.name}: ${e}`);
    }
  }

  return { restored, errors };
}

// ─── Onboard ─────────────────────────────────────────────

/** Deploy wallet contents to a new platform */
export function onboardPlatform(platform: string): { deployed: number; files: string[] } {
  const cfg = PLATFORM_CONFIGS[platform];
  if (!cfg) throw new Error(`Unknown platform: ${platform}`);

  const walletDir = join(homedir(), '.openskill', 'assets');
  const deployed: string[] = [];

  // Deploy rules from wallet preferences
  if (cfg.paths.rules) {
    const prefsDir = join(walletDir, 'preferences');
    if (existsSync(prefsDir)) {
      const prefs = readdirSync(prefsDir).filter(f => f.endsWith('.json'));
      if (prefs.length > 0) {
        const pref = JSON.parse(readFileSync(join(prefsDir, prefs[0]), 'utf-8'));
        const targetDir = join(cfg.paths.rules, '..');
        if (targetDir !== '.') mkdirSync(targetDir, { recursive: true });
        writeFileSync(cfg.paths.rules, pref.content?.body || '', 'utf-8');
        deployed.push(cfg.paths.rules);
      }
    }
  }

  // Deploy skills from wallet
  if (cfg.paths.skills) {
    const skillsDir = join(walletDir, 'skills');
    if (existsSync(skillsDir)) {
      for (const file of readdirSync(skillsDir).filter(f => f.endsWith('.json'))) {
        try {
          const skill = JSON.parse(readFileSync(join(skillsDir, file), 'utf-8'));
          const name = skill.name?.replace(/[^a-zA-Z0-9-_]/g, '-') || file.replace('.json', '');
          const targetDir = join(cfg.paths.skills, name);
          mkdirSync(targetDir, { recursive: true });
          writeFileSync(join(targetDir, 'SKILL.md'), skill.content?.body || '', 'utf-8');
          deployed.push(join(targetDir, 'SKILL.md'));
        } catch { /* skip */ }
      }
    }
  }

  return { deployed: deployed.length, files: deployed };
}

// ─── Health Check ────────────────────────────────────────

/** Run a cross-platform health audit */
export function checkHealth(): HealthReport {
  const platforms: PlatformHealth[] = [];
  const allIssues: string[] = [];

  for (const [key, cfg] of Object.entries(PLATFORM_CONFIGS)) {
    let detected = false;
    let assetCount = 0;
    const issues: string[] = [];

    for (const [, path] of Object.entries(cfg.paths)) {
      if (existsSync(path)) { detected = true; assetCount++; }
    }

    // Check for common issues
    if (detected) {
      if (cfg.paths.rules && existsSync(cfg.paths.rules)) {
        const content = readFileSync(cfg.paths.rules, 'utf-8');
        if (content.length < 50) issues.push('Rules file is very short — may be incomplete');
        if (content.length > 50000) issues.push('Rules file is very large — may impact performance');
      }
    }

    const score = detected ? Math.max(0, 100 - issues.length * 15) : 0;
    platforms.push({ platform: key, detected, asset_count: assetCount, issues, score });
    allIssues.push(...issues.map(i => `[${key}] ${i}`));
  }

  // Cross-platform analysis
  const detectedPlatforms = platforms.filter(p => p.detected);
  const duplicateCount = 0; // Would need full content analysis
  const gaps: string[] = [];
  const drift: string[] = [];

  // Check if platforms with rules have consistent content
  const rulesContents: Record<string, string> = {};
  for (const p of detectedPlatforms) {
    const cfg = PLATFORM_CONFIGS[p.platform];
    if (cfg.paths.rules && existsSync(cfg.paths.rules)) {
      rulesContents[p.platform] = readFileSync(cfg.paths.rules, 'utf-8');
    }
  }

  const rulesPlatforms = Object.keys(rulesContents);
  if (rulesPlatforms.length >= 2) {
    // Check content similarity
    for (let i = 0; i < rulesPlatforms.length; i++) {
      for (let j = i + 1; j < rulesPlatforms.length; j++) {
        const a = rulesContents[rulesPlatforms[i]];
        const b = rulesContents[rulesPlatforms[j]];
        if (Math.abs(a.length - b.length) > a.length * 0.5) {
          drift.push(`Rules differ significantly: ${rulesPlatforms[i]} (${a.length} chars) vs ${rulesPlatforms[j]} (${b.length} chars)`);
        }
      }
    }
  }

  // Platforms without skills support
  for (const p of detectedPlatforms) {
    const cfg = PLATFORM_CONFIGS[p.platform];
    if (!cfg.paths.skills) gaps.push(`${p.platform} has no skills directory`);
  }

  const consistency = detectedPlatforms.length > 0
    ? Math.max(0, 100 - drift.length * 20 - gaps.length * 10)
    : 0;

  const overall = detectedPlatforms.length > 0
    ? Math.round((platforms.reduce((s, p) => s + p.score, 0) / platforms.length + consistency) / 2)
    : 0;

  const recommendations: string[] = [];
  if (drift.length) recommendations.push('Run `os migrate` to sync rules across platforms');
  if (gaps.length) recommendations.push('Run `os onboard <platform>` to fill gaps');
  if (detectedPlatforms.length === 0) recommendations.push('No AI platforms detected — install Claude Code, Cursor, or Codex CLI');
  if (allIssues.length) recommendations.push('Run `os analyze` for detailed quality scoring');

  return {
    scanned_at: new Date().toISOString(),
    platforms,
    cross_platform: { consistency_score: consistency, duplicates: duplicateCount, gaps, drift_warnings: drift },
    overall_score: overall,
    recommendations,
  };
}

/** Get list of supported platforms */
export function getSupportedPlatforms(): Array<{ id: string; name: string }> {
  return Object.entries(PLATFORM_CONFIGS).map(([id, cfg]) => ({ id, name: cfg.name }));
}
