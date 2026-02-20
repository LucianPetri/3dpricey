/*
 * 3DPricey Frontend
 * Copyright (C) 2025 Printel
 */

// Auth utilities for managing authentication state

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
}

export function getStoredUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

export function clearAuth() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
}

export function setAuth(token: string, user: User) {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
