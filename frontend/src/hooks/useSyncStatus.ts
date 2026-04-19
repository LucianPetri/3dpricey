/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useEffect, useState } from 'react';
import { syncService } from '@/lib/sync';

export function useSyncStatus() {
  const [state, setState] = useState(() => syncService.getState());

  useEffect(() => {
    return syncService.subscribe(setState);
  }, []);

  return {
    ...state,
    syncNow: () => syncService.sync(),
    openConflictResolver: () => syncService.openConflictResolver(),
    closeConflictResolver: () => syncService.closeConflictResolver(),
    resolveConflict: (transactionId: string, selections: Record<string, 'local' | 'server'>) =>
      syncService.resolveConflict(transactionId, selections),
    refreshSyncStatus: () => syncService.refreshServerStatus(),
  };
}
