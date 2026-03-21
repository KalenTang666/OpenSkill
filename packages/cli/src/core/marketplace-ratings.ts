/**
 * OpenSkill Marketplace Ratings — Community quality scoring
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface SkillRating {
  skill_id: string;
  user_id: string;
  score: number;       // 1-5
  review?: string;
  tags: string[];      // e.g. ['useful', 'well-documented', 'secure']
  created_at: string;
}

export interface SkillStats {
  skill_id: string;
  avg_score: number;
  total_ratings: number;
  installs: number;
  top_tags: string[];
}

const RATINGS_DIR = join(homedir(), '.openskill', 'marketplace', 'ratings');

function ensureDir(): void {
  if (!existsSync(RATINGS_DIR)) mkdirSync(RATINGS_DIR, { recursive: true });
}

function getRatingsFile(skillId: string): string {
  return join(RATINGS_DIR, `${skillId}.json`);
}

/** Rate a skill */
export function rateSkill(skillId: string, userId: string, score: number, review?: string, tags: string[] = []): SkillRating {
  ensureDir();
  const file = getRatingsFile(skillId);
  const ratings: SkillRating[] = existsSync(file) ? JSON.parse(readFileSync(file, 'utf-8')) : [];

  // Update existing or add new
  const existing = ratings.findIndex(r => r.user_id === userId);
  const rating: SkillRating = {
    skill_id: skillId, user_id: userId,
    score: Math.max(1, Math.min(5, Math.round(score))),
    review, tags, created_at: new Date().toISOString(),
  };

  if (existing >= 0) ratings[existing] = rating;
  else ratings.push(rating);

  writeFileSync(file, JSON.stringify(ratings, null, 2));
  return rating;
}

/** Get ratings for a skill */
export function getSkillRatings(skillId: string): SkillRating[] {
  const file = getRatingsFile(skillId);
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, 'utf-8'));
}

/** Get aggregated stats for a skill */
export function getSkillStats(skillId: string): SkillStats {
  const ratings = getSkillRatings(skillId);
  const tagCounts = new Map<string, number>();
  for (const r of ratings) {
    for (const t of r.tags) {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
  }

  return {
    skill_id: skillId,
    avg_score: ratings.length > 0 ? Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10 : 0,
    total_ratings: ratings.length,
    installs: 0, // Would come from usage tracking
    top_tags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag),
  };
}
