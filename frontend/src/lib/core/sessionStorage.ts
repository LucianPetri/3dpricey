/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Local Storage - Data persists until explicitly cleared
// Data remains even after app closes/restarts

import { QuoteData, Material, Machine, CostConstant, Customer, CustomerReview, MaterialSpool, CompanySettings, QuoteStatus, Employee, StoredGcode, LaborItem, StockItem, StockStats, PrintType } from "@/types/quote";

// Generate unique IDs
const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const DEFAULT_MACHINE_HOURS_PER_DAY = 8;
const DEFAULT_MACHINE_LIFETIME_YEARS = 3;
const DEFAULT_MACHINE_MAINTENANCE_PERCENTAGE = 0;

export const calculateHourlyCostFromInputs = (
    machinePrice: number,
    hoursPerDayUsage: number,
    lifetimeYears: number,
    maintenancePercentage: number
): number => {
    if (machinePrice <= 0 || hoursPerDayUsage <= 0 || lifetimeYears <= 0) return 0;
    const baseCost = machinePrice / (lifetimeYears * 365 * hoursPerDayUsage);
    const maintenanceCost = machinePrice * (maintenancePercentage / 100);
    return baseCost + maintenanceCost;
};

const calculateMachinePriceFromHourlyCost = (
    hourlyCost: number,
    hoursPerDayUsage: number,
    lifetimeYears: number,
    maintenancePercentage: number
): number => {
    const divisor = (1 / (lifetimeYears * 365 * hoursPerDayUsage)) + (maintenancePercentage / 100);
    if (hourlyCost <= 0 || divisor <= 0) return 0;
    return hourlyCost / divisor;
};

const normalizeMachine = (machine: Machine): Machine => {
    const hoursPerDayUsage = machine.hours_per_day_usage ?? DEFAULT_MACHINE_HOURS_PER_DAY;
    const lifetimeYears = machine.lifetime_years ?? DEFAULT_MACHINE_LIFETIME_YEARS;
    const maintenancePercentage = machine.maintenance_percentage ?? DEFAULT_MACHINE_MAINTENANCE_PERCENTAGE;
    const machinePrice = machine.machine_price && machine.machine_price > 0
        ? machine.machine_price
        : calculateMachinePriceFromHourlyCost(machine.hourly_cost, hoursPerDayUsage, lifetimeYears, maintenancePercentage);
    const calculatedHourlyCost = calculateHourlyCostFromInputs(
        machinePrice,
        hoursPerDayUsage,
        lifetimeYears,
        maintenancePercentage
    );

    return {
        ...machine,
        machine_price: machinePrice,
        hours_per_day_usage: hoursPerDayUsage,
        lifetime_years: lifetimeYears,
        maintenance_percentage: maintenancePercentage,
        hourly_cost: calculatedHourlyCost > 0 ? parseFloat(calculatedHourlyCost.toFixed(2)) : machine.hourly_cost,
    };
};

// Default Materials
const defaultMaterials: Material[] = [
    // FDM Materials
    { id: "fdm-pla", name: "PLA", cost_per_unit: 25, unit: "kg", print_type: "FDM" },
    { id: "fdm-pla-plus", name: "PLA+", cost_per_unit: 28, unit: "kg", print_type: "FDM" },
    { id: "fdm-pla-silk", name: "PLA Silk", cost_per_unit: 32, unit: "kg", print_type: "FDM" },
    { id: "fdm-abs", name: "ABS", cost_per_unit: 28, unit: "kg", print_type: "FDM" },
    { id: "fdm-asa", name: "ASA", cost_per_unit: 35, unit: "kg", print_type: "FDM" },
    { id: "fdm-petg", name: "PETG", cost_per_unit: 30, unit: "kg", print_type: "FDM" },
    { id: "fdm-petg-cf", name: "PETG-CF", cost_per_unit: 55, unit: "kg", print_type: "FDM" },
    { id: "fdm-tpu", name: "TPU", cost_per_unit: 45, unit: "kg", print_type: "FDM" },
    { id: "fdm-nylon", name: "Nylon", cost_per_unit: 50, unit: "kg", print_type: "FDM" },
    { id: "fdm-pc", name: "Polycarbonate (PC)", cost_per_unit: 55, unit: "kg", print_type: "FDM" },
    { id: "fdm-pla-cf", name: "PLA-CF", cost_per_unit: 50, unit: "kg", print_type: "FDM" },
    // Resin Materials
    { id: "resin-standard", name: "Standard Resin", cost_per_unit: 35, unit: "liter", print_type: "Resin" },
    { id: "resin-water-washable", name: "Water Washable Resin", cost_per_unit: 45, unit: "liter", print_type: "Resin" },
    { id: "resin-abs-like", name: "ABS-Like Resin", cost_per_unit: 50, unit: "liter", print_type: "Resin" },
    { id: "resin-tough", name: "Tough Resin", cost_per_unit: 55, unit: "liter", print_type: "Resin" },
    { id: "resin-flexible", name: "Flexible Resin", cost_per_unit: 60, unit: "liter", print_type: "Resin" },
    { id: "resin-8k", name: "8K High-Detail Resin", cost_per_unit: 50, unit: "liter", print_type: "Resin" },
    { id: "resin-castable", name: "Castable Resin", cost_per_unit: 80, unit: "liter", print_type: "Resin" },
    { id: "resin-clear", name: "Clear/Transparent Resin", cost_per_unit: 55, unit: "liter", print_type: "Resin" },
    // Laser Materials
    { id: "laser-acrylic-clear-3mm", name: "Acrylic Clear 3mm", cost_per_unit: 0.18, unit: "cm2", print_type: "Laser" },
    { id: "laser-birch-plywood-3mm", name: "Birch Plywood 3mm", cost_per_unit: 0.11, unit: "cm2", print_type: "Laser" },
    { id: "laser-leatherette", name: "Leatherette Sheet", cost_per_unit: 0.14, unit: "cm2", print_type: "Laser" },
    // Embroidery Materials
    { id: "embroidery-backing-cutaway", name: "Cut-away Backing", cost_per_unit: 0.75, unit: "unit", print_type: "Embroidery" },
    { id: "embroidery-backing-tearaway", name: "Tear-away Backing", cost_per_unit: 0.55, unit: "unit", print_type: "Embroidery" },
    { id: "embroidery-water-soluble", name: "Water Soluble Topping", cost_per_unit: 0.95, unit: "unit", print_type: "Embroidery" },
];

