/*
 * 3DPricey Frontend
 * Copyright (C) 2025 Printel
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Background Sync Service
 * 
 * Syncs local changes to the server in the background
 * Runs every 5 minutes or when online event is triggered
 */

import { quotesAPI } from './api';

interface PendingChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: 'quote' | 'material' | 'machine';
  data: any;
  timestamp: number;
}

const STORAGE_KEY = 'pending_sync_changes';
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

let syncIntervalId: NodeJS.Timeout | null = null;

export class SyncService {
  private static instance: SyncService;

  private constructor() {
    // Start periodic sync
    this.startPeriodicSync();
    
    // Listen for online event
    window.addEventListener('online', () => {
      console.log('🌐 Back online, attempting sync...');
      this.sync();
    });
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private getPendingChanges(): PendingChange[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private savePendingChanges(changes: PendingChange[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(changes));
  }

  addPendingChange(change: Omit<PendingChange, 'timestamp'>) {
    const changes = this.getPendingChanges();
    changes.push({
      ...change,
      timestamp: Date.now(),
    });
    this.savePendingChanges(changes);
    
    console.log('📝 Added pending change:', change.type, change.resource);
  }

  async sync(): Promise<boolean> {
    if (!navigator.onLine) {
      console.log('⚠️ Offline, skipping sync');
      return false;
    }

    const changes = this.getPendingChanges();
    
    if (changes.length === 0) {
      console.log('✅ No pending changes to sync');
      return true;
    }

    console.log(`🔄 Syncing ${changes.length} pending changes...`);

    const failed: PendingChange[] = [];

    for (const change of changes) {
      try {
        await this.syncOne(change);
        console.log('✅ Synced:', change.type, change.resource, change.id);
      } catch (error: any) {
        console.error('❌ Sync failed:', change, error);
        
        // Check if it's a conflict (409)
        if (error.status === 409) {
          // TODO: Show conflict resolution modal
          console.log('⚠️ Conflict detected, needs resolution');
        }
        
        failed.push(change);
      }
    }

    // Update pending changes (keep failed ones)
    this.savePendingChanges(failed);

    if (failed.length === 0) {
      console.log('✅ All changes synced successfully');
      return true;
    } else {
      console.log(`⚠️ ${failed.length} changes failed to sync`);
      return false;
    }
  }

  private async syncOne(change: PendingChange) {
    switch (change.resource) {
      case 'quote':
        if (change.type === 'create') {
          await quotesAPI.createQuote(change.data);
        } else if (change.type === 'update') {
          await quotesAPI.updateQuote(change.id, change.data);
        } else if (change.type === 'delete') {
          await quotesAPI.deleteQuote(change.id);
        }
        break;
      
      // TODO: Add material and machine sync
      default:
        console.warn('Unknown resource type:', change.resource);
    }
  }

  startPeriodicSync() {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
    }

    syncIntervalId = setInterval(() => {
      this.sync();
    }, SYNC_INTERVAL);

    console.log('🔄 Background sync started (interval: 5 minutes)');
  }

  stopPeriodicSync() {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
      console.log('⏸️ Background sync stopped');
    }
  }

  hasPendingChanges(): boolean {
    return this.getPendingChanges().length > 0;
  }

  getPendingCount(): number {
    return this.getPendingChanges().length;
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
