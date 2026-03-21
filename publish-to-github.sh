#!/bin/bash
# ═══════════════════════════════════════════════════════════
# OpenSkill — GitHub 发布脚本
# ═══════════════════════════════════════════════════════════
#
# 使用方式:
#   chmod +x publish-to-github.sh
#   ./publish-to-github.sh
#
# 前置条件:
#   1. 已安装 git 和 gh (GitHub CLI)
#   2. 已登录 GitHub: gh auth login
#   3. 确认 GitHub 用户名（脚本会提示你输入）
#
# ═══════════════════════════════════════════════════════════

set -e

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   OpenSkill — GitHub 发布工具       ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ─── Step 1: 确认 GitHub 登录状态 ─────────────────────────

echo "📋 Step 1: 检查 GitHub 认证状态..."
if ! command -v gh &> /dev/null; then
    echo "❌ 未安装 GitHub CLI (gh)"
    echo "   安装方式: brew install gh (macOS) 或 https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "⚠️  未登录 GitHub，正在启动认证..."
    gh auth login
fi

GH_USER=$(gh api user -q .login)
echo "✅ 已登录为: $GH_USER"
echo ""

# ─── Step 2: 确认仓库名称 ─────────────────────────────────

read -p "📦 GitHub 仓库名 (默认: openskill): " REPO_NAME
REPO_NAME=${REPO_NAME:-openskill}
REPO_FULL="$GH_USER/$REPO_NAME"

echo ""
echo "   将创建仓库: https://github.com/$REPO_FULL"
read -p "   确认? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "已取消"
    exit 0
fi
echo ""

# ─── Step 3: 创建 GitHub 仓库 ─────────────────────────────

echo "🔧 Step 2: 创建 GitHub 仓库..."
if gh repo view "$REPO_FULL" &> /dev/null; then
    echo "   仓库已存在，跳过创建"
else
    gh repo create "$REPO_NAME" \
        --public \
        --description "OpenSkill — Cross-domain AI data asset management. Your Skills, Memory & Preferences, one wallet to rule them all." \
        --homepage "https://github.com/$REPO_FULL" \
        --license mit
    echo "✅ 仓库已创建"
fi
echo ""

# ─── Step 4: 初始化 Git 并推送 ────────────────────────────

echo "🚀 Step 3: 初始化 Git 并推送代码..."

# 如果当前目录已有 .git，先清理
if [ -d ".git" ]; then
    echo "   检测到已有 .git 目录"
    read -p "   是否重新初始化? (y/n): " REINIT
    if [ "$REINIT" = "y" ] || [ "$REINIT" = "Y" ]; then
        rm -rf .git
    fi
fi

if [ ! -d ".git" ]; then
    git init
    git branch -M main
fi

# 添加远程仓库
if git remote | grep -q origin; then
    git remote set-url origin "https://github.com/$REPO_FULL.git"
else
    git remote add origin "https://github.com/$REPO_FULL.git"
fi

# 提交所有文件
git add -A
git commit -m "feat: initial release v0.1.0 — OpenSkill

- Whitepaper (中文 + English)
- CLI tool (hw) with init/list/import/export/sync/inspect/stats
- Claude Adapter (CLAUDE.md + memory.json + skills)
- TypeScript SDK (@openskill/sdk) with Zod validation
- MCP Server (@openskill/mcp-server) for Claude/OpenClaw
- Asset Schema v0.1 (3-level model: Universal/Domain/Tool-specific)
- Adapter template for community contributors
- CI pipeline (GitHub Actions)
- Full project documentation"

echo ""

# 推送到 GitHub
echo "📤 推送到 GitHub..."
git push -u origin main

echo ""

# ─── Step 5: 创建 Release ─────────────────────────────────

echo "🏷️  Step 4: 创建 GitHub Release..."
gh release create v0.1.0 \
    --title "v0.1.0 — Phase 0: Concept Validation" \
    --notes "## OpenSkill v0.1.0

> Your AI Data Assets, One Wallet to Rule Them All.

### What's included

- **Whitepaper** — 中文 + English, covering the core thesis: treat Skills, Memory, and Preferences as portable digital assets
- **CLI tool** (\`hw\`) — init, list, import, export, sync, inspect, stats
- **Claude Adapter** — import/export CLAUDE.md, memory.json, and .claude/skills/
- **TypeScript SDK** (\`@openskill/sdk\`) — Zod-validated programmatic API
- **MCP Server** (\`@openskill/mcp-server\`) — 5 tools for Claude/OpenClaw integration
- **Asset Schema v0.1** — 3-level model (L0 Universal / L1 Domain / L2 Tool-specific)
- **Adapter Template** — for community contributors to add new platforms

### Quick Start

\`\`\`bash
npm install -g openskill
os init
os import --from claude
os list
\`\`\`

### What's Next (Phase 1)

- OpenClaw + Cursor Adapters
- Full two-way sync with conflict resolution
- npm publish for all 3 packages
- Web Dashboard prototype

---

*Built with conviction that your AI data should belong to you.*"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║  ✅ 发布完成!                             ║"
echo "  ║                                          ║"
echo "  ║  🔗 https://github.com/$REPO_FULL        "
echo "  ║                                          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  下一步:"
echo "  1. 在 GitHub 设置 Topics: ai, skills, wallet, agent, mcp, memory"
echo "  2. 编辑 About 描述和 Website URL"
echo "  3. 在 Settings > Pages 启用 GitHub Pages (可选)"
echo "  4. 分享到社区获取反馈"
echo ""