// Default Machines
const defaultMachines: Machine[] = [
    // FDM Printers
    normalizeMachine({ id: "fdm-ender3", name: "Ender 3", hourly_cost: 2, power_consumption_watts: 350, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-ender3-v2", name: "Ender 3 V2", hourly_cost: 2.5, power_consumption_watts: 350, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-ender3-v3", name: "Ender 3 V3", hourly_cost: 3, power_consumption_watts: 300, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-creality-k1", name: "Creality K1", hourly_cost: 6, power_consumption_watts: 350, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-creality-k1-max", name: "Creality K1 Max", hourly_cost: 8, power_consumption_watts: 500, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-prusa-mk3", name: "Prusa i3 MK3S+", hourly_cost: 5, power_consumption_watts: 120, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-prusa-mk4", name: "Prusa MK4", hourly_cost: 6, power_consumption_watts: 150, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-bambu-a1-mini", name: "Bambu Lab A1 Mini", hourly_cost: 5, power_consumption_watts: 150, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-bambu-a1", name: "Bambu Lab A1", hourly_cost: 6, power_consumption_watts: 200, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-bambu-p1s", name: "Bambu Lab P1S", hourly_cost: 8, power_consumption_watts: 350, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-bambu-x1c", name: "Bambu Lab X1 Carbon", hourly_cost: 10, power_consumption_watts: 400, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-voron-24", name: "Voron 2.4", hourly_cost: 7, power_consumption_watts: 400, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-artillery-x3", name: "Artillery Sidewinder X3", hourly_cost: 4, power_consumption_watts: 450, print_type: "FDM" }),
    normalizeMachine({ id: "fdm-qidi-x-max3", name: "QIDI X-Max 3", hourly_cost: 7, power_consumption_watts: 500, print_type: "FDM" }),
    // Resin Printers
    normalizeMachine({ id: "resin-elegoo-mars3", name: "Elegoo Mars 3", hourly_cost: 3, power_consumption_watts: 45, print_type: "Resin" }),
    normalizeMachine({ id: "resin-elegoo-mars4", name: "Elegoo Mars 4 Ultra", hourly_cost: 4, power_consumption_watts: 48, print_type: "Resin" }),
    normalizeMachine({ id: "resin-elegoo-saturn3", name: "Elegoo Saturn 3", hourly_cost: 5, power_consumption_watts: 60, print_type: "Resin" }),
    normalizeMachine({ id: "resin-elegoo-saturn4", name: "Elegoo Saturn 4 Ultra", hourly_cost: 6, power_consumption_watts: 65, print_type: "Resin" }),
    normalizeMachine({ id: "resin-anycubic", name: "Anycubic Photon Mono", hourly_cost: 4, power_consumption_watts: 50, print_type: "Resin" }),
    normalizeMachine({ id: "resin-anycubic-m5s", name: "Anycubic Photon Mono M5s", hourly_cost: 5, power_consumption_watts: 55, print_type: "Resin" }),
    normalizeMachine({ id: "resin-halot-mage", name: "Creality Halot Mage", hourly_cost: 4, power_consumption_watts: 50, print_type: "Resin" }),
    normalizeMachine({ id: "resin-halot-ray", name: "Creality Halot Ray", hourly_cost: 3, power_consumption_watts: 45, print_type: "Resin" }),
    normalizeMachine({ id: "resin-phrozen-mini8k", name: "Phrozen Sonic Mini 8K", hourly_cost: 5, power_consumption_watts: 50, print_type: "Resin" }),
    normalizeMachine({ id: "resin-phrozen-mega8k", name: "Phrozen Mega 8K", hourly_cost: 7, power_consumption_watts: 80, print_type: "Resin" }),
    // Laser Machines
    normalizeMachine({ id: "laser-glowforge-pro", name: "Glowforge Pro", hourly_cost: 18, power_consumption_watts: 600, print_type: "Laser" }),
    normalizeMachine({ id: "laser-thunder-nova24", name: "Thunder Nova 24", hourly_cost: 22, power_consumption_watts: 800, print_type: "Laser" }),
    // Embroidery Machines
    normalizeMachine({ id: "embroidery-brother-pr1055x", name: "Brother PR1055X", hourly_cost: 14, power_consumption_watts: 150, print_type: "Embroidery" }),
    normalizeMachine({ id: "embroidery-ricoma-ch1501", name: "Ricoma CH1501", hourly_cost: 16, power_consumption_watts: 180, print_type: "Embroidery" }),
];

// Default Constants/Consumables
const defaultConstants: CostConstant[] = [
    { id: "electricity", name: "Electricity Rate", value: 0.12, unit: "$/kWh", is_visible: false, description: "Cost per kilowatt-hour" },
    { id: "overhead", name: "Overhead Rate", value: 10, unit: "%", is_visible: false, description: "Overhead percentage" },
    { id: "markup", name: "Default Markup", value: 30, unit: "%", is_visible: false, description: "Default profit margin" },
    // Paint Consumables
    { id: "paint-acrylic-standard", name: "Acrylic Paint (Standard)", value: 0.10, unit: "$/ml", is_visible: true, description: "Standard hobby painting. Usage Rate: 0.02ml/cm2" },
    { id: "paint-spray-primer", name: "Spray Primer", value: 0.08, unit: "$/ml", is_visible: true, description: "Base coat primer. Usage Rate: 0.03ml/cm2" },
    { id: "paint-clear-coat", name: "Clear Coat Varnish", value: 0.12, unit: "$/ml", is_visible: true, description: "Protective finish. Usage Rate: 0.02ml/cm2" },
    { id: "paint-enamel", name: "Enamel Paint", value: 0.15, unit: "$/ml", is_visible: true, description: "Durable detail work. Usage Rate: 0.02ml/cm2" },
];

