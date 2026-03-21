/**
 * OpenSkill Plugin System — Community adapter extensions
 *
 * Enables third-party platform adapters and custom modules.
 * Plugins are SKILL.md-compatible directories with a plugin.json manifest.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  type: 'adapter' | 'scanner' | 'hook' | 'theme' | 'command';
  entry: string;           // Relative path to main file
  enabled: boolean;
  installed_at: string;
  source?: string;         // GitHub URL or local path
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  type: Plugin['type'];
  entry: string;
  dependencies?: string[];
  platforms?: string[];
}

const PLUGINS_DIR = join(homedir(), '.openskill', 'plugins');
const REGISTRY_FILE = join(PLUGINS_DIR, 'registry.json');

function ensureDir(): void {
  if (!existsSync(PLUGINS_DIR)) mkdirSync(PLUGINS_DIR, { recursive: true });
}

/** Get all installed plugins */
export function getPlugins(): Plugin[] {
  ensureDir();
  if (!existsSync(REGISTRY_FILE)) return [];
  return JSON.parse(readFileSync(REGISTRY_FILE, 'utf-8'));
}

function savePlugins(plugins: Plugin[]): void {
  ensureDir();
  writeFileSync(REGISTRY_FILE, JSON.stringify(plugins, null, 2));
}

/** Install a plugin from a manifest */
export function installPlugin(manifest: PluginManifest, source?: string): Plugin {
  const plugins = getPlugins();
  const existing = plugins.findIndex(p => p.name === manifest.name);

  const plugin: Plugin = {
    id: `plugin-${manifest.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    type: manifest.type,
    entry: manifest.entry,
    enabled: true,
    installed_at: new Date().toISOString(),
    source,
  };

  // Create plugin directory
  const pluginDir = join(PLUGINS_DIR, plugin.id);
  if (!existsSync(pluginDir)) mkdirSync(pluginDir, { recursive: true });
  writeFileSync(join(pluginDir, 'plugin.json'), JSON.stringify(manifest, null, 2));

  if (existing >= 0) {
    plugins[existing] = plugin;
  } else {
    plugins.push(plugin);
  }
  savePlugins(plugins);
  return plugin;
}

/** Uninstall a plugin */
export function uninstallPlugin(pluginId: string): boolean {
  const plugins = getPlugins();
  const idx = plugins.findIndex(p => p.id === pluginId);
  if (idx < 0) return false;

  // Remove plugin directory
  const pluginDir = join(PLUGINS_DIR, pluginId);
  if (existsSync(pluginDir)) rmSync(pluginDir, { recursive: true });

  plugins.splice(idx, 1);
  savePlugins(plugins);
  return true;
}

/** Enable/disable a plugin */
export function togglePlugin(pluginId: string, enabled: boolean): boolean {
  const plugins = getPlugins();
  const plugin = plugins.find(p => p.id === pluginId);
  if (!plugin) return false;
  plugin.enabled = enabled;
  savePlugins(plugins);
  return true;
}

/** Get enabled plugins of a specific type */
export function getEnabledPlugins(type?: Plugin['type']): Plugin[] {
  return getPlugins().filter(p => p.enabled && (!type || p.type === type));
}

/** List available plugin types */
export function getPluginTypes(): Array<{ type: Plugin['type']; description: string }> {
  return [
    { type: 'adapter', description: 'Platform adapter (add support for new AI tools)' },
    { type: 'scanner', description: 'Security scanner rules (custom detection patterns)' },
    { type: 'hook', description: 'Hook handler (custom event actions)' },
    { type: 'theme', description: 'Desktop theme (custom UI appearance)' },
    { type: 'command', description: 'CLI command (custom os subcommand)' },
  ];
}
