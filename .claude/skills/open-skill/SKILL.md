---
name: open-skill
description: Cross-domain AI skill asset manager. Discover, analyze, migrate, and sync your Skills, Memory, and Preferences across 8 AI platforms (Claude, Codex, Cursor, Copilot, Gemini, VS Code, Windsurf, OpenClaw). Features smart matching, hook automation, security scanning, growth gamification, and cross-device sync.
version: 1.2.0
author: Kalen666
tags: [ai, skills, wallet, agent, cross-platform, mcp, memory, migration, security, gamification]
---

# OpenSkill — One Wallet. All Your AI.

Cross-domain AI data asset management tool. Manages Skills, Memory, and Preferences as first-class digital assets across 8 AI platforms.

## Quick Start

```bash
npm install -g open-skill
oski init
oski discover        # Scan local platforms
oski match "react"   # Smart skill matching
os health          # Cross-platform audit
```

## Key Features

### Asset Management (53 CLI commands)
- `oski init` — Initialize wallet
- `oski discover` — Auto-scan 8 platforms for configs
- `oski import --from claude` — Import platform assets
- `oski sync --to codex` — Cross-platform sync
- `oski analyze` — 5-dimension quality scoring
- `oski scan --all` — 14-rule security scan

### Smart Matching
- `oski match "build react app" --stack react,ts` — Context-aware skill recommendations
- Progressive disclosure: metadata only at startup, full instructions on demand

### Migration
- `oski migrate --from claude --to codex` — One-click cross-platform migration
- `oski backup` / `oski restore` — Portable .osp identity bundles

### Hooks (Event-Driven)
- `oski hooks --add skill:installed --action notify` — 22 event types
- Actions: log, notify, sync, webhook, script

### Hardware Bridge
- `oski devices` — Register desktop/mobile/IoT/wearable
- Cross-device skill sync with capability-based filtering

### Growth System
- 6 ranks, 14 XP actions, 10 achievements
- `oski profile` / `oski achievements` / `oski leaderboard`

## Supported Platforms
Claude Code | Codex CLI | Cursor | GitHub Copilot | Gemini | VS Code | Windsurf | OpenClaw

## Links
- GitHub: https://github.com/KalenTang666/OpenSkill
- Discord: https://discord.gg/MKdGbqwWsT
- License: MIT
