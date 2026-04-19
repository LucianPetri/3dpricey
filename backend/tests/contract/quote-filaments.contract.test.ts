import jwt from 'jsonwebtoken';
import request from 'supertest';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  quote: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  quoteFilament: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import app from '../../src/index';

function getAuthHeader() {
  process.env.JWT_SECRET = 'quote-contract-secret';

  const token = jwt.sign(
    { id: 'user-1', email: 'user@example.com' },
    process.env.JWT_SECRET
  );

  return {
    Authorization: `Bearer ${token}`,
  };
}

function buildHydratedQuote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'quote-1',
    userId: 'user-1',
    companyId: 'company-1',
    customerId: null,
    customer: null,
    projectName: 'Tri-color bracket',
    printColour: '#111111, #ffffff',
    printType: 'FDM',
    materialCost: 12.5,
    machineTimeCost: 6,
    electricityCost: 0.5,
    laborCost: 1.5,
    laborConsumablesCost: 0,
    laborMachineCost: 0,
    overheadCost: 1,
    subtotal: 21.5,
    markup: 4.3,
    paintingCost: null,
    totalPrice: 25.8,
    quantity: 1,
    unitPrice: 25.8,
    notes: null,
    clientName: 'Printel',
    status: 'PENDING',
    priority: null,
    dueDate: null,
    filePath: null,
    assignedMachineId: null,
    statusTimeline: null,
    parameters: {},
    filamentWeight: 225,
    printTime: 2.5,
    laborHours: null,
    resinVolume: null,
    washingTime: null,
    curingTime: null,
    createdAt: new Date('2026-03-31T12:00:00.000Z'),
    updatedAt: new Date('2026-03-31T12:00:00.000Z'),
    quoteFilaments: [
      {
        id: 'segment-1',
        quoteId: 'quote-1',
        materialId: 'mat-a',
        weightGrams: 150,
        order: 1,
        tool: 'T0',
        color: '#111111',
        spoolId: 'spool-a',
        materialName: 'PLA Black',
        modelGrams: 120,
        supportGrams: 15,
        towerGrams: 10,
        flushGrams: 5,
        createdAt: new Date('2026-03-31T12:00:00.000Z'),
      },
      {
        id: 'segment-2',
        quoteId: 'quote-1',
        materialId: 'mat-b',
        weightGrams: 75,
        order: 2,
        tool: 'T1',
        color: '#ffffff',
        spoolId: 'spool-b',
        materialName: 'PLA White',
        modelGrams: 65,
        supportGrams: 5,
        towerGrams: 3,
        flushGrams: 2,
        createdAt: new Date('2026-03-31T12:00:00.000Z'),
      },
    ],
    printJob: null,
    ...overrides,
  };
}

describe('Quote filament contract', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'quote-contract-secret';
    jest.clearAllMocks();

    mockPrisma.user.findUnique.mockResolvedValue({ companyId: 'company-1' });
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    mockPrisma.quoteFilament.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.quoteFilament.createMany.mockResolvedValue({ count: 2 });
    mockPrisma.$transaction.mockImplementation(async (callback: (client: typeof mockPrisma) => unknown) => callback(mockPrisma));
  });

  it('accepts ordered quote filament segments on create', async () => {
    mockPrisma.quote.create.mockResolvedValue({ id: 'quote-1' });
    mockPrisma.quote.findUniqueOrThrow.mockResolvedValue(buildHydratedQuote());

    const response = await request(app)
      .post('/api/quotes')
      .set(getAuthHeader())
      .send({
        projectName: 'Tri-color bracket',
        printColour: '#111111, #ffffff',
        printType: 'FDM',
        materialCost: 12.5,
        machineTimeCost: 6,
        electricityCost: 0.5,
        laborCost: 1.5,
        overheadCost: 1,
        subtotal: 21.5,
        markup: 4.3,
        totalPrice: 25.8,
        unitPrice: 25.8,
        quantity: 1,
        parameters: {
          toolBreakdown: [
            { tool: 'T1', materialId: 'mat-b', totalGrams: 75, color: '#ffffff' },
            { tool: 'T0', materialId: 'mat-a', totalGrams: 150, color: '#111111' },
          ],
        },
        quoteFilaments: [
          { materialId: 'mat-b', weightGrams: 75, order: 2, tool: 'T1', color: '#ffffff', spoolId: 'spool-b', materialName: 'PLA White' },
          { materialId: 'mat-a', weightGrams: 150, order: 1, tool: 'T0', color: '#111111', spoolId: 'spool-a', materialName: 'PLA Black' },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.quote.quoteFilaments).toEqual([
      expect.objectContaining({ materialId: 'mat-a', weightGrams: 150, order: 1, tool: 'T0' }),
      expect.objectContaining({ materialId: 'mat-b', weightGrams: 75, order: 2, tool: 'T1' }),
    ]);
    expect(mockPrisma.quoteFilament.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ materialId: 'mat-a', weightGrams: 150, order: 1, tool: 'T0' }),
        expect.objectContaining({ materialId: 'mat-b', weightGrams: 75, order: 2, tool: 'T1' }),
      ],
    });
  });

  it('accepts tool breakdown fallback data on update when quoteFilaments are omitted', async () => {
    mockPrisma.quote.findFirst.mockResolvedValue(buildHydratedQuote());
    mockPrisma.quote.update.mockResolvedValue({ id: 'quote-1' });
    mockPrisma.quote.findUniqueOrThrow.mockResolvedValue(buildHydratedQuote({
      quoteFilaments: [
        {
          id: 'segment-1',
          quoteId: 'quote-1',
          materialId: 'mat-a',
          weightGrams: 125,
          order: 1,
          tool: 'T0',
          color: '#111111',
          spoolId: 'spool-a',
          materialName: 'PLA Black',
          modelGrams: 125,
          supportGrams: 0,
          towerGrams: 0,
          flushGrams: 0,
          createdAt: new Date('2026-03-31T12:00:00.000Z'),
        },
        {
          id: 'segment-2',
          quoteId: 'quote-1',
          materialId: 'mat-b',
          weightGrams: 80,
          order: 2,
          tool: 'T1',
          color: '#ffffff',
          spoolId: 'spool-b',
          materialName: 'PLA White',
          modelGrams: 80,
          supportGrams: 0,
          towerGrams: 0,
          flushGrams: 0,
          createdAt: new Date('2026-03-31T12:00:00.000Z'),
        },
      ],
    }));

    const response = await request(app)
      .put('/api/quotes/quote-1')
      .set(getAuthHeader())
      .send({
        parameters: {
          toolBreakdown: [
            { tool: 'T0', materialId: 'mat-a', totalGrams: 125, color: '#111111', spoolId: 'spool-a' },
            { tool: 'T1', materialId: 'mat-b', totalGrams: 80, color: '#ffffff', spoolId: 'spool-b' },
          ],
        },
      });

    expect(response.status).toBe(200);
    expect(mockPrisma.quoteFilament.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ materialId: 'mat-a', weightGrams: 125, order: 1, tool: 'T0', spoolId: 'spool-a' }),
        expect.objectContaining({ materialId: 'mat-b', weightGrams: 80, order: 2, tool: 'T1', spoolId: 'spool-b' }),
      ],
    });
  });
});