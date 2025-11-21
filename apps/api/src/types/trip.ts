/**
 * TripDTO - Data Transfer Object for Trip sync protocol
 * Matches the shape defined in docs/api-contract.md
 */
export interface TripDTO {
  id: string;              // Unique trip identifier
  title: string;           // Trip title (e.g., "Summer Vacation")
  destination: string;     // Destination (e.g., "Bali, Indonesia")
  startDate: string;       // ISO date string (e.g., "2025-07-15")
  endDate: string;         // ISO date string (e.g., "2025-07-25")
  notes?: string;          // Optional notes/description
  updatedAt: number;       // Unix timestamp (ms) - SERVER-ASSIGNED
  deleted: boolean;        // Soft delete marker (true = deleted)
}
