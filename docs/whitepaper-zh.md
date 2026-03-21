# OpenSkill 白皮书

> 跨域 AI 数据资产的统一管理基础设施

**版本**: 0.1.0-draft  
**日期**: 2026-03-15  
**作者**: Kalen666  

---

## 摘要

当下，AI 用户面临一个日益严重的碎片化问题：Skills、Memory、偏好设置等个人 AI 数据资产分散在 Claude、OpenClaw、opencode、各类 IDE 和聊天平台中，无法统一管理、跨域流通和版本控制。用户不得不在每个新平台重复配置，重复性劳动不减反增。

**OpenSkill** 提出一个新范式：将 Skills、Memory、Preferences 等 AI 数据视为**可管理、可流通、可组合的数字资产**，通过一个用户侧的统一"钱包"进行跨域管理——就像加密钱包管理链上资产一样，OpenSkill 管理你的 AI 资产。

---

## 1. 问题陈述

### 1.1 AI 数据资产的碎片化困境

2026 年，AI 工具生态呈现多极化格局：

| 场景 | 典型工具 | 数据存储方式 |
|------|---------|------------|
| 对话 | Claude, ChatGPT, 豆包 | 平台私有 Memory |
| 编码 | OpenClaw, Cursor, Claude Code | 本地 YAML/MD + 平台同步 |
| 工作流 | n8n, Dify, Coze | 平台内 Workflow 定义 |
| 知识管理 | Notion AI, Obsidian + AI | 各自格式 |

每个平台都维护自己的 Skills 库、Memory 系统和用户偏好设置，导致：

- **重复配置成本高**：同一套编码规范、写作风格、领域知识需要在每个平台重复设定
- **跨域不互通**：OpenClaw 的 Skill 无法直接在 Claude Code 使用，反之亦然
- **版本失控**：同一偏好在不同平台存在多个版本，没有单一事实来源（SSOT）
- **隐私分散**：个人数据散落在多个平台，增加泄露风险和管理负担

### 1.2 为什么现有方案不够

| 方案类型 | 代表 | 局限 |
|---------|------|------|
| Agent Memory | OpenStinger, MemOS, Letta | 绑定单一框架，不跨域 |
| Agent Wallet | Coinbase Agentic, Openfort | 仅管理金融资产，不管 Skills/Memory |
| Skills Hub | ClawHub, SkillsMP, agentskills.io | 分发市场，不管用户侧资产 |
| Agent Harness | LangChain Deep Agents, Hermes | 框架内管理，不是用户侧统一层 |

**核心缺失**：没有一个方案站在**用户侧**，提供跨框架、跨平台的 AI 数据资产统一管理。

### 1.3 反对意见与回应

Zep 团队在 "The Portable Memory Wallet Fallacy" 一文中提出了三个主要质疑：

| 质疑 | OpenSkill 的回应 |
|------|---------------------|
| **语义互操作性难题**：跨域记忆缺乏共享语义 | 采用**分层资产模型**：Level 0 (通用偏好) 跨域无损，Level 1 (领域知识) 需适配器转换，Level 2 (工具特定) 保持原生格式不强制转换 |
| **攻击面扩大**：中毒记忆跨域传播 | 引入**资产签名 + 沙箱验证**：所有跨域同步的资产需经来源签名验证和隔离沙箱测试 |
| **责任归属模糊**：出错谁负责 | **用户主权原则**：用户持有私钥，每次同步需用户确认授权，责任链清晰 |

---

## 2. 核心概念

### 2.1 AI 数据资产分类

OpenSkill 管理三类核心资产：

```
┌─────────────────────────────────────────┐
│            OpenSkill               │
├─────────┬──────────┬───────────────────┤
│ Skills  │ Memory   │ Preferences       │
├─────────┼──────────┼───────────────────┤
│ 工作流  │ 对话历史  │ 编码规范           │
│ 自动化  │ 知识图谱  │ 写作风格           │
│ 模板    │ 决策记录  │ 交互偏好           │
│ 插件    │ 项目上下文│ 模型路由策略        │
│ MCP配置 │ 学习轨迹  │ 隐私策略           │
└─────────┴──────────┴───────────────────┘
```

