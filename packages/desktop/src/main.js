/**
 * OpenSkill Desktop — Electron Main Process
 * macOS-native desktop client for AI data asset management
 */
const { app, BrowserWindow, ipcMain, Menu, shell, dialog, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const WALLET_DIR = path.join(os.homedir(), '.openskill');
const ASSETS_DIR = path.join(WALLET_DIR, 'assets');

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0f0f23',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer.html'));

  const template = [
    {
      label: 'OpenSkill',
      submenu: [
        { label: 'About OpenSkill', click: () => showAbout() },
        { type: 'separator' },
        { label: 'Preferences...', accelerator: 'Cmd+,', click: () => mainWindow.webContents.send('navigate', 'settings') },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        { label: 'Discover Assets', accelerator: 'Cmd+D', click: () => mainWindow.webContents.send('action', 'discover') },
        { label: 'Import...', accelerator: 'Cmd+I', click: () => mainWindow.webContents.send('action', 'import') },
        { label: 'Backup Wallet...', accelerator: 'Cmd+B', click: () => handleBackup() },
        { label: 'Restore from Backup...', click: () => handleRestore() },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    {
      label: 'Help',
      submenu: [
        { label: 'Documentation', click: () => shell.openExternal('https://github.com/KalenTang666/OpenSkill') },
        { label: 'Discord Community', click: () => shell.openExternal('https://discord.gg/MKdGbqwWsT') },
        { label: 'Report Issue', click: () => shell.openExternal('https://github.com/KalenTang666/OpenSkill/issues') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC Handlers ──────────────────────────────

ipcMain.handle('wallet:init', async () => {
  const dirs = [WALLET_DIR, ASSETS_DIR, ASSETS_DIR + '/skills', ASSETS_DIR + '/memories', ASSETS_DIR + '/preferences',
    WALLET_DIR + '/growth', WALLET_DIR + '/hooks', WALLET_DIR + '/devices', WALLET_DIR + '/usage',
    WALLET_DIR + '/audit', WALLET_DIR + '/commerce', WALLET_DIR + '/teams',
    WALLET_DIR + '/marketplace', WALLET_DIR + '/registry/local', WALLET_DIR + '/keys'];
  dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

  const configPath = path.join(WALLET_DIR, 'config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
      schema_version: '0.8.0', user: { id: os.userInfo().username, name: os.userInfo().username },
      adapters: {}, defaults: { sync_strategy: 'manual', conflict_resolution: 'user-decides' }, teams: [],
    }, null, 2));
  }
  return { success: true, path: WALLET_DIR };
});

ipcMain.handle('wallet:list', async () => {
  const assets = [];
  for (const typeDir of ['skills', 'memories', 'preferences']) {
    const dir = path.join(ASSETS_DIR, typeDir);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      try { assets.push(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))); } catch {}
    }
  }
  return assets;
});

ipcMain.handle('wallet:stats', async () => {
  let skills = 0, memories = 0, preferences = 0;
  for (const [type, dir] of [['skill', 'skills'], ['memory', 'memories'], ['preference', 'preferences']]) {
    const d = path.join(ASSETS_DIR, dir);
    if (fs.existsSync(d)) {
      const count = fs.readdirSync(d).filter(f => f.endsWith('.json')).length;
      if (type === 'skill') skills = count;
      else if (type === 'memory') memories = count;
      else preferences = count;
    }
  }
  return { skills, memories, preferences, total: skills + memories + preferences };
});

