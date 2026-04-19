/*
 * 3DPricey Frontend
 * Copyright (C) 2025 Printel
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { QuoteData } from '@/types/quote';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export type SyncResource = 'quote' | 'material' | 'machine';
export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncResolution = 'local' | 'server' | 'merged';

export interface SyncChangeDto {
  id: string;
  type: SyncOperation;
  resource: SyncResource;
  data: Record<string, unknown>;
  timestamp: number;
  baseVersion?: string | null;
}

export interface SyncConflictFieldDto {
  field: string;
  localValue: unknown;
  serverValue: unknown;
  updatedBy?: string;
}

export interface SyncConflictDto {
  id: string;
  changeId: string;
  transactionId: string;
  resourceType: SyncResource;
  resourceId: string;
  fields: SyncConflictFieldDto[];
  localVersion: Record<string, unknown>;
  serverVersion: Record<string, unknown>;
}

export interface SyncBatchResponse {
  applied: number;
  appliedChanges: string[];
  records: Array<{
    changeId: string;
    resourceType: SyncResource;
    record: QuoteData | null;
  }>;
  conflicts: SyncConflictDto[];
  failed: Array<{
    changeId: string;
    message: string;
    statusCode: number;
  }>;
  lastSyncedAt: string;
}

export interface SyncResolutionPayload {
  transactionId: string;
  resolution: SyncResolution;
  mergedValue?: Record<string, unknown>;
}

export interface SyncStatusResponse {
  pendingCount: number;
  conflictedCount: number;
  lastSyncedAt: string | null;
}

export interface ParsedGcodeColorChangeDto {
  order: number;
  tool: string;
  color?: string;
  material?: string;
  weightGrams: number;
}

export interface ParsedGcodeToolBreakdownDto {
  order: number;
  tool: string;
  color?: string;
  material?: string;
  modelGrams: number;
  supportGrams: number;
  towerGrams: number;
  flushGrams: number;
  totalGrams: number;
}

export interface ParsedGcodeResponse {
  colorChanges: ParsedGcodeColorChangeDto[];
  toolBreakdown: ParsedGcodeToolBreakdownDto[];
  recyclableTotals: {
    supportGrams: number;
    towerGrams: number;
    flushGrams: number;
    recyclableGrams: number;
    modelGrams: number;
  };
}

async function readErrorPayload(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function assertOk(response: Response, fallbackMessage: string) {
  if (response.ok) {
    return response;
  }

  const errorPayload = await readErrorPayload(response);
  throw new ApiError(
    errorPayload?.error || fallbackMessage,
    response.status,
    errorPayload?.details
  );
}

// Helper function to get auth token
function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Helper function to make authenticated requests
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  // Handle token expiration
  if (response.status === 401) {
    // Token expired, clear and redirect to login
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/#/login';
    throw new Error('Authentication expired');
  }

  return response;
}

// Authentication API
export const authAPI = {
  async register(data: { email: string; password: string; name: string; companyName?: string }) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const result = await response.json();
    
    // Store token and user data
    localStorage.setItem('auth_token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    
    return result;
  },

  async login(email: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const result = await response.json();
    
    // Store token and user data
    localStorage.setItem('auth_token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    
    return result;
  },

  async logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/#/login';
  },

  async getProfile() {
    const response = await fetchWithAuth('/auth/profile');
    
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    return response.json();
  },

  isAuthenticated(): boolean {
    return !!getToken();
  },
};

// Quotes API
export const quotesAPI = {
  async getQuotes(params: { limit?: number; offset?: number; status?: string; customerId?: string } = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.customerId) queryParams.append('customerId', params.customerId);

    const response = await fetchWithAuth(`/quotes?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch quotes');
    }

    return response.json();
  },

  async getQuoteById(id: string) {
    const response = await fetchWithAuth(`/quotes/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch quote');
    }

    return response.json();
  },

  async createQuote(quoteData: any) {
    const response = await fetchWithAuth('/quotes', {
      method: 'POST',
      body: JSON.stringify(quoteData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create quote');
    }

    return response.json();
  },

  async updateQuote(id: string, updateData: any) {
    const response = await fetchWithAuth(`/quotes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update quote');
    }

    return response.json();
  },

  async deleteQuote(id: string) {
    const response = await fetchWithAuth(`/quotes/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete quote');
    }

    return true;
  },

  async batchCreateQuotes(quotes: any[]) {
    const response = await fetchWithAuth('/quotes/batch', {
      method: 'POST',
      body: JSON.stringify({ quotes }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create quotes');
    }

    return response.json();
  },

  async parseGcode(gcode: string): Promise<ParsedGcodeResponse> {
    const response = await fetchWithAuth('/quotes/parse-gcode', {
      method: 'POST',
      body: JSON.stringify({ gcode }),
    });

    await assertOk(response, 'Failed to parse G-code');
    return response.json();
  },
};

// Materials API
export const materialsAPI = {
  async getMaterials(printType?: string) {
    const queryParams = printType ? `?printType=${printType}` : '';
    const response = await fetchWithAuth(`/materials${queryParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch materials');
    }

    return response.json();
  },

  async createMaterial(materialData: any) {
    const response = await fetchWithAuth('/materials', {
      method: 'POST',
      body: JSON.stringify(materialData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create material');
    }

    return response.json();
  },

  async updateMaterial(id: string, updateData: any) {
    const response = await fetchWithAuth(`/materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update material');
    }

    return response.json();
  },

  async deleteMaterial(id: string) {
    const response = await fetchWithAuth(`/materials/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete material');
    }

    return true;
  },
};

// Machines API
export const machinesAPI = {
  async getMachines(printType?: string) {
    const queryParams = printType ? `?printType=${printType}` : '';
    const response = await fetchWithAuth(`/machines${queryParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch machines');
    }

    return response.json();
  },

  async createMachine(machineData: any) {
    const response = await fetchWithAuth('/machines', {
      method: 'POST',
      body: JSON.stringify(machineData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create machine');
    }

    return response.json();
  },

  async updateMachine(id: string, updateData: any) {
    const response = await fetchWithAuth(`/machines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update machine');
    }

    return response.json();
  },

  async deleteMachine(id: string) {
    const response = await fetchWithAuth(`/machines/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete machine');
    }

    return true;
  },
};

export const syncAPI = {
  async syncChanges(changes: SyncChangeDto[]): Promise<SyncBatchResponse> {
    const response = await fetchWithAuth('/sync', {
      method: 'POST',
      body: JSON.stringify({ changes }),
    });

    await assertOk(response, 'Failed to sync pending changes');
    return response.json();
  },

  async resolveConflict(payload: SyncResolutionPayload): Promise<{ transaction: unknown; quote: QuoteData | null }> {
    const response = await fetchWithAuth('/sync/resolve', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await assertOk(response, 'Failed to resolve sync conflict');
    return response.json();
  },

  async getStatus(): Promise<SyncStatusResponse> {
    const response = await fetchWithAuth('/sync/status');

    await assertOk(response, 'Failed to fetch sync status');
    return response.json();
  },
};

export default {
  auth: authAPI,
  quotes: quotesAPI,
  materials: materialsAPI,
  machines: machinesAPI,
  sync: syncAPI,
};
