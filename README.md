<p align="center">
  <img src="docs/assets/logo.png" width="120" alt="OpenSkill" />
</p>

<h1 align="center">OpenSkill</h1>

<p align="center">
  <strong>One Skill & All Your AI. — Manage, migrate, and secure AI agent skills across 16+ platforms. Security scanner · Smart matching · Cross-device sync · Growth system.</strong>
  <br />
  跨域管理 Skills · Memory · Preferences 的开放标准 AI 技能资产管理器
  <br />
  <sub>58 CLI commands · 18 core modules · 9 adapters · macOS desktop client</sub>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://www.npmjs.com/package/openskill"><img src="https://img.shields.io/badge/npm-v1.0.0-blue.svg" alt="npm" /></a>
  <a href="https://github.com/KalenTang666/OpenSkill/actions"><img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="Build" /></a>
  <a href="https://discord.gg/MKdGbqwWsT"><img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2.svg?logo=discord&logoColor=white" alt="Discord" /></a>
  <a href="./docs/whitepaper-zh.md"><img src="https://img.shields.io/badge/whitepaper-中文-orange.svg" alt="Whitepaper" /></a>
  <a href="./docs/whitepaper-en.md"><img src="https://img.shields.io/badge/whitepaper-English-orange.svg" alt="Whitepaper" /></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#why-openskill">Why</a> ·
  <a href="./docs/whitepaper-zh.md">白皮书</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#roadmap">Roadmap</a> ·
  <a href="https://discord.gg/MKdGbqwWsT">Discord</a> ·
  <a href="./CONTRIBUTING.md">Contributing</a>
</p>

---

## The Problem

You use Claude Code at work, OpenClaw for side projects, and Cursor for quick edits. Each one has its own Skills, Memory, and config files. Every time you switch tools, you reconfigure the same coding standards, re-explain your preferences, and lose context.

**Your AI skills are scattered across platforms. OpenSkill unifies them.**

## Why OpenSkill

| Pain Point | OpenSkill Solution |
|-----------|------------------------|
| Same config on every platform | **One hub**, sync everywhere |
| Skills locked in one tool | **Portable assets** with adapter layer |
| Memory lost when switching | **Versioned memory** with conflict resolution |
| Privacy scattered across vendors | **Local-first**, you hold the keys |

Think of it as a **portable skill manager for AI** — but instead of managing tokens, you manage Skills, Memory, and Preferences as first-class digital assets.

## Quick Start

```bash
# Install
npm install -g openskill

# Initialize your skill hub
os init

# Import your existing Claude config
os import --from claude

# List your assets
os list

# Sync to another platform
os sync --to openclaw
```

## Screenshots

### macOS Desktop Client

<p align="center">
  <img src="docs/assets/desktop-preview.svg" width="800" alt="OpenSkill Desktop — Dashboard" />
</p>

> 7 views: Dashboard · Assets · Discover · Security · Migrate · Health · Profile
> Native macOS integration with traffic light buttons, app menu, keyboard shortcuts

### CLI

```bash
$ os discover

  🔍 Discovered 3 platforms with 5 assets

  ✅ Claude — CLAUDE.md, memory.json, 2 skills
  ✅ Cursor — .cursorrules
  ✅ Codex  — AGENTS.md, 1 skill

$ os match "react component testing"

  🎯 Smart Match: "react component testing"

  1. 📦 React Patterns (85/100)
     Tech: react · Task match: component, testing
  2. 🌐 Jest Testing (62/100)
     Tech: jest · Task match: testing
```

## Architecture — 4-Layer Model

> Aligned with Claude Code's extension architecture (编程接口层 → 集成层 → 扩展层 → 基础层)