const defaultLaborItems: LaborItem[] = [
    {
        id: "labor-bed-cleaning",
        name: "Bed Cleaning",
        type: "Post-processing",
        pricingModel: "hourly",
        rate: 15,
        description: "Clean and prepare the print surface",
        consumables: [],
        machines: [],
    },
    {
        id: "labor-support-removal",
        name: "Support Removal",
        type: "Post-processing",
        pricingModel: "hourly",
        rate: 18,
        description: "Remove supports and clean up part",
        consumables: [],
        machines: [],
    },
    {
        id: "labor-polishing",
        name: "Polishing",
        type: "Finishing",
        pricingModel: "hourly",
        rate: 20,
        description: "Sanding/polishing surfaces",
        consumables: [],
        machines: [],
    },
    {
        id: "labor-painting",
        name: "Painting",
        type: "Finishing",
        pricingModel: "hourly",
        rate: 22,
        description: "Surface prep and painting",
        consumables: [],
        machines: [],
    },
    {
        id: "labor-packaging",
        name: "Packaging",
        type: "Fulfillment",
        pricingModel: "flat",
        rate: 2,
        description: "Boxing and packaging materials",
        consumables: [],
        machines: [],
    },
];

// Session Storage Keys
const STORAGE_KEYS = {
    QUOTES: "session_quotes",
    MATERIALS: "session_materials",
    MACHINES: "session_machines",
    CONSTANTS: "session_constants",
    CUSTOMERS: "session_customers",
    REVIEWS: "session_reviews",
    SPOOLS: "session_spools",
    COMPANY: "session_company",
    EMPLOYEES: "session_employees",
    LABOR_ITEMS: "session_labor_items",
    GCODES: "session_gcodes",
    STOCK: "session_stock",
    FDM_CALC_DRAFT: "session_fdm_calc_draft",
    RESIN_CALC_DRAFT: "session_resin_calc_draft",
    LASER_CALC_DRAFT: "session_laser_calc_draft",
    EMBROIDERY_CALC_DRAFT: "session_embroidery_calc_draft",
    INITIALIZED: "session_initialized",
};

const mergeDefaultEntries = <T extends { id: string }>(storageKey: string, defaults: T[]) => {
    const existing: T[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
    let changed = false;
    const merged = [...existing];

    defaults.forEach((entry) => {
        if (!merged.some((item) => item.id === entry.id)) {
            merged.push(entry);
            changed = true;
        }
    });

    if (changed) {
        localStorage.setItem(storageKey, JSON.stringify(merged));
    }
};

// Initialize session storage with defaults if not already done
const initializeDefaults = () => {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
        localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(defaultMaterials));
        localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(defaultMachines));
        localStorage.setItem(STORAGE_KEYS.CONSTANTS, JSON.stringify(defaultConstants));
        localStorage.setItem(STORAGE_KEYS.LABOR_ITEMS, JSON.stringify(defaultLaborItems));
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.SPOOLS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.GCODES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(null));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true");
    }

    // Migration: Ensure STOCK key exists
    if (!localStorage.getItem(STORAGE_KEYS.STOCK)) {
        localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify([]));
    }

    // Migration: Add default paint consumables if they don't exist
    let existingConstants: CostConstant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONSTANTS) || "[]");
    const paintConsumables = defaultConstants.filter(c => c.id.startsWith("paint-"));
    let needsUpdate = false;

    for (const paint of paintConsumables) {
        const index = existingConstants.findIndex(c => c.id === paint.id);

        if (index === -1) {
            // New paint, add it
            existingConstants.push(paint);
            needsUpdate = true;
        } else {
            // Check if existing paint needs update (migration from flat to calculated)
            // Legacy values: 5, 8, 6, 7. New values are < 1.
            const existing = existingConstants[index];
            if (existing.unit === "flat" && existing.value > 1) {
                // Update to new default
                existingConstants[index] = paint;
                needsUpdate = true;
            }
        }
    }

    const filteredConstants = existingConstants.filter(c => c.id !== "labor" && c.name !== "Labor Rate");
    if (filteredConstants.length !== existingConstants.length) {
        existingConstants = filteredConstants;
        needsUpdate = true;
    }

    // Migration: Ensure system constants are hidden (not visible in paint/consumable selection)
    const systemIds = ["electricity", "overhead", "markup"];
    const systemNames = ["Electricity Rate", "Overhead Rate", "Default Markup"];

    for (let i = 0; i < existingConstants.length; i++) {
        const c = existingConstants[i];
        if ((systemIds.includes(c.id) || systemNames.includes(c.name)) && c.is_visible !== false) {
            existingConstants[i].is_visible = false;
            needsUpdate = true;
        }
    }

    if (needsUpdate) {
        localStorage.setItem(STORAGE_KEYS.CONSTANTS, JSON.stringify(existingConstants));
    }

    if (!localStorage.getItem(STORAGE_KEYS.LABOR_ITEMS)) {
        localStorage.setItem(STORAGE_KEYS.LABOR_ITEMS, JSON.stringify(defaultLaborItems));
    }

    mergeDefaultEntries(STORAGE_KEYS.MATERIALS, defaultMaterials);
    mergeDefaultEntries(STORAGE_KEYS.MACHINES, defaultMachines);
};

