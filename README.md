<p align="center">
  <img src="docs/assets/logo.png" width="120" alt="OpenSkill" />
</p>

<h1 align="center">OpenSkill</h1>

<p align="center">
  <strong>One Skill. All Your AI. Every Device.</strong>
  <br />
  Manage, migrate & secure AI agent skills across platforms and devices
  <br />
  从桌面到机器人，统一管理 AI 技能资产
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://github.com/KalenTang666/OpenSkill/actions"><img src="https://github.com/KalenTang666/OpenSkill/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://discord.gg/MKdGbqwWsT"><img src="https://img.shields.io/badge/Discord-Community-5865F2.svg?logo=discord&logoColor=white" alt="Discord" /></a>
</p>

<p align="center">
  <code>60 commands</code> · <code>20 modules</code> · <code>9 adapters</code> · <code>11 device profiles</code> · <code>40 tests</code>
</p>

<p align="center">
  <a href="#the-problem">Problem</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#edge--hardware">Edge & Hardware</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#status">Status</a> ·
  <a href="#roadmap">Roadmap</a> ·
  <a href="https://discord.gg/MKdGbqwWsT">Discord</a>
</p>

---

## The Problem

Your AI skills are scattered — **across platforms AND devices**.

On the **software** side: Claude Code at work, Cursor for side projects, Codex CLI for quick edits. Each has its own Skills, Memory, and config. Every tool switch means reconfiguring the same standards.

On the **hardware** side: your laptop runs full skill sets, but your Jetson Nano robot only has 4GB RAM. Your ESP32 sensor has 4MB total. Your AI smart glasses can handle 32KB. Today there is **no tool** that manages which skills go where, prunes them to fit, or syncs them across devices.

**OpenSkill unifies both dimensions** — the skill management layer between your AI agents and your hardware.

## Why OpenSkill

| Problem | OpenSkill Solution |
|---------|-------------------|
| Same config on every AI platform | One hub, sync everywhere |
| Skills locked in one tool | Portable assets with 9 adapter layer |
| No quality control on community skills | Security scanner (14 rules) + 6-dimension quality scoring |
| Can't deploy skills to robots/IoT | Edge Adapter with 11 device profiles — prune, cache, deploy |
| No skill management for wearables | AI glasses, pendants, smartwatches profiles built-in |
| Skills break on constrained hardware | Auto-pruning by device memory, GPU, storage capabilities |
| Offline robots can't get skill updates | Offline cache with SHA-256 integrity verification |
| Privacy scattered across vendors | Local-first, you hold the keys |

> If Skills.sh is npm (registry), **OpenSkill is the Docker Engine for skills** — managing which skills run where, with what constraints, on what devices.

## Quick Start

```bash
git clone https://github.com/KalenTang666/OpenSkill.git
cd OpenSkill/packages/cli && npm install && npm run build

npx oski init              # Initialize skill wallet
npx oski discover          # Scan 8 AI platforms
npx oski scan --all        # Security scan (14 rules)
npx oski match "your task" # Smart recommendations
npx oski edge --profiles   # Show 11 device profiles
```

Or install as an Agent Skill: `npx skills add KalenTang666/OpenSkill`

## Edge & Hardware

**The feature no other skill manager has.** OpenSkill can prune, deploy, and sync skills across 11 device types:

| Profile | Device | RAM | Max Skill | Use Case |
|---------|--------|-----|-----------|----------|
| `rpi-4` | Raspberry Pi 4 | 4 GB | 512 KB | Home automation, dev server |
| `rpi-zero` | Raspberry Pi Zero 2W | 512 MB | 128 KB | Sensor hub, edge node |
| `jetson-nano` | NVIDIA Jetson Nano | 4 GB | 2 MB | Computer vision, robotics |
| `jetson-orin` | NVIDIA Jetson Orin | 16 GB | 8 MB | Autonomous systems, industrial robots |
| `esp32` | ESP32 Microcontroller | 4 MB | 8 KB | IoT sensors, smart home |
| `wearable` | Generic Wearable | 256 MB | 64 KB | Smartwatch, basic AR |
| `ai-glasses` | AI Smart Glasses | 512 MB | 32 KB | Meta Ray-Ban, Apple Glasses, Samsung |
| `ai-pendant` | AI Pendant/Pin | 128 MB | 16 KB | Apple AI Pin, Plaud NotePin |
| `smartwatch-ai` | AI Smartwatch | 1 GB | 64 KB | Meta Malibu 2, Apple Watch AI |
| `robot-ros2` | ROS2 Robot | 8 GB | 4 MB | ROSA-compatible cobots, AMRs |
| `server` | Edge Server | 64 GB | 64 MB | Factory floor, data center edge |

```bash
oski edge --profiles                          # List all devices
oski edge --deploy jetson-nano --skills "ros2" # Prune & deploy to Jetson
oski edge --cache react-skill                 # Cache for offline use
```

