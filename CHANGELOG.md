# Changelog

## [1.0.0] - 2026-03-22

### OpenSkill — First Stable Release

**One Skill. All Your AI.** — Open Standard for AI Skill Portability

#### Core Platform
- **60 CLI commands** via `oski` command
- **20 core modules**: wallet, types, crypto, protocol, registry, local-scanner, analyzer, growth, migration, hooks, smart-match, hardware-bridge, skill-hub, skill-registry
- **9 platform adapters**: Claude, Codex CLI, Cursor, GitHub Copilot, Gemini, VS Code, Windsurf, OpenClaw + template
- **OSP Protocol** (OpenSkill Protocol) v1.0 specification

#### 4-Layer Architecture
- **编程接口层 (Agent SDK)**: TypeScript SDK with 25+ public exports
- **集成层 (Integration)**: MCP Server (9 tools) + Headless CLI (53 commands)
- **扩展层 (Extension)**: Skills (auto-discovery) + Hooks (22 events) + Smart Match + Commands
- **基础层 (Foundation)**: Memory + Ed25519 Crypto + Growth System + Hardware Bridge

#### Key Features
- **Cross-platform migration**: `oski migrate --from claude --to codex`
- **AI identity backup/restore**: `.osp` portable bundles with SHA-256 verification
- **Security scanner**: 14 detection rules across 5 categories
- **Growth system**: 6 ranks, 14 XP actions, 10 achievements
- **Smart matching**: Context-aware skill recommendations with progressive disclosure
- **Hook automation**: 22 event types × 5 action types
- **Hardware bridge**: Device registry for desktop/mobile/IoT/wearable sync
- **Skill Hub**: Multi-source search (SkillsMP, ClawHub, GitHub, npm, SkillForge, Smithery)

#### macOS Desktop Client
- Electron-based with native macOS integration
- 7 views: Dashboard, Assets, Discover, Security, Migrate, Health, Profile
- 10 IPC handlers with contextIsolation security
- macOS traffic light buttons + app menu + keyboard shortcuts

#### Developer Experience
- 19 automated tests (vitest)
- TypeScript strict mode compilation
- CI/CD via GitHub Actions (Node 18/20/22)
- Agent Skills SKILL.md for cross-platform installation
- MIT License

## [1.0.1] - 2026-03-23

### Socratic Audit Release

#### Fixes
- CLI renamed `os` → `oski` (avoids OS command conflicts)
- Wallet createAsset ID collision bug fixed (security scan now catches evil skills)
- README completely rewritten with honest Status section (🟡/✅/🔴)
- Removed fake npm badge (was linking to wrong package)
- Quick Start now says `git clone + build` (not false npm install)
- Version comment in CLI header fixed v0.6.0 → v1.0.0

#### New Features
- 4 AI wearable device profiles: ai-glasses, ai-pendant, smartwatch-ai, robot-ros2 (11 total)
- 11 E2E integration tests (40 total: 29 core + 11 E2E)
- Adapters verified reading real platform files (8/9 working)
- Security scanner verified catching 9 attack vectors (Trust: 0/100)

#### Removed
- `publish-to-github.sh` (stale)
- `docs/distribution-guide.md` (outdated)
- `docs/assets/logo-placeholder.svg` (unnecessary)
- `docs/assets/desktop-screenshot.html` (dev artifact)