ipcMain.handle('wallet:discover', async () => {
  const targets = [
    { platform: 'claude', path: path.join(os.homedir(), 'CLAUDE.md'), type: 'preference' },
    { platform: 'claude', path: path.join(os.homedir(), '.claude', 'memory.json'), type: 'memory' },
    { platform: 'cursor', path: path.join(process.cwd(), '.cursorrules'), type: 'preference' },
    { platform: 'codex', path: path.join(os.homedir(), '.codex', 'skills'), type: 'skill', isDir: true },
    { platform: 'gemini', path: path.join(os.homedir(), '.gemini', 'settings.json'), type: 'config' },
    { platform: 'copilot', path: path.join(process.cwd(), '.github', 'copilot-instructions.md'), type: 'preference' },
    { platform: 'windsurf', path: path.join(process.cwd(), '.windsurfrules'), type: 'preference' },
  ];
  const found = [];
  for (const t of targets) {
    if (fs.existsSync(t.path)) {
      const stat = fs.statSync(t.path);
      found.push({ ...t, size: stat.size, modified: stat.mtime.toISOString() });
    }
  }
  return { platforms: [...new Set(found.map(f => f.platform))], assets: found, total: found.length };
});

ipcMain.handle('wallet:scan', async (_, assetId) => {
  const rules = [
    { id: 'EXFIL-001', severity: 'critical', pattern: 'eval\\s*\\(', desc: 'Dynamic code execution' },
    { id: 'EXFIL-002', severity: 'critical', pattern: 'process\\.env', desc: 'Secret access' },
    { id: 'INJECT-001', severity: 'high', pattern: 'ignore\\s+(previous|above)', desc: 'Prompt injection' },
    { id: 'FS-001', severity: 'high', pattern: 'rm\\s+-rf', desc: 'Destructive operation' },
  ];
  const assets = [];
  for (const d of ['skills', 'memories', 'preferences']) {
    const dir = path.join(ASSETS_DIR, d);
    if (fs.existsSync(dir)) fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(f => assets.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))));
  }
  const target = assetId ? assets.filter(a => a.id === assetId) : assets;
  const results = target.map(asset => {
    const findings = [];
    for (const rule of rules) {
      if (new RegExp(rule.pattern, 'i').test(asset.content?.body || '')) findings.push(rule);
    }
    return { id: asset.id, name: asset.name, passed: findings.length === 0, findings, trust: Math.max(0, 100 - findings.reduce((s, f) => s + (f.severity === 'critical' ? 40 : 20), 0)) };
  });
  return results;
});

ipcMain.handle('wallet:profile', async () => {
  const profilePath = path.join(WALLET_DIR, 'growth', 'profile.json');
  if (!fs.existsSync(profilePath)) {
    const profile = { xp: 0, level: 0, rank: 'newcomer', achievements: [], streak: { current: 0, longest: 0, last_active: '' }, history: [], created_at: new Date().toISOString() };
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
    return profile;
  }
  return JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
});

ipcMain.handle('wallet:health', async () => {
  const platforms = ['claude', 'cursor', 'codex', 'gemini', 'copilot', 'windsurf', 'vscode', 'openclaw'];
  const detected = [];
  const checks = {
    claude: path.join(os.homedir(), 'CLAUDE.md'),
    cursor: '.cursorrules',
    codex: path.join(os.homedir(), '.codex'),
    gemini: path.join(os.homedir(), '.gemini'),
    copilot: path.join('.github', 'copilot-instructions.md'),
    windsurf: '.windsurfrules',
    vscode: path.join('.vscode', 'settings.json'),
    openclaw: path.join(os.homedir(), '.openclaw'),
  };
  for (const [p, c] of Object.entries(checks)) {
    if (fs.existsSync(c)) detected.push(p);
  }
  return { platforms, detected, score: Math.round((detected.length / platforms.length) * 100) };
});

// ─── File operations ───────────────────────────

async function handleBackup() {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup OpenSkill',
    defaultPath: `openskill-backup-${new Date().toISOString().slice(0, 10)}.osp`,
    filters: [{ name: 'OSP Backup', extensions: ['twp'] }],
  });
  if (!result.canceled && result.filePath) {
    const assets = [];
    for (const d of ['skills', 'memories', 'preferences']) {
      const dir = path.join(ASSETS_DIR, d);
      if (fs.existsSync(dir)) fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(f => {
        try { assets.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))); } catch {}
      });
    }
    const bundle = { version: '1.0', created_at: new Date().toISOString(), wallet_version: '0.8.0', assets: assets.length, data: assets };
    fs.writeFileSync(result.filePath, JSON.stringify(bundle, null, 2));
    mainWindow.webContents.send('notification', { type: 'success', message: `Backup saved: ${path.basename(result.filePath)}` });
  }
}

