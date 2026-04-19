import jwt from 'jsonwebtoken';
import request from 'supertest';

jest.mock('../../src/services/sync.service', () => ({
  syncService: {
    processChanges: jest.fn(),
    resolveConflict: jest.fn(),
    getStatus: jest.fn(),
  },
}));

import app from '../../src/index';
import { syncService } from '../../src/services/sync.service';

const mockedSyncService = syncService as jest.Mocked<typeof syncService>;

function getAuthHeader() {
  process.env.JWT_SECRET = 'contract-test-secret';

  const token = jwt.sign(
    { id: 'user-1', email: 'user@example.com' },
    process.env.JWT_SECRET
  );

  return {
    Authorization: `Bearer ${token}`,
  };
}

describe('Sync API contract', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'contract-test-secret';
    jest.clearAllMocks();
  });

  it('rejects malformed sync batch payloads', async () => {
    const response = await request(app)
      .post('/api/sync')
      .set(getAuthHeader())
      .send({ changes: [{ id: 'quote-1' }] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(Array.isArray(response.body.details.errors)).toBe(true);
  });

  it('accepts a valid sync batch and returns the expected response contract', async () => {
    mockedSyncService.processChanges.mockResolvedValue({
      applied: 1,
      appliedChanges: ['quote-1'],
      records: [
        {
          changeId: 'quote-1',
          resourceType: 'quote',
          record: {
            id: 'quote-1',
            projectName: 'Bracket',
            printColour: 'Black',
            printType: 'FDM',
            materialCost: 10,
            machineTimeCost: 5,
            electricityCost: 1,
            laborCost: 2,
            overheadCost: 1,
            subtotal: 19,
            markup: 3,
            totalPrice: 22,
            unitPrice: 22,
            quantity: 1,
            parameters: {},
          },
        },
      ],
      conflicts: [],
      failed: [],
      lastSyncedAt: '2026-03-31T12:00:00.000Z',
    });

    const response = await request(app)
      .post('/api/sync')
      .set(getAuthHeader())
      .send({
        changes: [
          {
            id: 'quote-1',
            type: 'create',
            resource: 'quote',
            data: { projectName: 'Bracket' },
            timestamp: Date.now(),
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      applied: 1,
      appliedChanges: ['quote-1'],
      conflicts: [],
      failed: [],
      lastSyncedAt: '2026-03-31T12:00:00.000Z',
    }));
    expect(mockedSyncService.processChanges).toHaveBeenCalledWith(
      'user-1',
      expect.arrayContaining([
        expect.objectContaining({
          id: 'quote-1',
          type: 'create',
          resource: 'quote',
        }),
      ])
    );
  });

  it('accepts conflict resolutions and returns the updated quote payload', async () => {
    mockedSyncService.resolveConflict.mockResolvedValue({
      transaction: { id: 'txn-1', status: 'RESOLVED' },
      quote: {
        id: 'quote-1',
        notes: 'Use local notes',
        parameters: {},
      },
    } as never);

    const response = await request(app)
      .post('/api/sync/resolve')
      .set(getAuthHeader())
      .send({
        transactionId: 'txn-1',
        resolution: 'local',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      transaction: expect.objectContaining({ id: 'txn-1', status: 'RESOLVED' }),
      quote: expect.objectContaining({ id: 'quote-1', notes: 'Use local notes' }),
    }));
    expect(mockedSyncService.resolveConflict).toHaveBeenCalledWith('user-1', 'txn-1', 'local', undefined);
  });

  it('returns sync status counts for the authenticated user', async () => {
    mockedSyncService.getStatus.mockResolvedValue({
      pendingCount: 0,
      conflictedCount: 2,
      lastSyncedAt: '2026-03-31T12:00:00.000Z',
    });

    const response = await request(app)
      .get('/api/sync/status')
      .set(getAuthHeader());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      pendingCount: 0,
      conflictedCount: 2,
      lastSyncedAt: '2026-03-31T12:00:00.000Z',
    });
  });
});
