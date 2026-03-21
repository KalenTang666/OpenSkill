/**
 * OpenSkill Desktop — Preload Script (Secure Bridge)
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('openSkill', {
  init: () => ipcRenderer.invoke('wallet:init'),
  list: () => ipcRenderer.invoke('wallet:list'),
  stats: () => ipcRenderer.invoke('wallet:stats'),
  discover: () => ipcRenderer.invoke('wallet:discover'),
  scan: (id) => ipcRenderer.invoke('wallet:scan', id),
  profile: () => ipcRenderer.invoke('wallet:profile'),
  health: () => ipcRenderer.invoke('wallet:health'),
  hooks: () => ipcRenderer.invoke('wallet:hooks'),
  devices: () => ipcRenderer.invoke('wallet:devices'),
  smartMatch: (task) => ipcRenderer.invoke('wallet:smartMatch', task),
  onAction: (callback) => ipcRenderer.on('action', (_, action) => callback(action)),
  onNavigate: (callback) => ipcRenderer.on('navigate', (_, page) => callback(page)),
  onNotification: (callback) => ipcRenderer.on('notification', (_, data) => callback(data)),
});