### 2.2 资产分层模型

```
Level 0: Universal（通用层）
  ├── 语言偏好、时区、姓名等基础身份信息
  ├── 通用写作风格（正式/口语、简洁/详细）
  └── 跨域无损同步，所有平台直接可用

Level 1: Domain（领域层）
  ├── 编码规范（TypeScript 风格、命名约定）
  ├── 领域知识（游戏化设计、移动开发最佳实践）
  └── 需适配器转换，不同平台可能有不同表达格式

Level 2: Tool-Specific（工具层）
  ├── Claude CLAUDE.md 配置
  ├── OpenClaw Skills / .openclaw/ 配置
  ├── Cursor .cursorrules 配置
  └── 保持原生格式，不强制统一
```

### 2.3 钱包架构

```
            ┌──────────────────┐
            │    User Layer    │
            │  CLI / Web / SDK │
            └────────┬─────────┘
                     │
            ┌────────▼─────────┐
            │   Wallet Core    │
            │                  │
            │  Asset Registry  │
            │  Version Control │
            │  Access Control  │
            │  Sync Engine     │
            └────────┬─────────┘
                     │
       ┌─────────────┼─────────────┐
       │             │             │
  ┌────▼───┐   ┌────▼───┐   ┌────▼───┐
  │Adapter │   │Adapter │   │Adapter │
  │ Claude │   │OpenClaw│   │ Cursor │
  └────┬───┘   └────┬───┘   └────┬───┘
       │             │             │
  ┌────▼───┐   ┌────▼───┐   ┌────▼───┐
  │ Claude │   │OpenClaw│   │ Cursor │
  │  API   │   │  CLI   │   │  IDE   │
  └────────┘   └────────┘   └────────┘
```

---

## 3. 技术设计

### 3.1 资产格式标准

每个资产是一个 JSON 文件，遵循统一 schema：

```jsonc
{
  "$schema": "https://openskill.dev/schema/asset-v1.json",
  "id": "hw-asset-xxxx",
  "type": "skill",           // skill | memory | preference
  "level": 0,                // 0=universal, 1=domain, 2=tool-specific
  "name": "TypeScript 编码规范",
  "version": "1.2.0",
  "created_at": "2026-03-15T10:00:00Z",
  "updated_at": "2026-03-15T10:00:00Z",
  "author": {
    "id": "user-kalen666",
    "signature": "ed25519:xxxxx"
  },
  "tags": ["coding", "typescript", "style"],
  "compatibility": ["claude-code", "openclaw", "cursor"],
  "content": {
    "format": "markdown",
    "body": "...",
    "metadata": {}
  },
  "sync": {
    "strategy": "manual",     // auto | manual | on-change
    "last_synced": {},
    "conflict_resolution": "user-decides"
  }
}
```

### 3.2 同步协议

```
1. PULL: 从目标平台拉取最新状态
2. DIFF: 与钱包中的版本对比
3. RESOLVE: 冲突时提示用户选择
4. TRANSFORM: 通过 Adapter 转换格式
5. PUSH: 推送到目标平台
6. SIGN: 记录操作签名和时间戳
```

### 3.3 适配器（Adapter）接口

```typescript
interface PlatformAdapter {
  /** 平台标识 */
  readonly platform: string;

  /** 检测平台是否可用 */
  detect(): Promise<boolean>;

  /** 从平台拉取资产 */
  pull(assetType: AssetType): Promise<RawAsset[]>;

  /** 推送资产到平台 */
  push(asset: WalletAsset): Promise<PushResult>;

  /** 将钱包资产转换为平台格式 */
  toNative(asset: WalletAsset): Promise<NativeFormat>;

  /** 将平台格式转换为钱包资产 */
  fromNative(raw: NativeFormat): Promise<WalletAsset>;
}
```

### 3.4 安全模型

- **本地优先**：钱包数据默认存储在本地文件系统（`~/.openskill/`）
- **端到端加密**：跨设备同步时使用用户私钥加密
- **签名验证**：每个资产变更都有签名记录，支持审计追溯
- **沙箱验证**：从外部导入的 Skills 在隔离环境中验证后才进入钱包
- **最小权限**：每个 Adapter 只获得必要的平台访问权限

