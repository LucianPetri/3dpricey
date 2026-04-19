import { SyncService } from '../../src/services/sync.service';

type FakeQuote = ReturnType<typeof createQuoteRecord>;

function createQuoteRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'quote-1',
    userId: 'user-1',
    companyId: 'company-1',
    customerId: null,
    customer: null,
    projectName: 'Bracket',
    printColour: 'Black',
    printType: 'FDM',
    materialCost: 10,
    machineTimeCost: 5,
    electricityCost: 1,
    laborCost: 2,
    laborConsumablesCost: 0,
    laborMachineCost: 0,
    overheadCost: 1,
    subtotal: 19,
    markup: 3,
    paintingCost: null,
    totalPrice: 22,
    quantity: 1,
    unitPrice: 22,
    notes: 'Server notes',
    clientName: 'Printel',
    status: 'PENDING',
    priority: null,
    dueDate: null,
    filePath: null,
    assignedMachineId: null,
    statusTimeline: null,
    parameters: {},
    filamentWeight: 12,
    printTime: 1.5,
    laborHours: null,
    resinVolume: null,
    washingTime: null,
    curingTime: null,
    createdAt: new Date('2026-03-31T10:00:00.000Z'),
    updatedAt: new Date('2026-03-31T12:00:00.000Z'),
    quoteFilaments: [],
    printJob: null,
    ...overrides,
  };
}

function createFakeSyncClient(initialQuotes: Array<Record<string, unknown>>) {
  const quotes = new Map(initialQuotes.map((quote) => [quote.id as string, { ...quote }]));
  const quoteFilaments = new Map<string, Array<Record<string, unknown>>>();
  const syncTransactions = new Map<string, Record<string, unknown>>();
  let transactionCounter = 0;

  const readQuote = (id: string) => {
    const quote = quotes.get(id);
    if (!quote) {
      return null;
    }

    return {
      ...quote,
      customer: null,
      printJob: null,
      quoteFilaments: [...(quoteFilaments.get(id) || [])],
    };
  };

  const quoteModel = {
    findFirst: async ({ where }: { where: { id: string; userId?: string } }) => {
      const quote = readQuote(where.id) as FakeQuote | null;
      if (!quote) {
        return null;
      }

      return where.userId && quote.userId !== where.userId ? null : quote;
    },
    findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
      const quote = readQuote(where.id);
      if (!quote) {
        throw new Error('Quote not found');
      }

      return quote;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const now = new Date();
      const quote = createQuoteRecord({
        ...data,
        createdAt: now,
        updatedAt: now,
      });
      quotes.set(quote.id, quote);
      return readQuote(quote.id)!;
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const existing = quotes.get(where.id);
      if (!existing) {
        throw new Error('Quote not found');
      }

      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      quotes.set(where.id, updated);
      return readQuote(where.id)!;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const existing = readQuote(where.id);
      quotes.delete(where.id);
      return existing;
    },
  };

  const quoteFilamentModel = {
    deleteMany: async ({ where }: { where: { quoteId: string } }) => {
      quoteFilaments.set(where.quoteId, []);
    },
    createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
      if (data.length === 0) {
        return;
      }

      quoteFilaments.set(data[0].quoteId as string, data.map((segment) => ({ ...segment })));
    },
  };

  const syncTransactionModel = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const transaction = {
        id: `txn-${++transactionCounter}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      syncTransactions.set(transaction.id as string, transaction);
      return transaction;
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const existing = syncTransactions.get(where.id);
      if (!existing) {
        throw new Error('Sync transaction not found');
      }

      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      syncTransactions.set(where.id, updated);
      return updated;
    },
    findFirst: async ({ where, orderBy }: { where: Record<string, unknown>; orderBy?: Record<string, 'asc' | 'desc'> }) => {
      const transactions = [...syncTransactions.values()].filter((transaction) => {
        return Object.entries(where).every(([key, value]) => transaction[key] === value);
      });

      if (orderBy?.updatedAt === 'desc') {
        transactions.sort((left, right) => Number(right.updatedAt) - Number(left.updatedAt));
      }

      return transactions[0] || null;
    },
    count: async ({ where }: { where: Record<string, unknown> }) => {
      return [...syncTransactions.values()].filter((transaction) => {
        return Object.entries(where).every(([key, value]) => transaction[key] === value);
      }).length;
    },
  };

  const auditLogModel = {
    create: async () => ({ id: 'audit-1' }),
  };

  const transactionClient = {
    quote: quoteModel,
    quoteFilament: quoteFilamentModel,
    syncTransaction: syncTransactionModel,
    auditLog: auditLogModel,
  };

  const client = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        return where.id === 'user-1' ? { companyId: 'company-1' } : null;
      },
    },
    quote: quoteModel,
    syncTransaction: syncTransactionModel,
    auditLog: auditLogModel,
    $transaction: async (callback: (value: typeof transactionClient) => unknown) => callback(transactionClient),
  };

  return {
    client,
    quotes,
    syncTransactions,
  };
}

describe('Sync conflict integration', () => {
  it('detects conflicting quote updates and resolves them with the local version', async () => {
    const existingQuote = createQuoteRecord({
      id: 'quote-1',
      notes: 'Server notes',
      updatedAt: new Date('2026-03-31T12:00:00.000Z'),
    });
    const { client, quotes } = createFakeSyncClient([existingQuote]);
    const service = new SyncService(client as never);

    const syncResult = await service.processChanges('user-1', [
      {
        id: 'quote-1',
        type: 'update',
        resource: 'quote',
        data: { notes: 'Local notes' },
        timestamp: Date.now(),
        baseVersion: '2026-03-31T09:00:00.000Z',
      },
    ]);

    expect(syncResult.applied).toBe(0);
    expect(syncResult.failed).toHaveLength(0);
    expect(syncResult.conflicts).toHaveLength(1);
    expect(syncResult.conflicts[0].fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'notes', localValue: 'Local notes', serverValue: 'Server notes' }),
      ])
    );

    const beforeResolutionStatus = await service.getStatus('user-1');
    expect(beforeResolutionStatus.conflictedCount).toBe(1);

    const resolution = await service.resolveConflict(
      'user-1',
      syncResult.conflicts[0].transactionId,
      'local'
    );

    expect(resolution.quote).toEqual(expect.objectContaining({
      id: 'quote-1',
      notes: 'Local notes',
      syncStatus: 'SYNCED',
    }));
    expect(quotes.get('quote-1')?.notes).toBe('Local notes');

    const afterResolutionStatus = await service.getStatus('user-1');
    expect(afterResolutionStatus.conflictedCount).toBe(0);
  });
});
