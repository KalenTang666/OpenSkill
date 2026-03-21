/**
 * Growth Engine — XP, Levels, Achievements, Streaks
 * Gamification layer for user engagement and retention
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const GROWTH_DIR = join(homedir(), '.openskill', 'growth');
const GROWTH_FILE = join(GROWTH_DIR, 'profile.json');

export type WalletRank = 'newcomer' | 'explorer' | 'builder' | 'contributor' | 'guardian' | 'architect';

export interface Achievement {
  id: string;
  name: string;
  badge: string;
  description: string;
  unlocked: boolean;
  unlocked_at?: string;
}

export interface GrowthProfile {
  xp: number;
  level: number;
  rank: WalletRank;
  achievements: Achievement[];
  streak: { current: number; longest: number; last_active: string };
  history: Array<{ action: string; xp: number; timestamp: string }>;
  created_at: string;
}

const RANK_TABLE: Array<{ level: number; rank: WalletRank; name: string; badge: string; xp_required: number }> = [
  { level: 0, rank: 'newcomer', name: 'Newcomer', badge: '🌱', xp_required: 0 },
  { level: 1, rank: 'explorer', name: 'Explorer', badge: '🔍', xp_required: 200 },
  { level: 2, rank: 'builder', name: 'Builder', badge: '⚡', xp_required: 600 },
  { level: 3, rank: 'contributor', name: 'Contributor', badge: '🤝', xp_required: 1500 },
  { level: 4, rank: 'guardian', name: 'Guardian', badge: '🛡️', xp_required: 3500 },
  { level: 5, rank: 'architect', name: 'Architect', badge: '🏛️', xp_required: 8000 },
];

const XP_TABLE: Record<string, number> = {
  init: 100, import: 20, discover: 30, analyze: 15, create: 25,
  scan: 20, sign: 30, sync: 40, 'team-share': 50,
  'marketplace-publish': 80, 'registry-publish': 100,
  'streak-7': 200, 'streak-30': 500, 'security-fix': 60,
};

const ACHIEVEMENT_DEFS: Array<{ id: string; name: string; badge: string; description: string; check: (p: GrowthProfile) => boolean }> = [
  { id: 'first-wallet', name: 'First Wallet', badge: '🎒', description: 'Initialize your wallet', check: p => p.history.some(h => h.action === 'init') },
  { id: 'cross-platform', name: 'Cross-Platform', badge: '🌐', description: 'Sync across 3+ platforms', check: p => p.history.filter(h => h.action === 'sync').length >= 3 },
  { id: 'security-guard', name: 'Security Guard', badge: '🛡️', description: 'Scan all assets with no issues', check: p => p.history.some(h => h.action === 'scan') },
  { id: 'skill-master', name: 'Skill Master', badge: '⚡', description: 'Own 20+ skills', check: p => p.history.filter(h => h.action === 'create' || h.action === 'import').length >= 20 },
  { id: 'team-player', name: 'Team Player', badge: '🤝', description: 'Share 5+ assets', check: p => p.history.filter(h => h.action === 'team-share').length >= 5 },
  { id: 'market-maker', name: 'Market Maker', badge: '📢', description: 'Publish 3+ to marketplace', check: p => p.history.filter(h => h.action === 'marketplace-publish').length >= 3 },
  { id: 'protocol-pioneer', name: 'Protocol Pioneer', badge: '🏛️', description: 'Publish to OSP registry', check: p => p.history.some(h => h.action === 'registry-publish') },
  { id: 'clean-slate', name: 'Clean Slate', badge: '✨', description: 'Pass security scan with 0 issues', check: p => p.history.some(h => h.action === 'scan') },
  { id: 'streak-7', name: 'Streak 7', badge: '🔥', description: '7 consecutive active days', check: p => p.streak.longest >= 7 },
  { id: 'streak-30', name: 'Streak 30', badge: '💎', description: '30 consecutive active days', check: p => p.streak.longest >= 30 },
];

/** Load or create growth profile */
export function loadProfile(): GrowthProfile {
  if (!existsSync(GROWTH_DIR)) mkdirSync(GROWTH_DIR, { recursive: true });
  if (existsSync(GROWTH_FILE)) return JSON.parse(readFileSync(GROWTH_FILE, 'utf-8'));

  const profile: GrowthProfile = {
    xp: 0, level: 0, rank: 'newcomer',
    achievements: ACHIEVEMENT_DEFS.map(a => ({ id: a.id, name: a.name, badge: a.badge, description: a.description, unlocked: false })),
    streak: { current: 0, longest: 0, last_active: '' },
    history: [], created_at: new Date().toISOString(),
  };
  saveProfile(profile);
  return profile;
}

