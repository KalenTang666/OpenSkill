/** OpenSkill — Public API v1.0.0 */

// Core
export { Wallet } from './core/wallet.js';
export type * from './core/types.js';

// Adapters
export { ClaudeAdapter } from './adapters/claude.js';
export { OpenClawAdapter } from './adapters/openclaw.js';
export { CursorAdapter } from './adapters/cursor.js';
export { VSCodeAdapter } from './adapters/vscode.js';
export { WindsurfAdapter } from './adapters/windsurf.js';
export { GeminiAdapter } from './adapters/gemini.js';
export { CopilotAdapter } from './adapters/copilot.js';
export { CodexAdapter } from './adapters/codex.js';

// Crypto & Protocol
export { contentHash, generateKeys, signContent, verifySignature, hasKeys, getPublicKeyHex } from './core/crypto.js';
export { toOSPEnvelope, fromOSPEnvelope, generateManifest, diffManifests, OSP_VERSION } from './core/protocol.js';

// Registry & Scanner
export { AssetRegistry } from './core/registry.js';
export { discoverLocalAssets, detectPlatforms } from './core/local-scanner.js';
export { scoreAsset, compareAcrossPlatforms, generateRecommendations, formatRecommendations } from './core/analyzer.js';

// Security
export { scanAsset, scanAll, formatReport } from './security/scanner.js';
export { validateInSandbox, validateBatch } from './security/sandbox.js';

// Enterprise & Commerce
export { logAudit, readAuditLog, hasPermission, getPermissions, formatAuditLog } from './enterprise/audit.js';
export { recordUsage as recordCommerceUsage, getUsageStats, recordRevenue, getCreatorEarnings } from './commerce/metering.js';

// Growth & Migration
export { loadProfile, awardXP, getRankInfo, xpToNextLevel, formatProfile } from './core/growth.js';
export { planMigration, executeMigration, createBackup, saveBackup, restoreBackup, onboardPlatform, checkHealth, getSupportedPlatforms } from './core/migration.js';

// Hooks + Smart Match + Hardware Bridge
export { registerHook, removeHook, toggleHook, emit, getHooks, getExecutionLog, getAvailableEvents } from './core/hooks.js';
export { smartMatch, recordUsage as recordSkillUsage, getFrequentSkills, estimateTokens } from './core/smart-match.js';
export { registerThisDevice, registerDevice, getDevices, removeDevice, generateSyncManifest, getSyncSummary, isSkillCompatible } from './core/hardware-bridge.js';

// File Watcher + Live Sync
export { startWatching, stopWatching, getWatchStatus, scanForChanges } from './core/file-watcher.js';
export { getSyncPairs, addSyncPair, removeSyncPair, executeSync, syncAll } from './core/live-sync.js';

// Plugin System + Marketplace Ratings
export { getPlugins, installPlugin, uninstallPlugin, togglePlugin, getEnabledPlugins, getPluginTypes } from './core/plugin-system.js';
export { rateSkill, getSkillRatings, getSkillStats } from './core/marketplace-ratings.js';