// Quotes
const normalizeQuote = (quote: QuoteData): QuoteData => {
    const createdAt = quote.createdAt || new Date().toISOString();
    const updatedAt = quote.updatedAt || createdAt;
    const quoteFilaments = (quote.quoteFilaments || [])
        .filter(segment => typeof segment.weightGrams === 'number' && segment.weightGrams > 0)
        .sort((left, right) => left.order - right.order)
        .map((segment, index) => ({
            ...segment,
            order: index + 1,
        }));

    return {
        ...quote,
        parameters: quote.parameters || {},
        quoteFilaments,
        createdAt,
        updatedAt,
        status: quote.status || 'PENDING',
        statusTimeline: quote.statusTimeline || { PENDING: createdAt },
        assignedMachineId: quote.assignedMachineId || undefined,
        actualPrintTime: quote.actualPrintTime || undefined,
        syncStatus: quote.syncStatus || 'LEGACY_LOCAL',
        pendingSyncAction: quote.pendingSyncAction || undefined,
        lastSyncedAt: quote.lastSyncedAt || undefined,
        lastServerUpdatedAt: quote.lastServerUpdatedAt || undefined,
        syncError: quote.syncError || undefined,
        conflictTransactionId: quote.conflictTransactionId || undefined,
    };
};

const persistQuotes = (quotes: QuoteData[]): QuoteData[] => {
    const normalizedQuotes = quotes.map(normalizeQuote);
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(normalizedQuotes));
    return normalizedQuotes;
};

export const getQuotes = (): QuoteData[] => {
    initializeDefaults();
    const rawQuotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUOTES) || "[]");

    return rawQuotes.map((q: QuoteData) => normalizeQuote(q));
};

export const saveQuotes = (quotes: QuoteData[]): QuoteData[] => {
    initializeDefaults();
    return persistQuotes(quotes);
};

export const getQuoteById = (id: string): QuoteData | undefined => {
    return getQuotes().find(quote => quote.id === id);
};

export const saveQuote = (quote: QuoteData): QuoteData => {
    const quotes = getQuotes();
    const newQuote: QuoteData = {
        ...quote,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'PENDING_SYNC',
        pendingSyncAction: 'create',
        syncError: undefined,
        conflictTransactionId: undefined,
    };
    return persistQuotes([newQuote, ...quotes])[0];
};

export const upsertQuote = (quote: QuoteData): QuoteData => {
    const quotes = getQuotes();
    const normalizedQuote = normalizeQuote(quote);
    const existingIndex = quotes.findIndex(item => item.id === normalizedQuote.id);

    if (existingIndex === -1) {
        persistQuotes([normalizedQuote, ...quotes]);
        return normalizedQuote;
    }

    quotes[existingIndex] = normalizedQuote;
    persistQuotes(quotes);
    return normalizedQuote;
};

export const replaceQuoteFromRemote = (quote: QuoteData): QuoteData => {
    return upsertQuote({
        ...quote,
        syncStatus: 'SYNCED',
        pendingSyncAction: undefined,
        lastSyncedAt: quote.updatedAt || new Date().toISOString(),
        lastServerUpdatedAt: quote.updatedAt || new Date().toISOString(),
        syncError: undefined,
        conflictTransactionId: undefined,
    });
};

export const updateQuote = (id: string, updates: Partial<QuoteData>): QuoteData | null => {
    const quotes = getQuotes();
    const index = quotes.findIndex(quote => quote.id === id);

    if (index === -1) {
        return null;
    }

    const existingQuote = quotes[index];
    const updatedQuote = normalizeQuote({
        ...existingQuote,
        ...updates,
        parameters: updates.parameters
            ? { ...existingQuote.parameters, ...updates.parameters }
            : existingQuote.parameters,
        updatedAt: updates.updatedAt || new Date().toISOString(),
    });

    quotes[index] = updatedQuote;
    persistQuotes(quotes);
    return updatedQuote;
};

export const deleteQuote = (id: string): void => {
    const quotes = getQuotes().filter(q => q.id !== id);
    persistQuotes(quotes);
};

export const updateQuoteNotes = (id: string, notes: string): QuoteData | null => {
    return updateQuote(id, { notes });
};

export const updateQuoteStatus = (id: string, status: QuoteStatus): void => {
    const quote = getQuoteById(id);
    if (!quote) return;

    updateQuote(id, {
        status,
        statusTimeline: {
            ...quote.statusTimeline,
            [status]: new Date().toISOString(),
        },
        ...(status === 'DONE' && !quote.statusTimeline?.DONE ? { actualPrintTime: quote.actualPrintTime } : {}),
    });
};

// Materials
export const getMaterials = (printType?: PrintType): Material[] => {
    initializeDefaults();
    const materials: Material[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATERIALS) || "[]");
    return printType ? materials.filter(m => m.print_type === printType) : materials;
};

export const saveMaterial = (material: Omit<Material, "id"> & { id?: string }): Material => {
    const materials = getMaterials();
    if (material.id) {
        // Update existing
        const index = materials.findIndex(m => m.id === material.id);
        if (index !== -1) {
            materials[index] = material as Material;
        }
    } else {
        // Add new
        const newMaterial: Material = {
            ...material,
            id: generateId(),
        } as Material;
        materials.push(newMaterial);
    }
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
    return material as Material;
};

export const deleteMaterial = (id: string): void => {
    const materials = getMaterials().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
};

// Machines
export const getMachines = (printType?: PrintType): Machine[] => {
    initializeDefaults();
    const machines: Machine[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MACHINES) || "[]");
    const normalized = machines.map(normalizeMachine);
    return printType ? normalized.filter(m => m.print_type === printType) : normalized;
};

export const saveMachine = (machine: Omit<Machine, "id"> & { id?: string }): Machine => {
    const machines = getMachines();
    const normalized = normalizeMachine(machine as Machine);
    if (machine.id) {
        // Update existing
        const index = machines.findIndex(m => m.id === machine.id);
        if (index !== -1) {
            machines[index] = { ...normalized, id: machine.id } as Machine;
        }
    } else {
        // Add new
        const newMachine: Machine = {
            ...normalized,
            id: generateId(),
        } as Machine;
        machines.push(newMachine);
    }
    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machines));
    return normalized as Machine;
};

export const deleteMachine = (id: string): void => {
    const machines = getMachines().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machines));
};

// Calculator Drafts
export type CalculatorDraft<T> = {
    formData: T;
    selectedSpoolId?: string;
};