```
┌─────────────────────────────────────────────────────────────┐
│  编程接口层  Agent SDK                                        │
│  TypeScript SDK · 25 public exports · Programmatic access    │
├─────────────────────────────────────────────────────────────┤
│  集成层  Integration                                         │
│  ┌──────────────────┐  ┌────────────────────┐               │
│  │  Headless CLI     │  │  MCP Server        │               │
│  │  53 commands      │  │  9 tools           │               │
│  │  CI/CD ready      │  │  Claude/OpenClaw   │               │
│  └──────────────────┘  └────────────────────┘               │
├─────────────────────────────────────────────────────────────┤
│  扩展层  Extension                                           │
│  ┌────────┐ ┌─────────┐ ┌───────────┐ ┌───────┐            │
│  │Commands│ │  Skills  │ │Smart Match│ │ Hooks │            │
│  │手动触发 │ │自动发现   │ │智能匹配    │ │事件驱动│            │
│  └────────┘ └─────────┘ └───────────┘ └───────┘            │
│  9 Adapters: Claude·Codex·Cursor·Copilot·Gemini·VS Code·…  │
├─────────────────────────────────────────────────────────────┤
│  基础层  Foundation                                          │
│  ┌────────┐ ┌─────────┐ ┌───────────┐ ┌─────────────┐      │
│  │ Memory │ │  Crypto  │ │  Growth   │ │  Hardware   │      │
│  │ 资产管理│ │ Ed25519  │ │ XP/等级   │ │  Bridge     │      │
│  │ 版本控制│ │ SHA-256  │ │ 成就系统   │ │  跨设备同步  │      │
│  └────────┘ └─────────┘ └───────────┘ └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Asset Levels

| Level | Scope | Sync | Example |
|-------|-------|------|---------|
| L0 | Universal | Lossless | Language, timezone, name, writing style |
| L1 | Domain | Via adapter | Coding standards, domain expertise |
| L2 | Tool-specific | Native format | CLAUDE.md, .openclaw/, .cursorrules |

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`openskill`](./packages/cli) | CLI tool — `os init`, `os sync`, `os list` | ✅ v1.0.0 |
| [`@openskill/sdk`](./packages/sdk) | TypeScript SDK for programmatic access | ✅ v1.0.0 |
| [`@openskill/mcp-server`](./packages/mcp-server) | MCP Server for Claude/OpenClaw integration | ✅ v1.0.0 |

## CLI Commands

```bash
os init                    # Initialize in ~/.openskill/
os list [--type skill]     # List assets, optionally filtered
os import --from <platform> # Import from Claude/OpenClaw/Cursor
os export --to <platform>   # Export to a platform
os sync --to <platform>     # Two-way sync with a platform
os diff <id1> <id2>          # Compare two assets
os sign <id>                # Sign asset with Ed25519 key
os inspect <asset-id>       # View asset details + history
```

## MCP Server Integration

Add to your `claude_desktop_config.json`:

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

Then in Claude: *"Search my openskill for TypeScript coding skills"*

## Roadmap

### v1.0.0 — Current Release ✅

- [x] 58 CLI commands + 18 core modules + 9 platform adapters
- [x] OSP Protocol v1.0 + Ed25519 crypto + security scanner (14 rules)
- [x] Hook system (22 events) + Smart Match + Hardware Bridge
- [x] File watcher (real-time config detection) + Live sync engine
- [x] Plugin system + Marketplace ratings & reviews
- [x] Growth system (6 ranks, XP, achievements)
- [x] macOS Desktop Client (Electron, 7 views, secure IPC)
- [x] TypeScript strict (zero errors) + 19 tests + CI/CD
- [x] Agent Skills SKILL.md for cross-platform install

### Next

- [x] GitHub Package Registry (auto-publish on release)
- [x] Homebrew formula (`brew install openskill`)
- [x] macOS DMG build workflow (auto-build on release)
- [ ] npm publish to npmjs.com (`npm install -g openskill`)
- [ ] Web dashboard (full React rewrite)

### Vision

- [ ] Decentralized skill registry (IPFS)
- [ ] AI-powered skill auto-generation from workflow
- [ ] Cross-device real-time sync (WebSocket)
- [ ] Mobile companion app (React Native)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

[MIT](./LICENSE) © 2026 Kalen666

---

<p align="center">
  <sub>Built with conviction that your AI data should belong to you.</sub>
  <br />
  <sub>让 AI 数据资产回归用户手中。</sub>
</p>
