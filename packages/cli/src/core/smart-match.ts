/**
 * OpenSkill Smart Match Engine — Intelligent skill discovery & recommendation
 * 
 * Features:
 * - Context-aware skill matching (project type, tech stack, task)
 * - Progressive disclosure (metadata → instructions → resources)
 * - Semantic similarity scoring
 * - Usage pattern learning
 * - Cross-platform skill compatibility checking
 * 
 * Inspired by: skills.sh find-skills, SkillsMP smart search, AionUI auto-accumulation
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ─── Types ───────────────────────────────────────────────

export interface SkillMatch {
  skill_id: string;
  name: string;
  score: number;          // 0-100 relevance score
  match_reasons: string[];
  source: 'local' | 'marketplace' | 'registry';
  install_command?: string;
  metadata_tokens: number; // Progressive disclosure: how many tokens just for metadata
}

export interface MatchContext {
  task?: string;          // What the user is trying to do
  tech_stack?: string[];  // Languages/frameworks in use
  platform?: string;      // Current AI platform
  project_type?: string;  // Web, mobile, data, etc.
  history?: string[];     // Recent commands/actions
}

export interface UsageRecord {
  skill_id: string;
  used_at: string;
  context: string;
  effectiveness: number;  // 1-5 rating
}

// ─── Keyword → Category Maps ─────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'frontend': ['react', 'vue', 'svelte', 'css', 'html', 'tailwind', 'ui', 'ux', 'design', 'component', 'responsive'],
  'backend': ['api', 'server', 'database', 'rest', 'graphql', 'node', 'fastify', 'express', 'django', 'flask'],
  'mobile': ['react native', 'expo', 'ios', 'android', 'swift', 'kotlin', 'flutter', 'mobile'],
  'devops': ['docker', 'kubernetes', 'ci', 'cd', 'deploy', 'pipeline', 'terraform', 'ansible'],
  'security': ['auth', 'encrypt', 'token', 'cors', 'xss', 'csrf', 'vulnerability', 'scan', 'audit'],
  'data': ['sql', 'nosql', 'analytics', 'etl', 'pandas', 'spark', 'warehouse', 'bigquery'],
  'ai': ['ml', 'model', 'training', 'inference', 'embedding', 'rag', 'llm', 'prompt', 'agent', 'skill'],
  'docs': ['markdown', 'readme', 'documentation', 'api-docs', 'changelog', 'whitepaper'],
  'testing': ['test', 'jest', 'vitest', 'cypress', 'playwright', 'e2e', 'unit', 'integration'],
};

// ─── Smart Match ─────────────────────────────────────────

/** Score how well a skill matches a given context */
function scoreMatch(skillName: string, skillTags: string[], skillBody: string, ctx: MatchContext): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const allText = `${skillName} ${skillTags.join(' ')} ${skillBody}`.toLowerCase();

  // Task match (highest weight)
  if (ctx.task) {
    const taskWords = ctx.task.toLowerCase().split(/\s+/);
    const taskHits = taskWords.filter(w => allText.includes(w) && w.length > 2);
    if (taskHits.length > 0) {
      score += Math.min(40, taskHits.length * 10);
      reasons.push(`Task match: ${taskHits.join(', ')}`);
    }
  }

  // Tech stack match
  if (ctx.tech_stack?.length) {
    const stackHits = ctx.tech_stack.filter(t => allText.includes(t.toLowerCase()));
    if (stackHits.length > 0) {
      score += Math.min(30, stackHits.length * 10);
      reasons.push(`Tech: ${stackHits.join(', ')}`);
    }
  }

  // Platform compatibility
  if (ctx.platform && allText.includes(ctx.platform.toLowerCase())) {
    score += 15;
    reasons.push(`Platform: ${ctx.platform}`);
  }

  // Category match via project type
  if (ctx.project_type) {
    const keywords = CATEGORY_KEYWORDS[ctx.project_type.toLowerCase()] || [];
    const catHits = keywords.filter(k => allText.includes(k));
    if (catHits.length > 0) {
      score += Math.min(15, catHits.length * 5);
      reasons.push(`Category: ${ctx.project_type}`);
    }
  }

  return { score: Math.min(100, score), reasons };
}

