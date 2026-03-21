/**
 * @openskill/sdk
 *
 * Programmatic TypeScript SDK for OpenSkill.
 * Use this to integrate OpenSkill into your own tools and workflows.
 *
 * @example
 * ```ts
 * import { OpenSkillSDK } from '@openskill/sdk';
 *
 * const hw = new OpenSkillSDK();
 *
 * // List all skills
 * const skills = hw.listAssets({ type: 'skill' });
 *
 * // Search by tags
 * const tsAssets = hw.searchAssets({ tags: ['typescript'] });
 *
 * // Create a new preference
 * hw.createAsset({
 *   type: 'preference',
 *   level: 1,
 *   name: 'My Coding Style',
 *   tags: ['coding', 'style'],
 *   content: { format: 'markdown', body: '...' },
 * });
 * ```
 */

import { z } from 'zod';

// ─── Schemas ─────────────────────────────────────────────

export const AssetTypeSchema = z.enum(['skill', 'memory', 'preference']);
export const AssetLevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export const SyncStrategySchema = z.enum(['auto', 'manual', 'on-change']);
export const ConflictResolutionSchema = z.enum(['user-decides', 'latest-wins', 'merge']);

export const AssetContentSchema = z.object({
  format: z.string(),
  body: z.string(),
  metadata: z.record(z.unknown()).default({}),
});

export const WalletAssetSchema = z.object({
  id: z.string(),
  type: AssetTypeSchema,
  level: AssetLevelSchema,
  name: z.string(),
  version: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  author: z.object({
    id: z.string(),
    signature: z.string().optional(),
  }),
  tags: z.array(z.string()),
  compatibility: z.array(z.string()),
  content: AssetContentSchema,
  sync: z.object({
    strategy: SyncStrategySchema,
    last_synced: z.record(z.string()),
    conflict_resolution: ConflictResolutionSchema,
  }),
});

export const CreateAssetInputSchema = z.object({
  type: AssetTypeSchema,
  level: AssetLevelSchema,
  name: z.string().min(1),
  tags: z.array(z.string()).default([]),
  compatibility: z.array(z.string()).default([]),
  content: z.object({
    format: z.string().default('markdown'),
    body: z.string(),
    metadata: z.record(z.unknown()).optional(),
  }),
  sync_strategy: SyncStrategySchema.optional(),
});

export const ListAssetsFilterSchema = z.object({
  type: AssetTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  level: AssetLevelSchema.optional(),
  search: z.string().optional(),
}).optional();

// ─── Type Exports ────────────────────────────────────────

export type AssetType = z.infer<typeof AssetTypeSchema>;
export type AssetLevel = z.infer<typeof AssetLevelSchema>;
export type WalletAsset = z.infer<typeof WalletAssetSchema>;
export type CreateAssetInput = z.infer<typeof CreateAssetInputSchema>;
export type ListAssetsFilter = z.infer<typeof ListAssetsFilterSchema>;

// ─── SDK Client ──────────────────────────────────────────

export class OpenSkillSDK {
  private walletDir: string;

  constructor(walletDir?: string) {
    this.walletDir = walletDir ?? `${process.env.HOME}/.openskill`;
  }

  /** List assets with optional filters */
  async listAssets(filter?: ListAssetsFilter): Promise<WalletAsset[]> {
    const { readFileSync, readdirSync, existsSync } = await import('node:fs');
    const { join } = await import('node:path');

    const types = filter?.type ? [filter.type] : ['skill', 'memory', 'preference'];
    const dirMap: Record<string, string> = {
      skill: 'skills',
      memory: 'memories',
      preference: 'preferences',
    };

    const assets: WalletAsset[] = [];

    for (const type of types) {
      const dir = join(this.walletDir, 'assets', dirMap[type] ?? type);
      if (!existsSync(dir)) continue;

      for (const file of readdirSync(dir)) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
          const asset = WalletAssetSchema.parse(raw);

          if (filter?.level !== undefined && asset.level !== filter.level) continue;
          if (filter?.tags?.length && !filter.tags.some(t => asset.tags.includes(t))) continue;
          if (filter?.search) {
            const q = filter.search.toLowerCase();
            const match =
              asset.name.toLowerCase().includes(q) ||
              asset.tags.some(t => t.toLowerCase().includes(q)) ||
              asset.content.body.toLowerCase().includes(q);
            if (!match) continue;
          }

          assets.push(asset);
        } catch {
          // Skip invalid files
        }
      }
    }

    return assets.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  /** Get a single asset by ID */
  async getAsset(id: string): Promise<WalletAsset | null> {
    const all = await this.listAssets();
    return all.find(a => a.id === id) ?? null;
  }

  /** Search assets by text query */
  async searchAssets(query: string): Promise<WalletAsset[]> {
    return this.listAssets({ search: query });
  }

  /** Validate an asset against the schema */
  validate(data: unknown): { valid: boolean; errors?: string[] } {
    const result = WalletAssetSchema.safeParse(data);
    if (result.success) return { valid: true };
    return {
      valid: false,
      errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    };
  }
}