export const getFdmCalculatorDraft = <T>(): CalculatorDraft<T> | null => {
    initializeDefaults();
    const raw = localStorage.getItem(STORAGE_KEYS.FDM_CALC_DRAFT);
    return raw ? (JSON.parse(raw) as CalculatorDraft<T>) : null;
};

export const saveFdmCalculatorDraft = <T>(draft: CalculatorDraft<T>): void => {
    initializeDefaults();
    localStorage.setItem(STORAGE_KEYS.FDM_CALC_DRAFT, JSON.stringify(draft));
};

export const clearFdmCalculatorDraft = (): void => {
    localStorage.removeItem(STORAGE_KEYS.FDM_CALC_DRAFT);
};

export const getResinCalculatorDraft = <T>(): CalculatorDraft<T> | null => {
    initializeDefaults();
    const raw = localStorage.getItem(STORAGE_KEYS.RESIN_CALC_DRAFT);
    return raw ? (JSON.parse(raw) as CalculatorDraft<T>) : null;
};

export const saveResinCalculatorDraft = <T>(draft: CalculatorDraft<T>): void => {
    initializeDefaults();
    localStorage.setItem(STORAGE_KEYS.RESIN_CALC_DRAFT, JSON.stringify(draft));
};

export const clearResinCalculatorDraft = (): void => {
    localStorage.removeItem(STORAGE_KEYS.RESIN_CALC_DRAFT);
};

export const getLaserCalculatorDraft = <T>(): CalculatorDraft<T> | null => {
    initializeDefaults();
    const raw = localStorage.getItem(STORAGE_KEYS.LASER_CALC_DRAFT);
    return raw ? (JSON.parse(raw) as CalculatorDraft<T>) : null;
};

export const saveLaserCalculatorDraft = <T>(draft: CalculatorDraft<T>): void => {
    initializeDefaults();
    localStorage.setItem(STORAGE_KEYS.LASER_CALC_DRAFT, JSON.stringify(draft));
};

export const clearLaserCalculatorDraft = (): void => {
    localStorage.removeItem(STORAGE_KEYS.LASER_CALC_DRAFT);
};

export const getEmbroideryCalculatorDraft = <T>(): CalculatorDraft<T> | null => {
    initializeDefaults();
    const raw = localStorage.getItem(STORAGE_KEYS.EMBROIDERY_CALC_DRAFT);
    return raw ? (JSON.parse(raw) as CalculatorDraft<T>) : null;
};

export const saveEmbroideryCalculatorDraft = <T>(draft: CalculatorDraft<T>): void => {
    initializeDefaults();
    localStorage.setItem(STORAGE_KEYS.EMBROIDERY_CALC_DRAFT, JSON.stringify(draft));
};

export const clearEmbroideryCalculatorDraft = (): void => {
    localStorage.removeItem(STORAGE_KEYS.EMBROIDERY_CALC_DRAFT);
};

// Constants
export const getConstants = (): CostConstant[] => {
    initializeDefaults();
    const constants = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONSTANTS) || "[]");

    // Enforce system constants to be hidden
    const systemIds = ["electricity", "overhead", "markup"];
    const systemNames = ["Electricity Rate", "Overhead Rate", "Default Markup"];

    return constants.map((c: CostConstant) => {
        if (systemIds.includes(c.id) || systemNames.includes(c.name)) {
            return { ...c, is_visible: false };
        }
        return c;
    });
};

export const saveConstant = (constant: Omit<CostConstant, "id"> & { id?: string }): CostConstant => {
    const constants = getConstants();
    if (constant.id) {
        // Update existing
        const index = constants.findIndex(c => c.id === constant.id);
        if (index !== -1) {
            constants[index] = constant as CostConstant;
        }
    } else {
        // Add new
        const newConstant: CostConstant = {
            ...constant,
            id: generateId(),
        } as CostConstant;
        constants.push(newConstant);
    }
    localStorage.setItem(STORAGE_KEYS.CONSTANTS, JSON.stringify(constants));
    return constant as CostConstant;
};

export const deleteConstant = (id: string): void => {
    const constants = getConstants().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CONSTANTS, JSON.stringify(constants));
};



// Reset all session data
export const resetSessionData = (): void => {
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
    localStorage.removeItem(STORAGE_KEYS.QUOTES);
    localStorage.removeItem(STORAGE_KEYS.MATERIALS);
    localStorage.removeItem(STORAGE_KEYS.MACHINES);
    localStorage.removeItem(STORAGE_KEYS.CONSTANTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.REVIEWS);
    localStorage.removeItem(STORAGE_KEYS.SPOOLS);
    localStorage.removeItem(STORAGE_KEYS.GCODES);
    localStorage.removeItem(STORAGE_KEYS.FDM_CALC_DRAFT);
    localStorage.removeItem(STORAGE_KEYS.RESIN_CALC_DRAFT);
    localStorage.removeItem(STORAGE_KEYS.LASER_CALC_DRAFT);
    localStorage.removeItem(STORAGE_KEYS.EMBROIDERY_CALC_DRAFT);
    initializeDefaults();
};

// Customers
export const getCustomers = (): Customer[] => {
    initializeDefaults();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || "[]");
};