async function handleRestore() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore OpenSkill',
    filters: [{ name: 'OSP Backup', extensions: ['twp'] }],
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths.length) {
    try {
      const bundle = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
      let restored = 0;
      for (const asset of bundle.data || []) {
        const typeDir = { skill: 'skills', memory: 'memories', preference: 'preferences' }[asset.type] || 'preferences';
        const dir = path.join(ASSETS_DIR, typeDir);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${asset.id}.json`), JSON.stringify(asset, null, 2));
        restored++;
      }
      mainWindow.webContents.send('notification', { type: 'success', message: `Restored ${restored} assets` });
    } catch (e) {
      mainWindow.webContents.send('notification', { type: 'error', message: `Restore failed: ${e.message}` });
    }
  }
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'OpenSkill',
    message: 'OpenSkill v0.8.0',
    detail: 'One Skill. All Your AI.\n一个技能管理器，所有 AI\n\nOpen Standard for AI Skill Portability\nhttps://github.com/KalenTang666/OpenSkill',
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ─── v1.1.0 IPC Handlers ──────────────────────

ipcMain.handle('wallet:hooks', async () => {
  const hooksDir = path.join(WALLET_DIR, 'hooks');
  const hooksFile = path.join(hooksDir, 'hooks.json');
  if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });
  if (!fs.existsSync(hooksFile)) return [];
  return JSON.parse(fs.readFileSync(hooksFile, 'utf-8'));
});

ipcMain.handle('wallet:devices', async () => {
  const devicesFile = path.join(WALLET_DIR, 'devices', 'registry.json');
  if (!fs.existsSync(devicesFile)) {
    const id = crypto.createHash('sha256').update(os.hostname() + os.platform()).digest('hex').slice(0, 16);
    const device = { id, name: os.hostname(), type: 'desktop', platform: os.platform(), sync_status: 'online', capabilities: ['full-skills', 'memory-sync', 'display'] };
    const dir = path.join(WALLET_DIR, 'devices');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(devicesFile, JSON.stringify([device], null, 2));
    return [device];
  }
  return JSON.parse(fs.readFileSync(devicesFile, 'utf-8'));
});

ipcMain.handle('wallet:smartMatch', async (_, task) => {
  const keywords = (task || '').toLowerCase().split(/\s+/);
  const catalog = [
    { id: 'docx', name: 'Document Builder', tags: ['docs', 'word', 'pdf'], score: 0 },
    { id: 'react', name: 'React Component Builder', tags: ['react', 'frontend', 'ui'], score: 0 },
    { id: 'security', name: 'Security Scanner', tags: ['security', 'audit', 'scan'], score: 0 },
    { id: 'expo', name: 'Expo Mobile Dev', tags: ['expo', 'mobile', 'react native'], score: 0 },
    { id: 'api', name: 'API Design', tags: ['api', 'rest', 'graphql'], score: 0 },
    { id: 'cicd', name: 'CI/CD Pipeline', tags: ['ci', 'cd', 'deploy', 'docker'], score: 0 },
    { id: 'rag', name: 'RAG Knowledge Base', tags: ['rag', 'knowledge', 'retrieval'], score: 0 },
    { id: 'pptx', name: 'Presentation Creator', tags: ['slides', 'pptx', 'deck'], score: 0 },
  ];
  for (const skill of catalog) {
    for (const kw of keywords) {
      if (kw.length < 2) continue;
      if (skill.name.toLowerCase().includes(kw) || skill.tags.some(t => t.includes(kw))) skill.score += 25;
    }
  }
  return catalog.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
});
