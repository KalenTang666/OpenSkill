/**
 * OpenSkill Protocol (TWP) — Protocol Implementation
 * Handles asset envelope creation, manifest generation, and sync protocol
 */
import { contentHash, ospId, signContent, hasKeys, getPublicKeyHex } from './crypto.js';
import type { WalletAsset } from './types.js';

export const OSP_VERSION = '1.0';

/** OSP Asset Envelope */
export interface OSPEnvelope {
  $osp: string;
  id: string;
  type: string;
  level: number;
  name: string;
  version: string;
  created_at: string;
  updated_at: string;
  author: { id: string; signature?: string };
  tags: string[];
  compatibility: string[];
  content: { format: string; body: string; hash: string };
  sync: { strategy: string; conflict_resolution: string };
  provenance: { chain: string[]; created_by: string; platform_origin: string };
}

/** Wrap a WalletAsset in OSP envelope */
export function toOSPEnvelope(asset: WalletAsset, platformOrigin: string = 'unknown'): OSPEnvelope {
  const bodyHash = contentHash(asset.content.body);
  const envelope: OSPEnvelope = {
    $osp: OSP_VERSION,
    id: ospId(asset.type, asset.content.body),
    type: asset.type,
    level: asset.level,
    name: asset.name,
    version: asset.version,
    created_at: asset.created_at,
    updated_at: asset.updated_at,
    author: { id: hasKeys() ? `did:key:${getPublicKeyHex()}` : asset.author.id },
    tags: asset.tags,
    compatibility: asset.compatibility,
    content: { format: asset.content.format, body: asset.content.body, hash: bodyHash },
    sync: { strategy: asset.sync.strategy, conflict_resolution: asset.sync.conflict_resolution },
    provenance: { chain: [], created_by: 'openskill-cli@0.3.0', platform_origin: platformOrigin },
  };

  // Sign if keys available
  if (hasKeys()) {
    try {
      const sig = signContent(JSON.stringify({ ...envelope, author: { ...envelope.author, signature: undefined } }));
      envelope.author.signature = `ed25519:${sig.signature.slice(0, 64)}`;
    } catch { /* signing optional */ }
  }

  return envelope;
}

/** Convert OSP envelope back to WalletAsset */
export function fromOSPEnvelope(envelope: OSPEnvelope): WalletAsset {
  return {
    id: envelope.id,
    type: envelope.type as any,
    level: envelope.level as any,
    name: envelope.name,
    version: envelope.version,
    created_at: envelope.created_at,
    updated_at: envelope.updated_at,
    author: { id: envelope.author.id, signature: envelope.author.signature },
    tags: envelope.tags,
    compatibility: envelope.compatibility,
    content: { format: envelope.content.format, body: envelope.content.body, metadata: { osp_hash: envelope.content.hash } },
    sync: { strategy: envelope.sync.strategy as any, last_synced: {}, conflict_resolution: envelope.sync.conflict_resolution as any },
  };
}

/** Generate manifest for sync protocol */
export function generateManifest(assets: WalletAsset[]): Array<{ id: string; hash: string; version: string; updated_at: string }> {
  return assets.map(a => ({
    id: a.id,
    hash: contentHash(a.content.body),
    version: a.version,
    updated_at: a.updated_at,
  }));
}

/** Compare two manifests and return differences */
export function diffManifests(
  local: ReturnType<typeof generateManifest>,
  remote: ReturnType<typeof generateManifest>
): { missing: string[]; changed: string[]; extra: string[] } {
  const localMap = new Map(local.map(a => [a.id, a]));
  const remoteMap = new Map(remote.map(a => [a.id, a]));

  const missing = remote.filter(r => !localMap.has(r.id)).map(r => r.id);
  const changed = remote.filter(r => {
    const l = localMap.get(r.id);
    return l && l.hash !== r.hash;
  }).map(r => r.id);
  const extra = local.filter(l => !remoteMap.has(l.id)).map(l => l.id);

  return { missing, changed, extra };
}
