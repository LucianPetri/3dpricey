/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler.middleware';
import {
  buildQuoteCreateInput,
  buildQuoteUpdateInput,
  extractQuoteFilamentsFromPayload,
  getQuoteInclude,
  replaceQuoteFilaments,
  toClientQuote,
} from './quote-extension.service';

export type SyncChangeType = 'create' | 'update' | 'delete';
export type SyncResourceType = 'quote' | 'material' | 'machine';

export interface SyncChangeInput {
  id: string;
  type: SyncChangeType;
  resource: SyncResourceType;
  data: Record<string, unknown>;
  timestamp: number;
  baseVersion?: string | null;
}

interface SyncConflictField {
  field: string;
  localValue: unknown;
  serverValue: unknown;
  updatedBy?: string;
}

export interface SyncConflict {
  id: string;
  changeId: string;
  transactionId: string;
  resourceType: SyncResourceType;
  resourceId: string;
  fields: SyncConflictField[];
  localVersion: Record<string, unknown>;
  serverVersion: Record<string, unknown>;
}

interface SyncFailure {
  changeId: string;
  message: string;
  statusCode: number;
}

interface AppliedRecord {
  changeId: string;
  resourceType: SyncResourceType;
  record: Record<string, unknown> | null;
}

export interface SyncBatchResult {
  applied: number;
  appliedChanges: string[];
  records: AppliedRecord[];
  conflicts: SyncConflict[];
  failed: SyncFailure[];
  lastSyncedAt: string;
}

export interface SyncStatusResult {
  pendingCount: number;
  conflictedCount: number;
  lastSyncedAt: string | null;
}

type SyncPrismaClient = Pick<PrismaClient, '$transaction' | 'quote' | 'syncTransaction' | 'auditLog' | 'user'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeError(error: unknown) {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(500, error.message);
  }

  return new AppError(500, 'Unknown sync error');
}

function valuesDiffer(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) !== JSON.stringify(right ?? null);
}

function createConflictFields(localValue: Record<string, unknown>, serverValue: Record<string, unknown>) {
  const keys = new Set([...Object.keys(localValue), ...Object.keys(serverValue)]);

  return [...keys]
    .filter((key) => !['syncStatus', 'pendingSyncAction', 'syncError', 'conflictTransactionId', 'lastSyncedAt', 'lastServerUpdatedAt'].includes(key))
    .filter((key) => valuesDiffer(localValue[key], serverValue[key]))
    .map((key) => ({
      field: key,
      localValue: localValue[key],
      serverValue: serverValue[key],
    }));
}

function createDeleteConflictField(serverValue: Record<string, unknown>) {
  return [
    {
      field: 'record',
      localValue: 'Delete quote',
      serverValue,
    },
  ];
}

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

async function getCompanyId(client: SyncPrismaClient, userId: string) {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (!user?.companyId) {
    throw new AppError(400, 'User must belong to a company before syncing quotes');
  }

  return user.companyId;
}

export class SyncService {
  constructor(private readonly client: SyncPrismaClient) {}

  async processChanges(userId: string, changes: SyncChangeInput[]): Promise<SyncBatchResult> {
    const result: SyncBatchResult = {
      applied: 0,
      appliedChanges: [],
      records: [],
      conflicts: [],
      failed: [],
      lastSyncedAt: new Date().toISOString(),
    };

    for (const change of changes) {
      try {
        if (change.resource !== 'quote') {
          throw new AppError(400, `Unsupported sync resource: ${change.resource}`);
        }

        if (change.type === 'create') {
          const record = await this.createQuote(userId, change);
          result.applied += 1;
          result.appliedChanges.push(change.id);
          result.records.push({ changeId: change.id, resourceType: 'quote', record });
          continue;
        }

        if (change.type === 'update') {
          const outcome = await this.updateQuote(userId, change);
          if ('conflict' in outcome && outcome.conflict) {
            result.conflicts.push(outcome.conflict);
          } else {
            result.applied += 1;
            result.appliedChanges.push(change.id);
            result.records.push({ changeId: change.id, resourceType: 'quote', record: outcome.record });
          }
          continue;
        }

        const outcome = await this.deleteQuote(userId, change);
        if ('conflict' in outcome && outcome.conflict) {
          result.conflicts.push(outcome.conflict);
        } else {
          result.applied += 1;
          result.appliedChanges.push(change.id);
          result.records.push({ changeId: change.id, resourceType: 'quote', record: null });
        }
      } catch (error) {
        const normalizedError = normalizeError(error);
        result.failed.push({
          changeId: change.id,
          message: normalizedError.message,
          statusCode: normalizedError.statusCode,
        });
      }
    }

    result.lastSyncedAt = new Date().toISOString();
    return result;
  }

