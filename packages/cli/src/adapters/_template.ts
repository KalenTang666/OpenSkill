/**
 * Platform Adapter Template
 *
 * Copy this file to create a new adapter:
 *   packages/cli/src/adapters/<platform>.ts
 *
 * Then register it in packages/cli/src/cli.ts → getAdapter()
 */

import type { PlatformAdapter, WalletAsset, AssetType, PushResult } from '../core/types.js';

export class TemplateAdapter implements PlatformAdapter {
  readonly platform = 'your-platform';   // e.g. 'openclaw', 'cursor', 'windsurf'
  readonly displayName = 'Your Platform'; // e.g. 'OpenClaw', 'Cursor', 'Windsurf'

  /**
   * Check if this platform is installed/available on the system.
   * Common checks: config file exists, CLI binary is in PATH, etc.
   */
  async detect(): Promise<boolean> {
    // Example: check if ~/.your-platform/config exists
    // const { existsSync } = await import('node:fs');
    // const { join } = await import('node:path');
    // const { homedir } = await import('node:os');
    // return existsSync(join(homedir(), '.your-platform', 'config'));
    return false;
  }

  /**
   * Pull assets from the platform into wallet format.
   * Read config files, databases, or API responses and convert to WalletAsset[].
   */
  async pull(assetType?: AssetType): Promise<WalletAsset[]> {
    const assets: WalletAsset[] = [];

    // TODO: Read platform-specific files and convert to WalletAsset format
    // Example for preferences:
    //   1. Read the platform's config file
    //   2. Parse it into structured data
    //   3. Create a WalletAsset with type='preference', level=2

    return assets;
  }

  /**
   * Push a wallet asset to the platform.
   * Convert from wallet format to platform-native format and write it.
   */
  async push(asset: WalletAsset): Promise<PushResult> {
    try {
      const native = await this.toNative(asset);

      // TODO: Write the native format to the platform's config location

      return {
        success: true,
        platform: this.platform,
        asset_id: asset.id,
        message: `Pushed to ${this.displayName}`,
      };
    } catch (err) {
      return {
        success: false,
        platform: this.platform,
        asset_id: asset.id,
        message: String(err),
      };
    }
  }

  /**
   * Convert a wallet asset to platform-native format string.
   * For L2 assets, often no conversion needed.
   */
  async toNative(asset: WalletAsset): Promise<string> {
    if (asset.level === 2) return asset.content.body;

    // TODO: Transform L0/L1 assets to platform format
    return asset.content.body;
  }

  /**
   * Convert platform-native format to a wallet asset.
   */
  async fromNative(raw: string, type: AssetType): Promise<WalletAsset> {
    const now = new Date().toISOString();
    return {
      id: `hw-${type.slice(0, 3)}-${Date.now().toString(36)}`,
      type,
      level: 2,
      name: `${this.displayName} imported ${type}`,
      version: '1.0.0',
      created_at: now,
      updated_at: now,
      author: { id: `imported-${this.platform}` },
      tags: [this.platform, 'imported'],
      compatibility: [this.platform],
      content: { format: 'markdown', body: raw, metadata: { source: `${this.platform}-adapter` } },
      sync: { strategy: 'manual', last_synced: { [this.platform]: now }, conflict_resolution: 'user-decides' },
    };
  }
}