function saveProfile(profile: GrowthProfile): void {
  if (!existsSync(GROWTH_DIR)) mkdirSync(GROWTH_DIR, { recursive: true });
  writeFileSync(GROWTH_FILE, JSON.stringify(profile, null, 2), 'utf-8');
}

/** Award XP for an action */
export function awardXP(action: string): { xp_gained: number; new_level: boolean; new_achievements: string[]; profile: GrowthProfile } {
  const profile = loadProfile();
  const xp = XP_TABLE[action] ?? 10;
  profile.xp += xp;
  profile.history.push({ action, xp, timestamp: new Date().toISOString() });

  // Update streak
  const today = new Date().toISOString().slice(0, 10);
  const lastActive = profile.streak.last_active;
  if (lastActive) {
    const daysDiff = (new Date(today).getTime() - new Date(lastActive).getTime()) / 86400000;
    if (daysDiff === 1) { profile.streak.current++; }
    else if (daysDiff > 1) { profile.streak.current = 1; }
  } else {
    profile.streak.current = 1;
  }
  profile.streak.last_active = today;
  if (profile.streak.current > profile.streak.longest) profile.streak.longest = profile.streak.current;

  // Check streak achievements
  if (profile.streak.current >= 7 && !profile.history.some(h => h.action === 'streak-7')) {
    profile.xp += XP_TABLE['streak-7'];
    profile.history.push({ action: 'streak-7', xp: XP_TABLE['streak-7'], timestamp: new Date().toISOString() });
  }

  // Level up check
  const oldLevel = profile.level;
  for (const rank of RANK_TABLE) {
    if (profile.xp >= rank.xp_required) { profile.level = rank.level; profile.rank = rank.rank; }
  }
  const new_level = profile.level > oldLevel;

  // Achievement check
  const new_achievements: string[] = [];
  for (const def of ACHIEVEMENT_DEFS) {
    const ach = profile.achievements.find(a => a.id === def.id);
    if (ach && !ach.unlocked && def.check(profile)) {
      ach.unlocked = true;
      ach.unlocked_at = new Date().toISOString();
      new_achievements.push(`${ach.badge} ${ach.name}`);
    }
  }

  saveProfile(profile);
  return { xp_gained: xp, new_level, new_achievements, profile };
}

/** Get rank info for a level */
export function getRankInfo(level: number): typeof RANK_TABLE[0] {
  return RANK_TABLE[Math.min(level, RANK_TABLE.length - 1)];
}

/** Get XP needed for next level */
export function xpToNextLevel(profile: GrowthProfile): number {
  const next = RANK_TABLE.find(r => r.level === profile.level + 1);
  return next ? next.xp_required - profile.xp : 0;
}

/** Format profile for CLI display */
export function formatProfile(profile: GrowthProfile): string {
  const rank = getRankInfo(profile.level);
  const nextXP = xpToNextLevel(profile);
  const bar = '█'.repeat(Math.min(20, Math.round((profile.xp / (profile.xp + nextXP)) * 20))) + '░'.repeat(Math.max(0, 20 - Math.round((profile.xp / (profile.xp + nextXP)) * 20)));

  let out = `  ${rank.badge} ${rank.name} (Lv.${profile.level})\n`;
  out += `  XP: ${profile.xp} ${bar} ${nextXP > 0 ? `(${nextXP} to next)` : '(MAX)'}\n`;
  out += `  Streak: ${profile.streak.current} days 🔥 (best: ${profile.streak.longest})\n\n`;

  const unlocked = profile.achievements.filter(a => a.unlocked);
  const locked = profile.achievements.filter(a => !a.unlocked);
  if (unlocked.length) out += `  Achievements: ${unlocked.map(a => a.badge).join(' ')}\n`;
  if (locked.length) out += `  Locked: ${locked.map(() => '🔒').join(' ')}\n`;

  return out;
}
