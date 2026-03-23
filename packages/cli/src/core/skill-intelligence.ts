/**
 * OpenSkill Skill Intelligence — Quality scoring, usage learning, auto-recommend
 *
 * Based on SkillsBench methodology: scores skills across multiple dimensions,
 * learns from usage patterns, and generates context-aware recommendations.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface QualityScore {
  skill_id: string;
  overall: number; // 0-100
  dimensions: {
    completeness: number;   // Has all required fields
    structure: number;      // Well-organized, follows conventions
    portability: number;    // Works across platforms
    security: number;       // No malicious patterns
    documentation: number;  // Clear instructions, examples
    testability: number;    // Can be verified/tested
  };
  issues: string[];
  recommendations: string[];
  scored_at: string;
}

export interface UsageRecord {
  skill_id: string;
  platform: string;
  action: 'activated' | 'completed' | 'failed' | 'skipped';
  context: string;
  duration_ms: number;
  timestamp: string;
}

export interface SkillRecommendation {
  skill_id: string;
  skill_name: string;
  relevance_score: number;  // 0-100
  reason: string;
  source: 'usage_history' | 'context_match' | 'popular' | 'complementary';
}

const INTEL_DIR = join(homedir(), '.openskill', 'intelligence');
const USAGE_FILE = join(INTEL_DIR, 'usage-log.json');
const SCORES_FILE = join(INTEL_DIR, 'scores.json');

function ensureDir(): void {
  if (!existsSync(INTEL_DIR)) mkdirSync(INTEL_DIR, { recursive: true });
}

/** Score a skill's quality across 6 dimensions */
export function scoreSkill(skillId: string, content: string, metadata?: { tags?: string[]; platforms?: string[]; hasTests?: boolean }): QualityScore {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Completeness: check required sections
  const hasYamlFrontmatter = /^---\n[\s\S]*?\n---/.test(content);
  const hasName = /name:\s*.+/.test(content);
  const hasDescription = /description:\s*.+/.test(content);
  const hasInstructions = content.split('\n').length > 10;
  const hasExamples = /```[\s\S]*?```/.test(content) || /example/i.test(content);
  let completeness = 0;
  if (hasYamlFrontmatter) completeness += 20; else issues.push('Missing YAML frontmatter');
  if (hasName) completeness += 20; else issues.push('Missing name field');
  if (hasDescription) completeness += 20; else issues.push('Missing description field');
  if (hasInstructions) completeness += 20; else issues.push('Instructions too brief');
  if (hasExamples) completeness += 20; else recommendations.push('Add examples for better activation');

  // Structure: headings, sections, organization
  const headings = (content.match(/^#{1,3}\s/gm) || []).length;
  const hasSteps = /step|phase|\d\./i.test(content);
  let structure = Math.min(100, headings * 15 + (hasSteps ? 30 : 0) + (content.length > 500 ? 10 : 0));

  // Portability: platform-specific vs universal
  const platformSpecific = /\.cursorrules|CLAUDE\.md|AGENTS\.md|\.windsurfrules/g;
  const platformMentions = (content.match(platformSpecific) || []).length;
  let portability = 100 - Math.min(60, platformMentions * 15);
  if (metadata?.platforms && metadata.platforms.length > 1) portability += 20;
  portability = Math.min(100, portability);

  // Security: check for dangerous patterns
  const dangerousPatterns = [
    /eval\s*\(/i, /process\.env/i, /exec\s*\(/i,
    /rm\s+-rf/i, /ignore\s+(previous|above)/i,
    /curl.*\|.*sh/i, /wget.*\|.*bash/i,
  ];
  const securityHits = dangerousPatterns.filter(p => p.test(content)).length;
  let security = Math.max(0, 100 - securityHits * 25);
  if (securityHits > 0) issues.push(`${securityHits} security pattern(s) detected`);

  // Documentation: comments, explanations, clarity
  const words = content.split(/\s+/).length;
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  const commentRatio = words > 0 ? Math.min(1, (words - codeBlocks * 20) / words) : 0;
  let documentation = Math.min(100, Math.round(commentRatio * 50 + (hasExamples ? 30 : 0) + (words > 200 ? 20 : 0)));

  // Testability
  let testability = 40; // base
  if (metadata?.hasTests) testability += 40;
  if (hasExamples) testability += 20;
  testability = Math.min(100, testability);

  const overall = Math.round(
    completeness * 0.25 + structure * 0.15 + portability * 0.15 +
    security * 0.20 + documentation * 0.15 + testability * 0.10
  );

  if (overall < 50) recommendations.push('Significant improvements needed for production use');
  else if (overall < 75) recommendations.push('Good skill, minor improvements possible');

  return {
    skill_id: skillId,
    overall,
    dimensions: { completeness, structure, portability, security, documentation, testability },
    issues,
    recommendations,
    scored_at: new Date().toISOString(),
  };
}

/** Record a usage event */
export function recordUsageEvent(record: UsageRecord): void {
  ensureDir();
  const log: UsageRecord[] = existsSync(USAGE_FILE) ? JSON.parse(readFileSync(USAGE_FILE, 'utf-8')) : [];
  log.push(record);
  // Keep last 1000 records
  const trimmed = log.slice(-1000);
  writeFileSync(USAGE_FILE, JSON.stringify(trimmed, null, 2));
}

/** Get usage statistics for a skill */
export function getSkillUsageStats(skillId: string): { total: number; success_rate: number; avg_duration_ms: number; platforms: string[] } {
  ensureDir();
  if (!existsSync(USAGE_FILE)) return { total: 0, success_rate: 0, avg_duration_ms: 0, platforms: [] };
  const log: UsageRecord[] = JSON.parse(readFileSync(USAGE_FILE, 'utf-8'));
  const records = log.filter(r => r.skill_id === skillId);
  if (records.length === 0) return { total: 0, success_rate: 0, avg_duration_ms: 0, platforms: [] };
  const completed = records.filter(r => r.action === 'completed').length;
  const avgDuration = Math.round(records.reduce((s, r) => s + r.duration_ms, 0) / records.length);
  const platforms = [...new Set(records.map(r => r.platform))];
  return { total: records.length, success_rate: Math.round((completed / records.length) * 100), avg_duration_ms: avgDuration, platforms };
}

/** Generate recommendations based on context + usage history */
export function recommend(context: { task?: string; platform?: string; tags?: string[] }, availableSkills: Array<{ id: string; name: string; tags: string[]; content: string }>): SkillRecommendation[] {
  const results: SkillRecommendation[] = [];

  for (const skill of availableSkills) {
    let score = 0;
    let reason = '';
    let source: SkillRecommendation['source'] = 'context_match';

    // Tag match
    if (context.tags) {
      const overlap = skill.tags.filter(t => context.tags!.includes(t)).length;
      score += overlap * 25;
      if (overlap > 0) reason += `Tags: ${skill.tags.filter(t => context.tags!.includes(t)).join(', ')}. `;
    }

    // Task keyword match
    if (context.task) {
      const taskWords = context.task.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const skillText = (skill.name + ' ' + skill.tags.join(' ') + ' ' + skill.content.slice(0, 500)).toLowerCase();
      const hits = taskWords.filter(w => skillText.includes(w)).length;
      score += hits * 20;
      if (hits > 0) reason += `Task match: ${hits} keywords. `;
    }

    // Platform match
    if (context.platform) {
      const platLower = context.platform.toLowerCase();
      if (skill.content.toLowerCase().includes(platLower) || skill.tags.includes(platLower)) {
        score += 15;
        reason += `Platform: ${context.platform}. `;
      }
    }

    // Usage history boost
    const stats = getSkillUsageStats(skill.id);
    if (stats.total > 0) {
      score += Math.min(20, stats.success_rate / 5);
      source = 'usage_history';
      reason += `Used ${stats.total}x (${stats.success_rate}% success). `;
    }

    if (score > 0) {
      results.push({ skill_id: skill.id, skill_name: skill.name, relevance_score: Math.min(100, score), reason: reason.trim(), source });
    }
  }

  return results.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 10);
}

/** Get all stored quality scores */
export function getStoredScores(): QualityScore[] {
  ensureDir();
  if (!existsSync(SCORES_FILE)) return [];
  return JSON.parse(readFileSync(SCORES_FILE, 'utf-8'));
}

/** Save a quality score */
export function saveScore(score: QualityScore): void {
  ensureDir();
  const scores = getStoredScores();
  const idx = scores.findIndex(s => s.skill_id === score.skill_id);
  if (idx >= 0) scores[idx] = score; else scores.push(score);
  writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}