  async resolveConflict(
    userId: string,
    transactionId: string,
    resolution: 'local' | 'server' | 'merged',
    mergedValue?: Record<string, unknown>
  ) {
    const transaction = await this.client.syncTransaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new AppError(404, 'Sync transaction not found');
    }

    if (transaction.status !== 'CONFLICT') {
      throw new AppError(400, 'Sync transaction is not awaiting conflict resolution');
    }

    const localChange = isRecord(transaction.localChanges) ? transaction.localChanges : {};
    const changeData = isRecord(localChange.data) ? localChange.data : {};
    const serverVersion = isRecord(transaction.serverVersion) ? transaction.serverVersion : {};
    const operation = transaction.operation.toLowerCase() as SyncChangeType;

    let resolvedQuote: Record<string, unknown> | null = null;

    if (operation === 'delete') {
      if (resolution !== 'server') {
        await this.client.quote.delete({
          where: { id: transaction.quoteId },
        });
      } else {
        const quote = await this.client.quote.findFirst({
          where: { id: transaction.quoteId, userId },
          include: getQuoteInclude(),
        });

        resolvedQuote = quote ? toClientQuote(quote) : null;
      }
    } else if (resolution === 'server') {
      const quote = await this.client.quote.findFirst({
        where: { id: transaction.quoteId, userId },
        include: getQuoteInclude(),
      });

      resolvedQuote = quote ? toClientQuote(quote) : null;
    } else {
      const payload = resolution === 'merged' && mergedValue ? mergedValue : changeData;
      resolvedQuote = operation === 'create'
        ? await this.createQuote(userId, {
            id: transaction.changeId || transaction.id,
            type: 'create',
            resource: 'quote',
            data: payload,
            timestamp: Date.now(),
          })
        : await this.forceUpdateQuote(userId, transaction.quoteId, payload);
    }

