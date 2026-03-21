/**
 * Example: Using OpenSkill SDK to manage AI assets
 *
 * Prerequisites:
 *   1. Run `os init` to initialize your wallet
 *   2. Run `os import --from claude` to import existing assets
 */

import { OpenSkillSDK } from '@openskill/sdk';

async function main() {
  const hw = new OpenSkillSDK();

  // ── List all assets ────────────────────────────────
  console.log('=== All Assets ===');
  const all = await hw.listAssets();
  for (const asset of all) {
    console.log(`  [${asset.type}] ${asset.name} (L${asset.level})`);
  }

  // ── Filter by type ─────────────────────────────────
  console.log('\n=== Skills Only ===');
  const skills = await hw.listAssets({ type: 'skill' });
  for (const skill of skills) {
    console.log(`  ⚡ ${skill.name}`);
  }

  // ── Search by keyword ──────────────────────────────
  console.log('\n=== Search: "typescript" ===');
  const tsAssets = await hw.searchAssets('typescript');
  for (const asset of tsAssets) {
    console.log(`  🔍 ${asset.name} — ${asset.tags.join(', ')}`);
  }

  // ── Filter by level ────────────────────────────────
  console.log('\n=== Universal (L0) Assets ===');
  const universal = await hw.listAssets({ level: 0 });
  for (const asset of universal) {
    console.log(`  🌍 ${asset.name}`);
  }

  // ── Validate an asset ──────────────────────────────
  const testAsset = {
    id: 'os-ski-test123',
    type: 'skill',
    level: 1,
    name: 'Test Skill',
    version: '1.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: { id: 'user-test' },
    tags: ['test'],
    compatibility: ['claude'],
    content: { format: 'markdown', body: '# Test', metadata: {} },
    sync: { strategy: 'manual', last_synced: {}, conflict_resolution: 'user-decides' },
  };

  const validation = hw.validate(testAsset);
  console.log('\n=== Validation ===');
  console.log(`  Valid: ${validation.valid}`);
  if (validation.errors) {
    console.log(`  Errors: ${validation.errors.join(', ')}`);
  }
}

main().catch(console.error);
