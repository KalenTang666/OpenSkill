/**
 * OpenSkill Hardware Bridge — Cross-device AI asset sync
 * 
 * Extends the Foundation Layer (基础层) into hardware ecosystem:
 * - Device registration & pairing
 * - Asset sync across devices (macOS ↔ mobile ↔ wearable ↔ IoT)
 * - Edge skill deployment (lightweight skills for constrained devices)
 * - Device-specific preference profiles
 * 
 * Use cases:
 * - Sync coding preferences from Mac → iPad when switching devices
 * - Deploy lightweight skills to Raspberry Pi / edge devices
 * - Wearable sends context (location, activity) to enrich skill matching
 * - Smart home device triggers hooks based on physical events
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, hostname, platform, arch } from 'node:os';
import { createHash } from 'node:crypto';

// ─── Types ───────────────────────────────────────────────

export interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'wearable' | 'iot' | 'server';
  platform: string;     // darwin, linux, win32, android, ios
  arch: string;
  capabilities: DeviceCapability[];
  last_seen: string;
  sync_status: 'online' | 'offline' | 'syncing';
  asset_count: number;
}

export type DeviceCapability =
  | 'full-skills'       // Can run any skill
  | 'lightweight-skills' // Limited to small skills (<5KB)
  | 'memory-sync'       // Can sync memory/preferences
  | 'hook-trigger'      // Can trigger hooks (IoT sensors)
  | 'context-provider'  // Provides context data (location, activity)
  | 'display'           // Has a screen for UI
  | 'headless';         // CLI/server only

export interface SyncManifest {
  device_id: string;
  timestamp: string;
  assets: Array<{ id: string; hash: string; type: string; size: number }>;
  preferences_hash: string;
}

export interface DeviceProfile {
  device_id: string;
  preferred_skills: string[];
  sync_rules: Array<{ asset_type: string; direction: 'push' | 'pull' | 'bidirectional' }>;
  bandwidth_limit?: number; // KB/s for constrained devices
}

// ─── Device Registry ─────────────────────────────────────

const DEVICES_DIR = join(homedir(), '.openskill', 'devices');
const DEVICES_FILE = join(DEVICES_DIR, 'registry.json');

function ensureDir(): void {
  if (!existsSync(DEVICES_DIR)) mkdirSync(DEVICES_DIR, { recursive: true });
}

/** Register this machine as a device */
export function registerThisDevice(): Device {
  ensureDir();
  const id = createHash('sha256').update(`${hostname()}-${platform()}-${arch()}`).digest('hex').slice(0, 16);
  const device: Device = {
    id, name: hostname(),
    type: platform() === 'darwin' ? 'desktop' : platform() === 'linux' ? 'server' : 'desktop',
    platform: platform(), arch: arch(),
    capabilities: ['full-skills', 'memory-sync', 'hook-trigger', 'display'],
    last_seen: new Date().toISOString(),
    sync_status: 'online', asset_count: 0,
  };
  const devices = getDevices();
  const idx = devices.findIndex(d => d.id === id);
  if (idx >= 0) { devices[idx] = { ...devices[idx], ...device }; }
  else { devices.push(device); }
  writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2));
  return device;
}

/** Register an external device (mobile, IoT, etc.) */
export function registerDevice(name: string, type: Device['type'], caps: DeviceCapability[]): Device {
  ensureDir();
  const id = createHash('sha256').update(`${name}-${type}-${Date.now()}`).digest('hex').slice(0, 16);
  const device: Device = {
    id, name, type, platform: 'unknown', arch: 'unknown',
    capabilities: caps, last_seen: new Date().toISOString(),
    sync_status: 'offline', asset_count: 0,
  };
  const devices = getDevices();
  devices.push(device);
  writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2));
  return device;
}

export function getDevices(): Device[] {
  ensureDir();
  if (!existsSync(DEVICES_FILE)) return [];
  return JSON.parse(readFileSync(DEVICES_FILE, 'utf-8'));
}

export function removeDevice(deviceId: string): boolean {
  const devices = getDevices();
  const filtered = devices.filter(d => d.id !== deviceId);
  if (filtered.length === devices.length) return false;
  writeFileSync(DEVICES_FILE, JSON.stringify(filtered, null, 2));
  return true;
}

/** Generate a sync manifest for a device */
export function generateSyncManifest(deviceId: string): SyncManifest {
  const assetsDir = join(homedir(), '.openskill', 'assets');
  const assets: SyncManifest['assets'] = [];

  for (const typeDir of ['skills', 'memories', 'preferences']) {
    const dir = join(assetsDir, typeDir);
    if (!existsSync(dir)) continue;
    for (const file of require('fs').readdirSync(dir).filter((f: string) => f.endsWith('.json'))) {
      const content = readFileSync(join(dir, file), 'utf-8');
      assets.push({
        id: file.replace('.json', ''),
        hash: createHash('sha256').update(content).digest('hex').slice(0, 16),
        type: typeDir.slice(0, -1),
        size: content.length,
      });
    }
  }

  return {
    device_id: deviceId,
    timestamp: new Date().toISOString(),
    assets,
    preferences_hash: createHash('sha256').update(JSON.stringify(assets.filter(a => a.type === 'preference'))).digest('hex').slice(0, 16),
  };
}

/** Get device sync status summary */
export function getSyncSummary(): { devices: number; online: number; total_assets: number; last_sync: string } {
  const devices = getDevices();
  return {
    devices: devices.length,
    online: devices.filter(d => d.sync_status === 'online').length,
    total_assets: devices.reduce((s, d) => s + d.asset_count, 0),
    last_sync: devices.length > 0 ? devices.sort((a, b) => b.last_seen.localeCompare(a.last_seen))[0].last_seen : 'never',
  };
}

/** Check if a skill is compatible with a device's capabilities */
export function isSkillCompatible(skillSize: number, deviceCaps: DeviceCapability[]): boolean {
  if (deviceCaps.includes('full-skills')) return true;
  if (deviceCaps.includes('lightweight-skills') && skillSize <= 5000) return true;
  return false;
}
