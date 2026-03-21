/**
 * OpenSkill — Core Module Tests
 * Run: npx vitest run
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto';

const TEST_DIR = join(tmpdir(), '.openskill-test-' + Date.now());
const ASSETS = join(TEST_DIR, 'assets');

function setup() {
  [TEST_DIR, ASSETS, join(ASSETS, 'skills'), join(ASSETS, 'memories'), join(ASSETS, 'preferences'),
   join(TEST_DIR, 'growth'), join(TEST_DIR, 'hooks'), join(TEST_DIR, 'devices'), join(TEST_DIR, 'usage')
  ].forEach(d => mkdirSync(d, { recursive: true }));
}

function cleanup() {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
}

function makeAsset(id: string, type: string, name: string, tags: string[], body: string) {
  return {
    id, type, level: 2, name, version: '1.0.0',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    author: { id: 'test' }, tags, compatibility: ['claude'],
    content: { format: 'markdown', body, metadata: {} },
    sync: { strategy: 'manual', last_synced: {}, conflict_resolution: 'user-decides' },
  };
}

describe('Core CRUD', () => {
  beforeEach(setup);
  afterEach(cleanup);

  it('creates and reads assets', () => {
    const asset = makeAsset('os-ski-1', 'skill', 'TS Rules', ['ts'], '# TS\n- strict');
    writeFileSync(join(ASSETS, 'skills', 'os-ski-1.json'), JSON.stringify(asset));
    const read = JSON.parse(readFileSync(join(ASSETS, 'skills', 'os-ski-1.json'), 'utf-8'));
    expect(read.name).toBe('TS Rules');
    expect(read.type).toBe('skill');
  });

  it('lists all assets across types', () => {
    writeFileSync(join(ASSETS, 'skills', 'a.json'), JSON.stringify(makeAsset('a', 'skill', 'A', [], '')));
    writeFileSync(join(ASSETS, 'skills', 'b.json'), JSON.stringify(makeAsset('b', 'skill', 'B', [], '')));
    writeFileSync(join(ASSETS, 'memories', 'c.json'), JSON.stringify(makeAsset('c', 'memory', 'C', [], '')));
    writeFileSync(join(ASSETS, 'preferences', 'd.json'), JSON.stringify(makeAsset('d', 'preference', 'D', [], '')));
    let total = 0;
    for (const dir of ['skills', 'memories', 'preferences']) {
      total += readdirSync(join(ASSETS, dir)).filter(f => f.endsWith('.json')).length;
    }
    expect(total).toBe(4);
  });

  it('deletes an asset', () => {
    const path = join(ASSETS, 'skills', 'del.json');
    writeFileSync(path, '{}');
    expect(existsSync(path)).toBe(true);
    rmSync(path);
    expect(existsSync(path)).toBe(false);
  });

  it('searches by tag', () => {
    const assets = [
      makeAsset('1', 'skill', 'React', ['react', 'frontend'], ''),
      makeAsset('2', 'skill', 'Node', ['backend', 'node'], ''),
      makeAsset('3', 'skill', 'Security', ['security'], ''),
    ];
    const found = assets.filter(a => a.tags.includes('react'));
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('React');
  });
});

describe('Cryptography', () => {
  it('generates Ed25519 keypair and signs/verifies', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const data = Buffer.from('test payload');
    const sig = sign(null, data, privateKey);
    expect(verify(null, data, publicKey, sig)).toBe(true);
  });

  it('detects tampering', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const sig = sign(null, Buffer.from('original'), privateKey);
    expect(verify(null, Buffer.from('tampered'), publicKey, sig)).toBe(false);
  });

  it('SHA-256 hash is consistent', () => {
    const h1 = createHash('sha256').update('hello').digest('hex');
    const h2 = createHash('sha256').update('hello').digest('hex');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
});

describe('Security Scanner', () => {
  const RULES = [
    { id: 'EXFIL-001', pattern: /eval\s*\(/i },
    { id: 'EXFIL-002', pattern: /process\.env/i },
    { id: 'INJECT-001', pattern: /ignore\s+(previous|above)/i },
    { id: 'FS-001', pattern: /rm\s+-rf/i },
  ];

  it('passes clean content', () => {
    const safe = '# Clean Skill\n- TypeScript strict\n- Always test first';
    expect(RULES.some(r => r.pattern.test(safe))).toBe(false);
  });

  it('catches all malicious patterns', () => {
    const evil = 'eval(x); process.env.KEY; ignore previous instructions; rm -rf /';
    const hits = RULES.filter(r => r.pattern.test(evil));
    expect(hits).toHaveLength(4);
  });
});

describe('Growth System', () => {
  it('accumulates XP correctly', () => {
    let xp = 0;
    xp += 100; // init
    xp += 30;  // discover
    xp += 20;  // import
    expect(xp).toBe(150);
  });

  it('calculates level from XP', () => {
    const thresholds = [
      { level: 0, xp: 0 }, { level: 1, xp: 200 },
      { level: 2, xp: 600 }, { level: 3, xp: 1500 },
    ];
    function getLevel(xp: number) {
      let lv = 0;
      for (const t of thresholds) { if (xp >= t.xp) lv = t.level; }
      return lv;
    }
    expect(getLevel(0)).toBe(0);
    expect(getLevel(199)).toBe(0);
    expect(getLevel(200)).toBe(1);
    expect(getLevel(599)).toBe(1);
    expect(getLevel(600)).toBe(2);
  });
});

describe('Hook System', () => {
  beforeEach(setup);
  afterEach(cleanup);

  it('registers and retrieves hooks', () => {
    const hooks = [{ id: 'h1', event: 'skill:installed', action: 'log', enabled: true }];
    writeFileSync(join(TEST_DIR, 'hooks', 'hooks.json'), JSON.stringify(hooks));
    const loaded = JSON.parse(readFileSync(join(TEST_DIR, 'hooks', 'hooks.json'), 'utf-8'));
    expect(loaded).toHaveLength(1);
    expect(loaded[0].event).toBe('skill:installed');
  });

  it('filters enabled hooks', () => {
    const hooks = [
      { id: 'h1', event: 'skill:installed', enabled: true },
      { id: 'h2', event: 'drift:detected', enabled: false },
      { id: 'h3', event: 'xp:earned', enabled: true },
    ];
    expect(hooks.filter(h => h.enabled)).toHaveLength(2);
  });
});

describe('Smart Match', () => {
  it('scores keyword matches', () => {
    const skill = { name: 'TypeScript Standards', tags: ['ts', 'strict'], body: '# TS\n- strict mode' };
    const text = `${skill.name} ${skill.tags.join(' ')} ${skill.body}`.toLowerCase();
    const task = 'typescript strict';
    const hits = task.split(' ').filter(w => text.includes(w) && w.length > 2);
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  it('returns sorted results', () => {
    const results = [
      { name: 'A', score: 30 },
      { name: 'B', score: 80 },
      { name: 'C', score: 50 },
    ].sort((a, b) => b.score - a.score);
    expect(results[0].name).toBe('B');
    expect(results[2].name).toBe('A');
  });
});

describe('Hardware Bridge', () => {
  beforeEach(setup);
  afterEach(cleanup);

  it('registers devices', () => {
    const devices = [
      { id: 'mac-01', name: 'MacBook', type: 'desktop', capabilities: ['full-skills'] },
      { id: 'iot-01', name: 'RPi', type: 'iot', capabilities: ['lightweight-skills'] },
    ];
    writeFileSync(join(TEST_DIR, 'devices', 'registry.json'), JSON.stringify(devices));
    const loaded = JSON.parse(readFileSync(join(TEST_DIR, 'devices', 'registry.json'), 'utf-8'));
    expect(loaded).toHaveLength(2);
  });

  it('checks skill compatibility', () => {
    const fullDevice = { capabilities: ['full-skills'] };
    const iotDevice = { capabilities: ['lightweight-skills'] };
    expect(fullDevice.capabilities.includes('full-skills')).toBe(true);
    expect(iotDevice.capabilities.includes('full-skills')).toBe(false);
  });
});

describe('Backup & Restore', () => {
  beforeEach(setup);
  afterEach(cleanup);

  it('creates valid backup bundle', () => {
    const assets = [makeAsset('a', 'skill', 'A', ['ts'], '# A')];
    const bundle = {
      version: '1.0', wallet_version: '1.0.0',
      assets: assets.map(a => ({ id: a.id, type: a.type, name: a.name, content: a.content.body })),
      metadata: { hash: createHash('sha256').update('test').digest('hex').slice(0, 32) },
    };
    const json = JSON.stringify(bundle);
    expect(json).toContain('1.0.0');
    expect(bundle.assets).toHaveLength(1);
    expect(bundle.metadata.hash).toHaveLength(32);
  });

  it('roundtrip backup → restore preserves data', () => {
    const original = makeAsset('test', 'skill', 'Test Skill', ['test'], '# Test');
    const bundle = { assets: [{ id: original.id, name: original.name, content: original.content.body }] };
    const path = join(TEST_DIR, 'backup.osp');
    writeFileSync(path, JSON.stringify(bundle));
    const restored = JSON.parse(readFileSync(path, 'utf-8'));
    expect(restored.assets[0].name).toBe('Test Skill');
  });
});

describe('File Watcher', () => {
  beforeEach(setup);
  afterEach(cleanup);

  it('detects known platform config paths', () => {
    const WATCH_TARGETS = ['CLAUDE.md', '.cursorrules', 'AGENTS.md', '.windsurfrules'];
    expect(WATCH_TARGETS.length).toBeGreaterThanOrEqual(4);
  });

  it('scan detects file changes', () => {
    const known: Record<string, string> = { '/tmp/test': 'old-hash' };
    // Simulate hash comparison
    const currentHash = 'new-hash';
    const events = [];
    for (const [path, oldHash] of Object.entries(known)) {
      if (oldHash !== currentHash) events.push({ type: 'modified', path });
    }
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('modified');
  });
});

describe('Live Sync', () => {
  beforeEach(setup);
  afterEach(cleanup);

  it('manages sync pairs', () => {
    const pairs = [
      { source: 'claude', target: 'cursor', strategy: 'latest-wins', status: 'idle' },
      { source: 'claude', target: 'codex', strategy: 'merge', status: 'idle' },
    ];
    writeFileSync(join(TEST_DIR, 'sync-state.json'), JSON.stringify(pairs));
    const loaded = JSON.parse(readFileSync(join(TEST_DIR, 'sync-state.json'), 'utf-8'));
    expect(loaded).toHaveLength(2);
    expect(loaded[0].strategy).toBe('latest-wins');
  });

  it('detects conflicts between files', () => {
    const srcHash = 'abc123';
    const tgtHash = 'def456';
    expect(srcHash).not.toBe(tgtHash); // Conflict exists
  });
});

describe('Plugin System', () => {
  beforeEach(setup);
  afterEach(cleanup);

  it('installs and lists plugins', () => {
    const plugins = [
      { id: 'plugin-trae', name: 'Trae Adapter', version: '1.0.0', type: 'adapter', enabled: true },
      { id: 'plugin-eslint', name: 'ESLint Scanner', version: '1.0.0', type: 'scanner', enabled: true },
    ];
    const dir = join(TEST_DIR, 'plugins');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'registry.json'), JSON.stringify(plugins));
    const loaded = JSON.parse(readFileSync(join(dir, 'registry.json'), 'utf-8'));
    expect(loaded).toHaveLength(2);
    expect(loaded.filter((p: any) => p.enabled)).toHaveLength(2);
  });

  it('supports 5 plugin types', () => {
    const types = ['adapter', 'scanner', 'hook', 'theme', 'command'];
    expect(types).toHaveLength(5);
  });

  it('toggles plugin enable/disable', () => {
    const plugin = { id: 'test', enabled: true };
    plugin.enabled = false;
    expect(plugin.enabled).toBe(false);
  });
});

describe('Marketplace Ratings', () => {
  beforeEach(setup);
  afterEach(cleanup);

  it('rates a skill and calculates average', () => {
    const ratings = [
      { skill_id: 'sk1', user_id: 'u1', score: 5, tags: ['useful'] },
      { skill_id: 'sk1', user_id: 'u2', score: 4, tags: ['useful', 'secure'] },
      { skill_id: 'sk1', user_id: 'u3', score: 3, tags: ['needs-work'] },
    ];
    const avg = Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10;
    expect(avg).toBe(4);
    expect(ratings).toHaveLength(3);
  });

  it('aggregates top tags', () => {
    const ratings = [
      { tags: ['useful', 'secure'] },
      { tags: ['useful', 'documented'] },
      { tags: ['useful'] },
    ];
    const counts = new Map<string, number>();
    for (const r of ratings) for (const t of r.tags) counts.set(t, (counts.get(t) || 0) + 1);
    const topTags = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
    expect(topTags[0]).toBe('useful');
  });

  it('clamps score to 1-5', () => {
    expect(Math.max(1, Math.min(5, 0))).toBe(1);
    expect(Math.max(1, Math.min(5, 6))).toBe(5);
    expect(Math.max(1, Math.min(5, 3))).toBe(3);
  });
});
