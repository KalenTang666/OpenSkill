/**
 * OpenSkill Edge Adapter — Skill pruning & edge deployment
 *
 * Enables skill deployment to resource-constrained devices:
 * Raspberry Pi, NVIDIA Jetson, ESP32, wearables, industrial robots.
 * Prunes skills based on device capabilities and generates lightweight bundles.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

export interface DeviceProfile {
  id: string;
  name: string;
  type: 'rpi' | 'jetson' | 'esp32' | 'wearable' | 'server' | 'mobile' | 'custom';
  capabilities: {
    memory_mb: number;
    storage_mb: number;
    has_gpu: boolean;
    has_network: boolean;
    max_skill_size_kb: number;
    supported_formats: string[];
  };
  description: string;
}

export interface EdgeBundle {
  device_profile: string;
  skills: Array<{
    id: string;
    name: string;
    original_size_kb: number;
    pruned_size_kb: number;
    pruned: boolean;
  }>;
  total_size_kb: number;
  hash: string;
  created_at: string;
  offline_ready: boolean;
}

const EDGE_DIR = join(homedir(), '.openskill', 'edge');
const CACHE_DIR = join(EDGE_DIR, 'cache');
const PROFILES_FILE = join(EDGE_DIR, 'profiles.json');

function ensureDir(): void {
  [EDGE_DIR, CACHE_DIR].forEach(d => {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  });
}

/** Built-in device profiles */
export const BUILTIN_PROFILES: DeviceProfile[] = [
  {
    id: 'rpi-4', name: 'Raspberry Pi 4', type: 'rpi',
    capabilities: { memory_mb: 4096, storage_mb: 32768, has_gpu: false, has_network: true, max_skill_size_kb: 512, supported_formats: ['markdown', 'json', 'yaml'] },
    description: 'General-purpose edge computing, home automation, dev server'
  },
  {
    id: 'rpi-zero', name: 'Raspberry Pi Zero 2W', type: 'rpi',
    capabilities: { memory_mb: 512, storage_mb: 16384, has_gpu: false, has_network: true, max_skill_size_kb: 128, supported_formats: ['markdown', 'json'] },
    description: 'Ultra-lightweight edge node, sensor hub'
  },
  {
    id: 'jetson-nano', name: 'NVIDIA Jetson Nano', type: 'jetson',
    capabilities: { memory_mb: 4096, storage_mb: 65536, has_gpu: true, has_network: true, max_skill_size_kb: 2048, supported_formats: ['markdown', 'json', 'yaml', 'python'] },
    description: 'AI inference at the edge, computer vision, robotics'
  },
  {
    id: 'jetson-orin', name: 'NVIDIA Jetson Orin', type: 'jetson',
    capabilities: { memory_mb: 16384, storage_mb: 131072, has_gpu: true, has_network: true, max_skill_size_kb: 8192, supported_formats: ['markdown', 'json', 'yaml', 'python', 'onnx'] },
    description: 'High-performance edge AI, autonomous systems, industrial robots'
  },
  {
    id: 'esp32', name: 'ESP32 Microcontroller', type: 'esp32',
    capabilities: { memory_mb: 4, storage_mb: 16, has_gpu: false, has_network: true, max_skill_size_kb: 8, supported_formats: ['json'] },
    description: 'IoT sensors, smart home, minimal skill execution'
  },
  {
    id: 'wearable', name: 'Wearable Device', type: 'wearable',
    capabilities: { memory_mb: 256, storage_mb: 1024, has_gpu: false, has_network: true, max_skill_size_kb: 64, supported_formats: ['markdown', 'json'] },
    description: 'Smartwatch, AR glasses, voice-triggered skills'
  },
  {
    id: 'server', name: 'Edge Server', type: 'server',
    capabilities: { memory_mb: 65536, storage_mb: 1048576, has_gpu: true, has_network: true, max_skill_size_kb: 65536, supported_formats: ['markdown', 'json', 'yaml', 'python', 'onnx', 'docker'] },
    description: 'Full-capability edge server, factory floor, data center edge'
  },
  {
    id: 'ai-glasses', name: 'AI Smart Glasses', type: 'wearable',
    capabilities: { memory_mb: 512, storage_mb: 2048, has_gpu: false, has_network: true, max_skill_size_kb: 32, supported_formats: ['markdown', 'json'] },
    description: 'Meta Ray-Ban, Apple Glasses, Samsung — voice-triggered, camera context'
  },
  {
    id: 'ai-pendant', name: 'AI Pendant/Pin', type: 'wearable',
    capabilities: { memory_mb: 128, storage_mb: 512, has_gpu: false, has_network: true, max_skill_size_kb: 16, supported_formats: ['json'] },
    description: 'Apple AI Pin, Plaud NotePin — transcription, voice, minimal context'
  },
  {
    id: 'smartwatch-ai', name: 'AI Smartwatch', type: 'wearable',
    capabilities: { memory_mb: 1024, storage_mb: 4096, has_gpu: false, has_network: true, max_skill_size_kb: 64, supported_formats: ['markdown', 'json'] },
    description: 'Meta Malibu 2, Apple Watch AI — health, gesture, assistant relay'
  },
  {
    id: 'robot-ros2', name: 'ROS2 Robot', type: 'custom',
    capabilities: { memory_mb: 8192, storage_mb: 65536, has_gpu: true, has_network: true, max_skill_size_kb: 4096, supported_formats: ['markdown', 'json', 'yaml', 'python'] },
    description: 'ROSA-compatible ROS2 robot, cobots, AMRs — real-time skills via rosbridge'
  },
];

