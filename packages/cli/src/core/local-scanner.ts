/**
 * Local Scanner — Discovers AI skills, configs, and memory across user's machine
 *
 * Scans known platform directories and produces a unified inventory
 * of what the user has installed across all their AI tools.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { homedir } from 'node:os';

export interface DiscoveredAsset {
  path: string;
  platform: string;
  type: 'skill' | 'memory' | 'preference' | 'config';
  name: string;
  size: number;
  modified: string;
  content_preview: string;
  format: string;
}

export interface ScanResult {
  scanned_at: string;
  platforms_detected: string[];
  total_assets: number;
  assets: DiscoveredAsset[];
  scan_paths: Array<{ path: string; exists: boolean; platform: string }>;
}

/** All known platform scan targets */
function getScanTargets(): Array<{ platform: string; paths: Array<{ path: string; type: DiscoveredAsset['type']; pattern?: string }> }> {
  const home = homedir();
  const cwd = process.cwd();

  return [
    {
      platform: 'claude',
      paths: [
        { path: join(home, 'CLAUDE.md'), type: 'preference' },
        { path: join(cwd, 'CLAUDE.md'), type: 'preference' },
        { path: join(home, '.claude', 'settings.json'), type: 'config' },
        { path: join(home, '.claude', 'memory.json'), type: 'memory' },
        { path: join(home, '.claude', 'skills'), type: 'skill', pattern: '*/SKILL.md' },
      ],
    },
    {
      platform: 'openclaw',
      paths: [
        { path: join(cwd, 'AGENTS.md'), type: 'preference' },
        { path: join(home, '.openclaw', 'settings.yaml'), type: 'config' },
        { path: join(home, '.openclaw', 'skills'), type: 'skill', pattern: '*/SKILL.md' },
        { path: join(home, '.openclaw', 'memory'), type: 'memory', pattern: '*.json' },
      ],
    },
    {
      platform: 'cursor',
      paths: [
        { path: join(cwd, '.cursorrules'), type: 'preference' },
        { path: join(cwd, '.cursor', 'rules'), type: 'preference', pattern: '*.md' },
        { path: join(home, '.cursor', 'rules'), type: 'preference', pattern: '*.md' },
      ],
    },
    {
      platform: 'vscode',
      paths: [
        { path: join(cwd, '.vscode', 'settings.json'), type: 'config' },
        { path: join(cwd, '.github', 'copilot-instructions.md'), type: 'preference' },
        { path: join(home, process.platform === 'darwin' ? 'Library/Application Support/Code/User/snippets' : '.config/Code/User/snippets'), type: 'skill', pattern: '*.json' },
      ],
    },
    {
      platform: 'windsurf',
      paths: [
        { path: join(cwd, '.windsurfrules'), type: 'preference' },
        { path: join(cwd, '.windsurf', 'rules'), type: 'preference', pattern: '*.md' },
      ],
    },
    {
      platform: 'gemini',
      paths: [
        { path: join(home, '.gemini', 'settings.json'), type: 'config' },
        { path: join(home, '.gemini', 'antigravity', 'skills'), type: 'skill', pattern: '*/SKILL.md' },
      ],
    },
    {
      platform: 'copilot',
      paths: [
        { path: join(cwd, '.github', 'copilot-instructions.md'), type: 'preference' },
        { path: join(cwd, '.github', 'skills'), type: 'skill', pattern: '*/SKILL.md' },
      ],
    },
    {
      platform: 'codex',
      paths: [
        { path: join(home, '.codex', 'skills'), type: 'skill', pattern: '*/SKILL.md' },
        { path: join(home, '.codex', 'instructions.md'), type: 'preference' },
      ],
    },
  ];
}

/** Scan a directory for files matching a pattern */
function scanDir(dirPath: string, pattern: string): string[] {
  if (!existsSync(dirPath)) return [];
  const results: string[] = [];

  try {
    if (pattern.startsWith('*/')) {
      // Subdirectory pattern: */SKILL.md
      const filename = pattern.slice(2);
      for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const target = join(dirPath, entry.name, filename);
          if (existsSync(target)) results.push(target);
        }
      }
    } else if (pattern.startsWith('*.')) {
      // Extension pattern: *.json
      const ext = pattern.slice(1);
      for (const file of readdirSync(dirPath)) {
        if (file.endsWith(ext)) results.push(join(dirPath, file));
      }
    }
  } catch { /* permission denied etc */ }

  return results;
}

