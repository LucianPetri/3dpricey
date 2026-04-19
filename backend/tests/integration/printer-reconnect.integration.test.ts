import jwt from 'jsonwebtoken';
import request from 'supertest';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  machine: {
    findFirst: jest.fn(),
  },
  printerConnectionState: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import app from '../../src/index';

function getAuthHeader() {
  process.env.JWT_SECRET = 'phase3-printer-secret';

  const token = jwt.sign(
    { id: 'user-1', email: 'user@example.com' },
    process.env.JWT_SECRET,
  );

  return {
    Authorization: `Bearer ${token}`,
  };
}

describe('Phase 3 printer reconnect integration', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'phase3-printer-secret';
    jest.clearAllMocks();

    mockPrisma.user.findUnique.mockResolvedValue({ companyId: 'company-1' });
    mockPrisma.machine.findFirst.mockResolvedValue({
      id: 'machine-1',
      companyId: 'company-1',
      name: 'Bambu Lab A1',
      printType: 'FDM',
    });
  });

  it('stores reconnect state for an available machine', async () => {
    mockPrisma.printerConnectionState.upsert.mockResolvedValue({
      id: 'connection-1',
      machineId: 'machine-1',
      status: 'connected',
      connectionType: 'lan',
      lastSeenAt: new Date('2026-03-31T12:00:00.000Z'),
      lastReconnectAt: new Date('2026-03-31T12:00:00.000Z'),
      reconnectError: null,
      assignedJobId: null,
      createdAt: new Date('2026-03-31T12:00:00.000Z'),
      updatedAt: new Date('2026-03-31T12:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/machines/machine-1/reconnect')
      .set(getAuthHeader())
      .send({ status: 'connected', connectionType: 'lan' });

    expect(response.status).toBe(200);
    expect(response.body.connection).toEqual(expect.objectContaining({
      machineId: 'machine-1',
      status: 'connected',
      connectionType: 'lan',
    }));
    expect(mockPrisma.printerConnectionState.upsert).toHaveBeenCalled();
  });

  it('assigns a job to a compatible connected machine', async () => {
    mockPrisma.printerConnectionState.findUnique.mockResolvedValue({
      id: 'connection-1',
      machineId: 'machine-1',
      status: 'connected',
      connectionType: 'lan',
      assignedJobId: null,
    });
    mockPrisma.printerConnectionState.update.mockResolvedValue({
      id: 'connection-1',
      machineId: 'machine-1',
      status: 'connected',
      assignedJobId: 'job-1',
      connectionType: 'lan',
    });

    const response = await request(app)
      .post('/api/machines/machine-1/assign-job')
      .set(getAuthHeader())
      .send({ jobId: 'job-1', printType: 'FDM' });

    expect(response.status).toBe(200);
    expect(response.body.assignment).toEqual(expect.objectContaining({
      machineId: 'machine-1',
      jobId: 'job-1',
      status: 'connected',
    }));
    expect(mockPrisma.printerConnectionState.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { machineId: 'machine-1' },
      data: expect.objectContaining({ assignedJobId: 'job-1' }),
    }));
  });

  it('rejects assignment when the machine print type is incompatible', async () => {
    mockPrisma.printerConnectionState.findUnique.mockResolvedValue({
      id: 'connection-1',
      machineId: 'machine-1',
      status: 'connected',
      assignedJobId: null,
    });

    const response = await request(app)
      .post('/api/machines/machine-1/assign-job')
      .set(getAuthHeader())
      .send({ jobId: 'job-1', printType: 'Laser' });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/incompatible/i);
  });

  it('rejects assignment when the machine is unavailable', async () => {
    mockPrisma.printerConnectionState.findUnique.mockResolvedValue({
      id: 'connection-1',
      machineId: 'machine-1',
      status: 'disconnected',
      assignedJobId: null,
    });

    const response = await request(app)
      .post('/api/machines/machine-1/assign-job')
      .set(getAuthHeader())
      .send({ jobId: 'job-1', printType: 'FDM' });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/unavailable/i);
  });
});