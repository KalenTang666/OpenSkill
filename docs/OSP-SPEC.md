# OpenSkill Protocol (TWP) Specification v1.0

> Open standard for cross-domain AI data asset interoperability
> 跨域 AI 数据资产互操作开放标准

**Status**: Draft  
**Version**: 1.0.0  
**Date**: 2026-03-16  
**Authors**: Kalen666 / KalenTang666

---

## 1. Introduction

The OpenSkill Protocol (TWP) defines a standard format and communication protocol for managing, sharing, and synchronizing AI data assets (Skills, Memory, Preferences) across heterogeneous AI platforms.

OSP builds on the open Agent Skills standard (agentskills.io) and extends it with three critical capabilities the ecosystem currently lacks: **cross-platform identity**, **asset versioning**, and **cryptographic integrity**.

### 1.1 Design Principles

1. **User sovereignty**: Assets are owned and controlled by the user, not the platform
2. **Local-first**: All operations work offline; sync is optional and user-initiated
3. **Platform-agnostic**: No dependency on any specific AI vendor
4. **Incrementally adoptable**: Platforms can adopt OSP partially (read-only, or single asset type)
5. **Compatible with Agent Skills**: OSP assets are a superset of the Agent Skills standard

### 1.2 Relationship to Existing Standards

| Standard | Focus | OSP Relationship |
|----------|-------|-------------------|
| Agent Skills (Anthropic) | Skill definition & discovery | OSP **extends** with versioning + identity + sync |
| MCP (Model Context Protocol) | AI ↔ Tool connectivity | OSP **uses** MCP as transport layer |
| W3C Verifiable Credentials | Identity attestation | OSP **aligns** for asset provenance signing |
| IPFS / CID | Content addressing | OSP **optionally uses** for decentralized registry |

---

## 2. Asset Format

### 2.1 OSP Asset Envelope

Every OSP asset is a JSON document wrapped in a standardized envelope:

```json
{
  "$twp": "1.0",
  "id": "osp:<type>:<content-hash>",
  "type": "skill | memory | preference",
  "level": 0 | 1 | 2,
  "name": "Human-readable name",
  "version": "semver",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "author": {
    "id": "did:key:<public-key> | user-id",
    "signature": "ed25519:<hex>"
  },
  "tags": ["string"],
  "compatibility": ["platform-id"],
  "content": {
    "format": "markdown | json | yaml",
    "body": "...",
    "hash": "sha256:<hex>"
  },
  "sync": {
    "strategy": "auto | manual | on-change",
    "conflict_resolution": "user-decides | latest-wins | merge"
  },
  "provenance": {
    "chain": ["osp:<parent-hash>"],
    "created_by": "tool:openskill-cli@0.3.0",
    "platform_origin": "claude | openclaw | cursor"
  }
}
```

### 2.2 Asset Identification

Assets use content-addressable IDs: `osp:<type>:<sha256-of-content-body>`

This ensures:
- Identical content always produces the same ID (deduplication)
- Any modification produces a new ID (tamper detection)
- IDs are globally unique without a central registry

### 2.3 Asset Levels

| Level | Scope | Sync Behavior | Examples |
|-------|-------|---------------|----------|
| 0 | Universal | Lossless across all platforms | Language, timezone, writing style |
| 1 | Domain | Adapter-mediated transformation | Coding standards, domain expertise |
| 2 | Tool-specific | Kept in native format | CLAUDE.md, .cursorrules, AGENTS.md |

---

## 3. Cryptographic Layer

### 3.1 Key Management

Each wallet generates an Ed25519 keypair on initialization:
- **Private key**: Stored locally at `~/.openskill/keys/private.key` (encrypted with user passphrase)
- **Public key**: Embedded in wallet config and optionally published to registry

### 3.2 Asset Signing

Every asset creation or modification produces a signature:

```
signature = Ed25519.sign(privateKey, sha256(canonical_json(asset)))
```

Verification:
```
Ed25519.verify(publicKey, signature, sha256(canonical_json(asset))) → true/false
```

### 3.3 Trust Model

- **Self-signed**: Default. User signs their own assets.
- **Team-signed**: Team admin signs shared assets with team key.
- **Registry-verified**: Optional. Registry validates asset integrity before listing.

---

## 4. Sync Protocol

### 4.1 Sync Flow