/** Find skills matching a context — searches local wallet + known registries */
export function smartMatch(ctx: MatchContext): SkillMatch[] {
  const results: SkillMatch[] = [];
  const walletDir = join(homedir(), '.openskill', 'assets', 'skills');

  // Search local wallet skills
  if (existsSync(walletDir)) {
    for (const file of readdirSync(walletDir).filter(f => f.endsWith('.json'))) {
      try {
        const skill = JSON.parse(readFileSync(join(walletDir, file), 'utf-8'));
        const { score, reasons } = scoreMatch(skill.name || '', skill.tags || [], skill.content?.body || '', ctx);
        if (score > 10) {
          results.push({
            skill_id: skill.id, name: skill.name, score, match_reasons: reasons,
            source: 'local', metadata_tokens: Math.round((skill.name || '').length / 4 + 10),
          });
        }
      } catch { /* skip */ }
    }
  }

  // Search known marketplace patterns (would be API calls in production)
  const marketplaceSkills = [
    { id: 'ms-docx', name: 'Document Builder (DOCX/PDF)', tags: ['docs', 'word', 'pdf', 'report'] },
    { id: 'ms-pptx', name: 'Presentation Creator', tags: ['slides', 'pptx', 'deck', 'presentation'] },
    { id: 'ms-react', name: 'React Component Builder', tags: ['react', 'component', 'frontend', 'ui'] },
    { id: 'ms-expo', name: 'Expo Mobile Dev', tags: ['expo', 'react native', 'mobile', 'ios', 'android'] },
    { id: 'ms-security', name: 'Security Scanner', tags: ['security', 'vulnerability', 'audit', 'scan'] },
    { id: 'ms-api', name: 'API Design & Testing', tags: ['api', 'rest', 'graphql', 'testing', 'openapi'] },
    { id: 'ms-cicd', name: 'CI/CD Pipeline Builder', tags: ['ci', 'cd', 'github actions', 'deploy', 'docker'] },
    { id: 'ms-rag', name: 'RAG Knowledge Base', tags: ['rag', 'embedding', 'knowledge', 'retrieval', 'ai'] },
  ];

  for (const ms of marketplaceSkills) {
    const { score, reasons } = scoreMatch(ms.name, ms.tags, ms.tags.join(' '), ctx);
    if (score > 15) {
      results.push({
        skill_id: ms.id, name: ms.name, score, match_reasons: reasons,
        source: 'marketplace', install_command: `npx skills add ${ms.id}`,
        metadata_tokens: Math.round(ms.name.length / 4 + 5),
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

/** Record a skill usage for learning */
export function recordUsage(skillId: string, context: string, effectiveness: number): void {
  const dir = join(homedir(), '.openskill', 'usage');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = join(dir, 'history.jsonl');
  const record: UsageRecord = { skill_id: skillId, used_at: new Date().toISOString(), context, effectiveness };
  const line = JSON.stringify(record) + '\n';
  writeFileSync(file, existsSync(file) ? readFileSync(file, 'utf-8') + line : line);
}

/** Get frequently used skills */
export function getFrequentSkills(limit: number = 5): Array<{ skill_id: string; count: number; avg_effectiveness: number }> {
  const file = join(homedir(), '.openskill', 'usage', 'history.jsonl');
  if (!existsSync(file)) return [];
  const records: UsageRecord[] = readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  const counts = new Map<string, { count: number; total_eff: number }>();
  for (const r of records) {
    const c = counts.get(r.skill_id) || { count: 0, total_eff: 0 };
    c.count++; c.total_eff += r.effectiveness;
    counts.set(r.skill_id, c);
  }
  return [...counts.entries()]
    .map(([id, c]) => ({ skill_id: id, count: c.count, avg_effectiveness: Math.round(c.total_eff / c.count * 10) / 10 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Estimate token cost for progressive disclosure */
export function estimateTokens(content: string): { metadata: number; instructions: number; total: number } {
  const lines = content.split('\n');
  const frontmatterEnd = lines.findIndex((l, i) => i > 0 && l.startsWith('---'));
  const metadata = frontmatterEnd > 0 ? lines.slice(0, frontmatterEnd + 1).join('\n') : lines.slice(0, 5).join('\n');
  return {
    metadata: Math.round(metadata.length / 4),
    instructions: Math.round(content.length / 4),
    total: Math.round(content.length / 4),
  };
}
