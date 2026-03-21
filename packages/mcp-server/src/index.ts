#!/usr/bin/env node
/**
 * @openskill/mcp-server v0.2.0
 * MCP Server: 9 tools for Claude/OpenClaw integration
 * Tools: wallet_list, wallet_search, wallet_get, wallet_create, wallet_stats,
 *        wallet_sync, wallet_team_list, wallet_team_share, wallet_marketplace
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const WALLET_DIR = join(homedir(), '.openskill');
const ASSETS_DIR = join(WALLET_DIR, 'assets');
const TEAMS_DIR = join(WALLET_DIR, 'teams');
const MARKETPLACE_DIR = join(WALLET_DIR, 'marketplace');

interface WalletAsset { id: string; type: string; level: number; name: string; version: string; created_at: string; updated_at: string; author: { id: string }; tags: string[]; compatibility: string[]; content: { format: string; body: string; metadata: Record<string, unknown> }; sync: any; team?: string; marketplace?: any; }

function ensureWallet() { return existsSync(join(WALLET_DIR, 'config.json')); }
function text(t: string) { return { content: [{ type: 'text' as const, text: t }] }; }

function loadAssets(baseDir: string = ASSETS_DIR): WalletAsset[] {
  const assets: WalletAsset[] = [];
  for (const dir of ['skills', 'memories', 'preferences']) {
    const fullDir = join(baseDir, dir);
    if (!existsSync(fullDir)) continue;
    for (const file of readdirSync(fullDir).filter(f => f.endsWith('.json'))) {
      try { assets.push(JSON.parse(readFileSync(join(fullDir, file), 'utf-8'))); } catch {}
    }
  }
  return assets.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function summarize(assets: WalletAsset[]): string {
  return assets.map(a => `• [${a.type.toUpperCase()}] ${a.name} (${a.id})\n  L${a.level} | v${a.version} | Tags: ${a.tags.join(', ')}${a.team ? ` | Team: ${a.team}` : ''}${a.marketplace?.published ? ' | 📢 Published' : ''}`).join('\n\n');
}

const server = new Server({ name: 'openskill', version: '0.2.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
  { name: 'wallet_list', description: 'List AI data assets. Filter by type, level, tags, team.', inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['skill','memory','preference'] }, level: { type: 'number', enum: [0,1,2] }, tags: { type: 'array', items: { type: 'string' } }, team: { type: 'string' } } } },
  { name: 'wallet_search', description: 'Search assets by keyword across name, tags, content.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'wallet_get', description: 'Get asset by ID with full content.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'wallet_create', description: 'Create a new asset.', inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['skill','memory','preference'] }, level: { type: 'number', enum: [0,1,2] }, name: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, content_format: { type: 'string' }, content_body: { type: 'string' }, compatibility: { type: 'array', items: { type: 'string' } }, team: { type: 'string' } }, required: ['type','level','name','content_body'] } },
  { name: 'wallet_stats', description: 'Get wallet statistics.', inputSchema: { type: 'object', properties: {} } },
  { name: 'wallet_adapters', description: 'List supported platform adapters.', inputSchema: { type: 'object', properties: {} } },
  { name: 'wallet_team_list', description: 'List teams or team assets.', inputSchema: { type: 'object', properties: { team_id: { type: 'string' } } } },
  { name: 'wallet_team_share', description: 'Share an asset to a team.', inputSchema: { type: 'object', properties: { asset_id: { type: 'string' }, team_id: { type: 'string' } }, required: ['asset_id','team_id'] } },
  { name: 'wallet_marketplace', description: 'Browse or publish to marketplace.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['browse','publish'] }, asset_id: { type: 'string' }, description: { type: 'string' } } } },
] }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  if (!ensureWallet() && name !== 'wallet_stats') return text('Wallet not initialized. Run `os init` first.');

  switch (name) {
    case 'wallet_list': {
      let assets = loadAssets();
      if (args?.type) assets = assets.filter(a => a.type === args.type);
      if (args?.level !== undefined) assets = assets.filter(a => a.level === args.level);
      if (args?.tags && Array.isArray(args.tags)) { const t = args.tags as string[]; assets = assets.filter(a => t.some(tag => a.tags.includes(tag))); }
      if (args?.team) assets = assets.filter(a => a.team === args.team);
      return text(assets.length ? `Found ${assets.length} asset(s):\n\n${summarize(assets)}` : 'No assets found.');
    }
    case 'wallet_search': {
      const q = String(args?.query ?? '').toLowerCase();
      const assets = loadAssets().filter(a => a.name.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q)) || a.content.body.toLowerCase().includes(q));
      return text(assets.length ? `${assets.length} result(s) for "${args?.query}":\n\n${summarize(assets)}` : `No results for "${args?.query}".`);
    }
    case 'wallet_get': {
      const asset = loadAssets().find(a => a.id === String(args?.id));
      return text(asset ? JSON.stringify(asset, null, 2) : `Asset not found: ${args?.id}`);
    }
    case 'wallet_create': {
      const now = new Date().toISOString();
      const type = String(args?.type ?? 'skill');
      const id = `hw-${type.slice(0,3)}-${Date.now().toString(36)}`;
      const asset: WalletAsset = {
        id, type, level: Number(args?.level ?? 1), name: String(args?.name ?? 'Untitled'), version: '1.0.0',
        created_at: now, updated_at: now, author: { id: 'mcp-created' },
        tags: (args?.tags as string[]) ?? [], compatibility: (args?.compatibility as string[]) ?? [],
        content: { format: String(args?.content_format ?? 'markdown'), body: String(args?.content_body ?? ''), metadata: { created_via: 'mcp-server' } },
        sync: { strategy: 'manual', last_synced: {}, conflict_resolution: 'user-decides' },
        team: args?.team as string | undefined,
      };
      const dir = join(ASSETS_DIR, { skill: 'skills', memory: 'memories', preference: 'preferences' }[type] ?? 'skills');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${id}.json`), JSON.stringify(asset, null, 2), 'utf-8');
      return text(`Created: ${asset.name} (${id})`);
    }
    case 'wallet_stats': {
      const assets = loadAssets();
      const byType = { skill: 0, memory: 0, preference: 0 };
      for (const a of assets) byType[a.type as keyof typeof byType] = (byType[a.type as keyof typeof byType] ?? 0) + 1;
      const config = existsSync(join(WALLET_DIR, 'config.json')) ? JSON.parse(readFileSync(join(WALLET_DIR, 'config.json'), 'utf-8')) : {};
      const teams = (config.teams ?? []).length;
      const mp = existsSync(MARKETPLACE_DIR) ? readdirSync(MARKETPLACE_DIR).reduce((n: number, d: string) => { try { return n + readdirSync(join(MARKETPLACE_DIR, d)).length; } catch { return n; } }, 0) : 0;
      return text(`OpenSkill Stats:\n  Skills: ${byType.skill}\n  Memories: ${byType.memory}\n  Preferences: ${byType.preference}\n  Total: ${assets.length}\n  Teams: ${teams}\n  Marketplace: ${mp}\n\nSupported: claude, openclaw, cursor, vscode, windsurf`);
    }
    case 'wallet_adapters': {
      return text('Supported adapters:\n  • Claude (CLAUDE.md, memory.json, .claude/skills/)\n  • OpenClaw (AGENTS.md, skills, memory)\n  • Cursor (.cursorrules, .cursor/)\n  • VS Code (.vscode/settings.json, copilot-instructions.md, snippets)\n  • Windsurf (.windsurfrules)');
    }
    case 'wallet_team_list': {
      if (args?.team_id) {
        const assets = loadAssets(join(TEAMS_DIR, String(args.team_id)));
        return text(assets.length ? `Team ${args.team_id} (${assets.length} assets):\n\n${summarize(assets)}` : `Team ${args.team_id} has no assets.`);
      }
      const config = existsSync(join(WALLET_DIR, 'config.json')) ? JSON.parse(readFileSync(join(WALLET_DIR, 'config.json'), 'utf-8')) : {};
      const teams = config.teams ?? [];
      return text(teams.length ? teams.map((t: any) => `• ${t.name} (${t.id}) — ${t.role}`).join('\n') : 'No teams. Use `os team create <id> <name>` to create one.');
    }
    case 'wallet_team_share': {
      const asset = loadAssets().find(a => a.id === String(args?.asset_id));
      if (!asset) return text(`Asset not found: ${args?.asset_id}`);
      const teamDir = join(TEAMS_DIR, String(args?.team_id), { skill: 'skills', memory: 'memories', preference: 'preferences' }[asset.type] ?? 'skills');
      if (!existsSync(teamDir)) mkdirSync(teamDir, { recursive: true });
      const shared = { ...asset, team: String(args?.team_id) };
      writeFileSync(join(teamDir, `${asset.id}.json`), JSON.stringify(shared, null, 2), 'utf-8');
      return text(`Shared ${asset.name} to team ${args?.team_id}`);
    }
    case 'wallet_marketplace': {
      if (args?.action === 'publish' && args?.asset_id) {
        const asset = loadAssets().find(a => a.id === String(args.asset_id));
        if (!asset) return text(`Asset not found: ${args.asset_id}`);
        asset.marketplace = { published: true, downloads: 0, rating: 0, price: 'free', description: String(args?.description ?? '') };
        const mpDir = join(MARKETPLACE_DIR, asset.type + 's');
        if (!existsSync(mpDir)) mkdirSync(mpDir, { recursive: true });
        writeFileSync(join(mpDir, `${asset.id}.json`), JSON.stringify(asset, null, 2), 'utf-8');
        return text(`Published: ${asset.name}`);
      }
      const mp = existsSync(MARKETPLACE_DIR) ? (() => { const a: WalletAsset[] = []; for (const d of ['skills','memories','preferences']) { const dir = join(MARKETPLACE_DIR, d); if (!existsSync(dir)) continue; for (const f of readdirSync(dir).filter(f => f.endsWith('.json'))) { try { a.push(JSON.parse(readFileSync(join(dir, f), 'utf-8'))); } catch {} } } return a; })() : [];
      return text(mp.length ? `Marketplace (${mp.length} items):\n\n${summarize(mp)}` : 'Marketplace is empty.');
    }
    default: return text(`Unknown tool: ${name}`);
  }
});

async function main() { const transport = new StdioServerTransport(); await server.connect(transport); }
main().catch(console.error);
