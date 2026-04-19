/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.middleware';

const quoteInclude: any = {
  customer: true,
  quoteFilaments: {
    orderBy: {
      order: 'asc',
    },
  },
  laserData: true,
  embroideryData: true,
  printJob: {
    include: {
      machine: true,
    },
  },
};

type QuoteFilamentClient = any;

type QuoteTypeStore = any;

type QuoteTypeClient = any;

export type QuoteRecord = Record<string, any>;

export interface QuoteFilamentInput {
  materialId: string;
  weightGrams: number;
  order: number;
  tool?: string;
  color?: string;
  spoolId?: string;
  materialName?: string;
  modelGrams?: number;
  supportGrams?: number;
  towerGrams?: number;
  flushGrams?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function parseNullableString(value: unknown) {
  if (value === null) {
    return null;
  }

  return parseString(value);
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function parseInteger(value: unknown) {
  const parsed = parseNumber(value);
  return parsed === undefined ? undefined : Math.trunc(parsed);
}

function parseBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}

function parseNonNegativeNumber(value: unknown) {
  const parsed = parseNumber(value);
  return parsed === undefined ? undefined : Math.max(0, parsed);
}

function parseDate(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
}

function parseDurationHours(value: unknown) {
  const numeric = parseNumber(value);
  if (numeric !== undefined) {
    return numeric;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  const hoursMatch = value.match(/(\d+(?:\.\d+)?)\s*h/i);
  const minutesMatch = value.match(/(\d+(?:\.\d+)?)\s*m/i);

  if (!hoursMatch && !minutesMatch) {
    return undefined;
  }

  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;

  return hours + minutes / 60;
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function normalizeJsonObject(value: unknown) {
  return isRecord(value) ? (value as Prisma.InputJsonObject) : undefined;
}

function getParameters(payload: Record<string, unknown>) {
  return isRecord(payload.parameters) ? payload.parameters : {};
}

interface LaserQuoteDataInput {
  materialId: string;
  designPath?: string;
  designWidth: number;
  designHeight: number;
  estimatedCutTime: number;
  estimatedEngravingTime?: number;
  materialSurfaceArea: number;
  laserPower?: number;
  focusLensReplacement?: boolean;
  laserTubeAge?: number;
}

interface EmbroideryQuoteDataInput {
  designPath?: string;
  stitchCount: number;
  designWidth: number;
  designHeight: number;
  estimatedEmbroideryTime: number;
  baseGarmentCost: number;
  threadCount: number;
  needleSize?: string;
  backingMaterialId?: string;
}

function getQuoteTypeStore(client: QuoteTypeClient, key: 'laserQuoteData' | 'embroideryQuoteData') {
  const store = client[key];
  if (!isRecord(store)) {
    return undefined;
  }

  return store as unknown as QuoteTypeStore;
}

function extractLaserQuoteData(payload: Record<string, unknown>): LaserQuoteDataInput | null {
  const parameters = getParameters(payload);

  const materialId = parseString(parameters.materialId) ?? parseString(payload.materialId);
  const designWidth = parseNumber(parameters.designWidth) ?? parseNumber(payload.designWidth);
  const designHeight = parseNumber(parameters.designHeight) ?? parseNumber(payload.designHeight);
  const estimatedCutTime = parseNumber(parameters.estimatedCutTime) ?? parseNumber(payload.estimatedCutTime);
  const materialSurfaceArea = parseNumber(parameters.materialSurfaceArea) ?? parseNumber(payload.materialSurfaceArea);

  if (!materialId || designWidth === undefined || designHeight === undefined || estimatedCutTime === undefined || materialSurfaceArea === undefined) {
    return null;
  }

  return compact({
    materialId,
    designPath: parseString(parameters.designPath) ?? parseString(payload.filePath),
    designWidth,
    designHeight,
    estimatedCutTime,
    estimatedEngravingTime: parseNumber(parameters.estimatedEngravingTime) ?? parseNumber(payload.estimatedEngravingTime),
    materialSurfaceArea,
    laserPower: parseNumber(parameters.laserPower) ?? parseNumber(payload.laserPower),
    focusLensReplacement: parseBoolean(parameters.focusLensReplacement) ?? parseBoolean(payload.focusLensReplacement),
    laserTubeAge: parseInteger(parameters.laserTubeAge) ?? parseInteger(payload.laserTubeAge),
  });
}

function extractEmbroideryQuoteData(payload: Record<string, unknown>): EmbroideryQuoteDataInput | null {
  const parameters = getParameters(payload);

  const stitchCount = parseInteger(parameters.stitchCount) ?? parseInteger(payload.stitchCount);
  const designWidth = parseNumber(parameters.designWidth) ?? parseNumber(payload.designWidth);
  const designHeight = parseNumber(parameters.designHeight) ?? parseNumber(payload.designHeight);
  const estimatedEmbroideryTime = parseNumber(parameters.estimatedEmbroideryTime) ?? parseNumber(payload.estimatedEmbroideryTime);
  const baseGarmentCost = parseNumber(parameters.baseGarmentCost) ?? parseNumber(payload.baseGarmentCost);
  const threadCount = parseInteger(parameters.threadColors) ?? parseInteger(parameters.colorCount) ?? parseInteger(payload.threadColors) ?? parseInteger(payload.colorCount);

  if (
    stitchCount === undefined ||
    designWidth === undefined ||
    designHeight === undefined ||
    estimatedEmbroideryTime === undefined ||
    baseGarmentCost === undefined ||
    threadCount === undefined
  ) {
    return null;
  }

  return compact({
    designPath: parseString(parameters.designPath) ?? parseString(payload.filePath),
    stitchCount,
    designWidth,
    designHeight,
    estimatedEmbroideryTime,
    baseGarmentCost,
    threadCount,
    needleSize: parseString(parameters.needleSize) ?? parseString(payload.needleSize),
    backingMaterialId:
      parseString(parameters.selectedBackingId) ??
      parseString(parameters.backingMaterialId) ??
      parseString(payload.selectedBackingId) ??
      parseString(payload.backingMaterialId),
  });
}

async function replaceLaserQuoteData(client: QuoteTypeClient, quoteId: string, data: LaserQuoteDataInput | null) {
  const store = getQuoteTypeStore(client, 'laserQuoteData');
  if (!store) {
    return;
  }

  if (!data) {
    await store.deleteMany({ where: { quoteId } });
    return;
  }

  await store.upsert({
    where: { quoteId },
    create: {
      quoteId,
      ...data,
    },
    update: data,
  });
}

async function replaceEmbroideryQuoteData(client: QuoteTypeClient, quoteId: string, data: EmbroideryQuoteDataInput | null) {
  const store = getQuoteTypeStore(client, 'embroideryQuoteData');
  if (!store) {
    return;
  }

  if (!data) {
    await store.deleteMany({ where: { quoteId } });
    return;
  }

  await store.upsert({
    where: { quoteId },
    create: {
      quoteId,
      ...data,
    },
    update: data,
  });
}

export function extractQuoteFilaments(value: unknown): QuoteFilamentInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsedSegments: Array<QuoteFilamentInput | null> = value
    .map((segment, index) => {
      if (!isRecord(segment)) {
        return null;
      }

      const materialId = parseString(segment.materialId);
      const weightGrams = parseNumber(segment.weightGrams) ?? parseNumber(segment.totalGrams);
      const order = parseInteger(segment.order) ?? index + 1;

      if (!materialId || weightGrams === undefined || weightGrams <= 0) {
        return null;
      }

      return {
        materialId,
        weightGrams,
        order,
        tool: parseString(segment.tool),
        color: parseString(segment.color),
        spoolId: parseString(segment.spoolId),
        materialName: parseString(segment.materialName) ?? parseString(segment.material),
        modelGrams: parseNonNegativeNumber(segment.modelGrams),
        supportGrams: parseNonNegativeNumber(segment.supportGrams),
        towerGrams: parseNonNegativeNumber(segment.towerGrams),
        flushGrams: parseNonNegativeNumber(segment.flushGrams),
      };
    });

  return parsedSegments
    .filter((segment): segment is QuoteFilamentInput => segment !== null)
    .sort((left, right) => left.order - right.order);
}

export function extractQuoteFilamentsFromPayload(payload: Record<string, unknown>): QuoteFilamentInput[] {
  const parameters = getParameters(payload);

  if (Array.isArray(payload.quoteFilaments)) {
    return extractQuoteFilaments(payload.quoteFilaments)
      .map((segment, index) => ({ ...segment, order: index + 1 }));
  }

  if (Array.isArray(parameters.quoteFilaments)) {
    return extractQuoteFilaments(parameters.quoteFilaments)
      .map((segment, index) => ({ ...segment, order: index + 1 }));
  }

  if (Array.isArray(parameters.toolBreakdown)) {
    return extractQuoteFilaments(parameters.toolBreakdown)
      .map((segment, index) => ({ ...segment, order: index + 1 }));
  }

  return [];
}

function buildQuoteWritePayload(payload: Record<string, unknown>, partial = false) {
  const parameters = getParameters(payload);

  const basePayload = compact({
    projectName: parseString(payload.projectName),
    printColour: parseString(payload.printColour),
    printType: parseString(payload.printType),
    materialCost: parseNumber(payload.materialCost),
    machineTimeCost: parseNumber(payload.machineTimeCost),
    electricityCost: parseNumber(payload.electricityCost),
    laborCost: parseNumber(payload.laborCost),
    laborConsumablesCost: parseNumber(payload.laborConsumablesCost),
    laborMachineCost: parseNumber(payload.laborMachineCost),
    overheadCost: parseNumber(payload.overheadCost),
    subtotal: parseNumber(payload.subtotal),
    markup: parseNumber(payload.markup),
    totalPrice: parseNumber(payload.totalPrice),
    unitPrice: parseNumber(payload.unitPrice),
    quantity: parseInteger(payload.quantity),
    notes: parseNullableString(payload.notes),
    clientName: parseNullableString(payload.clientName),
    status: parseString(payload.status),
    priority: parseNullableString(payload.priority),
    dueDate: parseDate(payload.dueDate),
    filePath: parseNullableString(payload.filePath),
    assignedMachineId: parseNullableString(payload.assignedMachineId),
    filamentWeight: parseNumber(payload.filamentWeight) ?? parseNumber(parameters.filamentWeight),
    printTime: parseDurationHours(payload.printTime) ?? parseDurationHours(parameters.printTime),
    laborHours: parseNumber(payload.laborHours) ?? parseNumber(parameters.laborHours),
    resinVolume: parseNumber(payload.resinVolume) ?? parseNumber(parameters.resinVolume),
    washingTime: parseNumber(payload.washingTime) ?? parseNumber(parameters.washingTime),
    curingTime: parseNumber(payload.curingTime) ?? parseNumber(parameters.curingTime),
    customerId: parseNullableString(payload.customerId),
    statusTimeline: normalizeJsonObject(payload.statusTimeline),
    parameters: normalizeJsonObject(payload.parameters) ?? (partial ? undefined : ({} as Prisma.InputJsonObject)),
  });

  if (!partial) {
    const missingFields: string[] = [];

    if (!basePayload.projectName) missingFields.push('projectName');
    if (!basePayload.printColour) missingFields.push('printColour');
    if (!basePayload.printType) missingFields.push('printType');
    if (basePayload.materialCost === undefined) missingFields.push('materialCost');
    if (basePayload.machineTimeCost === undefined) missingFields.push('machineTimeCost');
    if (basePayload.electricityCost === undefined) missingFields.push('electricityCost');
    if (basePayload.laborCost === undefined) missingFields.push('laborCost');
    if (basePayload.overheadCost === undefined) missingFields.push('overheadCost');
    if (basePayload.subtotal === undefined) missingFields.push('subtotal');
    if (basePayload.markup === undefined) missingFields.push('markup');
    if (basePayload.totalPrice === undefined) missingFields.push('totalPrice');
    if (basePayload.unitPrice === undefined) missingFields.push('unitPrice');

    if (missingFields.length > 0) {
      throw new AppError(400, 'Quote payload is missing required fields', { missingFields });
    }

    if (basePayload.quantity === undefined) {
      basePayload.quantity = 1;
    }
  }

  return basePayload;
}

export function buildQuoteCreateInput(
  payload: Record<string, unknown>,
  userId: string,
  companyId: string
): Prisma.QuoteUncheckedCreateInput {
  const basePayload = buildQuoteWritePayload(payload, false);

  return compact({
    id: parseString(payload.id),
    userId,
    companyId,
    projectName: basePayload.projectName!,
    printColour: basePayload.printColour!,
    printType: basePayload.printType!,
    materialCost: basePayload.materialCost!,
    machineTimeCost: basePayload.machineTimeCost!,
    electricityCost: basePayload.electricityCost!,
    laborCost: basePayload.laborCost!,
    laborConsumablesCost: basePayload.laborConsumablesCost,
    laborMachineCost: basePayload.laborMachineCost,
    overheadCost: basePayload.overheadCost!,
    subtotal: basePayload.subtotal!,
    markup: basePayload.markup!,
    totalPrice: basePayload.totalPrice!,
    unitPrice: basePayload.unitPrice!,
    quantity: basePayload.quantity ?? 1,
    notes: basePayload.notes,
    clientName: basePayload.clientName,
    status: basePayload.status,
    priority: basePayload.priority,
    dueDate: basePayload.dueDate,
    filePath: basePayload.filePath,
    assignedMachineId: basePayload.assignedMachineId,
    filamentWeight: basePayload.filamentWeight,
    printTime: basePayload.printTime,
    laborHours: basePayload.laborHours,
    resinVolume: basePayload.resinVolume,
    washingTime: basePayload.washingTime,
    curingTime: basePayload.curingTime,
    customerId: basePayload.customerId,
    statusTimeline: basePayload.statusTimeline,
    parameters: basePayload.parameters,
  });
}

export function buildQuoteUpdateInput(payload: Record<string, unknown>): Prisma.QuoteUncheckedUpdateInput {
  return buildQuoteWritePayload(payload, true);
}

export function getQuoteInclude() {
  return quoteInclude;
}

export async function replaceQuoteFilaments(
  client: QuoteFilamentClient,
  quoteId: string,
  quoteFilaments: QuoteFilamentInput[]
) {
  await client.quoteFilament.deleteMany({
    where: { quoteId },
  });

  if (quoteFilaments.length === 0) {
    return;
  }

  await client.quoteFilament.createMany({
    data: quoteFilaments.map((segment) => ({
      quoteId,
      materialId: segment.materialId,
      weightGrams: segment.weightGrams,
      order: segment.order,
      tool: segment.tool,
      color: segment.color,
      spoolId: segment.spoolId,
      materialName: segment.materialName,
      modelGrams: segment.modelGrams,
      supportGrams: segment.supportGrams,
      towerGrams: segment.towerGrams,
      flushGrams: segment.flushGrams,
    })),
  });
}

export async function syncQuoteTypeData(client: QuoteTypeClient, quoteId: string, payload: Record<string, unknown>) {
  const printType = parseString(payload.printType) ?? parseString(getParameters(payload).printType);

  if (printType === 'Laser') {
    await replaceLaserQuoteData(client, quoteId, extractLaserQuoteData(payload));
    await replaceEmbroideryQuoteData(client, quoteId, null);
    return;
  }

  if (printType === 'Embroidery') {
    await replaceEmbroideryQuoteData(client, quoteId, extractEmbroideryQuoteData(payload));
    await replaceLaserQuoteData(client, quoteId, null);
    return;
  }

  await replaceLaserQuoteData(client, quoteId, null);
  await replaceEmbroideryQuoteData(client, quoteId, null);
}

function normalizeStoredJson(value: Prisma.JsonValue | null) {
  return isRecord(value) ? value : undefined;
}

export function toClientQuote(quote: QuoteRecord) {
  return {
    ...quote,
    parameters: normalizeStoredJson(quote.parameters) ?? {},
    statusTimeline: normalizeStoredJson(quote.statusTimeline),
    lastSyncedAt: quote.updatedAt.toISOString(),
    lastServerUpdatedAt: quote.updatedAt.toISOString(),
    syncStatus: 'SYNCED',
    pendingSyncAction: undefined,
    syncError: undefined,
    conflictTransactionId: undefined,
  };
}