```
Client A                          Client B
   │                                │
   ├─ 1. ANNOUNCE (asset manifest) ─►
   │                                │
   ◄─ 2. DIFF (missing/changed) ───┤
   │                                │
   ├─ 3. PUSH (asset bundles) ──────►
   │                                │
   ◄─ 4. ACK (received + verified) ─┤
   │                                │
   ├─ 5. RESOLVE (if conflicts) ────►
   │                                │
   ◄─ 6. CONFIRM (resolution) ──────┤
```

### 4.2 Conflict Resolution Strategies

| Strategy | Behavior |
|----------|----------|
| `user-decides` | Present both versions, wait for user selection |
| `latest-wins` | Compare `updated_at`, keep most recent |
| `merge` | Combine tags + compatibility, keep longer content body |
| `theirs-wins` | Always accept remote version |
| `mine-wins` | Always keep local version |

---

## 5. Decentralized Registry

### 5.1 Overview

The OSP Registry is an optional, decentralized index of published assets. It supports three backend modes:

| Mode | Backend | Use Case |
|------|---------|----------|
| Local | File system | Single-user, offline |
| Hosted | HTTP API (GitHub/npm) | Teams, open-source sharing |
| Decentralized | IPFS + content addressing | Censorship-resistant, permanent |

### 5.2 Registry Entry Format

```json
{
  "osp_id": "osp:skill:<hash>",
  "name": "TypeScript Coding Standards",
  "author": "did:key:z6Mk...",
  "version": "1.2.0",
  "tags": ["typescript", "coding"],
  "compatibility": ["claude", "openclaw", "cursor"],
  "downloads": 1024,
  "rating": 4.7,
  "cid": "bafybei...",
  "signature": "ed25519:..."
}
```

### 5.3 IPFS Integration

For decentralized mode:
1. Asset content → IPFS → returns CID (Content Identifier)
2. CID + metadata → signed registry entry
3. Registry entry → append-only log (IPFS or OrbitDB)
4. Discovery via DHT (Distributed Hash Table) lookups

---

## 6. Vendor Integration

### 6.1 Adapter Specification

Any AI platform can integrate with OSP by implementing the Adapter interface:

```typescript
interface TWPAdapter {
  platform: string;
  detect(): Promise<boolean>;
  pull(type?: AssetType): Promise<TWPAsset[]>;
  push(asset: TWPAsset): Promise<PushResult>;
  toNative(asset: TWPAsset): Promise<string>;
  fromNative(raw: string, type: AssetType): Promise<TWPAsset>;
}
```

### 6.2 Current Adapters

| Platform | Status | Config Files |
|----------|--------|-------------|
| Claude | ✅ Stable | CLAUDE.md, memory.json, .claude/skills/ |
| OpenClaw | ✅ Stable | AGENTS.md, skills, memory, settings.yaml |
| Cursor | ✅ Stable | .cursorrules, .cursor/ |
| VS Code | ✅ Stable | .vscode/settings.json, copilot-instructions.md |
| Windsurf | ✅ Stable | .windsurfrules |
| Gemini / Antigravity | 🔜 Planned | .gemini/, AGENTS.md |
| GitHub Copilot | 🔜 Planned | .github/copilot-instructions.md |
| Codex CLI | 🔜 Planned | ~/.codex/skills/ |

### 6.3 Compatibility with Agent Skills Standard

OSP Level 2 skill assets are **fully compatible** with the Agent Skills open standard:
- A `SKILL.md` file with YAML frontmatter is a valid OSP asset
- OSP adds the envelope (versioning, signing, sync) as metadata
- Platforms that only understand Agent Skills can ignore the OSP envelope

---

## 7. Security Considerations

1. **Private key protection**: Keys encrypted at rest, never transmitted
2. **Skill sandboxing**: Imported skills run in isolation before entering wallet
3. **Supply chain attacks**: Registry entries must be signed; verification is mandatory
4. **Memory poisoning**: Cross-domain memory sync requires explicit user approval per asset
5. **Semantic injection**: L1 adapter transformations must be deterministic (no LLM in the loop)

---

## Appendix A: MIME Types

| Asset Type | MIME Type |
|-----------|-----------|
| Skill | `application/vnd.osp.skill+json` |
| Memory | `application/vnd.osp.memory+json` |
| Preference | `application/vnd.osp.preference+json` |
| Signed Bundle | `application/vnd.osp.bundle+json` |

## Appendix B: URI Scheme

```
osp://registry.example.com/skill/sha256-abc123?v=1.2.0
osp+ipfs://bafybei.../skill-typescript-standards
```
