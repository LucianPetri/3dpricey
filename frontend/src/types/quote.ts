/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Centralized types for the quote calculator application

export type QuoteStatus = 'PENDING' | 'APPROVED' | 'PRINTING' | 'POST_PROCESSING' | 'DONE' | 'DISPATCHED' | 'DELIVERED' | 'FAILED';
export type SyncAction = 'create' | 'update' | 'delete';
export type QuoteSyncStatus = 'LEGACY_LOCAL' | 'PENDING_SYNC' | 'SYNCED' | 'CONFLICT' | 'SYNC_FAILED';
export type PrintType = 'FDM' | 'Resin' | 'Laser' | 'Embroidery';

export interface QuoteFilamentSegment {
  id?: string;
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

export interface QuoteSyncConflictField {
  field: string;
  localValue: unknown;
  serverValue: unknown;
  updatedBy?: string;
}

export interface QuoteSyncConflict {
  id: string;
  changeId: string;
  transactionId: string;
  resourceType: 'quote' | 'material' | 'machine';
  resourceId: string;
  fields: QuoteSyncConflictField[];
  localVersion: Record<string, unknown>;
  serverVersion: Record<string, unknown>;
}

export interface QuoteData {
  id?: string;
  materialCost: number;
  machineTimeCost: number;
  electricityCost: number;
  laborCost: number;
  laborConsumablesCost?: number;
  laborMachineCost?: number;
  overheadCost: number;
  subtotal: number;
  markup: number;
  totalPrice: number;
  unitPrice: number;  // Price per single unit
  quantity: number;   // Number of units
  printType: PrintType;
  projectName: string;
  printColour: string;
  parameters: QuoteParameters;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
  filePath?: string;  // Original uploaded file path for printing
  customerId?: string; // Reference to a customer
  clientName?: string; // Snapshot of name for display/legacy
  quoteFilaments?: QuoteFilamentSegment[];
  // Kanban Fields
  status?: QuoteStatus;
  assignedMachineId?: string;
  actualPrintTime?: number; // hours (for "Actuals vs Estimates" analytics)
  statusTimeline?: { [_key in QuoteStatus]?: string }; // ISO dates for when it entered each stage
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string; // ISO date string
  assignedEmployeeId?: string; // ID of assigned employee
  syncStatus?: QuoteSyncStatus;
  pendingSyncAction?: SyncAction;
  lastSyncedAt?: string;
  lastServerUpdatedAt?: string;
  syncError?: string;
  conflictTransactionId?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  averageRating?: number;
  reviewCount?: number;
}

export interface Employee {
  id: string;
  name: string;
  jobPosition: string;
  email?: string;
  phone?: string;
  createdAt: string;
  allowedLaborItemIds?: string[];
}

export type LaborPricingModel = "hourly" | "flat";

export interface LaborConsumableInput {
  id: string;
  constantId: string;
  quantityPerUnit: number;
}

export interface LaborMachineInput {
  id: string;
  machineId: string;
  hoursPerUnit: number;
}

export interface LaborItem {
  id: string;
  name: string;
  type: string;
  pricingModel: LaborPricingModel;
  rate: number;
  description?: string;
  consumables: LaborConsumableInput[];
  machines: LaborMachineInput[];
}

export interface QuoteParameters {
  materialName?: string;
  machineName?: string;
  consumables?: { name: string; value: number }[];
  consumablesTotal?: number;
  laborItemsUsed?: LaborItemUsage[];
  laborConsumablesUsed?: LaborConsumableUsage[];
  laborMachinesUsed?: LaborMachineUsage[];
  laborSelections?: LaborSelection[];
  colorUsages?: FilamentColorUsage[];
  toolBreakdown?: FilamentToolBreakdown[];
  quoteFilaments?: QuoteFilamentSegment[];
  recyclableColorUsages?: RecyclableColorUsage[];
  recyclableTotals?: {
    supportGrams: number;
    towerGrams: number;
    flushGrams: number;
    recyclableGrams: number;
    modelGrams?: number;
  };
  printTime?: string;
  filamentWeight?: string;
  resinVolume?: string;
  overheadPercentage?: string;
  markupPercentage?: string;
  [key: string]: string | number | boolean | undefined | object;
}

export interface LaborItemUsage {
  id: string;
  name: string;
  type: string;
  pricingModel: LaborPricingModel;
  rate: number;
  units: number;
  cost: number;
}

export interface LaborConsumableUsage {
  constantId: string;
  name: string;
  quantity: number;
  unitCost: number;
  cost: number;
}

export interface LaborMachineUsage {
  machineId: string;
  name: string;
  hours: number;
  rate: number;
  cost: number;
}

export interface FilamentColorUsage {
  order?: number;
  tool: string;
  color?: string;
  material?: string;
  materialId?: string;
  spoolId?: string;
  usedGrams: number;
}

export interface FilamentToolBreakdown {
  order?: number;
  tool: string;
  color?: string;
  material?: string;
  materialId?: string;
  spoolId?: string;
  modelGrams: number;
  supportGrams: number;
  towerGrams: number;
  flushGrams: number;
  totalGrams: number;
}

export interface RecyclableColorUsage {
  tool: string;
  color?: string;
  supportGrams: number;
  towerGrams: number;
  flushGrams: number;
  recyclableGrams: number;
}

export interface LaborSelection {
  laborItemId: string;
  units: number;
  consumables: { constantId: string; quantity: number }[];
  machines: { machineId: string; hours: number }[];
}

export interface Material {
  id: string;
  name: string;
  cost_per_unit: number;
  unit: string;
  print_type: PrintType;
  totalInStock?: number;
  lowStockThreshold?: number;
}

export interface Machine {
  id: string;
  name: string;
  hourly_cost: number;
  machine_price?: number;
  hours_per_day_usage?: number;
  lifetime_years?: number;
  maintenance_percentage?: number;
  power_consumption_watts: number | null;
  print_type: PrintType;
}

export interface CostConstant {
  id: string;
  name: string;
  value: number;
  unit: string;
  is_visible?: boolean;
  description?: string | null;
}

export interface FDMFormData {
  projectName: string;
  printColour: string;
  materialId: string;
  machineId: string;
  printTime: string;
  filamentWeight: string;
  laborSelections: LaborSelection[];
  overheadPercentage: string;
  markupPercentage: string;
  quantity: string;
  selectedConsumableIds: string[];
  selectedSpoolId?: string; // Selected spool for inventory tracking
  filePath?: string; // Optional file path for uploaded G-code
  customerId?: string;
  clientName?: string;
  priority?: string;
  dueDate?: string;
  assignedEmployeeId?: string; // ID of assigned employee
  colorUsages?: FilamentColorUsage[];
  toolBreakdown?: FilamentToolBreakdown[];
  recyclableColorUsages?: RecyclableColorUsage[];
  quoteFilaments?: QuoteFilamentSegment[];
  recyclableTotals?: {
    supportGrams: number;
    towerGrams: number;
    flushGrams: number;
    recyclableGrams: number;
    modelGrams?: number;
  };
}

export interface ResinFormData {
  projectName: string;
  printColour: string;
  materialId: string;
  machineId: string;
  printTime: string;
  resinVolume: string;
  washingTime: string;
  curingTime: string;
  isopropylCost: string;
  laborSelections: LaborSelection[];
  overheadPercentage: string;
  markupPercentage: string;
  quantity: string;
  selectedConsumableIds: string[];
  selectedSpoolId?: string; // Selected spool for inventory tracking
  customerId?: string;
  clientName?: string;
  assignedEmployeeId?: string; // ID of assigned employee
}

export interface LaserFormData {
  projectName: string;
  printColour: string;
  materialId: string;
  machineId: string;
  designWidth: string;
  designHeight: string;
  estimatedCutTime: string;
  estimatedEngravingTime: string;
  materialSurfaceArea: string;
  laborHours: string;
  laserPower: string;
  focusLensReplacement: boolean;
  laserTubeAge: string;
  overheadPercentage: string;
  markupPercentage: string;
  quantity: string;
  selectedConsumableIds: string[];
  filePath?: string;
  customerId?: string;
  clientName?: string;
}

export interface EmbroideryFormData {
  projectName: string;
  printColour: string;
  machineId: string;
  selectedBackingId: string;
  designWidth: string;
  designHeight: string;
  stitchCount: string;
  estimatedEmbroideryTime: string;
  baseGarmentCost: string;
  threadColors: string;
  laborHours: string;
  needleSize: string;
  overheadPercentage: string;
  markupPercentage: string;
  quantity: string;
  selectedConsumableIds: string[];
  filePath?: string;
  customerId?: string;
  clientName?: string;
}

export interface QuoteStats {
  totalQuotes: number;
  totalRevenue: number;
  totalProfit: number;
  avgQuoteValue: number;
  fdmCount: number;
  resinCount: number;
  laserCount: number;
  embroideryCount: number;
  recentQuotes: number;
}

// Customer Review/Rating System
export interface CustomerReview {
  id: string;
  customerId: string;
  quoteId?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  tags?: ('quality' | 'communication' | 'timeliness' | 'value')[];
  createdAt: string;
}

// Material Inventory Tracking
export interface MaterialSpool {
  id: string;
  materialId: string;
  name?: string;           // e.g., "PLA Red #3"
  color?: string;
  initialWeight: number;   // grams (FDM) or ml (Resin)
  currentWeight: number;   // Remaining
  purchaseDate?: string;
  purchaseCost?: number;
  location?: string;       // e.g., "Shelf A1"
  notes?: string;
}

// Capacity Planning
export interface CapacityQuery {
  quantity: number;
  printTimePerUnit: number; // hours
  machineIds?: string[];    // Specific machines or all
  workHoursPerDay: number;  // e.g., 8 or 24
  startDate?: string;
}

export interface CapacityResult {
  totalPrintHours: number;
  machineCount: number;
  estimatedDays: number;
  completionDate: Date;
  utilizationPercent: number;
  breakdown: {
    machineId: string;
    machineName: string;
    unitsAssigned: number;
    hoursOccupied: number;
  }[];
}

export interface CompanySettings {
  name: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  taxId?: string;
  logoUrl?: string; // Optional logo buffer/base64
  footerText?: string;
}

// Stock Management
export interface StockItem {
  id: string;
  quoteId: string;
  projectName: string;
  quantity: number;
  unitPrice: number; // Cost per unit
  totalCost: number;
  printType: PrintType;
  material?: string;
  color?: string;
  createdAt: string;
  status: "IN_STOCK" | "SOLD" | "RESERVED"; // IN_STOCK = available, SOLD = removed/sold, RESERVED = for order
}

export interface StockStats {
  totalItems: number;
  totalValue: number;
  soldItems: number;
  soldValue: number;
  reservedItems: number;
  reservedValue: number;
}

// Stored G-code Files
export interface StoredGcode {
  id: string;
  name: string;
  filePath: string;
  printTime: number; // hours
  filamentWeight: number; // grams
  resinVolume?: number; // ml (for Resin printers)
  machineName?: string;
  materialName?: string;
  printType?: PrintType;
  thumbnail?: string;
  colorUsages?: FilamentColorUsage[];
  toolBreakdown?: FilamentToolBreakdown[];
  recyclableColorUsages?: RecyclableColorUsage[];
  recyclableTotals?: {
    supportGrams: number;
    towerGrams: number;
    flushGrams: number;
    recyclableGrams: number;
    modelGrams?: number;
  };
  createdAt: string;
}