---

## 4. 路线图

### 4.1 Phase 0: 概念验证（2 周）

- [x] 白皮书发布
- [ ] CLI 工具原型：`os init` / `os list` / `os sync`
- [ ] Claude Adapter 原型（读写 CLAUDE.md + Memory）
- [ ] 资产格式 Schema v0.1 定义

### 4.2 Phase 1: MVP（1-3 个月）

- [ ] Wallet Core 完整实现（资产注册、版本控制、冲突解决）
- [ ] OpenClaw Adapter（Skills / Memory / .openclaw 配置）
- [ ] Cursor Adapter（.cursorrules 读写）
- [ ] MCP Server 发布（供 Claude/OpenClaw 直接调用钱包）
- [ ] SDK 发布（TypeScript，npm 包）
- [ ] Web Dashboard 原型

### 4.3 Phase 2: 生态扩展（3-6 个月）

- [ ] 更多 Adapter（VS Code、Windsurf、Dify、n8n）
- [ ] 资产市场（用户可分享/交易 Skills）
- [ ] 团队/组织钱包（共享资产池 + 权限管理）
- [ ] 移动端管理 App

### 4.4 Phase 3: 协议化（6-12 个月）

- [ ] OpenSkill Protocol (HWP) 标准化提案
- [ ] 厂商合作集成（推动平台原生支持）
- [ ] 去中心化资产注册（可选，基于 IPFS 或链上）

---

## 5. 商业模式

| 层级 | 模式 | 说明 |
|------|------|------|
| 基础层 | 免费开源 | CLI + SDK + 核心 Adapter |
| 增值层 | 订阅制 | 跨设备同步、Web Dashboard、高级冲突解决 |
| 生态层 | 交易分成 | 资产市场中 Skill 交易的分成 |
| 企业层 | License | 组织钱包、私有化部署、合规审计 |

---

## 6. 为什么是现在

1. **Skills 标准化趋势**：AgentSkills.io、ClawHub、SkillsMP 等市场的出现证明 Skills 资产化已有共识
2. **AI 工具多极化**：用户同时使用 3-5 个 AI 工具已成常态，跨域管理需求真实存在
3. **隐私监管趋严**：用户对数据主权的需求随 AI Act、PIPL 等法规落地而增强
4. **Agent Harness 概念成熟**：OpenClaw、LangChain Deep Agents 已验证 harness 层的价值

---

## 附录 A: 术语表

| 术语 | 定义 |
|------|------|
| **Asset** | 钱包管理的最小单元，包括 Skill、Memory 或 Preference |
| **Adapter** | 将钱包资产格式与特定平台格式互相转换的模块 |
| **Wallet Core** | 负责资产注册、版本控制、同步调度的核心引擎 |
| **HWP** | OpenSkill Protocol，拟议的跨平台资产管理标准 |
| **Asset Level** | 资产的通用性分级（L0 通用 / L1 领域 / L2 工具特定） |

## 附录 B: 参考链接

- [OpenClaw Architecture Analysis](https://allthingsopen.org/articles/openclaw-viral-open-source-ai-agent-architecture)
- [Coinbase Agentic Wallets](https://www.coinbase.com/developer-platform/discover/launches/agentic-wallets)
- [The Portable Memory Wallet Fallacy (Zep)](https://blog.getzep.com/the-ai-memory-wallet-fallacy/)
- [From AI in Wallets to Wallet for AI Agents](https://medium.com/@thierry.thevenet/from-ai-in-wallets-to-wallet-for-ai-agents-9f51f16f83d4)
- [LangChain Deep Agents Harness](https://docs.langchain.com/oss/python/deepagents/harness)
- [Hermes Agent by Nous Research](https://hermesagent.agency/)
- [OpenStinger: Portable Memory Harness](https://github.com/srikanthbellary/openstinger)
- [MemOS: Memory Operating System](https://github.com/MemTensor/MemOS)