export const saveCustomer = (customer: Omit<Customer, "id" | "createdAt"> & { id?: string, createdAt?: string }): Customer => {
    const customers = getCustomers();
    if (customer.id) {
        // Update existing
        const index = customers.findIndex(c => c.id === customer.id);
        if (index !== -1) {
            customers[index] = { ...customers[index], ...customer };
        }
    } else {
        // Add new
        const newCustomer: Customer = {
            ...customer,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        customers.unshift(newCustomer);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    return customer.id
        ? customers.find(c => c.id === customer.id)!
        : customers[0];
};

export const deleteCustomer = (id: string): void => {
    const customers = getCustomers().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
};

export const getCustomer = (id: string): Customer | undefined => {
    return getCustomers().find(c => c.id === id);
};

export const getCustomerStats = (customerId: string) => {
    initializeDefaults();
    const quotes = getQuotes();
    const customerQuotes = quotes.filter(q => q.customerId === customerId);

    const totalSpent = customerQuotes.reduce((sum, q) => sum + (q.totalPrice || 0), 0);
    const orderCount = customerQuotes.length;
    const lastOrderDate = customerQuotes.length > 0
        ? customerQuotes.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0].createdAt
        : null;

    return {
        totalSpent,
        orderCount,
        lastOrderDate,
        quotes: customerQuotes
    };
};

// ==================== EMPLOYEES ====================

export const getEmployees = (): Employee[] => {
    initializeDefaults();
    const employees: Employee[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || "[]");
    const laborItemIds = getLaborItems().map(item => item.id);
    let needsUpdate = false;
    const normalized = employees.map(employee => {
        const allowedLaborItemIds = Array.isArray(employee.allowedLaborItemIds)
            ? employee.allowedLaborItemIds
            : laborItemIds;
        if (employee.allowedLaborItemIds !== allowedLaborItemIds) {
            needsUpdate = true;
        }
        return { ...employee, allowedLaborItemIds };
    });

    if (needsUpdate) {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(normalized));
    }

    return normalized;
};

export const saveEmployee = (employee: Omit<Employee, "id" | "createdAt"> & { id?: string }): Employee => {
    const employees = getEmployees();
    if (employee.id) {
        // Update existing
        const index = employees.findIndex(e => e.id === employee.id);
        if (index !== -1) {
            employees[index] = { ...employees[index], ...employee };
        }
    } else {
        // Add new
        const laborItemIds = getLaborItems().map(item => item.id);
        const newEmployee: Employee = {
            ...employee,
            id: generateId(),
            createdAt: new Date().toISOString(),
            allowedLaborItemIds: employee.allowedLaborItemIds || laborItemIds,
        };
        employees.unshift(newEmployee);
    }
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    return employee.id
        ? employees.find(e => e.id === employee.id)!
        : employees[0];
};

export const deleteEmployee = (id: string): void => {
    const employees = getEmployees().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
};

export const getEmployee = (id: string): Employee | undefined => {
    return getEmployees().find(e => e.id === id);
};

// ==================== LABOR ITEMS ====================

export const getLaborItems = (): LaborItem[] => {
    initializeDefaults();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LABOR_ITEMS) || "[]");
};

export const saveLaborItem = (laborItem: Omit<LaborItem, "id"> & { id?: string }): LaborItem => {
    const laborItems = getLaborItems();
    if (laborItem.id) {
        const index = laborItems.findIndex(item => item.id === laborItem.id);
        if (index !== -1) {
            laborItems[index] = { ...laborItems[index], ...laborItem } as LaborItem;
        }
    } else {
        const newItem: LaborItem = {
            ...laborItem,
            id: generateId(),
        } as LaborItem;
        laborItems.unshift(newItem);
    }
    localStorage.setItem(STORAGE_KEYS.LABOR_ITEMS, JSON.stringify(laborItems));
    return laborItem.id
        ? laborItems.find(item => item.id === laborItem.id)!
        : laborItems[0];
};

export const deleteLaborItem = (id: string): void => {
    const laborItems = getLaborItems().filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.LABOR_ITEMS, JSON.stringify(laborItems));
};

// ==================== CUSTOMER REVIEWS ====================

export const getReviews = (customerId?: string): CustomerReview[] => {
    initializeDefaults();
    const reviews: CustomerReview[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || "[]");
    return customerId ? reviews.filter(r => r.customerId === customerId) : reviews;
};

export const saveReview = (review: Omit<CustomerReview, "id" | "createdAt"> & { id?: string }): CustomerReview => {
    const reviews = getReviews();
    if (review.id) {
        const index = reviews.findIndex(r => r.id === review.id);
        if (index !== -1) {
            reviews[index] = { ...reviews[index], ...review } as CustomerReview;
        }
    } else {
        const newReview: CustomerReview = {
            ...review,
            id: generateId(),
            createdAt: new Date().toISOString(),
        } as CustomerReview;
        reviews.unshift(newReview);
    }
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));

    // Update customer's average rating
    updateCustomerRating(review.customerId);

    return review.id ? reviews.find(r => r.id === review.id)! : reviews[0];
};

export const deleteReview = (id: string): void => {
    const reviews = getReviews();
    const review = reviews.find(r => r.id === id);
    const filtered = reviews.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(filtered));

    if (review) {
        updateCustomerRating(review.customerId);
    }
};

export const getCustomerAverageRating = (customerId: string): { average: number; count: number } => {
    const reviews = getReviews(customerId);
    if (reviews.length === 0) return { average: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / reviews.length, count: reviews.length };
};

const updateCustomerRating = (customerId: string): void => {
    const { average, count } = getCustomerAverageRating(customerId);
    const customers = getCustomers();
    const index = customers.findIndex(c => c.id === customerId);
    if (index !== -1) {
        customers[index].averageRating = average;
        customers[index].reviewCount = count;
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    }
};

// ==================== MATERIAL SPOOLS (INVENTORY) ====================

export const getSpools = (materialId?: string): MaterialSpool[] => {
    initializeDefaults();
    const spools: MaterialSpool[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SPOOLS) || "[]");
    return materialId ? spools.filter(s => s.materialId === materialId) : spools;
};

export const saveSpool = (spool: Omit<MaterialSpool, "id"> & { id?: string }): MaterialSpool => {
    const spools = getSpools();
    if (spool.id) {
        const index = spools.findIndex(s => s.id === spool.id);
        if (index !== -1) {
            spools[index] = spool as MaterialSpool;
        }
    } else {
        const newSpool: MaterialSpool = {
            ...spool,
            id: generateId(),
        };
        spools.push(newSpool);
    }
    localStorage.setItem(STORAGE_KEYS.SPOOLS, JSON.stringify(spools));
    updateMaterialStock(spool.materialId);
    return spool.id ? spools.find(s => s.id === spool.id)! : spools[spools.length - 1];
};

