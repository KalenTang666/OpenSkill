/**
 * Skill Security Scanner
 * Detects: data exfiltration, prompt injection, unauthorized API calls,
 * suspicious patterns, and supply chain risks
 */
import type { WalletAsset } from '../core/types.js';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ScanFinding {
  rule: string;
  severity: SeverityLevel;
  description: string;
  line?: number;
  snippet?: string;
}

export interface ScanReport {
  asset_id: string;
  asset_name: string;
  scanned_at: string;
  findings: ScanFinding[];
  trust_score: number;
  passed: boolean;
}

const RULES: Array<{ id: string; severity: SeverityLevel; pattern: RegExp; desc: string }> = [
  { id: 'EXFIL-001', severity: 'critical', pattern: /fetch\s*\(|http\.request|axios\.|curl\s/i, desc: 'Network request — potential data exfiltration' },
  { id: 'EXFIL-002', severity: 'critical', pattern: /process\.env|API_KEY|SECRET|TOKEN|PASSWORD/i, desc: 'Secret/env variable access' },
  { id: 'EXFIL-003', severity: 'critical', pattern: /eval\s*\(|new Function\s*\(|exec\s*\(/i, desc: 'Dynamic code execution' },
  { id: 'INJECT-001', severity: 'high', pattern: /ignore\s+(previous|above|all)\s+instructions/i, desc: 'Prompt injection pattern' },
  { id: 'INJECT-002', severity: 'high', pattern: /you are now|act as if|pretend to be/i, desc: 'Role override injection' },
  { id: 'INJECT-003', severity: 'high', pattern: /system\s*:|<\|im_start\|>|<\|endoftext\|>/i, desc: 'System prompt manipulation' },
  { id: 'FS-001', severity: 'high', pattern: /rm\s+-rf|rmdir|unlink|deleteFile/i, desc: 'Destructive filesystem operation' },
  { id: 'FS-002', severity: 'high', pattern: /\/etc\/passwd|\/etc\/shadow|~\/\.ssh/i, desc: 'Sensitive system path access' },
  { id: 'FS-003', severity: 'high', pattern: /child_process|spawn\s*\(|execSync/i, desc: 'System command execution' },
  { id: 'SUS-001', severity: 'medium', pattern: /base64|btoa|atob/i, desc: 'Encoding/obfuscation detected' },
  { id: 'SUS-002', severity: 'medium', pattern: /localStorage|sessionStorage|cookie/i, desc: 'Browser storage access' },
  { id: 'SUS-003', severity: 'medium', pattern: /innerHTML\s*=|document\.write/i, desc: 'DOM manipulation (XSS risk)' },
  { id: 'BP-001', severity: 'low', pattern: /TODO|FIXME|HACK|XXX/i, desc: 'Unresolved code markers' },
  { id: 'BP-002', severity: 'low', pattern: /console\.(log|debug|trace)/i, desc: 'Debug logging in code' },
];

export function scanAsset(asset: WalletAsset): ScanReport {
  const findings: ScanFinding[] = [];
  const lines = asset.content.body.split('\n');
  for (const rule of RULES) {
    for (let i = 0; i < lines.length; i++) {
      if (rule.pattern.test(lines[i])) {
        findings.push({ rule: rule.id, severity: rule.severity, description: rule.desc, line: i + 1, snippet: lines[i].trim().slice(0, 100) });
      }
    }
  }
  const trust_score = calcTrust(asset, findings);
  return { asset_id: asset.id, asset_name: asset.name, scanned_at: new Date().toISOString(), findings, trust_score, passed: !findings.some(f => f.severity === 'critical' || f.severity === 'high') };
}

export function scanAll(assets: WalletAsset[]): ScanReport[] { return assets.map(scanAsset); }

function calcTrust(asset: WalletAsset, findings: ScanFinding[]): number {
  // Any critical finding = instant zero trust
  if (findings.some(f => f.severity === 'critical')) return 0;
  let s = 100;
  const ded: Record<SeverityLevel, number> = { critical: 100, high: 30, medium: 10, low: 3, info: 0 };
  for (const f of findings) s -= ded[f.severity];
  if (asset.author.signature) s += 5;
  if (asset.compatibility.length >= 3) s += 5;
  return Math.max(0, Math.min(100, s));
}

export function formatReport(r: ScanReport): string {
  const icon = r.passed ? '✅' : '❌';
  const hdr = `${icon} ${r.asset_name} — Trust: ${r.trust_score}/100\n`;
  if (!r.findings.length) return hdr + '  No issues found.\n';
  const si: Record<SeverityLevel, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: 'ℹ️' };
  return hdr + r.findings.map(f => `  ${si[f.severity]} [${f.rule}] ${f.description}${f.line ? ` (L${f.line})` : ''}`).join('\n') + '\n';
}
