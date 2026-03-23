# OpenSkill Discord — Channel Guide

> Server: https://discord.gg/MKdGbqwWsT
> One Skill. All Your AI. Every Device. 从桌面到机器人，统一管理 AI 技能资产。

---

## 📋 INFO

### #welcome
Welcome to OpenSkill — the open-source skill manager for AI agents across platforms and devices. Start here:
- **GitHub**: https://github.com/KalenTang666/OpenSkill
- **Quick Start**: `git clone` → `npm run build` → `oski init`
- **Key feature**: 11 device profiles from Raspberry Pi to ROS2 robots

### #rules
1. Be respectful — we're building open-source together
2. English and 中文 both welcome
3. No spam or self-promotion unrelated to AI skills
4. Security vulnerabilities → DM a maintainer, don't post publicly
5. Help others — today's question is tomorrow's documentation

### #announcements
Official project announcements only (maintainers). Release notes, breaking changes, roadmap updates.
- v1.0.0: 60 CLI commands, 20 modules, 11 device profiles, security scanner
- Trust scoring: any critical finding = instant Trust: 0/100
- 4 new AI wearable profiles: Meta Ray-Ban, Apple AI Pin, Meta Malibu 2, ROS2 robots

### #roadmap
Public roadmap discussion. Current priorities:
- [ ] npm publish (GitHub Actions workflow ready)
- [ ] ROS2 skill bridge (rosbridge WebSocket)
- [ ] macOS DMG binary release
- [ ] Web dashboard

---

## 💬 COMMUNITY

### #general
Chat about anything OpenSkill or AI skills related. Share your setup, ask questions, discuss the future of portable AI skills.

### #introductions
New here? Tell us: What AI tools do you use? What devices do you run them on? What's your biggest pain point with managing skills across platforms?

### #show-and-tell
Share your OpenSkill setups, custom device profiles, adapter configurations, or creative uses. Screenshots and terminal outputs welcome!

---

## 🛠️ DEVELOPMENT

### #cli-and-adapters
Discussion about the `oski` CLI (60 commands) and platform adapters (Claude, Cursor, Codex, Copilot, Gemini, VS Code, Windsurf, OpenClaw). Bug reports, feature requests, usage tips.

### #edge-and-hardware
**Our core differentiator.** Discussion about deploying skills to:
- Raspberry Pi (4 / Zero 2W)
- NVIDIA Jetson (Nano / Orin)
- ESP32, wearables, AI smart glasses
- AI pendants (Apple AI Pin, Plaud NotePin)
- AI smartwatches (Meta Malibu 2)
- ROS2 robots, cobots, AMRs
Share your hardware test results, custom device profiles, and edge deployment stories.

### #security-scanner
The security scanner catches malicious skills (14 rules, 5 categories). Discuss detection patterns, false positives, new rule proposals, and the Trust scoring system (0-100).

### #mcp-server
MCP Server integration for Claude Desktop / OpenClaw. 9 tools: wallet_list, wallet_search, wallet_get, wallet_create, wallet_stats, wallet_sync, wallet_team_list, wallet_team_share, wallet_marketplace.

### #desktop-client
macOS Electron desktop client. 7 views: Dashboard, Assets, Discover, Security, Migrate, Health, Profile. Help test, report bugs, suggest UX improvements.

---

## 🔬 RESEARCH

### #skill-standards
Discussion about the OpenSkill Protocol (OSP v1.0), skill portability standards, and interoperability with other skill systems (skills.sh, Skillkit, Anthropic Agent Skills spec).

### #ai-wearables
Research and news about AI wearable devices. 2026 is the year of AI glasses (Meta Ray-Ban, Apple Glasses, Samsung), AI pendants, and smartwatch AI integration. How should OpenSkill adapt?

### #robotics-integration
ROS2 integration, rosbridge WebSocket protocol, ROSA compatibility. How to deploy AI skills to physical robots, cobots, and autonomous mobile robots. Hardware Bridge + Edge Adapter architecture.

---

## 🤝 CONTRIBUTING

### #good-first-issues
Beginner-friendly tasks for new contributors. Maintained by the core team. If you want to contribute but don't know where to start, check here.

### #pull-requests
Discuss open PRs, code review feedback, and development workflow. All PRs welcome — from typo fixes to new adapters.

### #testing
Test coverage discussion. Currently 40 tests (29 core + 11 E2E). Help us test on real hardware: run `oski edge --profiles` on your RPi/Jetson and share results.

---

## 🌍 LOCALIZATION

### #中文交流
中文社区讨论区。OpenSkill 面向全球开发者，欢迎中文用户交流。
核心概念：从桌面到机器人，统一管理 AI 技能资产。

---

*Last updated: 2026-03-23 — OpenSkill v1.0.0*