export const deleteSpool = (id: string): void => {
    const spools = getSpools();
    const spool = spools.find(s => s.id === id);
    const filtered = spools.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SPOOLS, JSON.stringify(filtered));

    if (spool) {
        updateMaterialStock(spool.materialId);
    }
};

export const deductFromSpool = (spoolId: string, amount: number): boolean => {
    const spools = getSpools();
    const index = spools.findIndex(s => s.id === spoolId);
    if (index === -1) return false;

    // Allow negative stock (if over-consumed) or adding back (if amount is negative)
    const newWeight = spools[index].currentWeight - amount;
    spools[index].currentWeight = newWeight;

    localStorage.setItem(STORAGE_KEYS.SPOOLS, JSON.stringify(spools));
    updateMaterialStock(spools[index].materialId);
    return true;
};

export const restoreToSpool = (spoolId: string, amount: number): boolean => {
    return deductFromSpool(spoolId, -amount);
};

export const getMaterialStock = (materialId: string): number => {
    const spools = getSpools(materialId);
    return spools.reduce((sum, s) => sum + s.currentWeight, 0);
};

export const getLowStockMaterials = (threshold?: number): Material[] => {
    const materials = getMaterials();
    return materials.filter(m => {
        const stock = getMaterialStock(m.id);
        const limit = m.lowStockThreshold ?? threshold ?? 200; // Default 200g threshold
        return stock < limit && stock >= 0;
    });
};

const updateMaterialStock = (materialId: string): void => {
    const stock = getMaterialStock(materialId);
    const materials = getMaterials();
    const index = materials.findIndex(m => m.id === materialId);
    if (index !== -1) {
        materials[index].totalInStock = stock;
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
    }
};

// ==================== STORED G-CODES ====================

export const getGcodes = (): StoredGcode[] => {
    initializeDefaults();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.GCODES) || "[]");
};

export const saveGcode = (gcode: Omit<StoredGcode, "id"> & { id?: string }): StoredGcode => {
    const gcodes = getGcodes();
    if (gcode.id) {
        // Update existing
        const index = gcodes.findIndex(g => g.id === gcode.id);
        if (index !== -1) {
            gcodes[index] = gcode as StoredGcode;
        }
    } else {
        // Add new
        const newGcode: StoredGcode = {
            ...gcode,
            id: generateId(),
        } as StoredGcode;
        gcodes.unshift(newGcode);
    }
    localStorage.setItem(STORAGE_KEYS.GCODES, JSON.stringify(gcodes));
    return gcode.id ? gcodes.find(g => g.id === gcode.id)! : gcodes[0];
};

export const deleteGcode = (id: string): void => {
    const gcodes = getGcodes().filter(g => g.id !== id);
    localStorage.setItem(STORAGE_KEYS.GCODES, JSON.stringify(gcodes));
};

export const getRecyclableColorTotals = (): {
    byColor: { color: string; supportGrams: number; towerGrams: number; flushGrams: number; recyclableGrams: number; stockGrams: number; surplusGrams: number }[];
    totals: { supportGrams: number; towerGrams: number; flushGrams: number; recyclableGrams: number };
} => {
    const gcodes = getGcodes();
    const totalsByColor = new Map<string, { supportGrams: number; towerGrams: number; flushGrams: number; recyclableGrams: number }>();
    const normalizeColorKey = (value: string) => value.trim().toUpperCase();

    for (const gcode of gcodes) {
        if (!gcode.recyclableColorUsages) continue;
        for (const usage of gcode.recyclableColorUsages) {
            const color = usage.color || usage.tool || "Unknown";
            const key = normalizeColorKey(color);
            const current = totalsByColor.get(key) || { supportGrams: 0, towerGrams: 0, flushGrams: 0, recyclableGrams: 0 };
            current.supportGrams += usage.supportGrams || 0;
            current.towerGrams += usage.towerGrams || 0;
            current.flushGrams += usage.flushGrams || 0;
            current.recyclableGrams += usage.recyclableGrams || 0;
            totalsByColor.set(key, current);
        }
    }

    const materials = getMaterials();
    const materialById = new Map(materials.map(item => [item.id, item]));
    const stockByColor = new Map<string, number>();

    for (const spool of getSpools()) {
        const material = materialById.get(spool.materialId);
        if (!material || material.print_type !== "FDM") continue;
        const color = (spool.color || "Unknown").trim();
        const key = normalizeColorKey(color);
        stockByColor.set(key, (stockByColor.get(key) || 0) + (spool.currentWeight || 0));
    }

    const byColor = Array.from(totalsByColor.entries())
        .map(([color, values]) => ({
            color,
            supportGrams: Math.round(values.supportGrams * 100) / 100,
            towerGrams: Math.round(values.towerGrams * 100) / 100,
            flushGrams: Math.round(values.flushGrams * 100) / 100,
            recyclableGrams: Math.round(values.recyclableGrams * 100) / 100,
            stockGrams: Math.round((stockByColor.get(color) || 0) * 100) / 100,
            surplusGrams: Math.round(((stockByColor.get(color) || 0) - values.recyclableGrams) * 100) / 100,
        }))
        .sort((a, b) => b.recyclableGrams - a.recyclableGrams);

    const totals = byColor.reduce((acc, row) => ({
        supportGrams: acc.supportGrams + row.supportGrams,
        towerGrams: acc.towerGrams + row.towerGrams,
        flushGrams: acc.flushGrams + row.flushGrams,
        recyclableGrams: acc.recyclableGrams + row.recyclableGrams,
    }), { supportGrams: 0, towerGrams: 0, flushGrams: 0, recyclableGrams: 0 });

    return {
        byColor,
        totals: {
            supportGrams: Math.round(totals.supportGrams * 100) / 100,
            towerGrams: Math.round(totals.towerGrams * 100) / 100,
            flushGrams: Math.round(totals.flushGrams * 100) / 100,
            recyclableGrams: Math.round(totals.recyclableGrams * 100) / 100,
        },
    };
};

// ==================== COMPANY SETTINGS ====================


