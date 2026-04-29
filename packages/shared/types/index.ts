/**
 * Shared types for transversal project apps.
 * Extend with domain types (e.g. Location, Sale, Customer) as needed.
 */

// Base types
export type Id = string;

export interface BaseEntity {
  id: Id;
  createdAt?: string;
  updatedAt?: string;
}

// Election system types
export interface Candidate extends BaseEntity {
  name: string;
  party: string;
  votes: number; // Añadido para reportes
}

export interface Vote extends BaseEntity {
  candidateId: string;
  voterRegion: string;
  timestamp: string; // ISO String para mayor compatibilidad con JSON
}

export interface Election extends BaseEntity {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ErrorDetail {
  field: string;
  message: string;
}
