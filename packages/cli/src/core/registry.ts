/**
 * OpenSkill — Decentralized Asset Registry
 * Supports: local, hosted (GitHub/npm), decentralized (IPFS)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { contentHash } from './crypto.js';
import type { WalletAsset } from './types.js';

const REGISTRY_DIR = join(homedir(), '.openskill', 'registry');

export type RegistryMode = 'local' | 'hosted' | 'decentralized';

export interface RegistryEntry {
  osp_id: string;
  name: string;
  author: string;
  version: string;
  type: string;
  tags: string[];
  compatibility: string[];
  downloads: number;
  rating: number;
  content_hash: string;
  cid?: string;          // IPFS CID (decentralized mode)
  hosted_url?: string;   // HTTP URL (hosted mode)
  signature?: string;
  published_at: string;
}

export class AssetRegistry {
  private mode: RegistryMode;
  private registryDir: string;

  constructor(mode: RegistryMode = 'local') {
    this.mode = mode;
    this.registryDir = join(REGISTRY_DIR, mode);
    if (!existsSync(this.registryDir)) mkdirSync(this.registryDir, { recursive: true });
  }

  /** Publish an asset to the registry */
  publish(asset: WalletAsset, description?: string): RegistryEntry {
    const entry: RegistryEntry = {
      osp_id: `osp:${asset.type}:${contentHash(asset.content.body).slice(0, 16)}`,
      name: asset.name,
      author: asset.author.id,
      version: asset.version,
      type: asset.type,
      tags: asset.tags,
      compatibility: asset.compatibility,
      downloads: 0,
      rating: 0,
      content_hash: contentHash(asset.content.body),
      signature: asset.author.signature,
      published_at: new Date().toISOString(),
    };

    // Store entry
    const entryFile = join(this.registryDir, `${entry.osp_id.replace(/:/g, '-')}.json`);
    writeFileSync(entryFile, JSON.stringify(entry, null, 2), 'utf-8');

    // Store full asset alongside
    const assetFile = join(this.registryDir, `${entry.osp_id.replace(/:/g, '-')}.asset.json`);
    writeFileSync(assetFile, JSON.stringify(asset, null, 2), 'utf-8');

    return entry;
  }

  /** Search the registry */
  search(query: string): RegistryEntry[] {
    const entries: RegistryEntry[] = [];
    const q = query.toLowerCase();

    for (const file of readdirSync(this.registryDir).filter(f => f.endsWith('.json') && !f.includes('.asset.'))) {
      try {
        const entry: RegistryEntry = JSON.parse(readFileSync(join(this.registryDir, file), 'utf-8'));
        if (entry.name.toLowerCase().includes(q) ||
            entry.tags.some(t => t.toLowerCase().includes(q)) ||
            entry.type.includes(q)) {
          entries.push(entry);
        }
      } catch { /* skip */ }
    }

    return entries.sort((a, b) => b.downloads - a.downloads);
  }

  /** Get all entries */
  list(): RegistryEntry[] {
    const entries: RegistryEntry[] = [];
    for (const file of readdirSync(this.registryDir).filter(f => f.endsWith('.json') && !f.includes('.asset.'))) {
      try { entries.push(JSON.parse(readFileSync(join(this.registryDir, file), 'utf-8'))); } catch {}
    }
    return entries;
  }

  /** Install an asset from registry by ID */
  install(ospId: string): WalletAsset | null {
    const assetFile = join(this.registryDir, `${ospId.replace(/:/g, '-')}.asset.json`);
    if (!existsSync(assetFile)) return null;

    const asset: WalletAsset = JSON.parse(readFileSync(assetFile, 'utf-8'));

    // Increment download count
    const entryFile = join(this.registryDir, `${ospId.replace(/:/g, '-')}.json`);
    if (existsSync(entryFile)) {
      const entry: RegistryEntry = JSON.parse(readFileSync(entryFile, 'utf-8'));
      entry.downloads++;
      writeFileSync(entryFile, JSON.stringify(entry, null, 2), 'utf-8');
    }

    return asset;
  }

  /** Verify an entry's integrity */
  verify(entry: RegistryEntry): { valid: boolean; reason?: string } {
    const assetFile = join(this.registryDir, `${entry.osp_id.replace(/:/g, '-')}.asset.json`);
    if (!existsSync(assetFile)) return { valid: false, reason: 'Asset file not found' };

    const asset: WalletAsset = JSON.parse(readFileSync(assetFile, 'utf-8'));
    const hash = contentHash(asset.content.body);

    if (hash !== entry.content_hash) return { valid: false, reason: 'Content hash mismatch' };
    return { valid: true };
  }

  getMode(): RegistryMode { return this.mode; }
}