export const getCompanySettings = (): CompanySettings | null => {
    initializeDefaults();
    const data = localStorage.getItem(STORAGE_KEYS.COMPANY);
    return data ? JSON.parse(data) : null;
};

export const saveCompanySettings = (settings: CompanySettings): void => {
    localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(settings));
};

// ==================== EXPORT/IMPORT ====================

// Settings data structure for export/import
export interface SettingsExport {
    version: string;
    exportDate: string;
    materials: Material[];
    machines: Machine[];
    constants: CostConstant[];
    laborItems?: LaborItem[];
    customers: Customer[];
    reviews?: CustomerReview[];
    spools?: MaterialSpool[];
    gcodes?: StoredGcode[];
    company?: CompanySettings | null;
}

// Export all settings to JSON
export const exportAllSettings = (): SettingsExport => {
    return {
        version: "1.1",
        exportDate: new Date().toISOString(),
        materials: getMaterials(),
        machines: getMachines(),
        constants: getConstants(),
        laborItems: getLaborItems(),
        customers: getCustomers(),
        reviews: getReviews(),
        spools: getSpools(),
        gcodes: getGcodes(),
        company: getCompanySettings(),
    };
};

// Import settings from JSON
export const importAllSettings = (data: SettingsExport): { success: boolean; message: string } => {
    try {
        // Validate structure
        if (!data.version || !data.materials || !data.machines || !data.constants) {
            return { success: false, message: "Invalid settings file format" };
        }

        // Validate arrays
        if (!Array.isArray(data.materials) || !Array.isArray(data.machines) || !Array.isArray(data.constants)) {
            return { success: false, message: "Settings data is corrupted" };
        }

        if (data.laborItems && !Array.isArray(data.laborItems)) {
            return { success: false, message: "Labor items data is corrupted" };
        }

        // Validate customers (optional for backward compatibility)
        if (data.customers && !Array.isArray(data.customers)) {
            return { success: false, message: "Customer data is corrupted" };
        }

        // Import materials
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(data.materials));

        // Import machines
        localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(data.machines));

        // Import constants
        localStorage.setItem(STORAGE_KEYS.CONSTANTS, JSON.stringify(data.constants));

        if (data.laborItems) {
            localStorage.setItem(STORAGE_KEYS.LABOR_ITEMS, JSON.stringify(data.laborItems));
        }

        // Import customers (if present)
        if (data.customers) {
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data.customers));
        }

        // Import reviews (if present)
        if (data.reviews) {
            localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(data.reviews));
        }

        // Import spools (if present)
        if (data.spools) {
            localStorage.setItem(STORAGE_KEYS.SPOOLS, JSON.stringify(data.spools));
        }

        // Import G-codes (if present)
        if (data.gcodes) {
            localStorage.setItem(STORAGE_KEYS.GCODES, JSON.stringify(data.gcodes));
        }

        // Import company settings (if present)
        if (data.company) {
            localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(data.company));
        }

        return {
            success: true,
            message: `Imported ${data.materials.length} materials, ${data.machines.length} machines, ${data.constants.length} consumables${data.laborItems ? `, ${data.laborItems.length} labor items` : ''}${data.customers ? `, ${data.customers.length} customers` : ''}${data.reviews ? `, ${data.reviews.length} reviews` : ''}${data.spools ? `, ${data.spools.length} spools` : ''}${data.gcodes ? `, ${data.gcodes.length} G-codes` : ''}`
        };
    } catch (error) {
        console.error("Import error:", error);
        return { success: false, message: "Failed to import settings" };
    }
};

// Stock Management Functions
export const getStock = (): StockItem[] => {
    initializeDefaults();
    const data = localStorage.getItem(STORAGE_KEYS.STOCK);
    return data ? JSON.parse(data) : [];
};

export const addToStock = (quoteData: QuoteData, quantity: number): void => {
    initializeDefaults();
    const stock = getStock();
    const newItem: StockItem = {
        id: generateId(),
        quoteId: quoteData.id || generateId(),
        projectName: quoteData.projectName,
        quantity,
        unitPrice: quoteData.unitPrice,
        totalCost: quoteData.subtotal,
        printType: quoteData.printType,
        material: quoteData.parameters.materialName,
        color: quoteData.printColour,
        createdAt: new Date().toISOString(),
        status: "IN_STOCK",
    };
    stock.push(newItem);
    localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stock));
};

export const removeFromStock = (stockId: string, soldQuantity: number): void => {
    initializeDefaults();
    const stock = getStock();
    const index = stock.findIndex(item => item.id === stockId);
    if (index !== -1) {
        if (soldQuantity >= stock[index].quantity) {
            stock[index].status = "SOLD";
        } else {
            stock[index].quantity -= soldQuantity;
        }
        localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stock));
    }
};

export const updateStockStatus = (stockId: string, status: "IN_STOCK" | "SOLD" | "RESERVED"): void => {
    initializeDefaults();
    const stock = getStock();
    const item = stock.find(s => s.id === stockId);
    if (item) {
        item.status = status;
        localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stock));
    }
};

export const getStockStats = (): StockStats => {
    const stock = getStock();
    const stats: StockStats = {
        totalItems: 0,
        totalValue: 0,
        soldItems: 0,
        soldValue: 0,
        reservedItems: 0,
        reservedValue: 0,
    };

    stock.forEach(item => {
        if (item.status === "IN_STOCK") {
            stats.totalItems += item.quantity;
            stats.totalValue += item.totalCost * item.quantity;
        } else if (item.status === "SOLD") {
            stats.soldItems += item.quantity;
            stats.soldValue += item.totalCost * item.quantity;
        } else if (item.status === "RESERVED") {
            stats.reservedItems += item.quantity;
            stats.reservedValue += item.totalCost * item.quantity;
        }
    });

    return stats;
};

export const deleteStockItem = (stockId: string): void => {
    initializeDefaults();
    const stock = getStock();
    const filtered = stock.filter(item => item.id !== stockId);
    localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(filtered));
};