**How it works**: Skills are automatically pruned based on device capabilities — GPU-specific sections removed for non-GPU devices, code blocks stripped for unsupported formats, content truncated to fit memory limits. Each bundle gets SHA-256 integrity verification.

## Screenshots

<p align="center">
  <img src="docs/assets/desktop-preview.svg" width="800" alt="OpenSkill Desktop — Dashboard" />
</p>

```bash
$ oski discover
  🔍 Discovered 3 platforms with 5 assets
  ✅ Claude — CLAUDE.md, memory.json, 2 skills
  ✅ Cursor — .cursorrules
  ✅ Codex  — AGENTS.md, 1 skill

$ oski scan --all
  ✅ React Patterns — Trust: 100/100
  ❌ Suspicious Skill — Trust: 0/100
    🔴 [EXFIL-003] Dynamic code execution
    🟠 [INJECT-001] Prompt injection pattern
```

## Architecture — 4-Layer Model

```
┌─────────────────────────────────────────────────────────────┐
│  编程接口层  Agent SDK                                        │
│  TypeScript SDK · 30 exports · Programmatic access           │
├─────────────────────────────────────────────────────────────┤
│  集成层  Integration                                         │
│  Headless CLI (60 commands) · MCP Server (9 tools)          │
├─────────────────────────────────────────────────────────────┤
│  扩展层  Extension                                           │
│  Skills · Hooks (22 events) · Smart Match · Intelligence     │
│  Plugin System · 9 Adapters · Marketplace Ratings            │
├─────────────────────────────────────────────────────────────┤
│  基础层  Foundation                                          │
│  Memory · Ed25519 Crypto · Growth · Live Sync               │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Hardware Bridge + Edge Adapter                   │        │
│  │  11 device profiles · Skill pruning · Offline     │        │
│  │  Desktop ↔ Mobile ↔ IoT ↔ Robot ↔ Wearable      │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Security Scanner

14 detection rules across 5 categories — because [341 malicious skills were found](https://serenitiesai.com/articles/agent-skills-guide-2026) on community hubs in Feb 2026:

| Category | What it catches |
|----------|----------------|
| EXFIL | `fetch()`, `process.env`, `eval()`, credential theft |
| INJECT | `ignore previous instructions`, prompt injection |
| FS | `rm -rf`, destructive filesystem operations |
| SUS | Obfuscated code, browser storage access |
| BP | Missing metadata, poor structure |

```bash
oski scan --all   # Scan all wallet assets
# ✅ Trust: 100/100 (clean) or ❌ Trust: 0/100 (malicious)
```

## Status

> ⚠️ **Active development.** CLI works from source. npm not yet published.

| Component | Status | Notes |
|-----------|--------|-------|
| CLI (`oski`) | ✅ Working | 60 commands, `npm run build` to use |
| TypeScript | ✅ Compiles | Zero errors, strict mode |
| Tests | ✅ 40 passing | 29 core + 11 E2E (vitest) |
| 9 Adapters | ✅ Working | Read real platform files |
| Edge Adapter | ✅ Working | 11 device profiles, pruning, offline cache |
| Security Scanner | ✅ Working | 14 rules, catches eval/exfil/injection |
| MCP Server | ✅ Builds | 9 tools, `npm run build` to use |
| Desktop Client | 🟡 Source | Electron, requires build |
| npm Package | 🔴 Not published | Planned |
| Homebrew | 🔴 Not published | Formula in repo |

## Roadmap

### v1.0.0 — Current ✅

- [x] 60 CLI commands + 20 core modules + 9 working adapters
- [x] Security scanner (14 rules) + 6-dimension quality scoring
- [x] Edge Adapter: 11 device profiles (RPi, Jetson, ESP32, AI glasses, robot-ros2...)
- [x] Hooks (22 events) + Smart Match + Hardware Bridge + Live Sync
- [x] 40 automated tests (29 core + 11 E2E) + TypeScript strict
- [x] macOS Desktop Client source (Electron, 7 views)

### Next

- [ ] `npm publish` — GitHub Actions workflow ready, needs `NPM_TOKEN` secret
- [ ] macOS DMG binary release
- [ ] Homebrew tap submission
- [ ] Web dashboard
- [ ] ROS2 skill bridge (rosbridge WebSocket) — device profile `robot-ros2` ready

### Vision

- [ ] Decentralized skill registry (IPFS)
- [ ] AI-powered skill auto-generation from workflow
- [ ] Real-time cross-device sync (WebSocket)
- [ ] Mobile companion app

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md).

High-impact areas:
1. **Test on your hardware** — run `oski edge --profiles` on RPi/Jetson and report
2. **Add device profiles** — custom profiles for your hardware
3. **ROS2 integration** — connect Edge Adapter to rosbridge
4. **npm publish** — help with CI/CD pipeline

## License

[MIT](./LICENSE) © 2026 Kalen666

---

<p align="center">
  <sub>Built with conviction that your AI skills belong to you — on every device.</sub>
  <br />
  <sub>让 AI 技能资产回归用户手中 — 从桌面到机器人。</sub>
</p>