/** Get all profiles (built-in + custom) */
export function getProfiles(): DeviceProfile[] {
  ensureDir();
  const customs: DeviceProfile[] = existsSync(PROFILES_FILE)
    ? JSON.parse(readFileSync(PROFILES_FILE, 'utf-8'))
    : [];
  return [...BUILTIN_PROFILES, ...customs];
}

/** Add custom device profile */
export function addProfile(profile: DeviceProfile): void {
  ensureDir();
  const customs: DeviceProfile[] = existsSync(PROFILES_FILE)
    ? JSON.parse(readFileSync(PROFILES_FILE, 'utf-8'))
    : [];
  customs.push(profile);
  writeFileSync(PROFILES_FILE, JSON.stringify(customs, null, 2));
}

/** Prune a skill for a target device */
export function pruneSkill(skillContent: string, profile: DeviceProfile): { pruned: string; removed: string[] } {
  const maxKb = profile.capabilities.max_skill_size_kb;
  const maxBytes = maxKb * 1024;
  const removed: string[] = [];

  let pruned = skillContent;

  // Remove code blocks for unsupported formats
  const supportedFormats = profile.capabilities.supported_formats;
  const codeBlockRegex = /```(\w+)\n[\s\S]*?```/g;
  pruned = pruned.replace(codeBlockRegex, (match, lang) => {
    if (!supportedFormats.includes(lang) && !['bash', 'sh', 'text'].includes(lang)) {
      removed.push(`Code block: ${lang}`);
      return `<!-- Pruned: ${lang} code block (unsupported on ${profile.name}) -->`;
    }
    return match;
  });

  // Remove GPU-specific sections if no GPU
  if (!profile.capabilities.has_gpu) {
    pruned = pruned.replace(/#{1,3}\s.*(?:GPU|CUDA|TensorRT|ONNX).*\n[\s\S]*?(?=#{1,3}\s|\n$)/gi, (match) => {
      removed.push('GPU-specific section');
      return '';
    });
  }

  // Truncate if still too large
  if (Buffer.byteLength(pruned, 'utf-8') > maxBytes) {
    const lines = pruned.split('\n');
    let size = 0;
    let cutoff = lines.length;
    for (let i = 0; i < lines.length; i++) {
      size += Buffer.byteLength(lines[i] + '\n', 'utf-8');
      if (size > maxBytes * 0.9) { cutoff = i; break; }
    }
    pruned = lines.slice(0, cutoff).join('\n') + `\n\n<!-- Truncated for ${profile.name} (${maxKb}KB limit) -->`;
    removed.push(`Truncated from line ${cutoff}`);
  }

  return { pruned, removed };
}

/** Generate edge deployment bundle */
export function generateEdgeBundle(skills: Array<{ id: string; name: string; content: string }>, profileId: string): EdgeBundle {
  const profiles = getProfiles();
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) throw new Error(`Unknown profile: ${profileId}. Use: ${profiles.map(p => p.id).join(', ')}`);

  const bundledSkills = skills.map(skill => {
    const originalSize = Math.round(Buffer.byteLength(skill.content, 'utf-8') / 1024);
    const { pruned } = pruneSkill(skill.content, profile);
    const prunedSize = Math.round(Buffer.byteLength(pruned, 'utf-8') / 1024);
    return {
      id: skill.id,
      name: skill.name,
      original_size_kb: originalSize,
      pruned_size_kb: prunedSize,
      pruned: prunedSize < originalSize,
    };
  });

  const totalSize = bundledSkills.reduce((s, sk) => s + sk.pruned_size_kb, 0);
  const hash = createHash('sha256').update(JSON.stringify(bundledSkills)).digest('hex').slice(0, 16);

  return {
    device_profile: profileId,
    skills: bundledSkills,
    total_size_kb: totalSize,
    hash,
    created_at: new Date().toISOString(),
    offline_ready: true,
  };
}

/** Cache skills for offline use */
export function cacheForOffline(skillId: string, content: string): string {
  ensureDir();
  const path = join(CACHE_DIR, `${skillId}.json`);
  const cached = {
    id: skillId,
    content,
    cached_at: new Date().toISOString(),
    hash: createHash('sha256').update(content).digest('hex'),
  };
  writeFileSync(path, JSON.stringify(cached));
  return path;
}

/** Get cached skills count */
export function getCacheStats(): { count: number; total_size_kb: number } {
  ensureDir();
  if (!existsSync(CACHE_DIR)) return { count: 0, total_size_kb: 0 };
  const files = readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
  let totalSize = 0;
  for (const f of files) {
    const stat = readFileSync(join(CACHE_DIR, f));
    totalSize += stat.length;
  }
  return { count: files.length, total_size_kb: Math.round(totalSize / 1024) };
}
