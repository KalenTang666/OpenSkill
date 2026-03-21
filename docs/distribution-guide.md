# OpenSkill — 多生态分发指南

## 已完成

| 平台 | 状态 | 链接 |
|------|------|------|
| GitHub | ✅ | https://github.com/KalenTang666/OpenSkill |
| Discord | ✅ | https://discord.gg/MKdGbqwWsT |
| Agent Skills (SKILL.md) | ✅ | `.claude/skills/open-skill/SKILL.md` in repo |

## 待发布渠道

### 1. npm (全球)
```bash
cd packages/cli
npm publish --access public
# 包名: open-skill
# 安装: npm install -g open-skill
```

### 2. skills.sh (Vercel Agent Skills)
```bash
# 自动从 GitHub 抓取，确保 .claude/skills/open-skill/SKILL.md 存在
npx skills add KalenTang666/OpenSkill
```

### 3. SkillsMP (500K+ skills marketplace)
- 网址: https://skillsmp.com
- 条件: GitHub repo ≥ 2 stars，自动被抓取收录
- 操作: 获得 2+ stars 后自动出现

### 4. SkillForge (100K+ marketplace)  
- 网址: https://skillmarket.live
- 操作: 提交 GitHub URL https://github.com/KalenTang666/OpenSkill

### 5. ClawHub (OpenClaw 官方)
- 操作: Fork https://github.com/openclaw/skills → 添加 open-skill 目录 → PR
- 文件: 复制 .claude/skills/open-skill/ 到 skills/KalenTang666/OpenSkill/

### 6. AI Skill Market
- 网址: https://aiskill.market
- 操作: 注册发布者账号 → 上传 SKILL.md

### 7. Smithery (MCP 市场)
- 网址: https://smithery.ai/skills
- 操作: 提交 MCP Server 配置 (packages/mcp-server)

### 8. Atmos
- 操作: `npx @anthropic-ai/skills add KalenTang666/OpenSkill`

---

## 国内渠道

### 9. 腾讯云开发者社区
- 网址: https://cloud.tencent.com/developer
- 操作: 发布技术文章《OpenSkill：跨平台 AI 技能资产管理工具》
- 标签: AI, Agent Skills, 跨平台, MCP

### 10. 阿里云效 / npmmirror  
- npmmirror 自动同步 npm：发布 npm 后即可通过 `npx open-skill` 在国内使用
- 云效 DevOps: 添加为开发工具集成

### 11. 字节跳动 Trae
- Trae 支持 Agent Skills 标准
- 操作: 将 SKILL.md 放入 `.trae/skills/open-skill/` 目录
- 参考: Vercel skills 的 Trae 集成路径

### 12. 飞书开放平台
- 构建飞书机器人 skill → 调用 OpenSkill CLI
- 参考: zrong.net OpenClaw + 飞书 Skill 实战

### 13. 知乎 / 掘金 / CSDN
- 发布推广文章
- 标题建议:《40+ Agent Skills 精选之后，我做了一个跨平台 Skill 管理工具》

### 14. HelloGitHub
- 网址: https://hellogithub.com
- 操作: 提交开源项目推荐
- 条件: 项目质量 + README 完整度

---

## 提交模板

### npm package.json (已就绪)
```json
{
  "name": "open-skill",
  "version": "1.1.0",
  "bin": { "os": "./dist/cli.js" },
  "keywords": ["ai", "skills", "agent", "cross-platform", "mcp", "claude", "codex", "cursor"]
}
```

### skills.sh 自动发现格式 (已就绪)
```
.claude/skills/open-skill/SKILL.md  ← 标准 Agent Skills 格式
```

### ClawHub PR 格式
```
skills/KalenTang666/OpenSkill/
├── SKILL.md        ← 从 .claude/skills/open-skill/ 复制
└── scripts/        ← 可选：辅助脚本
```
