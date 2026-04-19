import jwt from 'jsonwebtoken';
import request from 'supertest';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  quote: {
    create: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  quoteFilament: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  laserQuoteData: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  embroideryQuoteData: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
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
  process.env.JWT_SECRET = 'phase3-contract-secret';

  const token = jwt.sign(
    { id: 'user-1', email: 'user@example.com' },
    process.env.JWT_SECRET,
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
    projectName: 'Phase 3 Quote',
    printColour: 'Black',
    printType: 'Laser',
    materialCost: 24,
    machineTimeCost: 6,
    electricityCost: 0.6,
    laborCost: 4,
    laborConsumablesCost: 0,
    laborMachineCost: 0,
    overheadCost: 5,
    subtotal: 39.6,
    markup: 9.9,
    paintingCost: null,
    totalPrice: 49.5,
    quantity: 1,
    unitPrice: 49.5,
    notes: null,
    clientName: 'Printel',
    status: 'PENDING',
    priority: null,
    dueDate: null,
    filePath: null,
    assignedMachineId: null,
    statusTimeline: null,
    parameters: {},
    filamentWeight: null,
    printTime: null,
    laborHours: null,
    resinVolume: null,
    washingTime: null,
    curingTime: null,
    createdAt: new Date('2026-03-31T12:00:00.000Z'),
    updatedAt: new Date('2026-03-31T12:00:00.000Z'),
    quoteFilaments: [],
    laserData: null,
    embroideryData: null,
    printJob: null,
    ...overrides,
  };
}