/** Read a file safely with preview */
function readSafe(filePath: string, maxPreview: number = 500): { content: string; size: number; modified: string } {
  try {
    const stat = statSync(filePath);
    const content = readFileSync(filePath, 'utf-8');
    return {
      content: content.slice(0, maxPreview),
      size: stat.size,
      modified: stat.mtime.toISOString(),
    };
  } catch {
    return { content: '', size: 0, modified: '' };
  }
}

/** Determine format from file extension */
function getFormat(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const map: Record<string, string> = { '.md': 'markdown', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.ts': 'typescript', '.js': 'javascript' };
  return map[ext] ?? 'text';
}

/** Derive a human-readable name from the path */
function deriveName(filePath: string, platform: string, type: string): string {
  const base = basename(filePath, extname(filePath));
  const parent = basename(join(filePath, '..'));

  if (base === 'SKILL') return `${platform} skill: ${parent}`;
  if (base === 'CLAUDE') return 'Claude global rules';
  if (base === 'AGENTS') return `${platform} agent instructions`;
  if (base === '.cursorrules') return 'Cursor rules';
  if (base === '.windsurfrules') return 'Windsurf rules';
  if (base === 'settings') return `${platform} settings`;
  if (base === 'memory') return `${platform} memory store`;
  if (base === 'copilot-instructions') return 'Copilot instructions';
  if (type === 'skill') return `${platform} skill: ${base}`;
  return `${platform} ${type}: ${base}`;
}

/**
 * Full system scan — discovers all AI assets across all platforms
 */
export function discoverLocalAssets(): ScanResult {
  const targets = getScanTargets();
  const assets: DiscoveredAsset[] = [];
  const scanPaths: ScanResult['scan_paths'] = [];
  const detectedPlatforms = new Set<string>();

  for (const target of targets) {
    for (const p of target.paths) {
      if (p.pattern) {
        // Directory scan
        const exists = existsSync(p.path);
        scanPaths.push({ path: p.path, exists, platform: target.platform });
        if (exists) {
          detectedPlatforms.add(target.platform);
          for (const filePath of scanDir(p.path, p.pattern)) {
            const info = readSafe(filePath);
            assets.push({
              path: filePath,
              platform: target.platform,
              type: p.type,
              name: deriveName(filePath, target.platform, p.type),
              size: info.size,
              modified: info.modified,
              content_preview: info.content,
              format: getFormat(filePath),
            });
          }
        }
      } else {
        // Single file
        const exists = existsSync(p.path);
        scanPaths.push({ path: p.path, exists, platform: target.platform });
        if (exists) {
          detectedPlatforms.add(target.platform);
          const info = readSafe(p.path);
          assets.push({
            path: p.path,
            platform: target.platform,
            type: p.type,
            name: deriveName(p.path, target.platform, p.type),
            size: info.size,
            modified: info.modified,
            content_preview: info.content,
            format: getFormat(p.path),
          });
        }
      }
    }
  }

  return {
    scanned_at: new Date().toISOString(),
    platforms_detected: [...detectedPlatforms],
    total_assets: assets.length,
    assets: assets.sort((a, b) => b.modified.localeCompare(a.modified)),
    scan_paths: scanPaths,
  };
}

/** Quick scan — just detect which platforms are installed */
export function detectPlatforms(): Array<{ platform: string; detected: boolean; asset_count: number }> {
  const result = discoverLocalAssets();
  const platforms = ['claude', 'openclaw', 'cursor', 'vscode', 'windsurf', 'gemini', 'copilot', 'codex'];

  return platforms.map(p => ({
    platform: p,
    detected: result.platforms_detected.includes(p),
    asset_count: result.assets.filter(a => a.platform === p).length,
  }));
}
