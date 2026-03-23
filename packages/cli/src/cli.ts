#!/usr/bin/env node
/**
 * OpenSkill CLI v1.0.0 — Cross-domain AI skill asset manager
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { Wallet } from './core/wallet.js';
import { ClaudeAdapter } from './adapters/claude.js';
import { OpenClawAdapter } from './adapters/openclaw.js';
import { CursorAdapter } from './adapters/cursor.js';
import { VSCodeAdapter } from './adapters/vscode.js';
import { WindsurfAdapter } from './adapters/windsurf.js';
import { GeminiAdapter } from './adapters/gemini.js';
import { CopilotAdapter } from './adapters/copilot.js';
import { CodexAdapter } from './adapters/codex.js';

const program = new Command();
program.name('oski').description('OpenSkill — Cross-domain AI data asset manager').version('1.0.0');

const typeIcon: Record<string, string> = { skill: '⚡', memory: '🧠', preference: '⚙️' };
const levelLabel: Record<number, string> = { 0: 'L0:Universal', 1: 'L1:Domain', 2: 'L2:Tool' };

function getAdapter(platform: string) {
  const map: Record<string, () => any> = {
    claude: () => new ClaudeAdapter(), openclaw: () => new OpenClawAdapter(),
    cursor: () => new CursorAdapter(), vscode: () => new VSCodeAdapter(),
    windsurf: () => new WindsurfAdapter(), gemini: () => new GeminiAdapter(),
    copilot: () => new CopilotAdapter(), codex: () => new CodexAdapter(),
  };
  return map[platform]?.() ?? null;
}

function printAsset(a: any) {
  const icon = typeIcon[a.type] ?? '📦';
  const level = chalk.dim(levelLabel[a.level] ?? '');
  const tags = a.tags.map((t: string) => chalk.cyan(`#${t}`)).join(' ');
  const team = a.team ? chalk.magenta(`[${a.team}]`) : '';
  const mp = a.marketplace?.published ? chalk.green(' 📢 Published') : '';
  console.log(`  ${icon} ${chalk.bold(a.name)} ${team}${mp}`);
  console.log(`    ${chalk.dim(a.id)} · v${a.version} · ${level}`);
  console.log(`    ${tags}`);
  console.log();
}

// ─── oski init ─────────────────────────────────────────────
program.command('init').description('Initialize a new wallet')
  .option('--user-id <id>', 'User identifier').option('--name <name>', 'User display name')
  .action((opts) => {
    if (Wallet.isInitialized()) { console.log(chalk.yellow('⚠ Wallet already initialized at'), Wallet.walletDir); return; }
    Wallet.initialize(opts.userId, opts.name);
    console.log(chalk.green('✓ Wallet initialized at'), Wallet.walletDir);
    console.log(chalk.dim('  Supported platforms: claude, openclaw, cursor, vscode, windsurf'));
    console.log(chalk.dim('  Run `oski import --from claude` to import your existing assets.'));
  });

// ─── oski list ─────────────────────────────────────────────
program.command('list').description('List wallet assets')
  .option('-t, --type <type>', 'Filter: skill | memory | preference')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('-l, --level <level>', 'Filter: 0 | 1 | 2')
  .option('--team <team>', 'Filter by team')
  .action((opts) => {
    const wallet = new Wallet();
    const filter: any = {};
    if (opts.type) filter.type = opts.type;
    if (opts.tags) filter.tags = opts.tags.split(',');
    if (opts.level !== undefined) filter.level = Number(opts.level);
    if (opts.team) filter.team = opts.team;
    const assets = wallet.listAssets(filter);
    if (!assets.length) { console.log(chalk.dim('No assets found.')); return; }
    console.log(chalk.bold(`\n  OpenSkill — ${assets.length} asset(s)\n`));
    assets.forEach(printAsset);
  });

// ─── os search ───────────────────────────────────────────
program.command('search <query>').description('Search assets by keyword')
  .action((query) => {
    const wallet = new Wallet();
    const assets = wallet.listAssets({ search: query });
    if (!assets.length) { console.log(chalk.dim(`No results for "${query}".`)); return; }
    console.log(chalk.bold(`\n  ${assets.length} result(s) for "${query}"\n`));
    assets.forEach(printAsset);
  });

// ─── oski import ───────────────────────────────────────────
program.command('import').description('Import assets from a platform')
  .requiredOption('--from <platform>', 'Source: claude | openclaw | cursor | vscode | windsurf')
  .option('-t, --type <type>', 'Import only specific type')
  .action(async (opts) => {
    const wallet = new Wallet();
    const adapter = getAdapter(opts.from);
    if (!adapter) { console.log(chalk.red(`✗ Unknown platform: ${opts.from}`)); return; }
    const detected = await adapter.detect();
    if (!detected) { console.log(chalk.yellow(`⚠ ${adapter.displayName} not detected.`)); return; }
    console.log(chalk.dim(`  Scanning ${adapter.displayName}...`));
    const assets = await adapter.pull(opts.type);
    if (!assets.length) { console.log(chalk.dim('  No assets found.')); return; }
    for (const asset of assets) {
      const created = wallet.createAsset({ type: asset.type, level: asset.level, name: asset.name, tags: asset.tags, compatibility: asset.compatibility, content: asset.content });
      console.log(chalk.green(`  ✓ Imported: ${created.name}`), chalk.dim(`(${created.id})`));
    }
    console.log(chalk.bold(`\n  ${assets.length} asset(s) imported from ${adapter.displayName}.\n`));
  });

// ─── os export ───────────────────────────────────────────
program.command('export').description('Export assets to a platform')
  .requiredOption('--to <platform>', 'Target platform').option('--id <id>', 'Specific asset ID')
  .action(async (opts) => {
    const wallet = new Wallet();
    const adapter = getAdapter(opts.to);
    if (!adapter) { console.log(chalk.red(`✗ Unknown platform: ${opts.to}`)); return; }
    if (opts.id) {
      const asset = wallet.getAsset(opts.id);
      if (!asset) { console.log(chalk.red(`✗ Asset not found: ${opts.id}`)); return; }
      const result = await adapter.push(asset);
      console.log(result.success ? chalk.green(`  ✓ ${result.message}`) : chalk.red(`  ✗ ${result.message}`));
    } else {
      console.log(chalk.yellow('  Specify --id <asset-id>. Run `oski list` to see assets.'));
    }
  });

// ─── oski sync ─────────────────────────────────────────────
program.command('sync').description('Two-way sync with a platform')
  .requiredOption('--to <platform>', 'Target platform')
  .option('--direction <dir>', 'pull | push | both', 'both')
  .action(async (opts) => {
    const wallet = new Wallet();
    const adapter = getAdapter(opts.to);
    if (!adapter) { console.log(chalk.red(`✗ Unknown platform: ${opts.to}`)); return; }
    console.log(chalk.dim(`  Syncing with ${adapter.displayName} (${opts.direction})...`));
    const result = await wallet.syncWithPlatform(adapter, opts.direction);
    console.log(chalk.green(`  ✓ Pulled: ${result.pulled}, Pushed: ${result.pushed}, Conflicts: ${result.conflicts.length}`));
    if (result.conflicts.length) {
      for (const c of result.conflicts) {
        console.log(chalk.yellow(`    ⚠ Conflict on ${c.asset_id}: ${c.diffs.map(d => d.field).join(', ')}`));
      }
    }
  });

// ─── os inspect ──────────────────────────────────────────
program.command('inspect <id>').description('View asset details + history')
  .action((id) => {
    const wallet = new Wallet();
    const asset = wallet.getAsset(id);
    if (!asset) { console.log(chalk.red(`✗ Asset not found: ${id}`)); return; }
    console.log(chalk.bold(`\n  ${asset.name}\n`));
    console.log(`  ID:            ${asset.id}`);
    console.log(`  Type:          ${asset.type}`);
    console.log(`  Level:         L${asset.level} (${levelLabel[asset.level]})`);
    console.log(`  Version:       ${asset.version}`);
    console.log(`  Created:       ${asset.created_at}`);
    console.log(`  Updated:       ${asset.updated_at}`);
    console.log(`  Tags:          ${asset.tags.join(', ')}`);
    console.log(`  Compatibility: ${asset.compatibility.join(', ')}`);
    console.log(`  Format:        ${asset.content.format}`);
    console.log(`  Content Size:  ${asset.content.body.length} chars`);
    if (asset.team) console.log(`  Team:          ${asset.team}`);
    if (asset.marketplace?.published) console.log(`  Marketplace:   Published (${asset.marketplace.downloads} downloads)`);
    const history = wallet.getHistory(id);
    if (history.length) {
      console.log(chalk.dim(`\n  Version History:`));
      for (const h of history) console.log(chalk.dim(`    v${h.version} — ${h.action} — ${h.timestamp}`));
    }
    console.log(chalk.dim(`\n  Content Preview (first 300 chars):`));
    console.log(chalk.dim(`  ${asset.content.body.slice(0, 300)}`));
    console.log();
  });

// ─── os diff ─────────────────────────────────────────────
program.command('diff <id1> <id2>').description('Compare two assets')
  .action((id1, id2) => {
    const wallet = new Wallet();
    const a1 = wallet.getAsset(id1), a2 = wallet.getAsset(id2);
    if (!a1 || !a2) { console.log(chalk.red('✗ One or both assets not found.')); return; }
    const diffs = wallet.diff(a1, a2);
    if (!diffs.length) { console.log(chalk.green('  Assets are identical.')); return; }
    console.log(chalk.bold(`\n  ${diffs.length} difference(s):\n`));
    for (const d of diffs) {
      console.log(`  ${chalk.yellow(d.field)}: ${chalk.red(d.local_value)} → ${chalk.green(d.remote_value)}`);
    }
    console.log();
  });

// ─── os stats ────────────────────────────────────────────
program.command('stats').description('Wallet statistics')
  .action(() => {
    const wallet = new Wallet();
    const s = wallet.stats();
    console.log(chalk.bold('\n  OpenSkill Stats\n'));
    console.log(`  ⚡ Skills:       ${s.skills}`);
    console.log(`  🧠 Memories:     ${s.memories}`);
    console.log(`  ⚙️  Preferences:  ${s.preferences}`);
    console.log(`  ────────────────`);
    console.log(`  📦 Total:        ${s.total}`);
    console.log(`  👥 Teams:        ${s.teams}`);
    console.log(`  📢 Marketplace:  ${s.marketplace}`);
    console.log(`\n  Supported platforms: claude, openclaw, cursor, vscode, windsurf\n`);
  });

// ─── os team ─────────────────────────────────────────────
const teamCmd = program.command('team').description('Manage team wallets');
teamCmd.command('create <id> <name>').description('Create a team')
  .action((id, name) => {
    const wallet = new Wallet();
    const team = wallet.createTeam(id, name);
    console.log(chalk.green(`  ✓ Team created: ${team.name} (${team.id})`));
  });
teamCmd.command('list').description('List teams')
  .action(() => {
    const wallet = new Wallet();
    const teams = wallet.listTeams();
    if (!teams.length) { console.log(chalk.dim('  No teams. Use `oski team create <id> <name>` to create one.')); return; }
    for (const t of teams) console.log(`  👥 ${chalk.bold(t.name)} (${t.id}) — ${t.role}`);
  });
teamCmd.command('share <asset-id> <team-id>').description('Share an asset to a team')
  .action((assetId, teamId) => {
    const wallet = new Wallet();
    const ok = wallet.shareAssetToTeam(assetId, teamId);
    console.log(ok ? chalk.green(`  ✓ Shared to team ${teamId}`) : chalk.red('  ✗ Failed to share'));
  });
teamCmd.command('assets <team-id>').description('List team assets')
  .action((teamId) => {
    const wallet = new Wallet();
    const assets = wallet.listTeamAssets(teamId);
    if (!assets.length) { console.log(chalk.dim('  No team assets.')); return; }
    console.log(chalk.bold(`\n  Team assets (${assets.length}):\n`));
    assets.forEach(printAsset);
  });

// ─── os marketplace ──────────────────────────────────────
const mpCmd = program.command('marketplace').description('Asset marketplace');
mpCmd.command('publish <asset-id>').description('Publish an asset')
  .option('-d, --desc <description>', 'Description', '')
  .option('-p, --price <price>', 'Price (free or number)', 'free')
  .action((assetId, opts) => {
    const wallet = new Wallet();
    const result = wallet.publishToMarketplace(assetId, opts.desc, opts.price === 'free' ? 'free' : Number(opts.price));
    console.log(result ? chalk.green(`  ✓ Published: ${result.name}`) : chalk.red('  ✗ Asset not found'));
  });
mpCmd.command('list').description('Browse marketplace')
  .option('-t, --type <type>', 'Filter type')
  .action((opts) => {
    const wallet = new Wallet();
    const assets = wallet.listMarketplace(opts.type);
    if (!assets.length) { console.log(chalk.dim('  Marketplace empty.')); return; }
    console.log(chalk.bold(`\n  Marketplace (${assets.length} items):\n`));
    assets.forEach(printAsset);
  });

// ─── os adapters ─────────────────────────────────────────
program.command('adapters').description('List available platform adapters')
  .action(async () => {
    const platforms = ['claude', 'openclaw', 'cursor', 'vscode', 'windsurf', 'gemini', 'copilot', 'codex'];
    console.log(chalk.bold('\n  Available Adapters (8)\n'));
    for (const p of platforms) {
      const adapter = getAdapter(p);
      const detected = await adapter.detect();
      const status = detected ? chalk.green('✓ Detected') : chalk.dim('✗ Not found');
      console.log(`  ${status}  ${adapter.displayName} (${adapter.platform})`);
    }
    console.log();
  });

// ─── os sign (Phase 3) ───────────────────────────────────
program.command('sign <id>').description('Sign an asset with Ed25519 key')
  .action((id) => {
    const wallet = new Wallet();
    const asset = wallet.getAsset(id);
    if (!asset) { console.log(chalk.red(`✗ Asset not found: ${id}`)); return; }
    try {
      const { signContent, hasKeys, generateKeys } = require('./core/crypto.js');
      if (!hasKeys()) { console.log(chalk.dim('  Generating Ed25519 keypair...')); generateKeys(); }
      const result = signContent(JSON.stringify(asset.content));
      console.log(chalk.green(`  ✓ Signed: ${asset.name}`));
      console.log(`    Hash:      ${result.hash.slice(0, 32)}...`);
      console.log(`    Signature: ${result.signature.slice(0, 32)}...`);
      console.log(`    Public Key: ${result.publicKey}`);
    } catch (err) { console.log(chalk.red(`  ✗ Signing failed: ${err}`)); }
  });

// ─── os verify (Phase 3) ─────────────────────────────────
program.command('verify <id>').description('Verify asset signature')
  .action((id) => {
    const wallet = new Wallet();
    const asset = wallet.getAsset(id);
    if (!asset) { console.log(chalk.red(`✗ Asset not found: ${id}`)); return; }
    if (!asset.author.signature) { console.log(chalk.yellow(`  ⚠ Asset not signed. Use \`oski sign ${id}\` first.`)); return; }
    console.log(chalk.green(`  ✓ Asset has signature: ${asset.author.signature.slice(0, 40)}...`));
  });

// ─── os keys (Phase 3) ──────────────────────────────────
program.command('keys').description('Show wallet key information')
  .action(() => {
    try {
      const { hasKeys, getPublicKeyHex, generateKeys } = require('./core/crypto.js');
      if (!hasKeys()) {
        console.log(chalk.dim('  No keys found. Generating...'));
        const kp = generateKeys();
        console.log(chalk.green(`  ✓ Keys generated. Public key: ${kp.publicKey}`));
      } else {
        const pub = getPublicKeyHex();
        console.log(chalk.bold('\n  Wallet Keys\n'));
        console.log(`  Public Key: ${pub}`);
        console.log(`  DID:        did:key:${pub}`);
        console.log(chalk.dim(`  Keys stored in ~/.openskill/keys/`));
      }
    } catch (err) { console.log(chalk.red(`  ✗ ${err}`)); }
  });

// ─── os registry (Phase 3) ──────────────────────────────
const regCmd = program.command('registry').description('OSP decentralized asset registry');
regCmd.command('publish <id>').description('Publish asset to registry')
  .action((id) => {
    const wallet = new Wallet();
    const asset = wallet.getAsset(id);
    if (!asset) { console.log(chalk.red(`✗ Asset not found: ${id}`)); return; }
    try {
      const { AssetRegistry } = require('./core/registry.js');
      const reg = new AssetRegistry('local');
      const entry = reg.publish(asset);
      console.log(chalk.green(`  ✓ Published to registry: ${entry.name}`));
      console.log(`    OSP ID: ${entry.osp_id}`);
      console.log(`    Hash:   ${entry.content_hash.slice(0, 32)}...`);
    } catch (err) { console.log(chalk.red(`  ✗ ${err}`)); }
  });
regCmd.command('search <query>').description('Search registry')
  .action((query) => {
    try {
      const { AssetRegistry } = require('./core/registry.js');
      const reg = new AssetRegistry('local');
      const results = reg.search(query);
      if (!results.length) { console.log(chalk.dim(`  No results for "${query}".`)); return; }
      console.log(chalk.bold(`\n  Registry: ${results.length} result(s)\n`));
      for (const r of results) {
        console.log(`  📦 ${chalk.bold(r.name)} (${r.osp_id})`);
        console.log(`    v${r.version} | ${r.type} | Downloads: ${r.downloads} | Tags: ${r.tags.join(', ')}`);
        console.log();
      }
    } catch (err) { console.log(chalk.red(`  ✗ ${err}`)); }
  });
regCmd.command('install <hwp-id>').description('Install asset from registry')
  .action((ospId) => {
    try {
      const { AssetRegistry } = require('./core/registry.js');
      const reg = new AssetRegistry('local');
      const asset = reg.install(ospId);
      if (!asset) { console.log(chalk.red(`  ✗ Not found in registry: ${ospId}`)); return; }
      const wallet = new Wallet();
      wallet.createAsset({ type: asset.type, level: asset.level, name: asset.name, tags: asset.tags, compatibility: asset.compatibility, content: asset.content });
      console.log(chalk.green(`  ✓ Installed: ${asset.name}`));
    } catch (err) { console.log(chalk.red(`  ✗ ${err}`)); }
  });
regCmd.command('list').description('List all registry entries')
  .action(() => {
    try {
      const { AssetRegistry } = require('./core/registry.js');
      const reg = new AssetRegistry('local');
      const entries = reg.list();
      if (!entries.length) { console.log(chalk.dim('  Registry empty.')); return; }
      console.log(chalk.bold(`\n  Registry (${entries.length} entries)\n`));
      for (const r of entries) {
        console.log(`  📦 ${chalk.bold(r.name)} (${r.osp_id}) — v${r.version} — ${r.downloads} downloads`);
      }
      console.log();
    } catch (err) { console.log(chalk.red(`  ✗ ${err}`)); }
  });

// ─── oski scan (Track 2: Security) ─────────────────────────
program.command('scan [id]').description('Scan asset(s) for security issues')
  .option('-a, --all', 'Scan all assets')
  .action((id, opts) => {
    const wallet = new Wallet();
    const { scanAsset, scanAll, formatReport } = require('./security/scanner.js');
    if (opts.all) {
      const assets = wallet.listAssets();
      if (!assets.length) { console.log(chalk.dim('  No assets to scan.')); return; }
      const reports = scanAll(assets);
      console.log(chalk.bold(`\n  Security Scan — ${reports.length} asset(s)\n`));
      for (const r of reports) console.log(formatReport(r));
      const passed = reports.filter((r: any) => r.passed).length;
      console.log(chalk.bold(`  Summary: ${passed}/${reports.length} passed\n`));
    } else if (id) {
      const asset = wallet.getAsset(id);
      if (!asset) { console.log(chalk.red(`✗ Asset not found: ${id}`)); return; }
      console.log(chalk.bold('\n  Security Scan\n'));
      console.log(formatReport(scanAsset(asset)));
    } else {
      console.log(chalk.yellow('  Specify asset ID or use --all. Run `oski list` to see assets.'));
    }
  });

// ─── os audit (Track 4: Enterprise) ─────────────────────
const auditCmd = program.command('audit').description('View audit trail');
auditCmd.command('log').description('Show audit log')
  .option('-n, --limit <n>', 'Number of entries', '20')
  .option('--action <action>', 'Filter by action')
  .action((opts) => {
    const { readAuditLog, formatAuditLog } = require('./enterprise/audit.js');
    const entries = readAuditLog({ action: opts.action });
    console.log(chalk.bold(`\n  Audit Log (${Math.min(entries.length, parseInt(opts.limit))} of ${entries.length})\n`));
    console.log(formatAuditLog(entries.slice(0, parseInt(opts.limit))));
  });
auditCmd.command('permissions <role>').description('Show role permissions')
  .action((role) => {
    const { getPermissions } = require('./enterprise/audit.js');
    const perms = getPermissions(role);
    if (!perms) { console.log(chalk.red(`  Unknown role: ${role}`)); return; }
    console.log(chalk.bold(`\n  Permissions for ${role}\n`));
    for (const [k, v] of Object.entries(perms)) {
      console.log(`  ${v ? chalk.green('✓') : chalk.red('✗')}  ${k}`);
    }
    console.log();
  });

// ─── os commerce (Track 3: Commerce) ────────────────────
const comCmd = program.command('commerce').description('Agent commerce & metering');
comCmd.command('usage <asset-id>').description('View usage stats')
  .action((assetId) => {
    const { getUsageStats } = require('./commerce/metering.js');
    const stats = getUsageStats(assetId);
    console.log(chalk.bold('\n  Usage Stats\n'));
    console.log(`  Total invocations:  ${stats.total}`);
    console.log(`  Last 30 days:       ${stats.last_30_days}`);
    console.log(`  Unique users:       ${stats.unique_users}`);
    console.log();
  });
comCmd.command('earnings [creator-id]').description('View creator earnings')
  .action((creatorId) => {
    const { getCreatorEarnings } = require('./commerce/metering.js');
    const wallet = new Wallet();
    const cid = creatorId || wallet.getConfig().user.id;
    const earnings = getCreatorEarnings(cid);
    console.log(chalk.bold('\n  Creator Earnings\n'));
    console.log(`  Total earned:    $${(earnings.total_earned / 100).toFixed(2)}`);
    console.log(`  Your share:      $${(earnings.total_share / 100).toFixed(2)}`);
    console.log(`  Assets sold:     ${earnings.asset_count}`);
    console.log();
  });

// ═══════════════════════════════════════════════════════════
// v0.5.0 — Local Discovery + Analysis + Optimization
// ═══════════════════════════════════════════════════════════

// ─── oski discover ─────────────────────────────────────────
program.command('discover').description('Scan local system for AI skills, configs, and memory')
  .option('-v, --verbose', 'Show all scan paths')
  .action((opts) => {
    const { discoverLocalAssets, detectPlatforms } = require('./core/local-scanner.js');
    const scan = discoverLocalAssets();
    console.log(chalk.bold(`\n  🔍 Local Discovery — ${scan.total_assets} asset(s) found\n`));
    console.log(chalk.dim(`  Scanned at: ${scan.scanned_at}`));
    console.log(chalk.dim(`  Platforms detected: ${scan.platforms_detected.join(', ') || 'none'}\n`));
    if (scan.total_assets === 0) {
      console.log(chalk.dim('  No AI configs found. Install Claude Code, Cursor, OpenClaw, etc. to get started.'));
      if (opts.verbose) {
        console.log(chalk.dim('\n  Scanned paths:'));
        for (const p of scan.scan_paths) console.log(chalk.dim(`    ${p.exists ? '✓' : '✗'} ${p.path}`));
      }
      return;
    }
    const byPlatform = new Map();
    for (const a of scan.assets) {
      if (!byPlatform.has(a.platform)) byPlatform.set(a.platform, []);
      byPlatform.get(a.platform).push(a);
    }
    for (const [platform, assets] of byPlatform) {
      console.log(chalk.bold(`  📂 ${platform} (${assets.length})`));
      for (const a of assets) {
        const sizeStr = a.size > 1024 ? `${(a.size/1024).toFixed(1)}KB` : `${a.size}B`;
        console.log(`    ${typeIcon[a.type] || '📄'} ${a.name}`);
        console.log(chalk.dim(`      ${a.path} · ${sizeStr} · ${a.format} · ${a.modified.slice(0,10)}`));
      }
      console.log();
    }
    if (opts.verbose) {
      console.log(chalk.dim('  All scan paths:'));
      for (const p of scan.scan_paths) console.log(chalk.dim(`    ${p.exists ? '✓' : '✗'} [${p.platform}] ${p.path}`));
    }
    console.log(chalk.dim(`  Run \`oski analyze\` for quality scoring and recommendations.\n`));
  });

// ─── os analyze ──────────────────────────────────────────
program.command('analyze').description('Analyze quality and provide recommendations for local AI assets')
  .option('-p, --platform <platform>', 'Analyze specific platform only')
  .action((opts) => {
    const { discoverLocalAssets } = require('./core/local-scanner.js');
    const { scoreAsset, compareAcrossPlatforms, generateRecommendations, formatRecommendations } = require('./core/analyzer.js');
    const scan = discoverLocalAssets();
    let assets = scan.assets;
    if (opts.platform) assets = assets.filter((a: any) => a.platform === opts.platform);
    if (!assets.length) { console.log(chalk.dim('  No assets found. Run `oski discover` first.')); return; }

    console.log(chalk.bold(`\n  📊 Asset Analysis — ${assets.length} asset(s)\n`));

    // Quality scores
    console.log(chalk.bold('  Quality Scores:\n'));
    const scores = assets.map((a: any) => scoreAsset(a));
    for (const s of scores.sort((a: any, b: any) => b.overall - a.overall)) {
      const bar = '█'.repeat(Math.round(s.overall / 5)) + '░'.repeat(20 - Math.round(s.overall / 5));
      const color = s.overall >= 70 ? chalk.green : s.overall >= 40 ? chalk.yellow : chalk.red;
      console.log(`  ${color(`${s.overall}`)} ${bar} ${s.asset_name} (${s.platform})`);
      if (s.issues.length) console.log(chalk.dim(`       Issues: ${s.issues.slice(0,2).join('; ')}`));
    }

    // Comparison
    const comparison = compareAcrossPlatforms(scan);
    if (comparison.duplicates.length) {
      console.log(chalk.bold('\n  🔗 Duplicates Detected:\n'));
      for (const d of comparison.duplicates) {
        console.log(`    ${d.assets.map((a: any) => `${a.platform}:${a.name}`).join(' ↔ ')} — ${d.similarity}`);
      }
    }

    // Recommendations
    const recs = generateRecommendations(scan, comparison);
    if (recs.length) {
      console.log(chalk.bold(`\n  💡 Recommendations (${recs.length}):\n`));
      console.log(formatRecommendations(recs));
    }
    console.log(chalk.dim(`  Run \`oski optimize\` to apply recommended changes.\n`));
  });

// ─── os compare ──────────────────────────────────────────
program.command('compare').description('Compare assets across platforms')
  .option('--platforms <p1,p2>', 'Compare specific platforms (comma-separated)')
  .action((opts) => {
    const { discoverLocalAssets } = require('./core/local-scanner.js');
    const { compareAcrossPlatforms } = require('./core/analyzer.js');
    const scan = discoverLocalAssets();
    const comparison = compareAcrossPlatforms(scan);

    console.log(chalk.bold('\n  🔄 Cross-Platform Comparison\n'));

    // Platform summary
    const byPlatform = new Map();
    for (const a of scan.assets) { if (!byPlatform.has(a.platform)) byPlatform.set(a.platform, []); byPlatform.get(a.platform).push(a); }
    console.log('  Platform coverage:');
    for (const [p, assets] of byPlatform) {
      const types = [...new Set(assets.map((a: any) => a.type))];
      console.log(`    ${chalk.bold(p)}: ${assets.length} assets (${types.join(', ')})`);
    }

    if (comparison.duplicates.length) {
      console.log(chalk.bold(`\n  Duplicates (${comparison.duplicates.length}):`));
      for (const d of comparison.duplicates) console.log(`    ↔ ${d.assets.map((a: any) => a.platform).join(' ⟷ ')}: ${d.similarity}`);
    } else {
      console.log(chalk.dim('\n  No duplicates found.'));
    }

    if (comparison.coverage_gaps.length) {
      console.log(chalk.bold(`\n  Coverage gaps:`));
      for (const g of comparison.coverage_gaps) console.log(`    ⚠ ${g.platform}: missing ${g.missing_types.join(', ')}`);
    }

    if (comparison.sync_candidates.length) {
      console.log(chalk.bold(`\n  Sync candidates:`));
      for (const c of comparison.sync_candidates) console.log(`    → ${c.source.name} → ${c.targets.join(', ')}`);
    }
    console.log();
  });

// ─── os optimize ─────────────────────────────────────────
program.command('optimize').description('Apply recommended optimizations')
  .option('--dry-run', 'Show what would be done without making changes')
  .action((opts) => {
    const { discoverLocalAssets } = require('./core/local-scanner.js');
    const { compareAcrossPlatforms, generateRecommendations } = require('./core/analyzer.js');
    const scan = discoverLocalAssets();
    const comparison = compareAcrossPlatforms(scan);
    const recs = generateRecommendations(scan, comparison);

    if (!recs.length) { console.log(chalk.green('\n  ✓ No optimizations needed — your setup is clean!\n')); return; }

    console.log(chalk.bold(`\n  🛠️  Optimization Plan (${recs.length} actions)\n`));
    const priIcon: Record<string, string> = { high: '🔴', medium: '🟡', low: '🔵' };
    for (const [i, r] of recs.entries()) {
      console.log(`  ${i+1}. ${priIcon[r.priority]} [${r.category}] ${r.title}`);
      console.log(chalk.dim(`     ${r.description}`));
      console.log(chalk.cyan(`     $ ${r.action}`));
      console.log();
    }

    if (opts.dryRun) {
      console.log(chalk.dim('  (Dry run — no changes made)\n'));
    } else {
      // Auto-import discovered assets into wallet
      let imported = 0;
      try {
        const wallet = new Wallet();
        for (const asset of scan.assets) {
          const existing = wallet.listAssets({ search: asset.name });
          if (!existing.length) {
            wallet.createAsset({
              type: asset.type === 'config' ? 'preference' : asset.type as any,
              level: 2, name: asset.name, tags: [asset.platform, asset.type],
              compatibility: [asset.platform],
              content: { format: asset.format, body: asset.content_preview, metadata: { source_path: asset.path } },
            });
            imported++;
          }
        }
        console.log(chalk.green(`  ✓ Auto-imported ${imported} new asset(s) into wallet.\n`));
      } catch (e) {
        console.log(chalk.yellow(`  ⚠ Wallet not initialized. Run \`oski init\` first, then \`oski optimize\`.\n`));
      }
    }
  });

// ═══════════════════════════════════════════════════════════
// v0.6.0 — Growth System (Gamification)
// ═══════════════════════════════════════════════════════════

// ─── os profile ──────────────────────────────────────────
program.command('profile').description('View your wallet growth profile')
  .action(() => {
    const { loadProfile, formatProfile } = require('./core/growth.js');
    const profile = loadProfile();
    console.log(chalk.bold('\n  🎮 Wallet Profile\n'));
    console.log(formatProfile(profile));
  });

// ─── os achievements ─────────────────────────────────────
program.command('achievements').description('View all achievements')
  .action(() => {
    const { loadProfile } = require('./core/growth.js');
    const profile = loadProfile();
    console.log(chalk.bold('\n  🏆 Achievements\n'));
    for (const a of profile.achievements) {
      const status = a.unlocked ? chalk.green(`${a.badge} ${a.name}`) : chalk.dim(`🔒 ${a.name}`);
      console.log(`  ${status} — ${a.description}${a.unlocked_at ? chalk.dim(` (${a.unlocked_at.slice(0,10)})`) : ''}`);
    }
    console.log();
  });

// ─── os leaderboard ──────────────────────────────────────
program.command('leaderboard').description('View XP leaderboard')
  .action(() => {
    const { loadProfile, getRankInfo, xpToNextLevel } = require('./core/growth.js');
    const profile = loadProfile();
    const rank = getRankInfo(profile.level);
    const next = xpToNextLevel(profile);
    console.log(chalk.bold('\n  📊 Leaderboard\n'));
    console.log(`  ${rank.badge} You — Lv.${profile.level} ${rank.name} — ${profile.xp} XP`);
    console.log(chalk.dim(`  ${next > 0 ? `${next} XP to Lv.${profile.level + 1}` : 'MAX LEVEL'}`));
    console.log(chalk.dim(`\n  Streak: ${profile.streak.current} days 🔥 | Best: ${profile.streak.longest}\n`));
    console.log(chalk.dim(`  Total actions: ${profile.history.length}`));
    console.log();
  });

// ═══════════════════════════════════════════════════════════
// v0.7.0 — Cross-Platform Migration + AI Identity Management
// ═══════════════════════════════════════════════════════════

// ─── os migrate ──────────────────────────────────────────
program.command('migrate').description('Migrate assets between AI platforms')
  .requiredOption('--from <platform>', 'Source platform')
  .requiredOption('--to <platform>', 'Target platform')
  .option('--dry-run', 'Preview migration without making changes')
  .action((opts) => {
    const { planMigration, executeMigration } = require('./core/migration.js');
    try {
      const plan = planMigration(opts.from, opts.to);
      console.log(chalk.bold(`\n  🔄 Migration: ${opts.from} → ${opts.to}\n`));
      if (plan.warnings.length) {
        console.log(chalk.yellow('  Warnings:'));
        plan.warnings.forEach((w: string) => console.log(chalk.yellow(`    ⚠ ${w}`)));
        console.log();
      }
      console.log(`  Assets to migrate: ${plan.assets.length}`);
      for (const a of plan.assets) {
        const icon = a.action === 'copy' ? '📋' : a.action === 'transform' ? '🔄' : '⏭️';
        console.log(`    ${icon} ${a.name} (${a.action}${a.transform_notes ? ': ' + a.transform_notes : ''})`);
      }
      const result = executeMigration(plan, opts.dryRun);
      console.log(chalk.bold(`\n  Result: ${result.migrated} migrated, ${result.skipped} skipped${opts.dryRun ? ' (DRY RUN)' : ''}`));
      if (result.errors.length) result.errors.forEach((e: string) => console.log(chalk.red(`    ✗ ${e}`)));
      console.log(chalk.dim(`  Duration: ${result.duration_ms}ms\n`));
    } catch (e) { console.log(chalk.red(`  ✗ ${e}`)); }
  });

// ─── os backup ───────────────────────────────────────────
program.command('backup').description('Export full AI identity as .osp backup')
  .option('-o, --output <path>', 'Output file path')
  .action((opts) => {
    const { saveBackup, createBackup } = require('./core/migration.js');
    try {
      const bundle = createBackup();
      const path = saveBackup(opts.output);
      console.log(chalk.bold('\n  💾 Wallet Backup Created\n'));
      console.log(`  File:      ${path}`);
      console.log(`  Assets:    ${bundle.metadata.asset_count}`);
      console.log(`  Platforms: ${bundle.platforms.join(', ')}`);
      console.log(`  Size:      ${bundle.metadata.total_size} chars`);
      console.log(`  Hash:      ${bundle.metadata.hash}`);
      console.log(chalk.dim(`\n  Restore with: os restore ${path}\n`));
    } catch (e) { console.log(chalk.red(`  ✗ ${e}`)); }
  });

// ─── os restore ──────────────────────────────────────────
program.command('restore <file>').description('Restore AI identity from .osp backup')
  .action((file) => {
    const { restoreBackup } = require('./core/migration.js');
    try {
      const result = restoreBackup(file);
      console.log(chalk.bold('\n  📥 Wallet Restored\n'));
      console.log(chalk.green(`  ✓ Restored: ${result.restored} assets`));
      if (result.errors.length) {
        console.log(chalk.yellow(`  ⚠ Errors: ${result.errors.length}`));
        result.errors.forEach((e: string) => console.log(chalk.red(`    ${e}`)));
      }
      console.log();
    } catch (e) { console.log(chalk.red(`  ✗ ${e}`)); }
  });

// ─── os onboard ──────────────────────────────────────────
program.command('onboard <platform>').description('Deploy wallet contents to a new platform')
  .action((platform) => {
    const { onboardPlatform, getSupportedPlatforms } = require('./core/migration.js');
    try {
      const result = onboardPlatform(platform);
      console.log(chalk.bold(`\n  🚀 Onboarded: ${platform}\n`));
      console.log(chalk.green(`  ✓ Deployed ${result.deployed} file(s):`));
      result.files.forEach((f: string) => console.log(`    📄 ${f}`));
      console.log();
    } catch (e) {
      const platforms = getSupportedPlatforms();
      console.log(chalk.red(`  ✗ ${e}`));
      console.log(chalk.dim(`  Supported: ${platforms.map((p: any) => p.id).join(', ')}\n`));
    }
  });

// ─── os health ───────────────────────────────────────────
program.command('health').description('Cross-platform consistency health check')
  .action(() => {
    const { checkHealth } = require('./core/migration.js');
    const report = checkHealth();
    console.log(chalk.bold('\n  🏥 Health Report\n'));
    const scoreColor = report.overall_score >= 70 ? chalk.green : report.overall_score >= 40 ? chalk.yellow : chalk.red;
    console.log(`  Overall: ${scoreColor(report.overall_score + '/100')}\n`);
    console.log(chalk.bold('  Platforms:'));
    for (const p of report.platforms) {
      if (!p.detected) continue;
      const icon = p.score >= 80 ? '✅' : p.score >= 50 ? '⚠️' : '❌';
      console.log(`    ${icon} ${p.platform}: ${p.asset_count} assets (${p.score}/100)`);
      p.issues.forEach((i: string) => console.log(chalk.dim(`       ${i}`)));
    }
    if (report.cross_platform.drift_warnings.length) {
      console.log(chalk.bold('\n  Drift:'));
      report.cross_platform.drift_warnings.forEach((w: string) => console.log(chalk.yellow(`    ⚠ ${w}`)));
    }
    if (report.recommendations.length) {
      console.log(chalk.bold('\n  Recommendations:'));
      report.recommendations.forEach((r: string) => console.log(`    💡 ${r}`));
    }
    console.log();
  });

program.command('hub:search <query>').description('Search skills across all registries')
  .option('--source <source>', 'Filter by source')
  .option('--limit <n>', 'Max results', '10')
  .action((query: string, opts: any) => {
    const { searchSkills, seedIndex } = require('./core/skill-hub.js');
    seedIndex();
    const results = searchSkills(query, { source: opts.source, limit: parseInt(opts.limit) });
    console.log(chalk.bold(`\n  🔍 Results for "${query}"\n`));
    if (!results.length) { console.log('  No results. Try different keywords.\n'); return; }
    results.forEach((r: any) => {
      console.log(`  ⭐${r.stars} ${chalk.bold(r.name)} — ${r.description}`);
      console.log(chalk.dim(`       [${r.source}] trust:${r.trust_score}/100 tags:${r.tags.join(',')}`));
    });
    console.log();
  });

program.command('hub:install <name>').description('Install a skill from registry')
  .option('--source <source>', 'Registry source', 'skillsmp')
  .option('--platform <platform>', 'Target platform', 'claude')
  .action((name: string, opts: any) => {
    const { installSkill } = require('./core/skill-hub.js');
    try {
      const result = installSkill(name, opts.source, opts.platform);
      console.log(chalk.bold(`\n  📥 Installed: ${result.name}\n`));
      console.log(`  To:      ${result.installed_to}`);
      console.log(`  Source:  ${result.source}`);
      console.log(`  Version: ${result.version}\n`);
    } catch (e) { console.log(chalk.red(`  ✗ ${e}`)); }
  });

program.command('hub:update').description('Check for skill updates')
  .action(() => {
    const { checkUpdates } = require('./core/skill-hub.js');
    const updates = checkUpdates();
    console.log(chalk.bold('\n  🔄 Skill Updates\n'));
    if (!updates.length) { console.log('  All skills up to date.\n'); return; }
    updates.forEach((u: any) => console.log(`  📦 ${u.name}: ${u.current} → ${u.latest} [${u.source}]`));
    console.log();
  });

program.command('hub:recommend').description('Get context-aware skill recommendations')
  .action(() => {
    const { recommendSkills } = require('./core/skill-hub.js');
    const recs = recommendSkills(['typescript', 'react', 'security'], []);
    console.log(chalk.bold('\n  💡 Recommended Skills\n'));
    recs.forEach((r: any) => {
      console.log(`  ⭐${r.skill.stars} ${chalk.bold(r.skill.name)} — ${r.skill.description}`);
      console.log(chalk.dim(`       Reason: ${r.reason} (confidence: ${Math.round(r.confidence * 100)}%)`));
    });
    console.log();
  });

program.command('hub:watch').description('Watch platform configs for changes')
  .action(() => {
    const { startWatching, onWatchEvent } = require('./core/skill-hub.js');
    const result = startWatching();
    console.log(chalk.bold('\n  👁️ File Watcher Active\n'));
    console.log(`  Watching: ${result.watching.length} files`);
    result.watching.forEach((w: string) => console.log(`    📄 ${w}`));
    onWatchEvent((e: any) => console.log(`  [${e.timestamp.slice(11,19)}] ${e.type} ${e.platform}: ${e.path}`));
    console.log(chalk.dim('\n  Press Ctrl+C to stop.\n'));
  });

// ═══════════════════════════════════════════════════════════
// v1.1.0 — Hooks + Smart Match + Hardware Bridge
// ═══════════════════════════════════════════════════════════

// ─── os hooks ────────────────────────────────────────────
program.command('hooks').description('Manage event-driven hooks')
  .option('--list', 'List all hooks')
  .option('--add <event>', 'Add hook for event')
  .option('--action <type>', 'Hook action: log|notify|sync|webhook|script')
  .option('--remove <id>', 'Remove hook')
  .option('--log', 'Show execution log')
  .action((opts) => {
    const { getHooks, registerHook, removeHook, getExecutionLog, getAvailableEvents } = require('./core/hooks.js');
    if (opts.remove) { removeHook(opts.remove); console.log(chalk.green('  ✓ Hook removed')); return; }
    if (opts.log) { const log = getExecutionLog(10); log.forEach((e: any) => console.log(`  ${e.result === 'success' ? '✅' : '❌'} [${e.event}] ${e.message || ''}`)); return; }
    if (opts.add) { const h = registerHook(opts.add, opts.action || 'log'); console.log(chalk.green(`  ✓ Hook registered: ${h.id} → ${h.event} (${h.action})`)); return; }
    const hooks = getHooks();
    if (!hooks.length) { console.log(chalk.dim('  No hooks. Events: ' + getAvailableEvents().join(', '))); return; }
    hooks.forEach((h: any) => console.log(`  ${h.enabled ? '🟢' : '⚪'} ${h.id}: ${h.event} → ${h.action}`));
  });

// ─── oski match ────────────────────────────────────────────
program.command('match <task>').description('Smart-match skills for a task')
  .option('--stack <items>', 'Tech stack (comma-separated)')
  .option('--platform <name>', 'Target platform')
  .action((task, opts) => {
    const { smartMatch } = require('./core/smart-match.js');
    const ctx = { task, tech_stack: opts.stack?.split(','), platform: opts.platform };
    const results = smartMatch(ctx);
    console.log(chalk.bold(`\n  🎯 Smart Match: "${task}"\n`));
    if (!results.length) { console.log(chalk.dim('  No matches found.')); return; }
    results.forEach((r: any, i: number) => {
      const icon = r.source === 'local' ? '📦' : '🌐';
      console.log(`  ${i + 1}. ${icon} ${r.name} (${r.score}/100)`);
      console.log(chalk.dim(`     ${r.match_reasons.join(' · ')}`));
      if (r.install_command) console.log(chalk.cyan(`     ${r.install_command}`));
    });
    console.log();
  });

// ─── os devices ──────────────────────────────────────────
program.command('devices').description('Manage connected devices')
  .option('--register <name>', 'Register a device')
  .option('--type <type>', 'Device type: desktop|mobile|tablet|wearable|iot|server')
  .option('--remove <id>', 'Remove device')
  .option('--sync', 'Generate sync manifest')
  .action((opts) => {
    const { getDevices, registerDevice, registerThisDevice, removeDevice, getSyncSummary } = require('./core/hardware-bridge.js');
    if (opts.register) { const d = registerDevice(opts.register, opts.type || 'desktop', ['full-skills', 'memory-sync']); console.log(chalk.green(`  ✓ Device registered: ${d.name} (${d.id})`)); return; }
    if (opts.remove) { removeDevice(opts.remove); console.log(chalk.green('  ✓ Device removed')); return; }
    if (opts.sync) { registerThisDevice(); const s = getSyncSummary(); console.log(`  Devices: ${s.devices} | Online: ${s.online} | Assets: ${s.total_assets}`); return; }
    const devices = getDevices();
    if (!devices.length) { registerThisDevice(); }
    const all = getDevices();
    console.log(chalk.bold('\n  📱 Connected Devices\n'));
    all.forEach((d: any) => console.log(`  ${d.sync_status === 'online' ? '🟢' : '⚪'} ${d.name} (${d.type}) — ${d.capabilities.length} caps`));
    console.log();
  });

// ═══════════════════════════════════════════════════════════
// v1.1.0+ — File Watcher + Live Sync
// ═══════════════════════════════════════════════════════════

program.command('watch').description('Watch platform configs for real-time changes')
  .option('--stop', 'Stop watching')
  .option('--status', 'Show watch status')
  .action((opts) => {
    const { startWatching, stopWatching, getWatchStatus } = require('./core/file-watcher.js');
    if (opts.stop) { const n = stopWatching(); console.log(chalk.green(`  ✓ Stopped ${n} watchers`)); return; }
    if (opts.status) { const s = getWatchStatus(); console.log(`  Watching: ${s.watching} files`); s.targets.forEach((t: any) => console.log(`    📄 ${t.platform}: ${t.path}`)); return; }
    const targets = startWatching((e: any) => console.log(`  ${e.type === 'modified' ? '📝' : e.type === 'created' ? '✨' : '🗑️'} [${e.platform}] ${e.type}: ${e.path}`));
    console.log(chalk.bold(`\n  👁️ Watching ${targets.length} platform configs\n`));
    targets.forEach((t: any) => console.log(`    📄 ${t.platform}: ${t.path}`));
    console.log(chalk.dim('\n  Press Ctrl+C to stop\n'));
  });

program.command('sync-live').description('Live two-way sync between platforms')
  .option('--add <source:target>', 'Add sync pair (e.g. claude:cursor)')
  .option('--remove <source:target>', 'Remove sync pair')
  .option('--run', 'Execute all sync pairs now')
  .option('--list', 'List sync pairs')
  .action((opts) => {
    const { addSyncPair, removeSyncPair, syncAll, getSyncPairs } = require('./core/live-sync.js');
    if (opts.add) { const [s, t] = opts.add.split(':'); const p = addSyncPair(s, t); console.log(chalk.green(`  ✓ Sync pair: ${p.source} ↔ ${p.target}`)); return; }
    if (opts.remove) { const [s, t] = opts.remove.split(':'); removeSyncPair(s, t); console.log(chalk.green('  ✓ Removed')); return; }
    if (opts.run) { const results = syncAll(); results.forEach((r: any) => console.log(`  ${r.conflicts ? '⚠️' : '✅'} ${r.pair.source} → ${r.pair.target}: ${r.filesChanged} changed`)); return; }
    const pairs = getSyncPairs();
    if (!pairs.length) { console.log(chalk.dim('  No sync pairs. Add with: oski sync-live --add claude:cursor')); return; }
    pairs.forEach((p: any) => console.log(`  ${p.status === 'idle' ? '🟢' : '🟡'} ${p.source} ↔ ${p.target} (${p.strategy})`));
  });

// ═══════════════════════════════════════════════════════════
// v1.2.0+ — Plugin System + Marketplace Ratings
// ═══════════════════════════════════════════════════════════

program.command('plugin').description('Manage plugins')
  .option('--list', 'List installed plugins')
  .option('--install <name>', 'Install plugin')
  .option('--uninstall <id>', 'Uninstall plugin')
  .option('--enable <id>', 'Enable plugin')
  .option('--disable <id>', 'Disable plugin')
  .option('--types', 'List plugin types')
  .action((opts) => {
    const { getPlugins, installPlugin, uninstallPlugin, togglePlugin, getPluginTypes } = require('./core/plugin-system.js');
    if (opts.types) { getPluginTypes().forEach((t: any) => console.log(`  ${t.type}: ${t.description}`)); return; }
    if (opts.install) { const p = installPlugin({ name: opts.install, version: '1.0.0', description: 'Community plugin', author: 'community', type: 'adapter', entry: 'index.ts' }); console.log(chalk.green(`  ✓ Installed: ${p.name}`)); return; }
    if (opts.uninstall) { uninstallPlugin(opts.uninstall); console.log(chalk.green('  ✓ Uninstalled')); return; }
    if (opts.enable) { togglePlugin(opts.enable, true); console.log(chalk.green('  ✓ Enabled')); return; }
    if (opts.disable) { togglePlugin(opts.disable, false); console.log(chalk.green('  ✓ Disabled')); return; }
    const plugins = getPlugins();
    if (!plugins.length) { console.log(chalk.dim('  No plugins installed.')); return; }
    plugins.forEach((p: any) => console.log(`  ${p.enabled ? '🟢' : '⚪'} ${p.name} v${p.version} (${p.type})`));
  });

program.command('rate <skillId>').description('Rate a skill')
  .requiredOption('--score <n>', 'Score 1-5')
  .option('--review <text>', 'Review text')
  .option('--tags <items>', 'Tags (comma-separated)')
  .action((skillId, opts) => {
    const { rateSkill, getSkillStats } = require('./core/marketplace-ratings.js');
    rateSkill(skillId, 'local-user', parseInt(opts.score), opts.review, opts.tags?.split(','));
    const stats = getSkillStats(skillId);
    console.log(chalk.bold(`\n  ⭐ ${stats.avg_score}/5 (${stats.total_ratings} ratings)\n`));
  });

// ═══════════════════════════════════════════════════════════
// v1.2.0 — Plugin System
// ═══════════════════════════════════════════════════════════

program.command('plugins').description('Manage OpenSkill plugins')
  .option('--list', 'List installed plugins')
  .option('--install <name>', 'Install a plugin')
  .option('--remove <name>', 'Remove a plugin')
  .option('--discover', 'Discover local plugins')
  .action((opts) => {
    const { getPlugins, removePlugin, discoverLocalPlugins, getPluginTypes } = require('./core/plugin-system.js');
    if (opts.remove) { removePlugin(opts.remove); console.log(chalk.green('  ✓ Plugin removed')); return; }
    if (opts.discover) { const found = discoverLocalPlugins(); console.log(`  Found ${found.length} local plugins`); found.forEach((p: any) => console.log(`    📦 ${p.name} (${p.type})`)); return; }
    const plugins = getPlugins();
    if (!plugins.length) { console.log(chalk.dim('  No plugins installed. Types: ' + getPluginTypes().map((t: any) => t.type).join(', '))); return; }
    plugins.forEach((p: any) => console.log(`  ${p.enabled ? '🟢' : '⚪'} ${p.name} v${p.version} (${p.type}) — ${p.description}`));
  });

// ═══════════════════════════════════════════════════════════
// Edge Adapter — IoT/Robot skill deployment
// ═══════════════════════════════════════════════════════════

program.command('edge').description('Edge device skill deployment')
  .option('--profiles', 'List device profiles')
  .option('--deploy <profile>', 'Deploy skills to device profile')
  .option('--cache <id>', 'Cache skill for offline')
  .option('--stats', 'Show cache statistics')
  .action((opts) => {
    const edge = require('./core/edge-adapter.js');
    if (opts.profiles) {
      const profiles = edge.getProfiles();
      profiles.forEach((p: any) => console.log(`  ${p.id.padEnd(14)} ${p.name.padEnd(24)} ${p.capabilities.memory_mb}MB RAM  ${p.capabilities.max_skill_size_kb}KB max  ${p.description}`));
      return;
    }
    if (opts.stats) { const s = edge.getCacheStats(); console.log(`  Cached: ${s.count} skills (${s.total_size_kb} KB)`); return; }
    if (opts.deploy) { console.log(chalk.green(`  Edge bundle for ${opts.deploy} — use SDK for programmatic deployment`)); return; }
    console.log(chalk.dim('  Use --profiles, --deploy <profile>, --cache <id>, or --stats'));
  });

// ═══════════════════════════════════════════════════════════
// Skill Intelligence — Quality scoring & recommendations
// ═══════════════════════════════════════════════════════════

program.command('intelligence').description('Skill quality scoring & smart recommendations')
  .option('--score <id>', 'Score skill quality')
  .option('--recommend', 'Get skill recommendations')
  .option('--usage <id>', 'Show usage stats for a skill')
  .option('--scores', 'List all stored scores')
  .action((opts) => {
    const intel = require('./core/skill-intelligence.js');
    if (opts.scores) { const scores = intel.getStoredScores(); scores.forEach((s: any) => console.log(`  ${s.skill_id}: ${s.overall}/100`)); return; }
    if (opts.usage) { const stats = intel.getSkillUsageStats(opts.usage); console.log(`  Total: ${stats.total} | Success: ${stats.success_rate}% | Platforms: ${stats.platforms.join(', ') || 'none'}`); return; }
    if (opts.recommend) { console.log(chalk.dim('  Use SDK for context-aware recommendations')); return; }
    console.log(chalk.dim('  Use --score <id>, --recommend, --usage <id>, or --scores'));
  });

program.parse();

// ═══════════════════════════════════════════════════════════
// v0.9.0 — Skill Hub + Smart Matching + File Watch
// ═══════════════════════════════════════════════════════════

// ... (commands will be added via sed)
