# OpenSkill API Reference

> Complete API documentation for CLI, SDK, MCP Server, and OSP Protocol

## CLI Commands (v0.3.0)

### Core
| Command | Description |
|---------|-------------|
| `os init [--user-id] [--name] [--generate-keys]` | Initialize wallet + optional Ed25519 keypair |
| `os list [-t type] [--tags] [-l level] [--team]` | List assets with filters |
| `os search <query>` | Full-text search across name, tags, content |
| `os inspect <id>` | View asset details + version history |
| `os diff <id1> <id2>` | Compare two assets side by side |
| `os stats` | Wallet statistics |
| `os adapters` | List available platform adapters + detection status |

### Import/Export/Sync
| Command | Description |
|---------|-------------|
| `os import --from <platform>` | Import from: claude, openclaw, cursor, vscode, windsurf |
| `os export --to <platform> --id <id>` | Export specific asset to platform |
| `os sync --to <platform> [--direction pull\|push\|both]` | Two-way sync with conflict resolution |

### Security (Phase 3+4)
| Command | Description |
|---------|-------------|
| `os sign <id>` | Sign an asset with Ed25519 key |
| `os verify <id>` | Verify asset signature integrity |
| `os keys` | Show public key info |
| `os scan [id] [--all]` | Security scan asset(s) — 14 detection rules |

### Discovery & Analysis (v0.5.0)
| Command | Description |
|---------|-------------|
| `os discover [-v]` | Scan local system for AI skills, configs, memory across 8 platforms |
| `os analyze [-p platform]` | Quality scoring + cross-platform comparison + recommendations |
| `os compare [--platforms]` | Compare assets across platforms (duplicates, gaps, candidates) |
| `os optimize [--dry-run]` | Apply recommended optimizations with auto-import |

### Teams (Phase 2)
| Command | Description |
|---------|-------------|
| `os team create <id> <name>` | Create a team |
| `os team list` | List teams |
| `os team share <asset-id> <team-id>` | Share asset to team |
| `os team assets <team-id>` | List team assets |

### Marketplace (Phase 2)
| Command | Description |
|---------|-------------|
| `os marketplace publish <id> [-d desc] [-p price]` | Publish asset |
| `os marketplace list [-t type]` | Browse marketplace |

### Registry (Phase 3)
| Command | Description |
|---------|-------------|
| `os registry publish <id>` | Publish to OSP registry |
| `os registry search <query>` | Search registry |
| `os registry install <hwp-id>` | Install from registry |
| `os registry list` | List registry entries |

## SDK API (@openskill/sdk)

```typescript
import { OpenSkillSDK } from '@openskill/sdk';
const hw = new OpenSkillSDK();

// Asset operations
await hw.listAssets({ type: 'skill', tags: ['typescript'] });
await hw.getAsset('os-ski-abc123');
await hw.searchAssets('typescript');
hw.validate(assetObject);

// Schemas (Zod)
import { WalletAssetSchema, AssetTypeSchema, AssetLevelSchema } from '@openskill/sdk';
```

## MCP Server Tools (9 tools)

| Tool | Description |
|------|-------------|
| `wallet_list` | List assets with filters |
| `wallet_search` | Keyword search |
| `wallet_get` | Get asset by ID |
| `wallet_create` | Create new asset |
| `wallet_stats` | Wallet statistics |
| `wallet_adapters` | List adapters |
| `wallet_team_list` | List teams/team assets |
| `wallet_team_share` | Share asset to team |
| `wallet_marketplace` | Browse/publish marketplace |

### MCP Configuration
```json
{
  "mcpServers": {
    "openskill": {
      "command": "npx",
      "args": ["-y", "@openskill/mcp-server"]
    }
  }
}
```

## OSP Protocol

See [OSP-SPEC.md](./OSP-SPEC.md) for full protocol specification.

### Key Types
```typescript
// Content-addressable ID
ospId(type: string, content: string): string  // → "osp:skill:a1b2c3d4..."

// Asset signing
signContent(content: string): { signature: string; publicKey: string; hash: string }

// OSP envelope
toOSPEnvelope(asset: WalletAsset): OSPEnvelope
fromOSPEnvelope(envelope: OSPEnvelope): WalletAsset

// Manifest sync
generateManifest(assets: WalletAsset[]): ManifestEntry[]
diffManifests(local, remote): { missing, changed, extra }
```

### Migration & Identity (v0.7.0)
| Command | Description |
|---------|-------------|
| `os migrate --from <src> --to <dest> [--dry-run]` | One-click cross-platform migration |
| `os backup [-o path]` | Export full AI identity as .osp bundle |
| `os restore <file.osp>` | Restore from backup to wallet |
| `os onboard <platform>` | Deploy wallet contents to new platform |
| `os health` | Cross-platform consistency audit |

### Desktop Client (v0.8.0)
| Feature | Description |
|---------|-------------|
| Dashboard | Live stats, XP progress, quick actions |
| Asset Browser | Full CRUD with table view |
| Discover | Auto-scan 8 platforms, visual platform grid |
| Security Scan | Batch scan with trust scores |
| Migrate | Visual migration guide with CLI commands |
| Health Check | Cross-platform consistency scoring |
| Profile | Growth system with rank progression |
| Backup/Restore | Native file dialogs for .osp bundles |
| Keyboard Shortcuts | Cmd+D (discover), Cmd+B (backup), Cmd+I (import) |
