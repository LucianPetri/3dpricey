/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SyncStatusBannerProps {
  pendingCount: number;
  conflictsCount: number;
  syncing: boolean;
  online: boolean;
  authenticated: boolean;
  lastSyncedAt?: string;
  onSync: () => void;
  onResolve: () => void;
}

export function SyncStatusBanner({
  pendingCount,
  conflictsCount,
  syncing,
  online,
  authenticated,
  lastSyncedAt,
  onSync,
  onResolve,
}: SyncStatusBannerProps) {
  if (pendingCount === 0 && conflictsCount === 0 && online && authenticated && !lastSyncedAt) {
    return null;
  }

  let title = 'Quotes are stored locally.';
  let description = 'Sync is standing by.';
  let toneClass = 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100';
  let Icon = CheckCircle2;

  if (conflictsCount > 0) {
    title = `${conflictsCount} sync conflict${conflictsCount === 1 ? '' : 's'} need resolution.`;
    description = 'Choose which values to keep before the queued quote changes can finish syncing.';
    toneClass = 'border-amber-500/20 bg-amber-500/10 text-amber-100';
    Icon = AlertTriangle;
  } else if (!online) {
    title = `${pendingCount} change${pendingCount === 1 ? '' : 's'} queued offline.`;
    description = 'They will stay in local storage until connectivity returns.';
    toneClass = 'border-slate-500/20 bg-slate-500/10 text-slate-100';
    Icon = CloudOff;
  } else if (!authenticated && pendingCount > 0) {
    title = `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting for login.`;
    description = 'Sign in to send the queued quotes to the backend.';
    toneClass = 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100';
    Icon = RefreshCw;
  } else if (syncing) {
    title = `Syncing ${pendingCount} queued change${pendingCount === 1 ? '' : 's'}...`;
    description = 'The newest local quotes and note edits are being reconciled with the backend.';
    toneClass = 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100';
    Icon = RefreshCw;
  } else if (pendingCount > 0) {
    title = `${pendingCount} change${pendingCount === 1 ? '' : 's'} ready to sync.`;
    description = 'You can sync now or leave the background sync loop to pick them up.';
    toneClass = 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100';
    Icon = RefreshCw;
  } else if (lastSyncedAt) {
    description = `Last synced ${new Date(lastSyncedAt).toLocaleString()}.`;
  }

  return (
    <div className={`rounded-xl border px-4 py-3 shadow-card ${toneClass}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-black/15 p-2">
            <Icon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs opacity-80">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {conflictsCount > 0 && (
            <Button variant="secondary" size="sm" onClick={onResolve}>
              Resolve conflicts
            </Button>
          )}
          <Button
            size="sm"
            onClick={onSync}
            disabled={syncing || pendingCount === 0 || !online || !authenticated}
          >
            {syncing ? 'Syncing...' : 'Sync now'}
          </Button>
        </div>
      </div>
    </div>
  );
}
