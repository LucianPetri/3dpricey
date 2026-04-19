/*
 * 3DPricey Frontend
 * Copyright (C) 2025 Printel
 */
import {
  ApiError,
  syncAPI,
  SyncBatchResponse,
  SyncChangeDto,
  SyncResolution,
} from './api';
import * as sessionStore from './core/sessionStorage';
import { QuoteData, QuoteSyncConflict } from '@/types/quote';

const PENDING_CHANGES_KEY = 'pending_sync_changes';
const CONFLICTS_KEY = 'pending_sync_conflicts';
const LAST_SYNCED_AT_KEY = 'pending_sync_last_synced_at';
const SYNC_INTERVAL = 5 * 60 * 1000;

export type PendingSyncChange = SyncChangeDto;

export interface SyncState {
  pendingCount: number;
  conflicts: QuoteSyncConflict[];
  lastSyncedAt?: string;
  syncing: boolean;
  online: boolean;
  authenticated: boolean;
  conflictModalOpen: boolean;
  serverPendingCount: number;
  serverConflictedCount: number;
  lastError?: string;
}

type SyncListener = (state: SyncState) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getCurrentOnlineState() {
  return typeof window === 'undefined' ? true : window.navigator.onLine;
}

function dedupeConflicts(conflicts: QuoteSyncConflict[]) {
  return conflicts.filter((conflict, index, current) => current.findIndex(item => item.transactionId === conflict.transactionId) === index);
}

export class SyncService {
  private static instance: SyncService;
  private readonly listeners = new Set<SyncListener>();
  private syncIntervalId: number | null = null;
  private state: SyncState;

  private readonly handleOnline = () => {
    this.state.online = true;
    this.emit();
    void this.sync();
  };

  private readonly handleOffline = () => {
    this.state.online = false;
    this.emit();
  };

  private readonly handleStorage = (event: StorageEvent) => {
    if ([PENDING_CHANGES_KEY, CONFLICTS_KEY, LAST_SYNCED_AT_KEY].includes(event.key || '')) {
      this.emit();
    }
  };

  private constructor() {
    const conflicts = this.getConflicts();
    this.state = {
      pendingCount: this.getPendingChanges().length,
      conflicts,
      lastSyncedAt: this.getLastSyncedAt(),
      syncing: false,
      online: getCurrentOnlineState(),
      authenticated: this.isAuthenticated(),
      conflictModalOpen: conflicts.length > 0,
      serverPendingCount: 0,
      serverConflictedCount: conflicts.length,
      lastError: undefined,
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      window.addEventListener('storage', this.handleStorage);
      this.startPeriodicSync();
      if (this.state.authenticated) {
        void this.refreshServerStatus();
      }
    }
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }

    return SyncService.instance;
  }

  subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): SyncState {
    return {
      ...this.state,
      conflicts: [...this.state.conflicts],
    };
  }

  hasPendingChanges() {
    return this.getPendingChanges().length > 0;
  }

  getPendingCount() {
    return this.getPendingChanges().length;
  }

  openConflictResolver() {
    if (this.getConflicts().length === 0) {
      return;
    }

    this.state.conflictModalOpen = true;
    this.emit();
  }

  closeConflictResolver() {
    this.state.conflictModalOpen = false;
    this.emit();
  }

  queueQuoteCreate(quote: QuoteData) {
    if (!quote.id) {
      return;
    }

    sessionStore.updateQuote(quote.id, {
      syncStatus: 'PENDING_SYNC',
      pendingSyncAction: 'create',
      syncError: undefined,
      conflictTransactionId: undefined,
    });

    this.upsertPendingChange({
      id: quote.id,
      type: 'create',
      resource: 'quote',
      data: this.serializeQuote(quote),
      timestamp: Date.now(),
      baseVersion: null,
    });
  }

  queueQuoteUpdate(quote: QuoteData, baseVersion?: string) {
    if (!quote.id) {
      return;
    }

    const action = quote.syncStatus === 'LEGACY_LOCAL' || quote.pendingSyncAction === 'create' || !baseVersion
      ? 'create'
      : 'update';

    sessionStore.updateQuote(quote.id, {
      syncStatus: 'PENDING_SYNC',
      pendingSyncAction: action,
      syncError: undefined,
      conflictTransactionId: undefined,
    });

    this.upsertPendingChange({
      id: quote.id,
      type: action,
      resource: 'quote',
      data: this.serializeQuote({ ...quote, pendingSyncAction: action, syncStatus: 'PENDING_SYNC' }),
      timestamp: Date.now(),
      baseVersion: action === 'update' ? baseVersion ?? null : null,
    });
  }

  queueQuoteDelete(quote: QuoteData, baseVersion?: string) {
    if (!quote.id) {
      return;
    }

    if (quote.syncStatus === 'LEGACY_LOCAL' && !quote.lastServerUpdatedAt) {
      this.discardPendingChange(quote.id);
      return;
    }

    this.upsertPendingChange({
      id: quote.id,
      type: 'delete',
      resource: 'quote',
      data: this.serializeQuote(quote),
      timestamp: Date.now(),
      baseVersion: baseVersion ?? quote.lastServerUpdatedAt ?? quote.updatedAt ?? null,
    });
  }

  discardPendingChange(id: string) {
    this.savePendingChanges(this.getPendingChanges().filter(change => change.id !== id));
    this.emit();
  }

  async sync(): Promise<boolean> {
    const changes = this.getPendingChanges();

    if (changes.length === 0) {
      await this.refreshServerStatus();
      return true;
    }

    if (!getCurrentOnlineState()) {
      this.state.lastError = 'Offline changes are stored locally until connectivity returns.';
      this.emit();
      return false;
    }

    if (!this.isAuthenticated()) {
      this.state.lastError = 'Pending changes will sync after you log in.';
      this.emit();
      return false;
    }

    this.state.syncing = true;
    this.state.lastError = undefined;
    this.emit();

    try {
      const result = await syncAPI.syncChanges(changes);
      this.applySyncResult(result, changes);
      await this.refreshServerStatus();
      return result.failed.length === 0;
    } catch (error) {
      const apiError = error as ApiError;
      this.state.lastError = apiError.message || 'Sync failed';
      this.emit();
      return false;
    } finally {
      this.state.syncing = false;
      this.emit();
    }
  }

  async resolveConflict(transactionId: string, selections: Record<string, 'local' | 'server'>) {
    const conflict = this.getConflicts().find(item => item.transactionId === transactionId);
    if (!conflict) {
      return;
    }

    const resolution = this.getResolutionStrategy(conflict, selections);
    const mergedValue = resolution === 'merged' ? this.buildMergedValue(conflict, selections) : undefined;
    const result = await syncAPI.resolveConflict({ transactionId, resolution, mergedValue });

    this.saveConflicts(this.getConflicts().filter(item => item.transactionId !== transactionId));

    if (result.quote) {
      sessionStore.replaceQuoteFromRemote(this.mapApiQuote(result.quote));
    } else {
      sessionStore.deleteQuote(conflict.resourceId);
    }

    if (this.getConflicts().length === 0) {
      this.state.conflictModalOpen = false;
    }

    this.setLastSyncedAt(new Date().toISOString());
    await this.refreshServerStatus();
    this.emit();
  }

  async refreshServerStatus() {
    if (!this.isAuthenticated()) {
      this.state.serverPendingCount = 0;
      this.state.serverConflictedCount = this.getConflicts().length;
      this.emit();
      return;
    }

    try {
      const status = await syncAPI.getStatus();
      this.state.serverPendingCount = status.pendingCount;
      this.state.serverConflictedCount = Math.max(status.conflictedCount, this.getConflicts().length);
      if (status.lastSyncedAt) {
        this.setLastSyncedAt(status.lastSyncedAt);
      }
    } catch {
      this.state.serverConflictedCount = this.getConflicts().length;
    }

    this.emit();
  }

  startPeriodicSync() {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.syncIntervalId) {
      window.clearInterval(this.syncIntervalId);
    }

    this.syncIntervalId = window.setInterval(() => {
      void this.sync();
    }, SYNC_INTERVAL);
  }

  stopPeriodicSync() {
    if (typeof window === 'undefined' || !this.syncIntervalId) {
      return;
    }

    window.clearInterval(this.syncIntervalId);
    this.syncIntervalId = null;
  }

  private emit() {
    this.state.pendingCount = this.getPendingChanges().length;
    this.state.conflicts = this.getConflicts();
    this.state.online = getCurrentOnlineState();
    this.state.authenticated = this.isAuthenticated();
    this.state.lastSyncedAt = this.getLastSyncedAt();
    this.state.serverConflictedCount = Math.max(this.state.serverConflictedCount, this.state.conflicts.length);

    const snapshot = this.getState();
    this.listeners.forEach(listener => listener(snapshot));
  }

  private isAuthenticated() {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('auth_token'));
  }

  private getPendingChanges(): PendingSyncChange[] {
    if (typeof window === 'undefined') {
      return [];
    }

    const stored = localStorage.getItem(PENDING_CHANGES_KEY);
    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private savePendingChanges(changes: PendingSyncChange[]) {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));
  }

  private getConflicts(): QuoteSyncConflict[] {
    if (typeof window === 'undefined') {
      return [];
    }

    const stored = localStorage.getItem(CONFLICTS_KEY);
    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveConflicts(conflicts: QuoteSyncConflict[]) {
    localStorage.setItem(CONFLICTS_KEY, JSON.stringify(dedupeConflicts(conflicts)));
  }

  private getLastSyncedAt() {
    if (typeof window === 'undefined') {
      return undefined;
    }

    return localStorage.getItem(LAST_SYNCED_AT_KEY) || undefined;
  }

  private setLastSyncedAt(lastSyncedAt?: string) {
    if (!lastSyncedAt) {
      return;
    }

    localStorage.setItem(LAST_SYNCED_AT_KEY, lastSyncedAt);
  }

  private serializeQuote(quote: QuoteData): Record<string, unknown> {
    const {
      syncStatus,
      pendingSyncAction,
      lastSyncedAt,
      lastServerUpdatedAt,
      syncError,
      conflictTransactionId,
      ...rest
    } = quote;

    return rest as Record<string, unknown>;
  }

  private upsertPendingChange(change: PendingSyncChange) {
    const changes = this.getPendingChanges();
    const existingIndex = changes.findIndex(item => item.id === change.id && item.resource === change.resource);

    if (existingIndex === -1) {
      this.savePendingChanges([...changes, change]);
      this.emit();
      if (this.isAuthenticated() && getCurrentOnlineState()) {
        void this.sync();
      }
      return;
    }

    const existing = changes[existingIndex];

    if (existing.type === 'create' && change.type === 'update') {
      changes[existingIndex] = {
        ...existing,
        data: change.data,
        timestamp: change.timestamp,
      };
    } else if (existing.type === 'create' && change.type === 'delete') {
      changes.splice(existingIndex, 1);
    } else if (existing.type === 'update' && change.type === 'delete') {
      changes[existingIndex] = {
        ...change,
        baseVersion: existing.baseVersion ?? change.baseVersion,
      };
    } else {
      changes[existingIndex] = {
        ...existing,
        ...change,
      };
    }

    this.savePendingChanges(changes);
    this.emit();
    if (this.isAuthenticated() && getCurrentOnlineState()) {
      void this.sync();
    }
  }

  private applySyncResult(result: SyncBatchResponse, submittedChanges: PendingSyncChange[]) {
    const conflictedChangeIds = new Set(result.conflicts.map(conflict => conflict.changeId));
    const appliedChangeIds = new Set(result.appliedChanges);

    this.savePendingChanges(
      submittedChanges.filter(change => !appliedChangeIds.has(change.id) && !conflictedChangeIds.has(change.id))
    );

    result.records.forEach((record) => {
      if (record.resourceType !== 'quote') {
        return;
      }

      if (record.record) {
        sessionStore.replaceQuoteFromRemote(this.mapApiQuote(record.record));
      }
    });

    if (result.conflicts.length > 0) {
      this.saveConflicts([...this.getConflicts(), ...result.conflicts]);
      result.conflicts.forEach((conflict) => {
        this.restoreConflictQuote(conflict);
      });
      this.state.conflictModalOpen = true;
    }

    if (result.failed.length > 0) {
      result.failed.forEach((failure) => {
        const quote = sessionStore.getQuoteById(failure.changeId);
        if (!quote) {
          return;
        }

        sessionStore.updateQuote(failure.changeId, {
          syncStatus: 'SYNC_FAILED',
          pendingSyncAction: quote.pendingSyncAction,
          syncError: failure.message,
        });
      });
      this.state.lastError = result.failed[0]?.message;
    } else {
      this.state.lastError = undefined;
    }

    this.setLastSyncedAt(result.lastSyncedAt);
    this.emit();
  }

  private restoreConflictQuote(conflict: QuoteSyncConflict) {
    if (conflict.resourceType !== 'quote') {
      return;
    }

    const payload = { ...conflict.localVersion };
    delete payload.action;

    sessionStore.upsertQuote({
      ...this.mapApiQuote(payload),
      syncStatus: 'CONFLICT',
      pendingSyncAction: 'update',
      syncError: 'Conflict detected during sync',
      conflictTransactionId: conflict.transactionId,
    });
  }

  private mapApiQuote(quote: Record<string, unknown>): QuoteData {
    const candidate = quote as QuoteData;
    const updatedAt = typeof candidate.updatedAt === 'string'
      ? candidate.updatedAt
      : new Date().toISOString();
    const quoteFilaments = Array.isArray(candidate.quoteFilaments)
      ? [...candidate.quoteFilaments]
        .filter((segment) => typeof segment.weightGrams === 'number' && segment.weightGrams > 0)
        .sort((left, right) => left.order - right.order)
        .map((segment, index) => ({
          ...segment,
          order: index + 1,
        }))
      : [];

    return {
      ...candidate,
      parameters: isRecord(candidate.parameters) ? candidate.parameters : {},
      quoteFilaments,
      syncStatus: 'SYNCED',
      pendingSyncAction: undefined,
      lastSyncedAt: updatedAt,
      lastServerUpdatedAt: updatedAt,
      syncError: undefined,
      conflictTransactionId: undefined,
    };
  }

  private getResolutionStrategy(conflict: QuoteSyncConflict, selections: Record<string, 'local' | 'server'>): SyncResolution {
    const decisions = conflict.fields.map(field => selections[`${conflict.id}:${field.field}`] || 'local');
    const uniqueDecisions = new Set(decisions);

    if (uniqueDecisions.size === 1) {
      return uniqueDecisions.has('server') ? 'server' : 'local';
    }

    return 'merged';
  }

  private buildMergedValue(conflict: QuoteSyncConflict, selections: Record<string, 'local' | 'server'>) {
    const localVersion = { ...conflict.localVersion };
    const serverVersion = conflict.serverVersion;
    const mergedValue: Record<string, unknown> = { ...serverVersion };

    conflict.fields.forEach((field) => {
      const selection = selections[`${conflict.id}:${field.field}`] || 'local';
      mergedValue[field.field] = selection === 'local'
        ? localVersion[field.field]
        : serverVersion[field.field];
    });

    return mergedValue;
  }
}

export const syncService = SyncService.getInstance();
