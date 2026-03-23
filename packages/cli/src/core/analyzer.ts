/**
 * Asset Analyzer — Compare, Evaluate, Score, and Recommend
 *
 * Analyzes discovered local assets and wallet assets to provide:
 * - Cross-platform comparison (duplicate detection, coverage gaps)
 * - Quality scoring per asset
 * - Actionable recommendations
 * - Optimization suggestions
 */
import type { DiscoveredAsset, ScanResult } from './local-scanner.js';
import type { WalletAsset } from './types.js';

// ─── Quality Scoring ─────────────────────────────────────

export interface QualityScore {
  asset_name: string;
  platform: string;
  overall: number;          // 0-100
  dimensions: {
    completeness: number;   // Content depth/coverage
    structure: number;      // Organization quality
    portability: number;    // Cross-platform readiness
    maintainability: number; // Versioning, freshness
    security: number;       // No dangerous patterns
  };
  issues: string[];
  strengths: string[];
}

export function scoreAsset(asset: DiscoveredAsset): QualityScore {
  const issues: string[] = [];
  const strengths: string[] = [];
  const body = asset.content_preview;
  const lines = body.split('\n').length;

  // Completeness (0-25)
  let completeness = 0;
  if (asset.size > 100) completeness += 5;
  if (asset.size > 500) completeness += 5;
  if (asset.size > 2000) completeness += 5;
  if (body.includes('#')) { completeness += 5; strengths.push('Has section headings'); }
  if (body.includes('```') || body.includes('example')) { completeness += 5; strengths.push('Includes code examples'); }
  if (completeness < 10) issues.push('Content is very brief — consider adding more detail');

  // Structure (0-25)
  let structure = 0;
  if (body.includes('## ') || body.includes('### ')) { structure += 8; strengths.push('Well-structured with headers'); }
  if (body.includes('- ') || body.includes('* ')) { structure += 5; strengths.push('Uses lists for clarity'); }
  if (body.includes('---') || body.includes('___')) structure += 4;
  if (asset.format === 'json' || asset.format === 'yaml') { structure += 8; strengths.push('Machine-readable format'); }
  if (lines > 5) structure += 5;
  if (structure < 8) issues.push('Poor structure — add headings and sections');

  // Portability (0-25)
  let portability = 0;
  if (asset.format === 'markdown') { portability += 10; strengths.push('Markdown format is cross-platform'); }
  if (asset.format === 'json') portability += 8;
  if (!body.includes('claude') && !body.includes('cursor') && !body.includes('openclaw')) {
    portability += 10; strengths.push('No platform-specific references');
  } else {
    portability += 3;
    issues.push('Contains platform-specific references — reduces portability');
  }
  if (body.match(/^---\n[\s\S]*?\n---/)) { portability += 5; strengths.push('Has YAML frontmatter (Agent Skills compatible)'); }

  // Maintainability (0-15)
  let maintainability = 0;
  const daysSinceModified = (Date.now() - new Date(asset.modified).getTime()) / 86400000;
  if (daysSinceModified < 7) { maintainability += 8; strengths.push('Recently updated'); }
  else if (daysSinceModified < 30) { maintainability += 5; }
  else if (daysSinceModified < 90) { maintainability += 3; }
  else { issues.push(`Not updated in ${Math.round(daysSinceModified)} days — may be stale`); }
  if (body.includes('version') || body.includes('v1') || body.includes('v2')) { maintainability += 4; strengths.push('Has version info'); }
  if (body.includes('changelog') || body.includes('updated')) maintainability += 3;

  // Security (0-10)
  let security = 10;
  const dangerPatterns = [/eval\s*\(/i, /exec\s*\(/i, /process\.env/i, /fetch\s*\(/i, /rm\s+-rf/i];
  for (const p of dangerPatterns) {
    if (p.test(body)) { security -= 3; issues.push(`Security concern: ${p.source} pattern found`); }
  }

  const overall = Math.min(100, completeness + structure + portability + maintainability + security);

  return {
    asset_name: asset.name, platform: asset.platform, overall,
    dimensions: { completeness, structure, portability, maintainability, security },
    issues, strengths,
  };
}

// ─── Cross-Platform Comparison ───────────────────────────

export interface ComparisonResult {
  duplicates: Array<{ assets: DiscoveredAsset[]; similarity: string }>;
  coverage_gaps: Array<{ platform: string; missing_types: string[] }>;
  inconsistencies: Array<{ field: string; platforms: Record<string, string> }>;
  sync_candidates: Array<{ source: DiscoveredAsset; targets: string[]; reason: string }>;
}

export function compareAcrossPlatforms(scan: ScanResult): ComparisonResult {
  const assets = scan.assets;
  const duplicates: ComparisonResult['duplicates'] = [];
  const coverage_gaps: ComparisonResult['coverage_gaps'] = [];
  const inconsistencies: ComparisonResult['inconsistencies'] = [];
  const sync_candidates: ComparisonResult['sync_candidates'] = [];

  // Detect duplicates by name similarity
  const byName = new Map<string, DiscoveredAsset[]>();
  for (const a of assets) {
    const key = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const group = byName.get(key) ?? [];
    group.push(a);
    byName.set(key, group);
  }
  for (const [, group] of byName) {
    if (group.length > 1 && new Set(group.map(a => a.platform)).size > 1) {
      duplicates.push({ assets: group, similarity: 'Same name across platforms' });
    }
  }

  // Detect preference/rules duplicates by content similarity
  const prefs = assets.filter(a => a.type === 'preference');
  for (let i = 0; i < prefs.length; i++) {
    for (let j = i + 1; j < prefs.length; j++) {
      if (prefs[i].platform !== prefs[j].platform) {
        const simScore = contentSimilarity(prefs[i].content_preview, prefs[j].content_preview);
        if (simScore > 0.6) {
          duplicates.push({ assets: [prefs[i], prefs[j]], similarity: `${Math.round(simScore * 100)}% content overlap` });
        }
      }
    }
  }

  // Coverage gaps
  const allPlatforms = [...new Set(assets.map(a => a.platform))];
  const allTypes = ['skill', 'preference', 'config', 'memory'] as const;
  for (const platform of allPlatforms) {
    const platformAssets = assets.filter(a => a.platform === platform);
    const presentTypes = new Set(platformAssets.map(a => a.type));
    const missing = allTypes.filter(t => !presentTypes.has(t));
    if (missing.length) coverage_gaps.push({ platform, missing_types: missing });
  }

  // Sync candidates — high-quality assets that could be shared
  const highQuality = assets.filter(a => {
    const score = scoreAsset(a);
    return score.overall >= 60 && a.type === 'skill';
  });
  for (const asset of highQuality) {
    const otherPlatforms = allPlatforms.filter(p => p !== asset.platform);
    if (otherPlatforms.length) {
      sync_candidates.push({ source: asset, targets: otherPlatforms, reason: `High quality (score ≥60), shareable to ${otherPlatforms.length} platforms` });
    }
  }

  return { duplicates, coverage_gaps, inconsistencies, sync_candidates };
}

// ─── Optimization Recommendations ────────────────────────

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'consolidate' | 'upgrade' | 'secure' | 'sync' | 'cleanup';
  title: string;
  description: string;
  action: string;   // CLI command to execute
  impact: string;
}

export function generateRecommendations(scan: ScanResult, comparison: ComparisonResult): Recommendation[] {
  const recs: Recommendation[] = [];

  // Consolidation recommendations
  for (const dup of comparison.duplicates) {
    recs.push({
      priority: 'high', category: 'consolidate',
      title: `Consolidate duplicate: ${dup.assets[0].name}`,
      description: `Found on ${dup.assets.map(a => a.platform).join(', ')} (${dup.similarity})`,
      action: `oski import --from ${dup.assets[0].platform} && os sync --to ${dup.assets[1]?.platform}`,
      impact: 'Eliminates version drift between platforms',
    });
  }

  // Coverage gap recommendations
  for (const gap of comparison.coverage_gaps) {
    if (gap.missing_types.includes('preference')) {
      recs.push({
        priority: 'medium', category: 'sync',
        title: `Missing preferences for ${gap.platform}`,
        description: `${gap.platform} has no preference/rules file configured`,
        action: `oski export --to ${gap.platform} --id <preference-asset-id>`,
        impact: 'Consistent coding standards across tools',
      });
    }
  }

  // Security recommendations
  for (const asset of scan.assets) {
    const score = scoreAsset(asset);
    if (score.dimensions.security < 7) {
      recs.push({
        priority: 'high', category: 'secure',
        title: `Security issue in ${asset.name}`,
        description: score.issues.filter(i => i.includes('Security')).join('; '),
        action: `oski scan ${asset.name}`,
        impact: 'Removes potential security vulnerabilities',
      });
    }
  }

  // Sync candidates
  for (const cand of comparison.sync_candidates) {
    recs.push({
      priority: 'low', category: 'sync',
      title: `Share "${cand.source.name}" to ${cand.targets.join(', ')}`,
      description: cand.reason,
      action: `oski import --from ${cand.source.platform} && os sync --to ${cand.targets[0]}`,
      impact: 'Maximizes reuse of proven skills',
    });
  }

  // Stale assets
  for (const asset of scan.assets) {
    const days = (Date.now() - new Date(asset.modified).getTime()) / 86400000;
    if (days > 90) {
      recs.push({
        priority: 'low', category: 'cleanup',
        title: `Stale: ${asset.name}`,
        description: `Not updated in ${Math.round(days)} days`,
        action: `oski inspect <id>`,
        impact: 'Keeps your skill library fresh',
      });
    }
  }

  return recs.sort((a, b) => {
    const pri: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return pri[a.priority] - pri[b.priority];
  });
}

// ─── Helpers ─────────────────────────────────────────────

/** Simple content similarity (Jaccard on word sets) */
function contentSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  if (!wordsA.size || !wordsB.size) return 0;
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

/** Format recommendations for CLI display */
export function formatRecommendations(recs: Recommendation[]): string {
  if (!recs.length) return '  No recommendations — your setup looks great!\n';
  const icons: Record<string, string> = { high: '🔴', medium: '🟡', low: '🔵' };
  const cats: Record<string, string> = { consolidate: '🔗', upgrade: '⬆️', secure: '🔒', sync: '🔄', cleanup: '🧹' };
  return recs.map((r, i) =>
    `  ${icons[r.priority]} ${cats[r.category]} [${r.priority.toUpperCase()}] ${r.title}\n    ${r.description}\n    → ${r.action}\n    Impact: ${r.impact}`
  ).join('\n\n') + '\n';
}