    const resolvedTransaction = await this.client.syncTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'RESOLVED',
        resolution: toPrismaJsonValue({
          resolution,
          mergedValue: mergedValue ?? null,
        }),
        resolvedAt: new Date(),
      },
    });

    return {
      transaction: resolvedTransaction,
      quote: resolvedQuote,
    };
  }

  async getStatus(userId: string): Promise<SyncStatusResult> {
    const [conflictedCount, pendingCount, latestTransaction] = await Promise.all([
      this.client.syncTransaction.count({ where: { userId, status: 'CONFLICT' } }),
      this.client.syncTransaction.count({ where: { userId, status: 'PENDING' } }),
      this.client.syncTransaction.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      pendingCount,
      conflictedCount,
      lastSyncedAt: latestTransaction?.updatedAt.toISOString() ?? null,
    };
  }

  private async createQuote(userId: string, change: SyncChangeInput) {
    const companyId = await getCompanyId(this.client, userId);

    const quote = await this.client.$transaction(async (tx) => {
      const createdQuote = await tx.quote.create({
        data: buildQuoteCreateInput(change.data, userId, companyId),
      });

      await replaceQuoteFilaments(tx, createdQuote.id, extractQuoteFilamentsFromPayload(change.data));

      const hydratedQuote = await tx.quote.findUniqueOrThrow({
        where: { id: createdQuote.id },
        include: getQuoteInclude(),
      });

      await tx.syncTransaction.create({
        data: {
          userId,
          quoteId: hydratedQuote.id,
          changeId: change.id,
          operation: change.type.toUpperCase(),
          tableName: change.resource,
          localChanges: toPrismaJsonValue(change),
          serverVersion: toPrismaJsonValue(toClientQuote(hydratedQuote)),
          status: 'APPLIED',
          resolvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          quoteId: hydratedQuote.id,
          action: 'SYNC_CREATE',
          changes: { quote: toClientQuote(hydratedQuote) },
        },
      });

      return hydratedQuote;
    });

    return toClientQuote(quote);
  }

  private async updateQuote(userId: string, change: SyncChangeInput) {
    const existingQuote = await this.client.quote.findFirst({
      where: { id: change.id, userId },
      include: getQuoteInclude(),
    });

    if (!existingQuote) {
      throw new AppError(404, 'Quote not found for sync update');
    }

    if (change.baseVersion && existingQuote.updatedAt.toISOString() !== change.baseVersion) {
      return {
        conflict: await this.recordConflict(userId, change, existingQuote.id, change.data, toClientQuote(existingQuote)),
      };
    }

    return {
      record: await this.forceUpdateQuote(userId, existingQuote.id, change.data, change),
    };
  }

  private async forceUpdateQuote(
    userId: string,
    quoteId: string,
    payload: Record<string, unknown>,
    change?: SyncChangeInput
  ) {
    const updatedQuote = await this.client.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id: quoteId },
        data: buildQuoteUpdateInput(payload),
      });

      if (Array.isArray(payload.quoteFilaments) || Array.isArray((payload.parameters as Record<string, unknown> | undefined)?.quoteFilaments) || Array.isArray((payload.parameters as Record<string, unknown> | undefined)?.toolBreakdown)) {
        await replaceQuoteFilaments(tx, quoteId, extractQuoteFilamentsFromPayload(payload));
      }

      const hydratedQuote = await tx.quote.findUniqueOrThrow({
        where: { id: quoteId },
        include: getQuoteInclude(),
      });

      if (change) {
        await tx.syncTransaction.create({
          data: {
            userId,
            quoteId,
            changeId: change.id,
            operation: change.type.toUpperCase(),
            tableName: change.resource,
            localChanges: toPrismaJsonValue(change),
            serverVersion: toPrismaJsonValue(toClientQuote(hydratedQuote)),
            status: 'APPLIED',
            resolvedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            quoteId,
            action: 'SYNC_UPDATE',
            changes: { quote: toClientQuote(hydratedQuote) },
          },
        });
      }

      return hydratedQuote;
    });

    return toClientQuote(updatedQuote);
  }

  private async deleteQuote(userId: string, change: SyncChangeInput) {
    const existingQuote = await this.client.quote.findFirst({
      where: { id: change.id, userId },
      include: getQuoteInclude(),
    });

    if (!existingQuote) {
      return { applied: true };
    }

    if (change.baseVersion && existingQuote.updatedAt.toISOString() !== change.baseVersion) {
      return {
        conflict: await this.recordConflict(
          userId,
          change,
          existingQuote.id,
          { action: 'delete', ...change.data },
          toClientQuote(existingQuote),
          true
        ),
      };
    }

    await this.client.$transaction(async (tx) => {
      await tx.quote.delete({
        where: { id: existingQuote.id },
      });

      await tx.syncTransaction.create({
        data: {
          userId,
          quoteId: existingQuote.id,
          changeId: change.id,
          operation: change.type.toUpperCase(),
          tableName: change.resource,
          localChanges: toPrismaJsonValue(change),
          serverVersion: toPrismaJsonValue(toClientQuote(existingQuote)),
          status: 'APPLIED',
          resolvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'SYNC_DELETE',
          changes: { deletedQuote: toClientQuote(existingQuote) },
        },
      });
    });

    return { applied: true };
  }

  private async recordConflict(
    userId: string,
    change: SyncChangeInput,
    quoteId: string,
    localValue: Record<string, unknown>,
    serverValue: Record<string, unknown>,
    isDelete = false
  ): Promise<SyncConflict> {
    const fields = isDelete ? createDeleteConflictField(serverValue) : createConflictFields(localValue, serverValue);

    const transaction = await this.client.syncTransaction.create({
      data: {
        userId,
        quoteId,
        changeId: change.id,
        operation: change.type.toUpperCase(),
        tableName: change.resource,
        localChanges: toPrismaJsonValue(change),
        serverVersion: toPrismaJsonValue(serverValue),
        status: 'CONFLICT',
        conflictedAt: new Date(),
      },
    });

    return {
      id: transaction.id,
      changeId: change.id,
      transactionId: transaction.id,
      resourceType: change.resource,
      resourceId: quoteId,
      fields,
      localVersion: localValue,
      serverVersion: serverValue,
    };
  }
}

export const syncService = new SyncService(prisma);