describe('Phase 3 quote print type contract', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'phase3-contract-secret';
    jest.clearAllMocks();

    mockPrisma.user.findUnique.mockResolvedValue({ companyId: 'company-1' });
    mockPrisma.quoteFilament.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.quoteFilament.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.laserQuoteData.upsert.mockResolvedValue({ id: 'laser-data-1' });
    mockPrisma.laserQuoteData.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.embroideryQuoteData.upsert.mockResolvedValue({ id: 'embroidery-data-1' });
    mockPrisma.embroideryQuoteData.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    mockPrisma.$transaction.mockImplementation(async (callback: (client: typeof mockPrisma) => unknown) => callback(mockPrisma));
  });

  it('creates a laser quote and persists laser-specific data', async () => {
    mockPrisma.quote.create.mockResolvedValue({ id: 'laser-quote-1' });
    mockPrisma.quote.findUniqueOrThrow.mockResolvedValue(buildHydratedQuote({
      id: 'laser-quote-1',
      projectName: 'Acrylic Sign',
      printType: 'Laser',
      printColour: 'Clear',
      parameters: {
        machineId: 'laser-machine-1',
        materialId: 'laser-acrylic-3mm',
        designWidth: '200',
        designHeight: '80',
        estimatedCutTime: '18',
        estimatedEngravingTime: '4',
        materialSurfaceArea: '160',
        laborHours: '0.5',
        laserPower: '60',
      },
      laserData: {
        id: 'laser-data-1',
        quoteId: 'laser-quote-1',
        materialId: 'laser-acrylic-3mm',
        designPath: 'sign.svg',
        designWidth: 200,
        designHeight: 80,
        estimatedCutTime: 18,
        estimatedEngravingTime: 4,
        materialSurfaceArea: 160,
        laserPower: 60,
        focusLensReplacement: false,
        laserTubeAge: 10,
        createdAt: new Date('2026-03-31T12:00:00.000Z'),
        updatedAt: new Date('2026-03-31T12:00:00.000Z'),
      },
    }));

    const response = await request(app)
      .post('/api/quotes/laser')
      .set(getAuthHeader())
      .send({
        projectName: 'Acrylic Sign',
        printColour: 'Clear',
        printType: 'Laser',
        materialCost: 24,
        machineTimeCost: 6,
        electricityCost: 0.6,
        laborCost: 4,
        overheadCost: 5,
        subtotal: 39.6,
        markup: 9.9,
        totalPrice: 49.5,
        unitPrice: 49.5,
        quantity: 1,
        filePath: 'sign.svg',
        parameters: {
          machineId: 'laser-machine-1',
          materialId: 'laser-acrylic-3mm',
          designPath: 'sign.svg',
          designWidth: '200',
          designHeight: '80',
          estimatedCutTime: '18',
          estimatedEngravingTime: '4',
          materialSurfaceArea: '160',
          laborHours: '0.5',
          laserPower: '60',
          focusLensReplacement: false,
          laserTubeAge: '10',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.quote).toEqual(expect.objectContaining({
      printType: 'Laser',
      projectName: 'Acrylic Sign',
    }));
    expect(response.body.quote.laserData).toEqual(expect.objectContaining({
      designWidth: 200,
      designHeight: 80,
      estimatedCutTime: 18,
      materialSurfaceArea: 160,
    }));
    expect(mockPrisma.laserQuoteData.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { quoteId: 'laser-quote-1' },
      create: expect.objectContaining({
        quoteId: 'laser-quote-1',
        materialId: 'laser-acrylic-3mm',
        designWidth: 200,
      }),
    }));
  });

  it('creates an embroidery quote and persists embroidery-specific data', async () => {
    mockPrisma.quote.create.mockResolvedValue({ id: 'embroidery-quote-1' });
    mockPrisma.quote.findUniqueOrThrow.mockResolvedValue(buildHydratedQuote({
      id: 'embroidery-quote-1',
      projectName: 'Uniform Logo',
      printType: 'Embroidery',
      printColour: 'Navy',
      materialCost: 12,
      machineTimeCost: 8,
      electricityCost: 0,
      laborCost: 6,
      overheadCost: 5,
      subtotal: 31,
      markup: 9.3,
      totalPrice: 40.3,
      unitPrice: 40.3,
      parameters: {
        machineId: 'embroidery-machine-1',
        designPath: 'logo.pes',
        stitchCount: '12500',
        designWidth: '90',
        designHeight: '45',
        estimatedEmbroideryTime: '16',
        baseGarmentCost: '8.5',
        threadColors: '3',
        selectedBackingId: 'backing-cutaway',
        needleSize: '75/11',
      },
      embroideryData: {
        id: 'embroidery-data-1',
        quoteId: 'embroidery-quote-1',
        designPath: 'logo.pes',
        stitchCount: 12500,
        designWidth: 90,
        designHeight: 45,
        estimatedEmbroideryTime: 16,
        baseGarmentCost: 8.5,
        threadCount: 3,
        needleSize: '75/11',
        backingMaterialId: 'backing-cutaway',
        createdAt: new Date('2026-03-31T12:00:00.000Z'),
        updatedAt: new Date('2026-03-31T12:00:00.000Z'),
      },
    }));

    const response = await request(app)
      .post('/api/quotes/embroidery')
      .set(getAuthHeader())
      .send({
        projectName: 'Uniform Logo',
        printColour: 'Navy',
        printType: 'Embroidery',
        materialCost: 12,
        machineTimeCost: 8,
        electricityCost: 0,
        laborCost: 6,
        overheadCost: 5,
        subtotal: 31,
        markup: 9.3,
        totalPrice: 40.3,
        unitPrice: 40.3,
        quantity: 1,
        parameters: {
          machineId: 'embroidery-machine-1',
          designPath: 'logo.pes',
          stitchCount: '12500',
          designWidth: '90',
          designHeight: '45',
          estimatedEmbroideryTime: '16',
          baseGarmentCost: '8.5',
          threadColors: '3',
          selectedBackingId: 'backing-cutaway',
          needleSize: '75/11',
          laborHours: '0.3',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.quote).toEqual(expect.objectContaining({
      printType: 'Embroidery',
      projectName: 'Uniform Logo',
    }));
    expect(response.body.quote.embroideryData).toEqual(expect.objectContaining({
      stitchCount: 12500,
      designWidth: 90,
      estimatedEmbroideryTime: 16,
    }));
    expect(mockPrisma.embroideryQuoteData.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { quoteId: 'embroidery-quote-1' },
      create: expect.objectContaining({
        quoteId: 'embroidery-quote-1',
        stitchCount: 12500,
        backingMaterialId: 'backing-cutaway',
      }),
    }));
  });

  it('parses svg design content through the laser parser endpoint', async () => {
    const response = await request(app)
      .post('/api/laser/parse-svg')
      .set(getAuthHeader())
      .send({
        svgData: '<svg width="120mm" height="60mm" viewBox="0 0 120 60"><rect width="120" height="60"/></svg>',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      widthMm: 120,
      heightMm: 60,
      pathCount: 1,
    }));
    expect(response.body.materialSurfaceArea).toBeGreaterThan(0);
  });

  it('parses embroidery file payloads through the embroidery parser endpoint', async () => {
    const buffer = Buffer.alloc(80);
    buffer.write('PES', 0, 'ascii');
    buffer.writeInt16LE(90, 48);
    buffer.writeInt16LE(45, 50);
    buffer[52] = 0x01;
    buffer[53] = 0x01;
    buffer[54] = 0x01;
    buffer[55] = 0x01;
    buffer[56] = 0xff;
    buffer[57] = 0x00;

    const response = await request(app)
      .post('/api/embroidery/parse-file')
      .set(getAuthHeader())
      .send({
        fileName: 'logo.pes',
        fileContent: buffer.toString('base64'),
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      designWidth: 90,
      designHeight: 45,
    }));
    expect(response.body.stitchCount).toBeGreaterThan(0);
    expect(response.body.estimatedEmbroideryTime).toBeGreaterThan(0);
  });
});