/**
 * Sandboxed Import Validator — validates assets in isolation before wallet entry
 */
import type { WalletAsset } from '../core/types.js';
import { scanAsset, type ScanReport } from './scanner.js';

export interface ValidationResult {
  asset_id: string;
  status: 'approved' | 'quarantined' | 'rejected';
  scan: ScanReport;
  reason?: string;
}

export function validateInSandbox(asset: WalletAsset): ValidationResult {
  const scan = scanAsset(asset);
  let status: ValidationResult['status'];
  let reason: string | undefined;

  if (scan.findings.some(f => f.severity === 'critical')) {
    status = 'rejected';
    reason = `Critical: ${scan.findings.find(f => f.severity === 'critical')?.description}`;
  } else if (scan.findings.some(f => f.severity === 'high')) {
    status = 'quarantined';
    reason = `Review needed: ${scan.findings.find(f => f.severity === 'high')?.description}`;
  } else {
    status = 'approved';
  }

  return { asset_id: asset.id, status, scan, reason };
}

export function validateBatch(assets: WalletAsset[]): ValidationResult[] {
  return assets.map(validateInSandbox);
}
